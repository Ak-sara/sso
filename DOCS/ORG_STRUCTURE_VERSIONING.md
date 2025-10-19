# Organization Structure Versioning System

## Overview

The Organization Structure Versioning system provides **complete historical tracking** of organizational changes with formal **Surat Keputusan (SK)** documentation and automated employee reassignment tracking.

## Core Concept

**Every change to the organization structure must create a new version with an SK.**

This ensures:
1. **Audit trail** - Complete history of organizational evolution
2. **Legal compliance** - Every structural change has formal documentation
3. **Employee tracking** - Automatic list of affected employees for SK attachments
4. **Comparison** - Ability to see what changed between versions
5. **Rollback capability** - Can reference previous structures

---

## Workflow

### 1. Initial Setup
When first deploying Aksara SSO:

```
1. Create Organization (e.g., "IAS - Injourney Aviation Service")
2. Define all Unit Kerja (Direktorat, Divisi, Departemen, etc.) with parent-child relationships
3. Define all Positions (Direktur, GM, Manager, Supervisor, Staff)
4. Create VERSION 1.0 "Initial Structure"
   - Snapshot all units and positions
   - Assign Unit Heads (Kepala Unit)
   - Status: DRAFT → PENDING_APPROVAL → ACTIVE
```

### 2. Adding Employees
After structure is established:

```
1. Admin uses Onboarding Wizard
2. Assigns employee to:
   - Entity (Realm)
   - Unit Kerja
   - Position
   - Reports to (Manager)
3. Employee appears in the unit's headcount
```

### 3. Creating New Version (Restructure)

When organizational changes are needed:

```
STEP 1: Create New Version Draft
- Click "Buat Versi Baru"
- Enter version name (e.g., "2025-Q2 Cargo Division Restructure")
- Set effective date
- System creates snapshot of current structure

STEP 2: Edit Structure (on version detail page)
- Add new units
- Remove units
- Move units (change parent)
- Merge units
- Change unit heads
- System auto-tracks all changes

STEP 3: Identify Affected Employees
- System compares old vs new structure
- Lists all employees in changed units
- Shows: Old Position → New Position
- Shows: Old Unit → New Unit
- This list becomes SK attachment

STEP 4: Fill SK Information
- SK Number (e.g., SK-042/IAS/2025)
- SK Date
- Signed by (Direktur Utama)
- Upload SK PDF/DOCX

STEP 5: Submit for Approval
- Status: DRAFT → PENDING_APPROVAL
- Cannot be edited anymore
- Notification sent to approver

STEP 6: Approval & Activation
- Approver reviews version
- Clicks "Approve & Activate"
- System:
  - Deactivates current active version
  - Activates new version
  - Applies all reassignments to employees
  - Creates employee_history entries for each affected employee
  - Triggers SCIM sync (optional)
```

---

## Data Model

### OrgStructureVersion Collection

