# Employee Management Features

## Overview

Aksara SSO now includes comprehensive employee lifecycle management with workflows that reflect real-world HR operations. This document describes the employee management features implemented to address the user's request for "down to earth logic" that shows employees in their full organizational context.

## Key Principle: Context-First Design

Unlike simple CRUD interfaces, every employee management page shows the employee's **full organizational context**:
- **Entity/Realm** (e.g., "IAS - Injourney Aviation Service")
- **Unit Kerja/Divisi** (e.g., "Cargo Service")
- **Position/Jabatan** (e.g., "Manager")
- **Work Location** (e.g., "CGK - Jakarta")
- **SSO Account Status** (linked or not)

This ensures HR admins always understand WHERE an employee is placed and WHAT access they have.

---

## 1. Employee Detail Page

**Route:** `/employees/[id]`
**File:** `src/routes/(app)/employees/[id]/+page.svelte`

### Four-Tab Interface

#### Tab 1: Overview
- Personal information (name, email, phone, gender, DOB)
- Employment status with color-coded badges:
  - 🟢 Green: Permanent
  - 🟡 Yellow: PKWT (contract)
  - ⚪ Gray: OS (outsource)
- Join date, probation period, contract end date
- Employment status (Active, Probation, Terminated)

#### Tab 2: Penempatan (Assignment)
- **Primary Assignment** in blue highlight box:
  - Realm/Entitas
  - Unit Kerja/Divisi
  - Position/Jabatan
  - Work Location
  - Regional assignment
- **Secondary Assignments** (for multi-company placement):
  - List of additional assignments to other entities/units
  - Start and end dates for each assignment

#### Tab 3: SSO Access
- Shows linked SSO account if exists:
  - Username
  - Email
  - Roles (badges)
  - Account status (Enabled/Disabled)
  - Email verification status
- **Actions:**
  - Create SSO Account (if not linked)
  - Revoke Access (disable account)
  - Reset Password
  - Manage Roles

#### Tab 4: History
- **Visual timeline** of all employee events
- Color-coded by event type:
  - 🟢 Onboarding
  - 🔵 Mutation/Transfer/Promotion
  - 🔴 Offboarding
- Shows full context for each event:
  - Entity, Unit Kerja, Position at that time
  - Notes/reason for change
  - Date in Indonesian locale

### Action Buttons
- **🔄 Mutasi/Transfer** - Opens mutation modal
- **👋 Offboarding** - Opens offboarding modal
- Both actions are context-aware (show current assignment as reference)

---

## 2. Employee Onboarding Wizard

**Route:** `/employees/onboard`
**File:** `src/routes/(app)/employees/onboard/+page.svelte`

### Progressive 5-Step Wizard

Visual progress indicator shows current step with color-coded bars.

#### Step 1: Personal Information
```
📋 Informasi Personal
- Nama Depan *
- Nama Belakang *
- Email *
- Telepon
- Gender (Laki-laki/Perempuan)
- Tanggal Lahir
```

#### Step 2: Employment Information
```
💼 Informasi Kepegawaian
- NIK/Employee ID * (validated for uniqueness)
- Jenis Kepegawaian * (Permanent/PKWT/OS/Contract)
- Tanggal Bergabung *
- Akhir Masa Probation

⚠️ Warning for PKWT: "Jangan lupa set tanggal akhir kontrak setelah onboarding"
```

#### Step 3: Assignment (Penempatan)
```
🏢 Penempatan
- Realm/Entitas * (IAS, IASS, IASG dropdown)
- Unit Kerja/Divisi * (filtered by selected entity)
- Posisi/Jabatan * (Direktur, Manager, Supervisor, Staff)
- Lokasi Kerja (CGK, DPS, KNO, UPG)
- Regional (Regional 1-4)
```

