# OFM SCIM Integration Guide

## Overview

This guide walks you through integrating OFM (Operational Field Management) with Aksara SSO using SCIM 2.0 protocol for automatic employee and organizational structure synchronization.

## What You'll Achieve

After implementing SCIM integration, OFM will:

1. ✅ **Auto-sync employees** from SSO to OFM database
2. ✅ **Auto-sync org units** with complete hierarchy
3. ✅ **Know who is the manager** of each department/division
4. ✅ **Find teammates** in same org unit (for approval workflows)
5. ✅ **Query locally** without calling SSO every time

## Architecture Flow

```
┌─────────────────────────────────────────────┐
│  Aksara SSO (localhost:5173)                │
│                                              │
│  SCIM Endpoints:                             │
│  - GET /scim/v2/Users                        │
│  - GET /scim/v2/Groups (org units)           │
│                                              │
│  Data includes:                              │
│  - Employee details                          │
│  - Org unit hierarchy (parentId)             │
│  - Manager ID per unit                       │
│  - Position (isManager flag)                 │
└──────────────────┬──────────────────────────┘
                   │
                   │ SCIM HTTP GET
                   │ Bearer: scim-token-12345
                   │
┌──────────────────▼──────────────────────────┐
│  OFM App (localhost:5174)                   │
│                                              │
│  Sync Script:                                │
│  - Fetch from /scim/v2/Users                 │
│  - Fetch from /scim/v2/Groups                │
│  - Store in local MongoDB                    │
│                                              │
│  Local Collections:                          │
│  - users (with managerId, departmentId)      │
│  - organizationalUnits (with parentId)       │
│                                              │
│  Approval Logic:                             │
│  - Query LOCAL database                      │
│  - Find manager by unit.managerId            │
│  - Find teammates by same departmentId       │
│  - No need to call SSO!                      │
└──────────────────────────────────────────────┘
```

## Step-by-Step Implementation

### Step 1: Create SCIM Sync Script

Create `ofm/scripts/sync-employees-from-sso-scim.ts`:

