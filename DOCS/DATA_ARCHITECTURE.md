# Aksara SSO - Data Architecture

> **Last Updated**: November 2025
> **Schema Version**: 2.0 (Unified Identity Model)

---

## Overview

Aksara SSO uses a **unified identity model** where all user types (employees, partners, external users, service accounts) are stored in a single polymorphic `identities` collection. This design provides flexibility, simplifies queries, and maintains a single source of truth for authentication.

---

## Core Collections

### 1. identities (Unified Identity Collection)

**Purpose**: Single collection for all user types with polymorphic schema

**Key Fields**:
```typescript
{
  _id: ObjectId,
  identityType: 'employee' | 'partner' | 'external' | 'service_account',

  // Common fields (all identity types)
  email: string,
  username: string (optional),
  password: string (hashed with Argon2),
  isActive: boolean,
  roles: string[],
  createdAt: Date,
  updatedAt: Date,

  // Employee-specific (when identityType === 'employee')
  employee: {
    employeeId: string (NIK),          // 🔴 SENSITIVE
    firstName: string,
    lastName: string,
    dateOfBirth: Date,                 // 🔴 SENSITIVE
    idNumber: string (KTP),            // 🔴 SENSITIVE - Should be encrypted
    taxId: string (NPWP),              // 🔴 SENSITIVE - Should be encrypted
    phone: string,                     // 🔴 SENSITIVE
    personalEmail: string,
    joinDate: Date,
    employmentType: 'permanent' | 'PKWT' | 'OS',
    employmentStatus: 'active' | 'inactive' | 'terminated',
    organizationId: ObjectId,          // → organizations
    orgUnitId: ObjectId,               // → org_units
    positionId: ObjectId,              // → positions
    managerId: ObjectId (optional),    // → identities (self-reference)
    location: string
  },

  // Partner-specific (when identityType === 'partner')
  partner: {
    companyName: string,
    companyId: string,
    contractStartDate: Date,
    contractEndDate: Date,
    partnerType: string,
    contactPerson: string,
    contactPhone: string
  },

  // External user-specific (when identityType === 'external')
  external: {
    accessLevel: string,
    expiryDate: Date,
    sponsorId: ObjectId,               // → identities (who granted access)
    purpose: string
  },

  // Service account-specific (when identityType === 'service_account')
  serviceAccount: {
    oauthClientId: ObjectId,           // → oauth_clients
    scopes: string[],
    apiKeyHash: string
  }
}
```

**Indexes**:
- `{ email: 1 }` - unique
- `{ username: 1 }` - unique, sparse
- `{ 'employee.employeeId': 1 }` - unique, sparse
- `{ identityType: 1, isActive: 1 }`
- `{ 'employee.orgUnitId': 1 }`
- `{ 'employee.positionId': 1 }`

---

### 2. organizations

**Purpose**: Top-level organizational entities (realms)

**Key Fields**:
```typescript
{
  _id: ObjectId,
  code: string (unique),
  name: string,
  parentId: ObjectId (optional),       // → organizations (for subsidiaries)
  realm: string,
  isActive: boolean,
  createdAt: Date
}
```

**Relationships**:
- Self-referencing for hierarchies (Holding → Subsidiaries)
- Referenced by `identities.employee.organizationId`
- Referenced by `org_units.organizationId`

---

### 3. org_units

**Purpose**: Organizational units within entities (Direktorat, Divisi, Departemen, etc.)

**Key Fields**:
```typescript
{
  _id: ObjectId,
  code: string (unique),
  name: string,
  organizationId: ObjectId,            // → organizations
  parentId: ObjectId (optional),       // → org_units (for hierarchy)
  type: 'holding' | 'directorate' | 'division' | 'department' | 'section',
  level: number (calculated),
  sortOrder: number (calculated),
  managerId: ObjectId (optional),      // → identities
  description: string,
  isActive: boolean,
  createdAt: Date
}
```