#### Step 4: SSO Access (Optional)
```
🔐 SSO Access (Optional)
☐ Buat akun SSO untuk karyawan ini

If checked:
- Username * (format: nama.belakang)
- Password Temporary *
- Roles:
  ☑ user (default, disabled)
  ☐ hr
  ☐ manager

Note: "User akan diminta mengganti password saat login pertama"
```

#### Step 5: Review & Confirmation
```
✅ Review & Konfirmasi

Summary of all entered data grouped by section:
- Personal Information
- Employment Information
- Penempatan
- SSO Access

Checklist Onboarding:
✓ Data karyawan akan disimpan di database
✓ Akun SSO akan dibuat (if applicable)
✓ Email notifikasi akan dikirim ke karyawan (if applicable)
✓ Riwayat onboarding akan dicatat
✓ Status karyawan: Active
```

### Server-Side Implementation

**File:** `src/routes/(app)/employees/onboard/+page.server.ts`

**Validation:**
- Required fields check (firstName, lastName, email, employeeId, employmentType, joinDate)
- Duplicate employeeId check
- Duplicate email check
- If createSSOAccount: username and password required
- If createSSOAccount: username uniqueness check

**Database Operations:**
1. **Create SSO User** (if requested):
   - Hash password with Argon2 (memoryCost: 19456, timeCost: 2)
   - Set `requirePasswordChange: true`
   - Set `enabled: true`, `emailVerified: false`

2. **Create Employee Record:**
   - Full name concatenation
   - Convert dates to Date objects
   - Link to SSO user via `userId` field
   - Set initial `employmentStatus: 'active'`

3. **Create Assignment History Entry:**
   - eventType: 'onboarding'
   - eventDate: joinDate
   - Store organizationId, orgUnitId, positionId
   - Store details (employmentType, workLocation, region)

4. **Log Audit Trail:**
   - action: 'employee.onboarding'
   - resourceType: 'employee'
   - Details include ssoAccountCreated flag

5. **Redirect:**
   - On success: redirect to `/employees/[id]`
   - On error: return validation error message

---

## 3. Employee Mutation/Transfer

**Implementation:** Form action in employee detail page
**File:** `src/routes/(app)/employees/[id]/+page.server.ts` (actions.mutation)

### Mutation Modal

Triggered by "Mutasi/Transfer" button on employee detail page.

**Form Fields:**
```
🔄 Mutasi/Transfer Karyawan
Pindahkan [Employee Name] ke unit kerja atau entitas lain

- Tipe Mutasi:
  • Transfer Unit Kerja
  • Transfer Entitas
  • Promosi
  • Demosi

- Entitas Tujuan * (dropdown: all organizations)
- Unit Kerja Tujuan * (dropdown: all org units)
- Posisi Baru * (dropdown: all positions)
- Lokasi Kerja (dropdown: CGK/DPS/KNO/UPG)
- Regional (dropdown: Regional 1-4)
- Tanggal Efektif *
- Catatan (textarea for reason/context)
```

### Server-Side Processing

**Database Operations:**
1. **Update Employee Record:**
   - Update organizationId, orgUnitId, positionId
   - Update workLocation, region
   - Update updatedAt, updatedBy

2. **Create History Entry:**
   - eventType: mutation type from form
   - eventDate: effective date
   - Store NEW organizationId, orgUnitId, positionId
   - Store PREVIOUS values in details object:
     ```javascript
     {
       workLocation: string,
       region: string,
       notes: string,
       previousOrganizationId: string,
       previousOrgUnitId: string,
       previousPositionId: string
     }
     ```

3. **Audit Log:**
   - action: 'employee.mutation'
   - Full mutation data in details

**Use Cases:**
- Transfer within same entity to different unit
- Transfer to different entity (e.g., IAS → IASS)
- Promotion with position change
- Demotion while keeping same unit
- Location change (e.g., CGK → DPS)

---

## 4. Employee Offboarding

**Implementation:** Form action in employee detail page
**File:** `src/routes/(app)/employees/[id]/+page.server.ts` (actions.offboard)