```typescript
{
  _id: ObjectId,
  versionNumber: 1,  // Sequential: 1, 2, 3...
  versionName: "2025-Q1 Initial Structure",
  organizationId: "IAS",
  effectiveDate: ISODate("2025-01-01"),
  endDate: ISODate("2025-06-30"),  // When superseded
  status: "active",  // draft | pending_approval | active | archived

  // Complete snapshot
  structure: {
    orgUnits: [
      {
        _id: "unit-123",
        code: "DDC",
        name: "Direktorat Komersial",
        parentId: "bod-001",
        type: "directorate",
        level: 2,
        sortOrder: 30,
        headEmployeeId: "IAS-042"  // Kepala Unit
      },
      // ... more units
    ],
    positions: [
      {
        _id: "pos-456",
        code: "DIR",
        name: "Direktur",
        level: "executive",
        grade: "E1"
      },
      // ... more positions
    ]
  },

  // What changed from previous version
  changes: [
    {
      type: "unit_added",
      entityType: "org_unit",
      entityId: "unit-999",
      entityName: "Digital Transformation",
      description: "Added new division under Direktur SDM",
      oldValue: null,
      newValue: { parentId: "DDH", level: 3 }
    },
    {
      type: "unit_moved",
      entityType: "org_unit",
      entityId: "unit-456",
      entityName: "Information Technology",
      description: "Moved from DDH to DDO",
      oldValue: { parentId: "DDH" },
      newValue: { parentId: "DDO" }
    }
  ],

  // Employees affected by this restructure
  reassignments: [
    {
      employeeId: "IAS-123",
      employeeName: "Budi Santoso",
      oldOrgUnitId: "unit-456",
      oldOrgUnitName: "IT under DDH",
      oldPositionId: "pos-MGR",
      oldPositionName: "Manager",
      newOrgUnitId: "unit-456",
      newOrgUnitName: "IT under DDO",
      newPositionId: "pos-GM",
      newPositionName: "General Manager",  // Promoted!
      effectiveDate: ISODate("2025-06-01"),
      reason: "Organizational restructure + promotion"
    }
    // ... more reassignments
  ],

  // SK Documentation
  skNumber: "SK-042/IAS/2025",
  skDate: ISODate("2025-05-15"),
  skSignedBy: "IAS-001",  // Direktur Utama
  skAttachments: [
    {
      filename: "SK-042-IAS-2025-Restructure.pdf",
      fileUrl: "/uploads/sk/...",
      fileType: "pdf",
      uploadedAt: ISODate("2025-05-16")
    }
  ],

  // Mermaid Diagram (auto-generated)
  mermaidDiagram: "flowchart TD\n  DU --> DDC\n  ...",

  // Metadata
  createdBy: "admin@ias.co.id",
  approvedBy: "direktur@ias.co.id",
  approvedAt: ISODate("2025-05-20"),
  notes: "Q2 restructure focusing on digital transformation",
  createdAt: ISODate("2025-05-01"),
  updatedAt: ISODate("2025-05-20")
}
```

---

## UI Features

### Version List Page (`/org-structure/versions`)

**Current Active Version** (highlighted in green):
- Version number and name
- Effective date
- SK number
- Number of units
- Number of affected employees

**Version History** (table):
- All versions sorted by version number (descending)
- Status badges (Active, Pending, Draft, Archived)
- Quick stats (effective date, SK number, changes count, reassignments count)
- Actions: View Detail, Edit (if draft)

**Create New Version Button**:
- Modal with form:
  - Version name
  - Effective date
  - Notes
- Creates draft version
- Redirects to version detail page

### Version Detail Page (`/org-structure/versions/[id]`)

**4 Tabs:**

#### Tab 1: Structure
- **Mermaid Diagram** - Visual representation
- **Unit Kerja Table**:
  - Code, Name, Type, Parent, Level
  - Kepala Unit (Unit Head) column
  - Sortable, filterable
- **Positions Table**
- **Edit Structure** button (if draft status)

#### Tab 2: Changes
- List of all changes from previous version
- Color-coded:
  - 🟢 Green = Added
  - 🔴 Red = Removed
  - 🔵 Blue = Modified
- Shows old value → new value
- Human-readable descriptions

#### Tab 3: Karyawan Terdampak (Affected Employees)
- **Table format** (ready for SK attachment):
  - No, NIK, Nama
  - Dari (Old Unit + Position)
  - Ke (New Unit + Position)
  - Tanggal Efektif
  - Alasan
- **Download Excel** button - generates formatted spreadsheet for SK attachment
- Total count of affected employees
- Filter by change type (promotion, transfer, demotion)

#### Tab 4: Surat Keputusan
- **SK Information Form**:
  - SK Number (required)
  - SK Date (required)
  - Signed By (dropdown of Direktur-level positions)
  - Upload SK document (PDF/DOCX)
- **Attachments List**:
  - Previously uploaded SK documents
  - Download and delete actions
- **Submit for Approval** button (if draft)

**Workflow Buttons** (top right):
- **Draft status**: "Submit for Approval"
- **Pending status**: "Approve & Activate" (for approvers)
- **Active status**: "Download SK", "View Mermaid"

---

## Automatic Features

### 1. Change Detection
When editing a draft version, system compares with previous active version:

