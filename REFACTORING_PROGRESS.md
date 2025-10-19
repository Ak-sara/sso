# SSO Architecture Refactoring Progress

**Date Started**: 2025-10-19
**Status**: 🚧 In Progress (Backend Complete, UI Pending)

## 🎯 Refactoring Goals

1. **Unified Identity Model**: Merge Users, Employees, and Partners into single `identities` collection
2. **Cleaner Navigation**: Reorganize nav groups (Users & Access, Organisasi, Data Management, Integrasi)
3. **Smart CSV Import**: Auto-create/update identities with `isActive: true` by default
4. **NIK as Username**: Employees can login with email OR NIK
5. **Nested Navigation**: SK Penempatan as sub-item of Versi Struktur

---

## ✅ Phase 1: Backend Foundation (COMPLETED)

### 1. Unified Identity Schema (`src/lib/db/schemas.ts`)

**Created**: `IdentitySchema` - Single schema for all identity types

```typescript
{
  identityType: 'employee' | 'partner' | 'external' | 'service_account',
  username: string,  // Email or NIK
  email?: string,    // Optional
  password: string,
  isActive: boolean, // true = can login

  // Employee-specific fields (if identityType === 'employee')
  employeeId?: string,  // NIK
  orgUnitId?: string,
  positionId?: string,
  employmentType?: 'permanent' | 'pkwt' | 'outsource' | 'contract',
  employmentStatus?: 'active' | 'probation' | 'terminated' | 'resigned',
  joinDate?: Date,
  workLocation?: string,
  ...

  // Partner-specific fields (if identityType === 'partner')
  partnerType?: 'vendor' | 'contractor' | 'consultant' | 'client',
  companyName?: string,
  contractNumber?: string,
  ...
}
```

**Status**: Old schemas (User, Employee, Partner) marked as DEPRECATED

---

### 2. Identity Repository (`src/lib/db/identity-repository.ts`)

**Created**: Complete repository with all necessary methods

**Key Features**:
- ✅ Basic CRUD (create, findById, updateById, deleteById)
- ✅ Authentication (findByUsername, findByEmailOrNIK, verifyPassword)
- ✅ Query by type (findEmployees, findPartners, findExternal, findServiceAccounts)
- ✅ Pagination support (`listPaginated`)
- ✅ Employee-specific queries (findByOrgUnit, findByManager, findActiveEmployees)
- ✅ **Smart bulk upsert** for CSV/Entra ID imports
  - Preserves `isActive`, `password`, `employmentStatus` on update
  - Auto-creates new identities with `isActive: true`
- ✅ Conflict detection for imports
- ✅ Statistics methods
- ✅ Migration helpers

---

### 3. Migration Script (`src/lib/db/migrations/001-merge-to-identities.ts`)

**Created**: Automatic migration from old structure to unified model

**What it does**:
1. ✅ Creates backup of existing collections (with timestamp)
2. ✅ Migrates `users` → `identities` (adds `identityType`)
3. ✅ Merges `employees` into `identities` (links existing or creates new)
4. ✅ Migrates `partners` → `identities`
5. ✅ Updates references in OAuth collections (`userId` → `identityId`)
6. ✅ Updates audit logs (`userId` → `identityId`)
7. ✅ Creates indexes on `identities` collection
8. ✅ Comprehensive error handling and reporting

**How to run**:
```bash
bun run src/lib/db/migrations/001-merge-to-identities.ts
```

---

### 4. Seed Data (`src/lib/db/seeders/identities.ts`)

**Created**: New seeder for unified identity model

**What it seeds**:
- ✅ 1 Admin identity (employee with admin role)
  - Email: `admin@ias.co.id`
  - NIK: `IAS00001`
  - Can login with either email or NIK
- ✅ 1,500 employee identities
  - 70% with email, 30% NIK-only (realistic distribution)
  - Mix of employment types (permanent, PKWT, outsource, contract)
  - 5% inactive (terminated/resigned)
  - Random org units, positions, locations
