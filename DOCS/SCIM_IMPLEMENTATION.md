# SCIM 2.0 Implementation Guide

## Overview

Aksara SSO now implements **SCIM 2.0** (System for Cross-domain Identity Management) protocol to enable automated provisioning and synchronization of users and organizational units to connected applications like OFM.

## What is SCIM?

SCIM is an industry-standard REST API protocol for managing user identities and groups across systems. It enables:

- **Automatic user provisioning** - Create users in target apps when onboarded in SSO
- **Deprovisioning** - Deactivate users in apps when offboarded
- **Organizational sync** - Keep org structure (units, hierarchy, managers) in sync
- **Single source of truth** - SSO becomes the master for identity data

## Architecture

```
┌─────────────────────────────────────┐
│   Aksara SSO (Identity Provider)    │
│                                      │
│   ┌──────────────────────────────┐  │
│   │  SCIM 2.0 API                │  │
│   │  /scim/v2/Users              │  │
│   │  /scim/v2/Groups             │  │
│   └──────────┬───────────────────┘  │
│              │                       │
└──────────────┼───────────────────────┘
               │
               │ SCIM HTTP Requests
               │ (Bearer Token Auth)
               │
┌──────────────▼───────────────────────┐
│   Consumer Apps (OFM, etc)           │
│                                      │
│   - Sync users periodically          │
│   - Sync org units                   │
│   - Store locally for queries        │
│   - Use local data for approvals     │
└──────────────────────────────────────┘
```

## SCIM Endpoints

### Authentication

All SCIM endpoints require **Bearer token authentication**:

```bash
Authorization: Bearer scim-token-12345
```

**Default token:** `scim-token-12345` (change via `SCIM_BEARER_TOKEN` env var)

### Users Endpoints

#### 1. List Users

```http
GET /scim/v2/Users?startIndex=1&count=100
```

**Response:**

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
  "totalResults": 8,
  "startIndex": 1,
  "itemsPerPage": 8,
  "Resources": [
    {
      "schemas": [
        "urn:ietf:params:scim:schemas:core:2.0:User",
        "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"
      ],
      "id": "507f1f77bcf86cd799439011",
      "externalId": "EMP-001",
      "userName": "john.doe@ias.co.id",
      "name": {
        "givenName": "John",
        "familyName": "Doe",
        "formatted": "John Doe"
      },
      "displayName": "John Doe",
      "active": true,
      "emails": [
        {
          "value": "john.doe@ias.co.id",
          "primary": true,
          "type": "work"
        }
      ],
      "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
        "employeeNumber": "EMP-001",
        "department": "507f1f77bcf86cd799439012",
        "manager": {
          "value": "507f1f77bcf86cd799439015",
          "$ref": "http://localhost:5173/scim/v2/Users/507f1f77bcf86cd799439015"
        }
      },
      "x-position": {
        "id": "507f1f77bcf86cd799439020",
        "name": "Senior Analyst",
        "isManager": false,
        "level": 3
      },
      "x-orgUnit": {
        "id": "507f1f77bcf86cd799439012",
        "name": "IAS - Finance Division"
      },
      "meta": {
        "resourceType": "User",
        "created": "2025-10-15T10:00:00.000Z",
        "lastModified": "2025-10-15T10:00:00.000Z",
        "location": "http://localhost:5173/scim/v2/Users/507f1f77bcf86cd799439011"
      }
    }
  ]
}
```

**Filtering:**

```http
GET /scim/v2/Users?filter=active eq "true"
GET /scim/v2/Users?filter=userName eq "john.doe@ias.co.id"
```

#### 2. Get Single User

```http
GET /scim/v2/Users/{id}
```

#### 3. Create User

```http
POST /scim/v2/Users
Content-Type: application/scim+json