```typescript
// Pseudo-code
const previousVersion = getActiveVersion();
const currentDraft = getDraftVersion();

const changes = [];

// Detect added units
for (const unit of currentDraft.units) {
  if (!previousVersion.units.find(u => u._id === unit._id)) {
    changes.push({
      type: 'unit_added',
      description: `Added new ${unit.type}: ${unit.name}`
    });
  }
}

// Detect removed units
for (const unit of previousVersion.units) {
  if (!currentDraft.units.find(u => u._id === unit._id)) {
    changes.push({
      type: 'unit_removed',
      description: `Removed ${unit.type}: ${unit.name}`
    });
  }
}

// Detect moved/renamed units
for (const unit of currentDraft.units) {
  const prev = previousVersion.units.find(u => u._id === unit._id);
  if (prev) {
    if (prev.parentId !== unit.parentId) {
      changes.push({
        type: 'unit_moved',
        description: `Moved ${unit.name} from ${prev.parentName} to ${unit.parentName}`
      });
    }
    if (prev.name !== unit.name) {
      changes.push({
        type: 'unit_renamed',
        oldValue: prev.name,
        newValue: unit.name
      });
    }
  }
}
```

### 2. Employee Reassignment Detection
When units change, system finds affected employees:

```typescript
// Find all employees in changed units
const changedUnitIds = changes
  .filter(c => c.entityType === 'org_unit')
  .map(c => c.entityId);

const affectedEmployees = await db.collection('employees').find({
  orgUnitId: { $in: changedUnitIds }
}).toArray();

// Create reassignment records
for (const employee of affectedEmployees) {
  const oldUnit = previousVersion.units.find(u => u._id === employee.orgUnitId);
  const newUnit = currentDraft.units.find(u => u._id === employee.orgUnitId);

  reassignments.push({
    employeeId: employee.employeeId,
    employeeName: employee.fullName,
    oldOrgUnitName: oldUnit?.name,
    newOrgUnitName: newUnit?.name,
    // Check if position also changed
    oldPositionId: employee.positionId,
    newPositionId: getNewPositionId(employee, changes),
    effectiveDate: version.effectiveDate,
    reason: "Organizational restructure"
  });
}
```

### 3. Mermaid Diagram Generation

```typescript
function generateMermaidDiagram(version: OrgStructureVersion): string {
  const units = version.structure.orgUnits;

  let diagram = "flowchart TD\n";

  // Add nodes
  for (const unit of units) {
    diagram += `  ${unit.code}[${unit.name}]\n`;
  }

  // Add relationships
  for (const unit of units) {
    if (unit.parentId) {
      const parent = units.find(u => u._id === unit.parentId);
      if (parent) {
        diagram += `  ${parent.code} --> ${unit.code}\n`;
      }
    }
  }

  return diagram;
}
```

### 4. SK Attachment Excel Generation

```typescript
// Generate Excel with list of affected employees
function generateSKAttachment(version: OrgStructureVersion): Excel {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daftar Karyawan Terdampak');

  // Headers
  worksheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'NIK', key: 'nip', width: 15 },
    { header: 'Nama Lengkap', key: 'name', width: 30 },
    { header: 'Dari (Unit Kerja)', key: 'from_unit', width: 25 },
    { header: 'Dari (Posisi)', key: 'from_position', width: 20 },
    { header: 'Ke (Unit Kerja)', key: 'to_unit', width: 25 },
    { header: 'Ke (Posisi)', key: 'to_position', width: 20 },
    { header: 'Tanggal Efektif', key: 'effective_date', width: 15 },
    { header: 'Keterangan', key: 'notes', width: 30 }
  ];

  // Data rows
  version.reassignments.forEach((r, i) => {
    worksheet.addRow({
      no: i + 1,
      nip: r.employeeId,
      name: r.employeeName,
      from_unit: r.oldOrgUnitName,
      from_position: r.oldPositionName,
      to_unit: r.newOrgUnitName,
      to_position: r.newPositionName,
      effective_date: formatDate(r.effectiveDate),
      notes: r.reason
    });
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };

  return workbook;
}
```

---

## Integration Points

### 1. Employee Onboarding
When onboarding wizard assigns employee to unit:
- Uses **current active version** structure
- Validates unit exists in active version
- Validates position exists

### 2. Employee Mutation
When creating mutation/transfer:
- Can only assign to units in **current active version**
- Creates employee_history entry
- If mutation is part of restructure:
  - Links to version via `details.versionId`
  - Included in version's reassignments list

### 3. SCIM Provisioning
When version is activated:
- Triggers SCIM update to all connected apps
- Sends new organizational structure
- Updates employee assignments
- Connected apps (Slack, Google Workspace, etc.) reflect new structure

### 4. Reporting
All reports can filter by version:
- "Show me headcount as of Version 3"
- "Compare headcount between Version 2 and Version 4"
- "List all employees who were reassigned in Version 5"