- ✅ 2 partner identities (vendors, consultants)
- ✅ 1 external identity (auditor)

**Updated**: `src/lib/db/seeders/index.ts`
- Now uses `seedIdentities()` instead of `seedUsers()`, `seedEmployees()`, `seedPartners()`
- Creates proper indexes for `identities` collection

---

## 🚧 Phase 2: UI & Components (PENDING)

### 5. Reusable Components (TODO)

**Need to create**:
- [ ] `src/lib/components/IdentityTable.svelte` - Table component for all identity types
- [ ] `src/lib/components/SyncStatsCard.svelte` - Statistics card for sync operations
- [ ] `src/lib/components/EntraIDSyncTab.svelte` - Entra ID sync UI
- [ ] `src/lib/components/CSVSyncTab.svelte` - CSV import/export UI

---

### 6. Identities Page (TODO)

**Create**: `src/routes/(app)/identities/+page.svelte`

**Features**:
- Tabbed interface:
  - Tab 1: **Karyawan** (employees) - Show identities where `identityType === 'employee'`
  - Tab 2: **Partners** - Show `identityType === 'partner'`
  - Tab 3: **External** - Show `identityType === 'external'`
  - Tab 4: **Service Accounts** - Show `identityType === 'service_account'`
- Search, filter, pagination
- Actions: Create, edit, activate/deactivate
- Shows email/NIK, name, org unit, status

---

### 7. Unified Sync Page (TODO)

**Create**: `src/routes/(app)/sync/+page.svelte`

**Features**:
- Tabbed interface with component separation:
  - Tab 1: **Entra ID Sync** (component: `EntraIDSyncTab.svelte`)
  - Tab 2: **CSV Import/Export** (component: `CSVSyncTab.svelte`)
  - Tab 3: **API Sync** (future)
- Shared statistics dashboard
- Import preview before applying changes

---

### 8. Employee Import Service (TODO)

**Create**: `src/lib/services/employee-import.ts`

**Smart Import Logic**:
```typescript
For each row in CSV:
  1. Find existing identity by NIK
  2. IF FOUND (existing):
     - Update fields
     - PRESERVE isActive, password, employmentStatus
  3. IF NOT FOUND (new):
     - Create identity with isActive: true
     - Send welcome email with temp password
```

---

### 9. Navigation Update (TODO)

**Update**: `src/routes/(app)/+layout.svelte`

**New Structure**:
```
Dashboard (standalone)

Users & Access (renamed from Identitas)
  ├─ 🔐 Identitas

Organisasi
  ├─ 🌐 Realm/Entitas
  ├─ 🏛️ Unit Kerja/Divisi
  ├─ 🌳 Struktur Organisasi
  ├─ 📋 Versi Struktur
  │   └─ 📄 SK Penempatan (nested)
  └─ 💼 Posisi/Jabatan

Data Management (new group)
  └─ 🔄 Sync & Import

Integrasi
  ├─ 🔑 OAuth Clients
  ├─ 🔐 SCIM Clients
  └─ 📋 Audit Log (moved from standalone)
```

---

### 10. Remove Old Pages (TODO)

**Delete**:
- [ ] `src/routes/(app)/users/` → merged into `/identities`
- [ ] `src/routes/(app)/employees/` → merged into `/identities`
- [ ] `src/routes/(app)/partners/` → merged into `/identities`
- [ ] `src/routes/(app)/employees/sync/` → moved to `/sync`
- [ ] `src/routes/(app)/entraid-sync/` → merged into `/sync`
- [ ] `src/routes/(app)/sk-penempatan/` → becomes child of version detail

---

### 11. Update Workflows (TODO)

**Update**: Onboarding, Mutation, Offboarding workflows
- [ ] Use `identityRepository` instead of `userRepository` + `employeeRepository`
- [ ] Update form actions to work with unified schema
- [ ] Update validation logic

---

### 12. Update OAuth/SCIM (TODO)