### Offboarding Modal

Triggered by "Offboarding" button on employee detail page.

**Form Fields:**
```
👋 Offboarding Karyawan
Proses pemberhentian untuk [Employee Name]

- Tanggal Terminasi *
- Alasan Pemberhentian *:
  • Resign
  • Kontrak Habis
  • Pemutusan Hubungan Kerja (PHK)
  • Pensiun
  • Meninggal Dunia
  • Lainnya
- Last Working Day
- Catatan
☑ Revoke SSO Access (checkbox)

Checklist Otomatis:
☐ Update status karyawan → Terminated
☐ Revoke akses SSO (jika dicentang)
☐ Catat riwayat offboarding
☐ Log audit trail
☐ [TODO] Kembalikan aset perusahaan
☐ [TODO] Proses payroll terakhir
☐ [TODO] Hapus akses aplikasi eksternal
```

### Server-Side Processing

**Database Operations:**
1. **Update Employee Status:**
   - Set `employmentStatus: 'terminated'`
   - Set `terminationDate`
   - Set `terminationReason`

2. **Revoke SSO Access** (if checkbox checked):
   - Find linked user by `userId`
   - Set `enabled: false`
   - This immediately blocks login to all SSO-connected apps

3. **Create History Entry:**
   - eventType: 'offboarding'
   - eventDate: termination date
   - Store current organizationId, orgUnitId, positionId
   - Store details:
     ```javascript
     {
       terminationReason: string,
       lastWorkingDay: string,
       notes: string,
       ssoAccessRevoked: boolean
     }
     ```

4. **Audit Log:**
   - action: 'employee.offboarding'
   - Full offboarding data in details

**Future Enhancements (TODO):**
- Trigger SCIM deprovision to external apps
- Send offboarding checklist email to HR
- Asset return tracking
- Final payroll processing integration
- Exit interview scheduling

---

## 5. Data Sync Comparison

**Route:** `/employees/sync`
**Files:**
- `src/routes/(app)/employees/sync/+page.svelte`
- `src/routes/(app)/employees/sync/+page.server.ts`

### Purpose

Compare employee data from multiple sources and merge changes bidirectionally:
- **App Database** ↔ **Microsoft Entra ID**
- **App Database** ↔ **CSV Upload**

This addresses the user's requirement: "ability to choose to update/add data at which side, by comparing this database, entraid or uploaded csv"

### UI Workflow

#### Step 1: Choose Source
```
1️⃣ Pilih Sumber Data

[ ☁️ Microsoft Entra ID ]  [ 📄 Upload CSV ]
  Sinkronisasi dari cloud      Import dari file CSV
```

If CSV selected:
- File upload input
- Shows filename and size: "📎 employees.csv (245.32 KB)"

Button: **🔍 Mulai Perbandingan**

#### Step 2: Review Differences
```
2️⃣ Review Perbedaan Data

Statistics Dashboard:
┌─────────┬─────────┬──────────┬────────────┐
│  Total  │  Cocok  │ Konflik  │ Data Baru  │
│   150   │   120   │    25    │     5      │
└─────────┴─────────┴──────────┴────────────┘

Differences Table:
┌───┬────────────────┬──────────┬──────────────────┬──────────────────┬──────────────────┐
│ ☐ │ Karyawan       │ Field    │ App DB           │ Entra ID / CSV   │ Action           │
├───┼────────────────┼──────────┼──────────────────┼──────────────────┼──────────────────┤
│ ☑ │ Budi Santoso   │ email    │ budi@ias.co.id   │ budi.santoso@... │ [Use Entra ID ▼] │
│   │ IAS-001        │          │                  │                  │                  │
├───┼────────────────┼──────────┼──────────────────┼──────────────────┼──────────────────┤
│ ☑ │ Siti Nurhaliza │ position │ Manager          │ Senior Manager   │ [Use Entra ID ▼] │
│   │ IAS-002        │          │                  │                  │                  │
└───┴────────────────┴──────────┴──────────────────┴──────────────────┴──────────────────┘

Action Dropdown Options:
- Keep App DB (no change)
- Use Entra ID / CSV (update App DB)
- Sync Both Ways (update both systems)
- Skip (ignore this conflict)

Bulk Actions: [Pilih Semua] [Hapus Semua]
```