---

## Business Rules

### 1. Only One Active Version
- At any time, only ONE version can have `status: 'active'`
- When new version is approved, previous active becomes `archived`
- Archived version gets `endDate` set to new version's `effectiveDate`

### 2. Draft Versions Can Be Edited
- Status `draft` = editable
- Can modify structure, SK info, reassignments
- Once submitted → `pending_approval` → no more edits

### 3. SK Required for Approval
- Cannot submit for approval without:
  - SK Number
  - SK Date
  - Signed By (Direktur)
- Validates on submit

### 4. Effective Date Logic
- Effective date can be in the future
- Version becomes "active" on approval, not on effective date
- Effective date is for historical reference and reporting

### 5. Employee Assignment Validation
- Employees can only be assigned to units that exist in **current active version**
- When assigning via onboarding or mutation, system checks active version structure

---

## Example Scenario

**Initial State (Version 1)**
```
Injourney Aviation Service (IAS)
├── Direktur Utama
│   ├── Direktorat SDM (DDH)
│   │   ├── HC Strategy (HS) - 5 employees
│   │   ├── HC BP (HB) - 8 employees
│   │   └── Information Technology (IT) - 12 employees
│   └── Direktorat Operasi (DDO)
│       ├── Operations (OPS) - 20 employees
│       └── Customer Experience (CX) - 10 employees
```

**Change Needed:**
- Move IT from DDH to DDO (IT is more operational)
- Create new "Digital Transformation" division under DDH
- Transfer 3 IT employees to Digital Transformation

**Steps:**
1. Create Version 2 "Q2-2025 Digital Transformation Initiative"
2. In version editor:
   - Change IT's parent from DDH to DDO
   - Add new unit "Digital Transformation" under DDH
   - Assign 3 specific employees to new unit
3. System auto-detects:
   - Change: "unit_moved" (IT from DDH to DDO)
   - Change: "unit_added" (Digital Transformation)
   - Reassignments: 3 employees (from IT to Digital Transformation)
4. Fill SK info:
   - SK-015/IAS/2025
   - Date: 2025-05-20
   - Signed by: Direktur Utama
5. Submit for approval
6. Direktur approves
7. System applies:
   - Updates 3 employee records
   - Creates 3 employee_history entries
   - Deactivates Version 1, activates Version 2
   - Sends SCIM update

**Result (Version 2)**
```
Injourney Aviation Service (IAS)
├── Direktur Utama
│   ├── Direktorat SDM (DDH)
│   │   ├── HC Strategy (HS) - 5 employees
│   │   ├── HC BP (HB) - 8 employees
│   │   └── Digital Transformation (DT) - 3 employees ✨ NEW
│   └── Direktorat Operasi (DDO)
│       ├── Operations (OPS) - 20 employees
│       ├── Customer Experience (CX) - 10 employees
│       └── Information Technology (IT) - 9 employees ✨ MOVED
```

---

## Benefits

1. **Legal Compliance**: Every structural change has formal SK documentation
2. **Audit Trail**: Complete history of organizational evolution
3. **Employee Transparency**: Employees can see why they were reassigned
4. **Reporting**: Can generate reports "as of Version X"
5. **Rollback**: Can reference previous structures if needed
6. **Integration**: External systems stay in sync via SCIM
7. **Automation**: Reassignment list auto-generated for SK attachment

---

## Next Steps / Enhancements

1. **Visual Structure Editor**
   - Drag-and-drop org chart builder
   - Visual diff between versions

2. **Employee Impact Analysis**
   - Before activating version, show impact report:
     - X employees will be promoted
     - Y employees will change units
     - Z positions will be vacant

3. **Notification System**
   - Email affected employees when version activated
   - Include SK document as attachment
   - Explain their new assignment

4. **Version Comparison Tool**
   - Side-by-side comparison of two versions
   - Highlight differences in structure
   - Show employee movement between versions

5. **SK Template Generator**
   - Auto-generate SK document from template
   - Fill in version data, reassignment list
   - Export as Word document for editing

6. **Approval Workflow**
   - Multi-level approval (HC Manager → Direktur SDM → Direktur Utama)
   - Email notifications at each step
   - Comments and rejection reasons

---

**Last Updated**: 2025-10-14
**Status**: Implemented, ready for testing