```typescript
/**
 * SCIM 2.0 Sync Script
 * Syncs employees and org units from Aksara SSO to OFM database
 */

import { getDB } from '$lib/server/db/mongodb';
import { ObjectId } from 'mongodb';

const SSO_BASE_URL = 'http://localhost:5173';
const SCIM_TOKEN = 'scim-token-12345'; // Get from env in production

interface ScimUser {
	id: string;
	userName: string;
	name: {
		givenName: string;
		familyName: string;
	};
	active: boolean;
	emails?: Array<{ value: string; primary: boolean }>;
	phoneNumbers?: Array<{ value: string; primary: boolean }>;
	'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'?: {
		employeeNumber?: string;
		department?: string; // org unit ID
		manager?: {
			value?: string; // manager user ID
		};
	};
	'x-position'?: {
		id: string;
		name: string;
		isManager: boolean;
		level?: number;
	};
	'x-orgUnit'?: {
		id: string;
		name: string;
	};
}

interface ScimGroup {
	id: string;
	displayName: string;
	externalId?: string; // org unit code
	members?: Array<{
		value: string;
		display: string;
		type: 'User';
	}>;
	'x-orgUnit'?: {
		unitType?: string;
		level?: number;
		parentUnitId?: string;
		managerId?: string;
	};
}

interface ScimListResponse<T> {
	schemas: string[];
	totalResults: number;
	startIndex?: number;
	itemsPerPage?: number;
	Resources: T[];
}

/**
 * Fetch all users from SSO via SCIM
 */
async function fetchUsersFromSCIM(): Promise<ScimUser[]> {
	const response = await fetch(`${SSO_BASE_URL}/scim/v2/Users?count=1000`, {
		headers: {
			Authorization: `Bearer ${SCIM_TOKEN}`,
			'Content-Type': 'application/scim+json'
		}
	});

	if (!response.ok) {
		throw new Error(`SCIM Users fetch failed: ${response.statusText}`);
	}

	const data: ScimListResponse<ScimUser> = await response.json();
	console.log(`✅ Fetched ${data.totalResults} users from SSO`);
	return data.Resources;
}

/**
 * Fetch all groups (org units) from SSO via SCIM
 */
async function fetchGroupsFromSCIM(): Promise<ScimGroup[]> {
	const response = await fetch(`${SSO_BASE_URL}/scim/v2/Groups?count=1000`, {
		headers: {
			Authorization: `Bearer ${SCIM_TOKEN}`,
			'Content-Type': 'application/scim+json'
		}
	});

	if (!response.ok) {
		throw new Error(`SCIM Groups fetch failed: ${response.statusText}`);
	}

	const data: ScimListResponse<ScimGroup> = await response.json();
	console.log(`✅ Fetched ${data.totalResults} org units from SSO`);
	return data.Resources;
}

/**
 * Sync users to OFM database
 */
async function syncUsers(users: ScimUser[]) {
	const db = getDB();
	const usersCollection = db.collection('users');

	let created = 0;
	let updated = 0;

	for (const scimUser of users) {
		const enterpriseUser =
			scimUser['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'];

		const userData = {
			userId: scimUser.userName.split('@')[0], // "john.doe"
			email: scimUser.emails?.[0]?.value || scimUser.userName,
			username: scimUser.userName.split('@')[0],
			firstName: scimUser.name.givenName,
			lastName: scimUser.name.familyName,
			phone: scimUser.phoneNumbers?.[0]?.value,

			// SSO reference
			ssoUserId: scimUser.id,
			employeeId: enterpriseUser?.employeeNumber,

			// Organization assignment
			companyId: 'IAS', // You can extract from orgUnit name if needed
			departmentId: enterpriseUser?.department, // Org unit ID
			positionId: scimUser['x-position']?.id,

			// Manager reference (direct manager from SCIM)
			managerId: enterpriseUser?.manager?.value,

			// Status
			isActive: scimUser.active,

			// Sync metadata
			syncedAt: new Date(),
			lastLogin: null
		};

		const result = await usersCollection.updateOne(
			{ ssoUserId: scimUser.id },
			{
				$set: userData,
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);

		if (result.upsertedCount > 0) created++;
		if (result.modifiedCount > 0) updated++;
	}

	console.log(`✅ Users sync complete: ${created} created, ${updated} updated`);
}

/**
 * Sync org units to OFM database
 */
async function syncOrgUnits(groups: ScimGroup[]) {
	const db = getDB();
	const orgUnitsCollection = db.collection('organizationalUnits');

	let created = 0;
	let updated = 0;

	for (const scimGroup of groups) {
		const orgUnitData = scimGroup['x-orgUnit'];

		const unitData = {
			unitId: scimGroup.externalId || scimGroup.id.substring(0, 8),
			unitName: scimGroup.displayName,
			unitType: orgUnitData?.unitType || 'department',
			level: orgUnitData?.level || 1,

			// IMPORTANT: Parent-child relationship
			parentUnitId: orgUnitData?.parentUnitId || null,

			// IMPORTANT: Manager of this unit
			managerId: orgUnitData?.managerId || null,

			// Organization
			companyId: 'IAS',

			// Status
			isActive: true,

			// Sync metadata
			syncedAt: new Date()
		};

		const result = await orgUnitsCollection.updateOne(
			{ _id: new ObjectId(scimGroup.id) },
			{
				$set: unitData,
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);

		if (result.upsertedCount > 0) created++;
		if (result.modifiedCount > 0) updated++;
	}

	console.log(`✅ Org units sync complete: ${created} created, ${updated} updated`);
}

/**
 * Main sync function
 */
async function main() {
	console.log('🔄 Starting SCIM sync from Aksara SSO...\n');

	try {
		// Step 1: Fetch data from SSO
		console.log('📥 Fetching data from SSO...');
		const [users, groups] = await Promise.all([fetchUsersFromSCIM(), fetchGroupsFromSCIM()]);

		// Step 2: Sync to local database
		console.log('\n💾 Syncing to OFM database...');
		await syncOrgUnits(groups); // Sync org units first (referenced by users)
		await syncUsers(users);

		console.log('\n✅ SCIM sync completed successfully!');
		console.log(`   - ${users.length} users synced`);
		console.log(`   - ${groups.length} org units synced`);
	} catch (error) {
		console.error('❌ SCIM sync failed:', error);
		throw error;
	}
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main()
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
}

export { main as syncFromSCIM };
```

### Step 2: Update OFM Database Schema

Make sure your OFM collections have these fields:

**users collection:**

```typescript
interface User {
	_id: ObjectId;
	userId: string; // "john.doe"
	email: string;
	firstName: string;
	lastName: string;
	phone?: string;

	// SSO sync fields
	ssoUserId: string; // Links to SSO employee._id
	employeeId?: string; // "EMP-001"

	// Organization
	companyId: string; // "IAS"
	departmentId?: string; // Org unit ID (ObjectId as string)
	positionId?: string; // Position ID
	managerId?: string; // Direct manager's user ID

	// Status
	isActive: boolean;

	// Metadata
	syncedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}
```

**organizationalUnits collection:**

```typescript
interface OrganizationalUnit {
	_id: ObjectId;
	unitId: string; // "OU-015"
	unitName: string; // "IAS - Finance Division"
	unitType: 'directorate' | 'division' | 'department' | 'section';
	level: number; // 1, 2, 3, 4

	// CRITICAL: Hierarchy fields
	parentUnitId?: string; // Parent org unit ID (ObjectId as string)
	managerId?: string; // User ID of unit manager/head

	companyId: string;
	isActive: boolean;

	syncedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}
```