#### Step 3: Apply Changes
```
3️⃣ Terapkan Perubahan

⚠️ 12 perubahan akan diterapkan. Pastikan sudah review semua.

[✓ Terapkan 12 Perubahan]  [📥 Export Preview]
```

### Comparison Algorithm (Conceptual)

```typescript
interface ComparisonDifference {
  id: string;
  employeeId: string;
  employeeName: string;
  field: string;
  appValue: any;
  sourceValue: any;
  conflictType: 'value_mismatch' | 'missing_in_app' | 'missing_in_source';
}

// For each employee in source:
//   1. Match by employeeId or email
//   2. Compare each field (email, phone, position, orgUnit, etc.)
//   3. If values differ: create conflict record
//   4. Track new records (exist in source but not in app)
//   5. Track missing records (exist in app but not in source)
```

### Sync History

Table showing past sync operations:
```
📊 Riwayat Sinkronisasi
┌────────────────────┬────────────┬────────────┬─────────┬────────┐
│ Timestamp          │ Source     │ Changes    │ Status  │ User   │
├────────────────────┼────────────┼────────────┼─────────┼────────┤
│ 14/10/2025 10:30   │ ☁️ Entra  │ 12 records │ Success │ Admin  │
│ 13/10/2025 09:15   │ 📄 CSV     │ 45 records │ Success │ HR     │
│ 12/10/2025 14:20   │ ☁️ Entra  │ 8 records  │ Failed  │ Admin  │
└────────────────────┴────────────┴────────────┴─────────┴────────┘
```

### Server Actions

**Action: compareEntraID**
```typescript
// TODO: Implement
// 1. Get access token from Microsoft Graph API
// 2. Fetch users from Entra ID
// 3. Map Entra ID fields to employee schema
// 4. Compare with local database
// 5. Return differences array
```

**Action: compareCSV**
```typescript
// TODO: Implement
// 1. Parse CSV file (validate headers)
// 2. Map CSV columns to employee schema
// 3. Compare with local database
// 4. Return differences array
```

**Action: applyChanges**
```typescript
// Receives: array of changes with action for each
// For each change:
//   - if action === 'use-source': update App DB
//   - if action === 'use-app': update Entra ID (API call)
//   - if action === 'use-both': update both systems
//   - if action === 'skip': do nothing
// Create sync_history entry
// Return success with count
```

---

## Database Collections Used

### employees
```typescript
{
  _id: ObjectId,
  employeeId: string,
  firstName: string,
  lastName: string,
  fullName: string,
  email: string,
  phone: string,
  gender: string,
  dateOfBirth: Date,

  // Employment
  employmentType: 'permanent' | 'PKWT' | 'OS' | 'contract',
  employmentStatus: 'active' | 'probation' | 'terminated',
  joinDate: Date,
  probationEndDate: Date,
  contractEndDate: Date,
  terminationDate: Date,
  terminationReason: string,

  // Assignment
  organizationId: ObjectId,
  orgUnitId: ObjectId,
  positionId: ObjectId,
  workLocation: string,
  region: string,
  secondaryAssignments: Array<{
    organizationId: ObjectId,
    orgUnitId: ObjectId,
    positionId: ObjectId,
    startDate: Date,
    endDate: Date
  }>,

  // SSO Link
  userId: ObjectId | null,

  // Custom Properties
  customProperties: Record<string, any>,

  // Metadata
  createdAt: Date,
  updatedAt: Date,
  createdBy: string,
  updatedBy: string
}
```

