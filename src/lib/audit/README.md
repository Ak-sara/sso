# Audit Logging System

Comprehensive audit logging for all system activities in Aksara SSO.

## Features

- ✅ **Automatic request tracking** via middleware (401/403 errors)
- ✅ **Reusable helper functions** for common operations
- ✅ **Type-safe audit actions** with TypeScript enums
- ✅ **Request metadata capture** (IP address, user agent)
- ✅ **Non-blocking** - Audit failures don't break operations
- ✅ **Comprehensive coverage** - Auth, employee lifecycle, OAuth, org management

## Quick Start

### 1. Import the logger

```typescript
import { logAuth, logEmployeeLifecycle, logOAuth } from '$lib/audit/logger';
```

### 2. Extract request metadata

In your SvelteKit route handlers:

```typescript
const ipAddress = getClientAddress();
const userAgent = request.headers.get('user-agent') || undefined;
const performedBy = locals.user?.userId?.toString() || 'system';
```

### 3. Log the action

```typescript
await logAuth('login', identity._id!.toString(), {
	ipAddress,
	userAgent,
	email: identity.email,
	username: identity.username
});
```

## Available Logging Functions

### Authentication Events

```typescript
logAuth(action, identityId, details)
```

**Actions**: `login`, `logout`, `login_failed`

**Example**:
```typescript
await logAuth('login_failed', identity._id!.toString(), {
	ipAddress,
	userAgent,
	email: identity.email,
	username: identity.username,
	reason: 'Invalid password'
});
```

---

### Employee Lifecycle Events

```typescript
logEmployeeLifecycle(action, performedBy, employeeId, details)
```

**Actions**: `employee_onboard`, `employee_mutation`, `employee_transfer`, `employee_promotion`, `employee_demotion`, `employee_offboard`

**Example**:
```typescript
await logEmployeeLifecycle(
	'employee_onboard',
	performedBy,
	data.employeeId,
	{
		employeeName: `${data.firstName} ${data.lastName}`,
		newOrgUnit: orgUnit?.name,
		newPosition: position?.name,
		effectiveDate: new Date(data.joinDate),
		ipAddress,
		userAgent,
		organizationId: data.organizationId
	}
);
```

---

### Identity Operations

```typescript
logIdentityOperation(action, identityId, targetIdentityId, details)
```

**Actions**: `create_identity`, `update_identity`, `delete_identity`, `activate_identity`, `deactivate_identity`

**Example**:
```typescript
await logIdentityOperation(
	'update_identity',
	performedBy,
	params.id,
	{
		identityType: 'employee',
		changes: updateData,
		ipAddress,
		userAgent
	}
);
```

---

### OAuth Operations

```typescript
logOAuth(action, identityId, details)
```

**Actions**: `oauth_authorize`, `oauth_token_grant`, `oauth_token_refresh`, `oauth_token_revoke`, `create_oauth_client`, `update_oauth_client`, `delete_oauth_client`, `rotate_oauth_secret`

**Example**:
```typescript
await logOAuth(
	'oauth_token_grant',
	authCode.identity_id,
	{
		clientId: validatedData.client_id,
		clientName: client.client_name,
		scope: authCode.scope,
		grantType: 'authorization_code',
		ipAddress,
		userAgent
	}
);
```

---

### Organization Operations

```typescript
logOrganizationOperation(action, performedBy, resourceId, details)
```

**Actions**: `create_organization`, `update_organization`, `delete_organization`, `create_org_unit`, `update_org_unit`, `delete_org_unit`, `create_position`, `update_position`, `delete_position`

**Example**:
```typescript
await logOrganizationOperation(
	'create_org_unit',
	performedBy,
	newUnit._id.toString(),
	{
		resourceName: newUnit.name,
		ipAddress,
		userAgent,
		organizationId: newUnit.organizationId
	}
);
```

---

### Org Structure Versioning

```typescript
logOrgStructure(action, performedBy, resourceId, details)
```

**Actions**: `create_org_version`, `update_org_version`, `publish_org_version`, `archive_org_version`, `create_sk_penempatan`, `approve_sk_penempatan`, `execute_sk_penempatan`

**Example**:
```typescript
await logOrgStructure(
	'publish_org_version',
	performedBy,
	versionId,
	{
		versionNumber: version.versionNumber,
		versionName: version.versionName,
		affectedEmployees: reassignments.length,
		ipAddress,
		userAgent,
		organizationId: version.organizationId
	}
);
```

---

### Access Control Events

```typescript
logAccessControl(action, identityId, details)
```