**Indexes**:
- `{ code: 1 }` - unique
- `{ organizationId: 1, parentId: 1 }`
- `{ managerId: 1 }`

**Hierarchical Structure**:
```
Holding Company
├── Directorate 1
│   ├── Division 1A
│   │   ├── Department 1A1
│   │   └── Department 1A2
│   └── Division 1B
└── Directorate 2
```

---

### 4. positions

**Purpose**: Job positions/titles

**Key Fields**:
```typescript
{
  _id: ObjectId,
  code: string (unique),
  title: string,
  level: number,
  isManager: boolean,
  description: string,
  organizationId: ObjectId,            // → organizations
  isActive: boolean
}
```

**Relationships**:
- Referenced by `identities.employee.positionId`

---

### 5. oauth_clients

**Purpose**: OAuth 2.0 client applications

**Key Fields**:
```typescript
{
  _id: ObjectId,
  clientId: string (unique),
  clientSecret: string (hashed),
  name: string,
  redirectUris: string[],
  allowedScopes: string[],
  serviceAccountId: ObjectId,          // → identities (auto-created)
  isActive: boolean
}
```

**Relationships**:
- Has one-to-one relationship with service account identity
- Each OAuth client automatically gets a linked service account

---

### 6. scim_clients

**Purpose**: SCIM 2.0 client configuration

**Key Fields**:
```typescript
{
  _id: ObjectId,
  name: string,
  clientId: string (unique),
  clientSecret: string (hashed with Argon2),
  scopes: string[],
  ipWhitelist: string[] (CIDR notation),
  rateLimit: number (requests per minute),
  isActive: boolean,
  createdAt: Date
}
```

---

### 7. org_structure_versions

**Purpose**: Snapshot-based versioning of organizational structure

**Key Fields**:
```typescript
{
  _id: ObjectId,
  versionNumber: number,
  name: string,
  skNumber: string (Surat Keputusan number),
  skDate: Date,
  effectiveDate: Date,
  status: 'draft' | 'active' | 'archived',
  publishStatus: 'unpublished' | 'publishing' | 'published' | 'failed',
  publishProgress: {
    current: number,
    total: number,
    message: string
  },
  structure: {
    // Frozen snapshot of org_units at this version
    orgUnits: Array<OrgUnit>,
    positions: Array<Position>
  },
  employeeSnapshot: Array<{
    identityId: ObjectId,              // → identities
    nik: string,
    name: string,
    positionId: ObjectId,
    orgUnitId: ObjectId
  }>,
  createdBy: ObjectId,                 // → identities
  createdAt: Date
}
```

**Relationships**:
- Contains frozen snapshot of org_units and positions
- References `identities` for employee snapshot

---

### 8. sk_penempatan

**Purpose**: Employee assignment decrees (bulk reassignments)

**Key Fields**:
```typescript
{
  _id: ObjectId,
  skNumber: string,
  skDate: Date,
  effectiveDate: Date,
  status: 'draft' | 'pending_approval' | 'approved' | 'executed',
  assignments: Array<{
    identityId: ObjectId,              // → identities
    previousOrgUnitId: ObjectId,
    previousPositionId: ObjectId,
    newOrgUnitId: ObjectId,
    newPositionId: ObjectId,
    notes: string
  }>,
  createdBy: ObjectId,
  executedAt: Date
}
```

---

### 9. audit_logs

**Purpose**: Comprehensive audit trail

**Key Fields**:
```typescript
{
  _id: ObjectId,
  action: string,
  identityId: ObjectId (optional),     // → identities (who performed action)
  targetId: ObjectId (optional),       // → various collections
  targetType: string,
  changes: {
    before: object,
    after: object
  },
  metadata: {
    ipAddress: string,
    userAgent: string,
    requestId: string
  },
  timestamp: Date
}
```