### employee_history
```typescript
{
  _id: ObjectId,
  employeeId: ObjectId,
  eventType: 'onboarding' | 'mutation' | 'transfer' | 'promotion' | 'demotion' | 'offboarding',
  eventDate: Date,
  organizationId: ObjectId,
  orgUnitId: ObjectId,
  positionId: ObjectId,
  details: {
    // Varies by event type
    notes?: string,
    previousOrganizationId?: string,
    previousOrgUnitId?: string,
    previousPositionId?: string,
    terminationReason?: string,
    ssoAccessRevoked?: boolean,
    // ...other fields
  },
  createdAt: Date,
  createdBy: string
}
```

### sync_history
```typescript
{
  _id: ObjectId,
  timestamp: Date,
  source: 'entraid' | 'csv',
  changesApplied: number,
  status: 'success' | 'failed',
  user: string,
  details: Array<any> // Array of changes applied
}
```

---

## Navigation Structure

```
Identitas (Group)
├─ 🔐 SSO Users
├─ 👨‍💼 Karyawan
│   └─ (List) → Detail Page (4 tabs) → Onboarding Wizard
├─ 🔄 Data Sync ← NEW!
└─ 🤝 Partner/Eksternal
```

---

## Benefits of This Design

### 1. Context-Aware
Every page shows WHERE the employee is in the organizational hierarchy, not just isolated data fields.

### 2. Workflow-Oriented
Matches real HR processes:
- Onboarding: progressive wizard that collects all info once
- Mutation: clear before/after assignment tracking
- Offboarding: automated checklist with SSO revocation
- Sync: bidirectional comparison with conflict resolution

### 3. Audit-Ready
Every action creates:
- Audit log entry (who, what, when)
- History timeline entry (context at that time)
- Automatic tracking of previous values

### 4. Multi-Tenancy Ready
- Supports multiple entities (Injourney → IAS → IASS)
- Secondary assignments allow employees to work across entities
- Each entity can be a separate realm

### 5. Integration-Friendly
- SCIM provisioning hooks (TODO)
- Entra ID sync for cloud directory
- CSV import for bulk operations
- Clear data comparison UI for conflict resolution

---

## Future Enhancements

### Phase 2: SSO Integration
- Auto-provision SSO accounts to connected apps via SCIM
- Auto-deprovision on offboarding
- Role mapping per application

### Phase 3: Advanced Sync
- Real-time Entra ID sync with webhooks
- Scheduled automatic sync (daily/weekly)
- Conflict resolution rules (e.g., "always prefer Entra ID for email")
- Sync to multiple sources simultaneously

### Phase 4: Reporting
- Organization chart export
- Employee directory PDF
- Headcount reports by entity/unit/position
- Turnover analysis
- Assignment history reports

### Phase 5: Self-Service
- Employee portal to view own data
- Update contact info (pending HR approval)
- View assignment history
- Access SSO-connected apps

---

## Testing Checklist

- [ ] Create employee via onboarding wizard
- [ ] Verify SSO account creation with temporary password
- [ ] Verify password change required on first login
- [ ] View employee in detail page (all 4 tabs)
- [ ] Perform mutation (transfer to different unit)
- [ ] Verify history timeline shows mutation event
- [ ] Perform offboarding with SSO revocation
- [ ] Verify SSO login fails after offboarding
- [ ] Compare data with mock Entra ID source
- [ ] Compare data with uploaded CSV
- [ ] Apply selective changes (some use App DB, some use source)
- [ ] Verify sync history log entry
- [ ] Test empty states (no history, no SSO account)
- [ ] Test error states (duplicate email, invalid dates)
- [ ] Test mobile responsiveness

---

## Conclusion

The employee management system now provides a comprehensive, workflow-oriented approach to HR operations. It addresses the user's core requirement: **"down to earth logic"** that shows employees in their full organizational context (entity → unit → position) and provides the ability to manage the complete employee lifecycle with proper tracking and integration capabilities.