**Update**: All references to use `identityId`
- [ ] OAuth authorization flow
- [ ] Token generation
- [ ] SCIM endpoints
- [ ] Audit logging

---

### 13. Documentation (TODO)

**Update**: `CLAUDE.md` with new architecture
- [ ] Document unified identity model
- [ ] Update implementation todos
- [ ] Add migration instructions
- [ ] Update test credentials

---

### 14. Testing (TODO)

**Test all workflows**:
- [ ] Run seed script with new data
- [ ] Test login with email and NIK
- [ ] Test CSV import
- [ ] Test Entra ID sync (if configured)
- [ ] Test onboarding workflow
- [ ] Test mutation/offboarding
- [ ] Verify OAuth flows still work
- [ ] Run migration on test data

---

## 📊 Progress Summary

**Completed**: 4/14 tasks (29%)

✅ **Backend Foundation** (100% complete)
- Unified schema
- Repository layer
- Migration script
- Seed data

🚧 **UI & Workflows** (0% complete)
- Components
- Pages
- Navigation
- Workflows
- Testing

---

## 🎯 Next Steps (Priority Order)

1. **Create reusable components** (IdentityTable, SyncStatsCard, sync tabs)
2. **Create `/identities` page** with tabs
3. **Update navigation** layout with new groups
4. **Create `/sync` page** with CSV import
5. **Update onboarding workflow** to use identityRepository
6. **Remove old pages** (users, employees, partners)
7. **Test end-to-end** workflows
8. **Update documentation**

---

## 🔑 Key Architectural Decisions

### Why Merge Collections?

**Before**: 3 collections with complex relationships
- `users` (SSO accounts) + `employees` (HR data) + `partners` (external)
- Required manual linking: employee.userId → user._id
- CSV import = create employee, then create user, then link

**After**: 1 collection with polymorphism
- `identities` with `identityType` field
- No manual linking needed
- CSV import = auto-create/update identity

### Why isActive: true by Default?

**Problem**:
- If new employees are inactive by default, admin must manually activate 1000s of users
- Most employees should have SSO access

**Solution**:
- New imports: `isActive: true` (can login immediately)
- Inactive employees: Admin excludes from CSV (don't import)
- Re-imports: Preserve existing `isActive` status (don't reset)

### Why Preserve Status on Re-import?

**Scenario**: Admin uploads CSV monthly with latest org chart

**Problem**:
- If we reset `isActive` and `password` on every import:
  - Employees in probation lose access
  - Temporarily disabled accounts get re-enabled
  - Everyone's password gets reset

**Solution**:
- Only update fields that changed in CSV (name, org unit, position, etc.)
- Preserve: `isActive`, `password`, `employmentStatus`, `roles`
- Admin can manually adjust these if needed

---

## 🚀 How to Use (After Completion)

### Fresh Installation
```bash
# 1. Seed database with unified model
bun run seed

# 2. Start dev server
bun run dev

# 3. Login
# Email: admin@ias.co.id
# NIK: IAS00001
# Password: password123
```

### Migrating Existing Database
```bash
# 1. Backup your database first!

# 2. Run migration
bun run src/lib/db/migrations/001-merge-to-identities.ts

# 3. Verify identities collection looks correct

# 4. Start using new UI
```

### CSV Import (After UI Complete)
```bash
# 1. Navigate to /sync
# 2. Click "CSV Import/Export" tab
# 3. Download template
# 4. Fill in: NIK, FirstName, LastName, Email, OrgUnit, Position, etc.
# 5. Upload CSV
# 6. Review preview (shows what will be created/updated)
# 7. Click "Confirm Import"
# Result: Identities auto-created with isActive: true
```

---

## 📝 Notes

- All employee data IS identity data (no separate collections)
- NIK is unique identifier (can be used as username)
- Email is optional (some employees may not have company email)
- Employees can login with either email OR NIK
- isActive: true = can login, false = account disabled
- Old schemas kept for backward compatibility during migration
- Migration creates timestamped backups for rollback safety

---

**Last Updated**: 2025-10-19