**Logged Events**:
- Authentication (login, logout, failures)
- Employee lifecycle (onboarding, mutation, offboarding)
- OAuth operations (token grants, refresh)
- Identity operations (create, update, delete)
- Organization management (CRUD)
- SCIM API requests

---

### 10. sessions

**Purpose**: User session management

**Key Fields**:
```typescript
{
  _id: string (session ID),
  identityId: ObjectId,                // → identities
  expiresAt: Date,
  data: object,
  createdAt: Date
}
```

**Session Duration**:
- 24-hour session duration
- 2-hour idle timeout
- HttpOnly secure cookies

---

## Entity Relationships

### Core Relationship Diagram

```
┌──────────────┐
│ identities   │ (Polymorphic: employee, partner, external, service_account)
└───────┬──────┘
        │
        ├─────── employee.organizationId ──→ organizations
        ├─────── employee.orgUnitId ──────→ org_units
        ├─────── employee.positionId ─────→ positions
        ├─────── employee.managerId ──────→ identities (self-reference)
        ├─────── serviceAccount.oauthClientId ──→ oauth_clients
        └─────── partner.*, external.*, (type-specific fields)

┌──────────────┐
│ org_units    │
└───────┬──────┘
        ├─────── organizationId ──→ organizations
        ├─────── parentId ─────────→ org_units (self-reference)
        └─────── managerId ────────→ identities

┌──────────────┐
│ oauth_clients│
└───────┬──────┘
        └─────── serviceAccountId ─→ identities (type: service_account)

┌──────────────────────────┐
│ org_structure_versions   │
└───────┬──────────────────┘
        └─────── employeeSnapshot[].identityId ──→ identities

┌──────────────┐
│ sk_penempatan│
└───────┬──────┘
        ├─────── assignments[].identityId ──→ identities
        └─────── createdBy ────────────────→ identities

┌──────────────┐
│ audit_logs   │
└───────┬──────┘
        ├─────── identityId ──────→ identities
        └─────── targetId ────────→ various collections

┌──────────────┐
│ sessions     │
└───────┬──────┘
        └─────── identityId ──────→ identities
```

---

## Query Patterns

### 1. Find All Employees in an Org Unit

```typescript
const employees = await db.collection('identities').find({
  identityType: 'employee',
  'employee.orgUnitId': orgUnitId,
  isActive: true
}).toArray();
```

### 2. Find Manager of an Employee

```typescript
const employee = await db.collection('identities').findOne({
  _id: employeeId,
  identityType: 'employee'
});

const manager = await db.collection('identities').findOne({
  _id: employee.employee.managerId
});
```

### 3. Find All Team Members (Same Org Unit)

```typescript
const employee = await db.collection('identities').findOne({ _id: employeeId });

const teamMembers = await db.collection('identities').find({
  identityType: 'employee',
  'employee.orgUnitId': employee.employee.orgUnitId,
  isActive: true
}).toArray();
```

### 4. Authenticate User (Multi-Login Support)

```typescript
// Can login with email, username, or NIK (employeeId)
const identity = await db.collection('identities').findOne({
  $or: [
    { email: loginInput },
    { username: loginInput },
    { 'employee.employeeId': loginInput }
  ],
  isActive: true
});
```

### 5. Find Service Account for OAuth Client

```typescript
const client = await db.collection('oauth_clients').findOne({ clientId });
const serviceAccount = await db.collection('identities').findOne({
  _id: client.serviceAccountId,
  identityType: 'service_account'
});
```

---

## Data Migration Notes

### From Old Schema to Unified Identity Model

The system previously used three separate collections:
- `users` (authentication only)
- `employees` (employee data)
- `partners` (partner data)

**Migration completed**: October 2025

**Changes**:
1. ✅ Merged `users`, `employees`, `partners` → `identities`
2. ✅ Added `identityType` discriminator field
3. ✅ Created nested objects for type-specific fields (`employee`, `partner`, etc.)
4. ✅ Updated all queries to use unified collection
5. ✅ Updated SCIM endpoints to query `identities`
6. ✅ Updated authentication to support multi-login (email, username, NIK)

