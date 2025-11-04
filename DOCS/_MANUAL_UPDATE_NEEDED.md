# 📝 Documentation Manual Updates Needed

This file lists documentation that needs manual review and updates to reflect current architecture.

---

## Files Requiring Manual Updates

### 1. **DATA_ARCHITECTURE_AND_RELATIONSHIPS.md**

**Issue:** Shows old schema with separate `users`, `employees`, `partners` collections

**Current Reality:** We now have unified `identities` collection

**Updates Needed:**
- [ ] Replace collection references:
  - `users` collection → `identities` collection (where `identityType: 'employee' | 'partner' | 'external' | 'service_account'`)
  - `employees` collection → Part of `identities` with `identityType: 'employee'`
  - `partners` collection → Part of `identities` with `identityType: 'partner'`
- [ ] Update schema diagrams to show unified identity model
- [ ] Add explanation of polymorphic identity schema
- [ ] Update relationship diagrams (org_units → identities, positions → identities)

**Key Changes:**
```
OLD:
- users (email, username, password)
- employees (userId, orgUnitId, positionId, employeeId)
- partners (userId, companyId, contractInfo)

NEW:
- identities (identityType, email, username, password, employee{...}, partner{...})
  - When identityType='employee': has employee.orgUnitId, employee.positionId, employee.employeeId
  - When identityType='partner': has partner.companyId, partner.contractInfo
  - When identityType='service_account': linked to OAuth clients
```

---

### 2. **EMPLOYEE_MANAGEMENT.md**

**Issue:** References old `employees` collection

**Current Reality:** Employees are in `identities` collection with `identityType: 'employee'`

**Updates Needed:**
- [ ] Replace all `employees` collection references with `identities`
- [ ] Add filter examples: `{ identityType: 'employee' }`
- [ ] Update query examples:
  ```typescript
  // OLD
  db.collection('employees').find({ isActive: true })

  // NEW
  db.collection('identities').find({ identityType: 'employee', isActive: true })
  ```
- [ ] Update schema field references:
  - `employeeId` is now at top-level or in `employee.employeeId`
  - `orgUnitId` is now at top-level or in `employee.orgUnitId`
  - `positionId` is now at top-level or in `employee.positionId`
- [ ] Update onboarding/mutation/offboarding workflows to use identity model

---

### 3. **USER_MANAGEMENT_GUIDE.md**

**Issue:** References old `users` collection for SSO accounts

**Current Reality:** SSO users are in `identities` collection

**Updates Needed:**
- [ ] Replace `users` collection references with `identities`
- [ ] Explain that users can be:
  - Regular users (identityType: 'employee' or 'partner')
  - Service accounts (identityType: 'service_account')
  - External users (identityType: 'external')
- [ ] Update authentication flow to query identities
- [ ] Update role-based access control examples
- [ ] Update user profile management to use identity schema

---

### 4. **SUMMARY_DATA_PRIVACY_COMPLIANCE.md**

**Issue:** May reference old collections in data retention policies

**Updates Needed:**
- [ ] Review data retention policies for identities collection
- [ ] Update GDPR data export to include all identity types
- [ ] Update data deletion procedures to handle polymorphic identities
- [ ] Ensure personal data mapping reflects unified schema

---

## Auto-Fixed Files ✅

These files have been automatically updated:

1. **SCIM Documentation (4 files)**
   - ✅ `unitType` → `type`
   - ✅ `organizationalUnits` → `org_units`
   - Files updated:
     - OFM_SCIM_INTEGRATION_GUIDE.md
     - SCIM_COMPLETE_GUIDE.md
     - SCIM_IMPLEMENTATION.md
     - SCIM_INDUSTRY_COMPARISON.md

---

## Deleted Files ✅

These obsolete files have been removed:

1. ✅ **STO_DATA_FIX_GUIDE.md** - Temporary troubleshooting guide
2. ✅ **CSV_IMPORT_ENHANCEMENTS.md** - Implementation completed

---

## Files Still Relevant (No Changes Needed) ✅

- DEPLOYMENT_GUIDE.md
- ENTRAID_SYNC_IMPLEMENTATION.md
- KEBIJAKAN_PRIVASI_TEMPLATE.md
- ORG_VERSIONING_REDESIGN_PLAN.md
- REALM_CONCEPT.md
- SCHEMA_EVOLUTION.md
- SECURITY_IMPLEMENTATION_GUIDE.md
- SSO_ADMIN_GUIDE.md
- SSO_CLIENT_GUIDE.md
- example_org_structure.md

---

## Next Steps

1. Review each file listed above
2. Make updates according to the guidelines
3. Test code examples to ensure they work with current schema
4. Delete this file once all updates are complete

**Priority Order:**
1. DATA_ARCHITECTURE_AND_RELATIONSHIPS.md (most critical - shows overall schema)
2. EMPLOYEE_MANAGEMENT.md (frequently referenced)
3. USER_MANAGEMENT_GUIDE.md
4. SUMMARY_DATA_PRIVACY_COMPLIANCE.md (compliance-critical)