{
  "schemas": [
    "urn:ietf:params:scim:schemas:core:2.0:User",
    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"
  ],
  "userName": "jane.smith@ias.co.id",
  "name": {
    "givenName": "Jane",
    "familyName": "Smith"
  },
  "active": true,
  "emails": [
    {
      "value": "jane.smith@ias.co.id",
      "primary": true
    }
  ]
}
```

#### 4. Update User (PUT - full replacement)

```http
PUT /scim/v2/Users/{id}
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "jane.smith@ias.co.id",
  "name": {
    "givenName": "Jane",
    "familyName": "Smith-Updated"
  },
  "active": true
}
```

#### 5. Patch User (partial update)

```http
PATCH /scim/v2/Users/{id}
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "path": "active",
      "value": false
    }
  ]
}
```

#### 6. Delete User (deactivate)

```http
DELETE /scim/v2/Users/{id}
```

**Note:** This sets employee status to "terminated", not hard delete.

### Groups Endpoints (Organizational Units)

#### 1. List Groups

```http
GET /scim/v2/Groups?startIndex=1&count=100
```

**Response:**

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
  "totalResults": 57,
  "startIndex": 1,
  "itemsPerPage": 57,
  "Resources": [
    {
      "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
      "id": "507f1f77bcf86cd799439012",
      "externalId": "OU-015",
      "displayName": "IAS - Finance Division",
      "members": [
        {
          "value": "507f1f77bcf86cd799439011",
          "$ref": "/scim/v2/Users/507f1f77bcf86cd799439011",
          "type": "User",
          "display": "John Doe"
        },
        {
          "value": "507f1f77bcf86cd799439015",
          "$ref": "/scim/v2/Users/507f1f77bcf86cd799439015",
          "type": "User",
          "display": "Jane Smith"
        }
      ],
      "x-orgUnit": {
        "unitType": "division",
        "level": 3,
        "parentUnitId": "507f1f77bcf86cd799439003",
        "managerId": "507f1f77bcf86cd799439015"
      },
      "meta": {
        "resourceType": "Group",
        "created": "2025-10-15T10:00:00.000Z",
        "lastModified": "2025-10-15T10:00:00.000Z",
        "location": "http://localhost:5173/scim/v2/Groups/507f1f77bcf86cd799439012"
      }
    }
  ]
}
```

#### 2. Get Single Group

```http
GET /scim/v2/Groups/{id}
```

#### 3. Create Group

```http
POST /scim/v2/Groups
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
  "displayName": "New Department",
  "x-orgUnit": {
    "unitType": "department",
    "level": 4,
    "parentUnitId": "507f1f77bcf86cd799439012"
  }
}
```

#### 4. Update Group (PUT)

```http
PUT /scim/v2/Groups/{id}
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
  "displayName": "Updated Department Name"
}
```

#### 5. Patch Group

```http
PATCH /scim/v2/Groups/{id}
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "path": "displayName",
      "value": "New Name"
    }
  ]
}
```

#### 6. Delete Group

```http
DELETE /scim/v2/Groups/{id}
```

## Custom Extensions

### x-position (User attribute)

Provides employee position information:

```json
{
  "x-position": {
    "id": "507f1f77bcf86cd799439020",
    "name": "Senior Analyst",
    "isManager": false,
    "level": 3
  }
}
```

### x-orgUnit (Group attribute)

Provides organizational unit metadata:

```json
{
  "x-orgUnit": {
    "unitType": "division",
    "level": 3,
    "parentUnitId": "507f1f77bcf86cd799439003",
    "managerId": "507f1f77bcf86cd799439015"
  }
}
```

## How Consumer Apps Use SCIM

### Example: OFM App Integration

#### 1. Initial Sync (Full Import)

```typescript
// ofm/scripts/sync-from-sso-scim.ts
async function fullSync() {
  // Sync all users
  const usersResponse = await fetch('http://localhost:5173/scim/v2/Users?count=1000', {
    headers: { 'Authorization': 'Bearer scim-token-12345' }
  });
  const usersData = await usersResponse.json();

  for (const user of usersData.Resources) {
    await db.collection('users').updateOne(
      { ssoUserId: user.id },
      {
        $set: {
          email: user.emails[0].value,
          firstName: user.name.givenName,
          lastName: user.name.familyName,
          departmentId: user['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'].department,
          managerId: user['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'].manager?.value,
          positionId: user['x-position']?.id,
          isActive: user.active,
          syncedAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  // Sync all org units
  const groupsResponse = await fetch('http://localhost:5173/scim/v2/Groups?count=1000', {
    headers: { 'Authorization': 'Bearer scim-token-12345' }
  });
  const groupsData = await groupsResponse.json();

  for (const group of groupsData.Resources) {
    await db.collection('organizationalUnits').updateOne(
      { _id: new ObjectId(group.id) },
      {
        $set: {
          unitName: group.displayName,
          unitType: group['x-orgUnit'].unitType,
          level: group['x-orgUnit'].level,
          parentUnitId: group['x-orgUnit'].parentUnitId,
          managerId: group['x-orgUnit'].managerId,
          syncedAt: new Date()
        }
      },
      { upsert: true }
    );
  }
}
```