---

## Security Considerations

### Sensitive Fields (Require Encryption)

Fields marked with 🔴 should be encrypted using MongoDB Field-Level Encryption:
- `employee.idNumber` (KTP)
- `employee.taxId` (NPWP)
- `employee.dateOfBirth`
- `employee.phone`

**Status**: ⏳ Planned (Phase 1: Security & Compliance)

### Data Masking

Sensitive fields should be masked in UI:
- KTP: `3174************12` (show first 4 and last 2)
- NPWP: `31.***.***.***-123` (show first 2 and last 3)
- Phone: `+6281*****89` (show first 4 and last 2)
- Email: `jo***@example.com` (show first 2 chars)

**Status**: ⏳ Planned (Phase 1: Security & Compliance)

---

## Schema Evolution

**Current Version**: 2.0 (Unified Identity Model)

**Version History**:
- **v1.0** (Sep 2025): Separate users, employees, partners collections
- **v2.0** (Oct 2025): Unified identities collection with polymorphic schema

**Future Considerations**:
- Add `employee.secondaryManagers` for matrix reporting (Phase 3)
- Add `employee.secondaryAssignments` for multi-company placement
- Extend `external` type for contractor management
- Add `employee.certifications` array for skills tracking

---

## CSV Seeding

All collections can be seeded from CSV files in `scripts/seeders/`:
- `identities.csv` - All identity types
- `organizations.csv`
- `org_units.csv`
- `positions.csv`
- `oauth_clients.csv`
- `scim_clients.csv`

**Key Features**:
- Human-readable references (use codes/names instead of ObjectIds)
- Automatic reference resolution during import
- Dependency-aware import order
- Version-controlled seed data

**Commands**:
```bash
bun run db:seed              # Import all CSVs
bun run db:seed --clean      # Drop and re-import
bun run db:export            # Export to CSV
```

---

## Performance Optimization

### Recommended Indexes

1. **identities**:
   - `{ email: 1 }` - unique (login)
   - `{ username: 1 }` - unique, sparse (login)
   - `{ 'employee.employeeId': 1 }` - unique, sparse (login with NIK)
   - `{ identityType: 1, isActive: 1 }` - filtering
   - `{ 'employee.orgUnitId': 1 }` - org queries
   - `{ 'employee.positionId': 1 }` - position queries
   - `{ 'employee.managerId': 1 }` - manager lookup

2. **org_units**:
   - `{ code: 1 }` - unique
   - `{ organizationId: 1, parentId: 1 }` - hierarchy queries
   - `{ managerId: 1 }` - manager lookup

3. **audit_logs**:
   - `{ identityId: 1, timestamp: -1 }` - user activity
   - `{ action: 1, timestamp: -1 }` - event filtering
   - `{ timestamp: -1 }` - chronological queries

4. **sessions**:
   - `{ expiresAt: 1 }` - TTL index for automatic cleanup

### Query Performance Tips

1. Use projection to limit returned fields
2. Leverage compound indexes for multi-field queries
3. Use `$lookup` sparingly (pre-load references if possible)
4. Index fields used in `$match` stages
5. Consider denormalization for frequently accessed data

---

## Related Documentation

- `_DEV_GUIDE.md` - Feature roadmap and implementation plan
- `AUTHENTICATION_GUIDE.md` - Authentication flow details
- `EMPLOYEE_MANAGEMENT.md` - Employee lifecycle workflows
- `SCIM_COMPLETE_GUIDE.md` - SCIM 2.0 API documentation
- `SECURITY_IMPLEMENTATION_GUIDE.md` - Field-level encryption implementation

---

**Document Version**: 2.0
**Last Updated**: November 2025
**Status**: ✅ Current and Accurate