**Actions**: `access_granted`, `access_denied`, `permission_changed`

**Example**:
```typescript
await logAccessControl(
	'access_denied',
	identityId,
	{
		resource: event.url.pathname,
		reason: 'Forbidden',
		ipAddress,
		userAgent,
		organizationId: locals.user?.organizationId
	}
);
```

---

### Sync Operations

```typescript
logSync(action, performedBy, details)
```

**Actions**: `sync_started`, `sync_completed`, `sync_failed`

**Example**:
```typescript
await logSync(
	'sync_completed',
	performedBy,
	{
		syncType: 'entra_id_users',
		source: 'Microsoft Entra ID',
		recordsProcessed: 100,
		successCount: 95,
		failureCount: 5,
		ipAddress,
		userAgent,
		organizationId: orgId
	}
);
```

---

## Generic Logging

For custom audit events:

```typescript
await logAudit({
	identityId: performedBy,
	action: 'custom_action',
	resource: 'custom_resource',
	resourceId: 'resource-id',
	details: { custom: 'data' },
	ipAddress,
	userAgent,
	organizationId,
	status: 'success'
});
```

---

## Middleware Auto-Logging

The audit middleware in `hooks.server.ts` automatically logs:

- ❌ **401 Unauthorized** requests
- ❌ **403 Forbidden** requests
- 📝 Attaches request metadata to `event.locals.audit`

---

## Viewing Audit Logs

Navigate to `/audit` in the admin console to:

- 📊 View all audit logs with pagination
- 🔍 Search by action, user, target
- 📅 Sort by timestamp, action, user
- 🎨 Visual action icons

---

## Schema

Audit logs are stored in the `audit_logs` collection:

```typescript
{
	_id: ObjectId
	identityId: string        // Who performed the action
	action: string            // What action was performed
	resource: string          // What resource was affected
	resourceId?: string       // Specific resource ID
	details?: Record<any>     // Additional context
	ipAddress?: string        // Request IP
	userAgent?: string        // Request user agent
	organizationId?: string   // Which organization context
	timestamp: Date           // When it happened
}
```

---

## Best Practices

1. **Always log critical actions**:
   - User authentication (login, logout, failed attempts)
   - Employee lifecycle (onboard, mutation, offboard)
   - OAuth token grants
   - Configuration changes

2. **Include context**:
   - Who performed the action (`identityId`)
   - What changed (`details.changes`)
   - Why it changed (`details.reason`)
   - When it happened (automatic `timestamp`)

3. **Capture request metadata**:
   ```typescript
   const ipAddress = getClientAddress();
   const userAgent = request.headers.get('user-agent') || undefined;
   ```

4. **Use appropriate action types**:
   - Don't use generic `update` when you can be specific (`employee_promotion`)
   - Use typed actions from the enum for autocomplete

5. **Don't throw errors**:
   - Audit logging should never break the main operation
   - The `logAudit()` function catches and logs errors internally

---

## Helper Functions

### Extract Request Metadata

```typescript
import { extractRequestMetadata } from '$lib/audit/logger';

const metadata = extractRequestMetadata(event);
// { ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0...' }
```

### Get Current Identity ID

```typescript
import { getCurrentIdentityId } from '$lib/audit/logger';

const identityId = getCurrentIdentityId(locals);
```

---

## Integration Checklist

When adding a new feature, ensure audit logging is added for:

- [ ] Create operations
- [ ] Update operations
- [ ] Delete operations
- [ ] State changes (activate, deactivate, approve, etc.)
- [ ] Failed operations (validation errors, permission denied)
- [ ] Sensitive operations (password reset, secret rotation)

---

## Security Considerations

1. **PII Protection**: Audit logs may contain sensitive data
   - Never log passwords or secrets
   - Hash sensitive identifiers if needed
   - Apply data retention policies

2. **Access Control**: Only authorized users should view audit logs
   - Implement role-based access to `/audit`
   - Consider separate admin-only audit viewer

3. **Immutability**: Audit logs should never be modified
   - Consider write-once storage
   - Implement log signing/verification (future)

---

## Performance

- Audit logging is **non-blocking** - uses async without await in critical paths
- Database writes are batched where possible
- Consider archiving old logs (>90 days) to a separate collection

---

## Future Enhancements

- [ ] Real-time audit log streaming (WebSocket)
- [ ] Advanced filtering (date ranges, multiple actions)
- [ ] Export to CSV/JSON
- [ ] Integration with SIEM systems
- [ ] Anomaly detection (suspicious login patterns)
- [ ] Audit log signing/verification