### Step 3: Run Initial Sync

```bash
cd ofm
bun run scripts/sync-employees-from-sso-scim.ts
```

**Expected output:**

```
🔄 Starting SCIM sync from Aksara SSO...

📥 Fetching data from SSO...
✅ Fetched 8 users from SSO
✅ Fetched 57 org units from SSO

💾 Syncing to OFM database...
✅ Org units sync complete: 57 created, 0 updated
✅ Users sync complete: 8 created, 0 updated

✅ SCIM sync completed successfully!
   - 8 users synced
   - 57 org units synced
```

### Step 4: Implement Approval Logic

Now you can query **local database** for approvals:

Create `ofm/src/lib/server/approval/resolver.ts`:

```typescript
/**
 * Approval Resolver
 * Determines approvers for requests using LOCAL database
 */

import { getDB } from '$lib/server/db/mongodb';
import { ObjectId } from 'mongodb';

/**
 * Get approver for a transportation request
 * Finds the manager of employee's org unit
 */
export async function getApproverForRequest(requestId: string) {
	const db = getDB();

	// Get the request
	const request = await db.collection('transportationRequests').findOne({
		_id: new ObjectId(requestId)
	});

	if (!request) throw new Error('Request not found');

	// Get the employee who made the request
	const employee = await db.collection('users').findOne({
		userId: request.userId
	});

	if (!employee || !employee.departmentId) {
		throw new Error('Employee or department not found');
	}

	// Get the org unit
	const orgUnit = await db.collection('organizationalUnits').findOne({
		_id: new ObjectId(employee.departmentId)
	});

	if (!orgUnit || !orgUnit.managerId) {
		throw new Error('Org unit manager not found');
	}

	// Get the manager (LOCAL QUERY - no SSO call!)
	const manager = await db.collection('users').findOne({
		_id: new ObjectId(orgUnit.managerId)
	});

	return manager;
}

/**
 * Get teammates (same org unit)
 */
export async function getTeammates(userId: string) {
	const db = getDB();

	// Get employee
	const employee = await db.collection('users').findOne({ userId });

	if (!employee || !employee.departmentId) {
		return [];
	}

	// Find all users in same department (LOCAL QUERY)
	const teammates = await db
		.collection('users')
		.find({
			departmentId: employee.departmentId,
			userId: { $ne: userId }, // Exclude self
			isActive: true
		})
		.toArray();

	return teammates;
}

/**
 * Get escalation approver (parent unit manager)
 */
export async function getEscalationApprover(requestId: string) {
	const db = getDB();

	// Get the request
	const request = await db.collection('transportationRequests').findOne({
		_id: new ObjectId(requestId)
	});

	if (!request) throw new Error('Request not found');

	// Get employee
	const employee = await db.collection('users').findOne({
		userId: request.userId
	});

	if (!employee || !employee.departmentId) {
		throw new Error('Employee or department not found');
	}

	// Get employee's org unit
	const orgUnit = await db.collection('organizationalUnits').findOne({
		_id: new ObjectId(employee.departmentId)
	});

	if (!orgUnit || !orgUnit.parentUnitId) {
		throw new Error('Parent unit not found');
	}

	// Get parent org unit (LOCAL QUERY)
	const parentUnit = await db.collection('organizationalUnits').findOne({
		_id: new ObjectId(orgUnit.parentUnitId)
	});

	if (!parentUnit || !parentUnit.managerId) {
		throw new Error('Parent unit manager not found');
	}

	// Get parent unit manager (escalation target)
	const escalationManager = await db.collection('users').findOne({
		_id: new ObjectId(parentUnit.managerId)
	});

	return escalationManager;
}

/**
 * Check if user is manager of a unit
 */
export async function isUserManager(userId: string, unitId?: string): Promise<boolean> {
	const db = getDB();

	const query = unitId
		? { _id: new ObjectId(unitId), managerId: userId }
		: { managerId: userId };

	const unit = await db.collection('organizationalUnits').findOne(query);

	return !!unit;
}

/**
 * Get all units managed by a user
 */
export async function getUnitsUnderManagement(userId: string) {
	const db = getDB();

	const units = await db
		.collection('organizationalUnits')
		.find({ managerId: userId })
		.toArray();

	return units;
}
```

### Step 5: Use in Approval Workflow

Update your approval workflow to use the resolver:

```typescript
// ofm/src/routes/api/v1/requests/transport/+server.ts
import { getApproverForRequest } from '$lib/server/approval/resolver';

export async function POST({ request, locals }) {
	// ... create transportation request ...

	// Automatically assign approver
	const approver = await getApproverForRequest(newRequest._id.toString());

	if (approver) {
		// Send notification to approver
		await sendApprovalNotification(approver.email, newRequest);
	}

	return json({ success: true, data: newRequest });
}
```

### Step 6: Schedule Periodic Sync

Add to `ofm/package.json`:

```json
{
	"scripts": {
		"sync:scim": "bun run scripts/sync-employees-from-sso-scim.ts"
	}
}
```

Set up cron job (Linux/Mac):

```bash
# Sync every hour
0 * * * * cd /path/to/ofm && bun run sync:scim >> /var/log/ofm-scim-sync.log 2>&1

# Or sync every 6 hours
0 */6 * * * cd /path/to/ofm && bun run sync:scim >> /var/log/ofm-scim-sync.log 2>&1
```

Or use a Node.js scheduler (better for development):

```typescript
// ofm/src/lib/server/scheduler.ts
import cron from 'node-cron';
import { syncFromSCIM } from '../../scripts/sync-employees-from-sso-scim';

export function startSyncScheduler() {
	// Run every 6 hours
	cron.schedule('0 */6 * * *', async () => {
		console.log('⏰ Running scheduled SCIM sync...');
		try {
			await syncFromSCIM();
			console.log('✅ Scheduled sync completed');
		} catch (error) {
			console.error('❌ Scheduled sync failed:', error);
		}
	});

	console.log('✅ SCIM sync scheduler started (every 6 hours)');
}
```

## Testing

### 1. Test SSO SCIM Endpoints

```bash
cd sso
bun run dev # Start SSO on localhost:5173

# Test SCIM endpoints
./scripts/test-scim.sh
```

### 2. Test OFM Sync

```bash
cd ofm
bun run dev # Start OFM on localhost:5174

# Run sync
bun run sync:scim
```

### 3. Test Approval Logic

```typescript
// Test in OFM
import { getApproverForRequest, getTeammates } from '$lib/server/approval/resolver';

// Test getting approver
const approver = await getApproverForRequest('some-request-id');
console.log('Approver:', approver);

// Test getting teammates
const teammates = await getTeammates('john.doe');
console.log('Teammates:', teammates);
```

## Troubleshooting

### Error: "Authentication failed"

```bash
# Check SCIM token
echo $SCIM_TOKEN

# Test manually
curl -X GET \
  "http://localhost:5173/scim/v2/Users?count=1" \
  -H "Authorization: Bearer scim-token-12345"
```

### Error: "Manager not found"

This happens when:
1. Org unit doesn't have a manager assigned in SSO
2. Position doesn't have `isManager: true` flag

**Solution:** Check SSO data:

```bash
# Check which positions are managers
curl -X GET \
  "http://localhost:5173/scim/v2/Groups/{unit-id}" \
  -H "Authorization: Bearer scim-token-12345" | jq '.["x-orgUnit"].managerId'
```

### Error: "No parent unit"

If escalation fails, it means the org unit is at the top of hierarchy.

**Solution:** Add fallback logic:

```typescript
export async function getEscalationApprover(requestId: string) {
	// ... existing code ...

	if (!orgUnit.parentUnitId) {
		// Fallback: find global admin or super admin
		const admin = await db.collection('users').findOne({
			roleIds: { $in: ['global_admin', 'super_admin'] }
		});
		return admin;
	}

	// ... rest of code ...
}
```

## Best Practices

1. **Run initial sync** before deploying approval workflows
2. **Schedule periodic sync** (every 6-12 hours)
3. **Handle sync failures** gracefully - don't block app if SSO is down
4. **Log sync operations** for debugging
5. **Cache locally** - never query SSO directly in approval logic
6. **Monitor sync health** - alert if sync hasn't run in 24 hours
7. **Test with real data** - use actual org structure from SSO

## Benefits Recap

✅ **Automatic sync** - No manual data entry
✅ **Always up-to-date** - Org changes in SSO propagate to OFM
✅ **Fast queries** - All data local, no network calls
✅ **Smart approvals** - Auto-detect managers from hierarchy
✅ **Teammate visibility** - See who's in your team
✅ **Escalation** - Auto-escalate to parent unit manager
✅ **Single source of truth** - SSO is master for org data

## Next Steps

1. ✅ Implement sync script
2. ✅ Update database schemas
3. ✅ Test with SSO data
4. ✅ Implement approval resolver
5. ✅ Schedule periodic sync
6. 🔜 Add webhook support (real-time updates)
7. 🔜 Build sync monitoring dashboard
8. 🔜 Add conflict resolution UI

---

**Need Help?** Check `SCIM_IMPLEMENTATION.md` for full SCIM API documentation.