#### 2. Using Local Data for Approvals

```typescript
// ofm/src/lib/server/approval/resolver.ts
export async function getApproverForRequest(requestId: string) {
  const request = await db.collection('transportationRequests').findOne({ _id: new ObjectId(requestId) });
  const employee = await db.collection('users').findOne({ userId: request.userId });

  // Find manager of employee's unit (LOCAL QUERY - no need to call SSO)
  const unit = await db.collection('organizationalUnits').findOne({ _id: new ObjectId(employee.departmentId) });
  const manager = await db.collection('users').findOne({ _id: new ObjectId(unit.managerId) });

  return manager;
}

export async function getTeammates(userId: string) {
  const employee = await db.collection('users').findOne({ userId });

  // Find all users in same unit (LOCAL QUERY)
  const teammates = await db.collection('users').find({
    departmentId: employee.departmentId,
    userId: { $ne: userId }
  }).toArray();

  return teammates;
}
```

## Testing

### Run Test Script

```bash
# Make sure SSO server is running on localhost:5173
bun run dev

# In another terminal
./scripts/test-scim.sh
```

### Manual Testing with curl

```bash
# List users
curl -X GET \
  "http://localhost:5173/scim/v2/Users?count=10" \
  -H "Authorization: Bearer scim-token-12345" \
  -H "Content-Type: application/scim+json"

# Get single user
curl -X GET \
  "http://localhost:5173/scim/v2/Users/67102e3c8d97e2e4b8a8e85e" \
  -H "Authorization: Bearer scim-token-12345"

# List groups
curl -X GET \
  "http://localhost:5173/scim/v2/Groups?count=10" \
  -H "Authorization: Bearer scim-token-12345"
```

## Security Considerations

### Bearer Token Management

**Current Implementation (Development):**
- Static token: `scim-token-12345`
- Stored in code and env var

**Production Recommendations:**
1. ✅ Store tokens in database with expiry
2. ✅ Generate unique token per client application
3. ✅ Implement token rotation
4. ✅ Add IP whitelisting
5. ✅ Rate limiting per token
6. ✅ Audit logging of all SCIM operations

### Data Privacy

- SCIM exposes employee data - ensure proper authorization
- Use HTTPS in production
- Implement field-level permissions if needed
- Log all access for compliance

## Implementation Checklist

- [x] SCIM 2.0 schemas and types
- [x] Bearer token authentication
- [x] GET /scim/v2/Users (list with pagination)
- [x] GET /scim/v2/Users/{id}
- [x] POST /scim/v2/Users (create)
- [x] PUT /scim/v2/Users/{id} (full update)
- [x] PATCH /scim/v2/Users/{id} (partial update)
- [x] DELETE /scim/v2/Users/{id}
- [x] GET /scim/v2/Groups (list with pagination)
- [x] GET /scim/v2/Groups/{id}
- [x] POST /scim/v2/Groups (create)
- [x] PUT /scim/v2/Groups/{id}
- [x] PATCH /scim/v2/Groups/{id}
- [x] DELETE /scim/v2/Groups/{id}
- [x] Manager lookup utility
- [x] Team member lookup utility
- [x] Filter support (basic)
- [x] Pagination support
- [x] Error responses (SCIM format)
- [x] Test script
- [ ] Webhooks for real-time sync (future)
- [ ] Advanced filter parser (future)
- [ ] Token management UI (future)

## Next Steps

1. **Implement OFM Sync** - Create sync script in OFM project
2. **Scheduled Sync** - Set up cron job for periodic sync
3. **Webhooks** - Add webhook notifications for real-time updates
4. **Token Management UI** - Admin page to generate/revoke SCIM tokens
5. **Advanced Filtering** - Full SCIM filter expression support
6. **Bulk Operations** - SCIM bulk endpoints for efficiency

## References

- [RFC 7643 - SCIM Core Schema](https://tools.ietf.org/html/rfc7643)
- [RFC 7644 - SCIM Protocol](https://tools.ietf.org/html/rfc7644)
- [SCIM 2.0 Specification](http://www.simplecloud.info/)

---

**Last Updated:** 2025-10-18
**Status:** ✅ Implemented and Ready for Testing
