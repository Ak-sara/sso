# Data Architecture & Collection Relationships

**Date**: October 15, 2025
**Status**: ⚠️ Requires Review for Compliance

---

## 📊 Collection Architecture Overview

### Three Separate Collections

Aksara SSO uses **three distinct collections** for different purposes:

```
┌─────────────────────┐
│   1. users          │  ← Authentication & Authorization ONLY
│   (SSO Accounts)    │     - Login credentials
│                     │     - Roles & permissions
│                     │     - Session management
└──────────┬──────────┘
           │ userId (reference)
           │
           ▼
┌─────────────────────┐
│   2. employees      │  ← HR Data (PII - Personal Identifiable Information)
│   (Karyawan)        │     - Full employee profile
│                     │     - KTP, NPWP (sensitive!)
│                     │     - Date of birth, phone
│                     │     - Employment history
└──────────┬──────────┘
           │ userId (optional)
           │
           ▼
┌─────────────────────┐
│   3. partners       │  ← External Users (Non-employees)
│   (Eksternal)       │     - Contractors, vendors
│                     │     - Limited SSO access
│                     │     - Contract information
└─────────────────────┘
```

---

## 🔗 Relationship Model

### 1. **users** Collection (Authentication Layer)

**Purpose**: SSO authentication ONLY
**Sensitivity**: Medium (contains passwords, email)

```typescript
{
  _id: ObjectId,
  email: string,              // Work email
  username: string,           // Login username
  password: string,           // Hashed (Argon2)
  firstName?: string,         // Display name only
  lastName?: string,
  roles: string[],            // Permissions
  organizationId?: string,
  employeeId?: string,        // ⚠️ Link to employees collection
  isActive: boolean,
  emailVerified: boolean,
  lastLogin: Date
}
```

### 2. **employees** Collection (HR Master Data)

**Purpose**: Complete employee profile & HR data
**Sensitivity**: 🔴 **HIGH** - Contains PII protected by UU PDP

```typescript
{
  _id: ObjectId,
  employeeId: string,         // NIP
  userId?: string,            // ⚠️ Link to users collection (optional)

  // ⚠️ SENSITIVE PERSONAL DATA (UU PDP Protected)
  firstName: string,
  lastName: string,
  email: string,
  phone?: string,
  personalEmail?: string,
  dateOfBirth?: Date,         // 🔴 SENSITIVE
  gender?: string,
  idNumber?: string,          // 🔴 KTP - VERY SENSITIVE
  taxId?: string,             // 🔴 NPWP - VERY SENSITIVE

  // Employment data
  organizationId: string,
  orgUnitId?: string,
  positionId?: string,
  employmentType: string,
  employmentStatus: string,
  joinDate: Date,
  endDate?: Date,

  // Work location
  workLocation?: string,
  region?: string,

  // Audit trail
  createdAt: Date,
  updatedAt: Date,
  createdBy?: string,
  updatedBy?: string
}
```

### 3. **partners** Collection (External Users)

**Purpose**: Non-employee users (contractors, vendors, etc.)
**Sensitivity**: Medium-High

```typescript
{
  _id: ObjectId,
  partnerId: string,
  userId?: string,            // ⚠️ Link to users collection (optional)
  type: 'vendor' | 'contractor' | 'consultant' | etc,
  companyName?: string,
  contactName: string,
  email: string,
  phone?: string,
  accessLevel: 'read' | 'write' | 'admin',
  contractNumber?: string,
  contractStartDate?: Date,
  contractEndDate?: Date
}
```

---

## ⚠️ Critical Data Privacy Issues

### Issue 1: Sensitive PII Storage

**Problem**: `employees` collection contains:
- ✅ KTP (ID Card Number) - **Nomor Identitas**
- ✅ NPWP (Tax ID) - **Data Perpajakan**
- ✅ Date of Birth - **Data Pribadi**
- ✅ Phone numbers
- ✅ Personal email
- ✅ Gender

**Risk**: This data is protected under:
- **UU No. 27 Tahun 2022** tentang Perlindungan Data Pribadi (PDP)
- **Peraturan Menteri Kominfo No. 20 Tahun 2016** tentang PDP

### Issue 2: No Encryption at Rest

**Current State**: All data stored in plain text in MongoDB
**Required**: Field-level encryption for sensitive data

### Issue 3: No Access Control Granularity

**Current State**: Users with HR role can see ALL employee data
**Required**: Role-based field-level access control

### Issue 4: No Data Minimization

**Current State**: System stores maximum data by default
**Required**: Only collect necessary data with explicit consent

### Issue 5: No Audit Trail for Data Access

**Current State**: Only tracks data changes, not who viewed what
**Required**: Log all access to sensitive PII

---

## 📜 UU PDP Compliance Requirements

### UU No. 27 Tahun 2022 - Key Requirements

#### 1. **Lawful Basis for Processing** (Pasal 20)

Data can only be processed if:
- ✅ Consent from data subject (employee)
- ✅ Legal obligation (employment contract)
- ✅ Legitimate interest (HR management)

**Action Required**:
- Add consent tracking mechanism
- Document legal basis for each data field

#### 2. **Data Minimization** (Pasal 24)

Only collect data that is:
- Adequate
- Relevant
- Limited to necessary purposes

**Action Required**:
- Review if KTP/NPWP is truly necessary
- Make sensitive fields optional where possible

#### 3. **Purpose Limitation** (Pasal 25)

Data can only be used for stated purposes.

**Action Required**:
- Document purpose for each field
- Prevent unauthorized secondary use

#### 4. **Data Subject Rights** (Pasal 30-38)

Individuals have right to:
- ✅ Access their data
- ✅ Rectify incorrect data
- ✅ Erasure ("right to be forgotten")
- ✅ Data portability
- ✅ Object to processing

**Action Required**:
- Implement self-service profile portal
- Add data export functionality
- Add data deletion functionality

#### 5. **Security Measures** (Pasal 40)

Must implement:
- ✅ Encryption
- ✅ Access controls
- ✅ Audit trails
- ✅ Incident response plan

**Action Required**: See Security section below

#### 6. **Data Breach Notification** (Pasal 41)

Must notify:
- Data subject within 3x24 hours
- Government within 3x24 hours

**Action Required**:
- Implement breach detection
- Create notification process

#### 7. **Data Retention** (Pasal 43)

Data must be deleted when no longer needed.

**Action Required**:
- Define retention periods
- Implement automatic deletion

---

## 🔒 Required Security Measures

### 1. **Encryption**

#### At Rest (MongoDB)
```javascript
// Enable MongoDB Field-Level Encryption
{
  encryptedFields: {
    fields: [
      { path: "idNumber", bsonType: "string" },      // KTP
      { path: "taxId", bsonType: "string" },         // NPWP
      { path: "dateOfBirth", bsonType: "date" },
      { path: "phone", bsonType: "string" },
      { path: "personalEmail", bsonType: "string" }
    ]
  }
}
```

#### In Transit
- ✅ HTTPS only (TLS 1.3)
- ✅ MongoDB connection over TLS
- ✅ No plain HTTP

### 2. **Access Control**

#### Role-Based Field Access
```typescript
const fieldPermissions = {
  'user': {
    canView: ['firstName', 'lastName', 'email', 'workLocation'],
    canEdit: []
  },
  'hr': {
    canView: ['*'], // All fields
    canEdit: ['organizationId', 'orgUnitId', 'positionId']
  },
  'manager': {
    canView: ['firstName', 'lastName', 'email', 'phone', 'orgUnitId'],
    canEdit: []
  },
  'admin': {
    canView: ['*'],
    canEdit: ['*']
  }
};
```

### 3. **Audit Logging**

Track ALL operations on sensitive data:
```typescript
{
  action: 'VIEW_EMPLOYEE_KTP',
  userId: 'admin@ias.co.id',
  targetEmployeeId: 'NIP001',
  fieldAccessed: 'idNumber',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla...',
  timestamp: Date,
  justification?: 'HR verification for background check'
}
```

### 4. **Data Masking**

Hide sensitive data by default:
```typescript
// Display masked version
idNumber: "3173***********" // Show first 4 digits only
taxId: "01.234.***.*-***.***"
phone: "0812****5678"
```

### 5. **Session Security**

- ✅ Session timeout (2 hours idle) - Already implemented
- ✅ Force re-authentication for sensitive actions
- ✅ Session invalidation on password change
- ⚠️ Add: IP binding to session
- ⚠️ Add: Device fingerprinting

---

## 🚨 Cybersecurity Breach Response Plan

### Incident Response Phases

#### 1. **Detection**
- Anomaly detection on data access patterns
- Failed login monitoring
- Database query monitoring
- File integrity monitoring

#### 2. **Containment**
- Immediately disable compromised accounts
- Revoke all active sessions
- Block suspicious IP addresses
- Isolate affected systems

#### 3. **Investigation**
- Review audit logs
- Identify scope of breach
- Determine data affected
- Identify root cause

#### 4. **Notification** (UU PDP Compliant)
- **Within 3x24 hours**:
  - Notify affected employees
  - Notify Kementerian Kominfo
  - Notify BSSN (if critical infrastructure)
- **Content**:
  - What data was compromised
  - When breach occurred
  - Actions being taken
  - Steps individuals should take

#### 5. **Remediation**
- Patch vulnerabilities
- Reset all passwords
- Review and strengthen access controls
- Enhance monitoring

#### 6. **Post-Incident**
- Document lessons learned
- Update security policies
- Conduct security training
- Review and improve response plan

---

## 📋 Required Policies & Documentation

### 1. **Privacy Policy** (Kebijakan Privasi)

Must include:
- ✅ What data is collected
- ✅ Why data is collected (legal basis)
- ✅ How data is used
- ✅ Who has access
- ✅ How long data is retained
- ✅ Data subject rights
- ✅ How to exercise rights
- ✅ Contact for privacy officer

### 2. **Data Processing Agreement** (DPA)

For each third-party service:
- MongoDB Atlas
- Email service provider
- Cloud storage provider
- Microsoft Entra ID sync

### 3. **Employee Consent Form**

Before collecting data:
```
FORMULIR PERSETUJUAN PENGOLAHAN DATA PRIBADI

Saya [Nama Karyawan] memberikan persetujuan kepada [Nama Perusahaan]
untuk mengumpulkan, menyimpan, dan mengolah data pribadi saya untuk
keperluan:

☐ Administrasi kepegawaian
☐ Penggajian dan tunjangan
☐ Perpajakan (NPWP)
☐ Asuransi kesehatan/jiwa

Data yang dikumpulkan:
- Nama lengkap
- NIK (KTP)
- NPWP
- Tanggal lahir
- Alamat
- Nomor telepon
- Email

Saya memahami hak saya untuk:
- Mengakses data saya
- Memperbaiki data yang salah
- Menghapus data (dalam kondisi tertentu)
- Mengunduh data saya

Tanda Tangan: _____________
Tanggal: _____________
```

### 4. **Data Retention Policy**

```markdown
KEBIJAKAN RETENSI DATA

1. Data Karyawan Aktif
   - Disimpan selama masa kerja
   - Diperbarui sesuai kebutuhan

2. Data Karyawan Non-Aktif
   - Disimpan selama 5 tahun setelah keluar (sesuai UU Ketenagakerjaan)
   - Data sensitif (KTP, NPWP) dihapus setelah 2 tahun
   - Hanya data yang diperlukan untuk keperluan hukum yang dipertahankan

3. Data SSO (Login)
   - Session: 24 jam
   - Audit log: 2 tahun
   - Failed login attempts: 90 hari

4. Penghapusan Otomatis
   - Sistem akan otomatis menghapus data sesuai jadwal
   - Notifikasi 30 hari sebelum penghapusan
   - HR dapat memperpanjang retensi dengan justifikasi
```

### 5. **Access Control Policy**

```markdown
KEBIJAKAN KONTROL AKSES

1. Principle of Least Privilege
   - Setiap user hanya diberi akses minimal yang diperlukan
   - Akses ke data sensitif memerlukan justifikasi

2. Role-Based Access
   - User: Hanya data pribadi sendiri
   - Manager: Data tim langsung (terbatas)
   - HR: Data semua karyawan
   - Admin: Full access (dengan audit ketat)

3. Sensitive Data Access
   - KTP/NPWP: Hanya HR + Admin
   - Gaji: Hanya Payroll staff
   - Medical: Hanya Medical team + employee

4. Access Review
   - Review akses setiap 3 bulan
   - Revoke akses user yang sudah resign
   - Audit log untuk semua akses sensitive data
```

### 6. **Incident Response Plan**

Already documented above in Cybersecurity section.

### 7. **Data Processing Record** (ROPA - Record of Processing Activities)

Required by UU PDP:
```markdown
REGISTER AKTIVITAS PENGOLAHAN DATA

ID: ROPA-001
Nama Aktivitas: Manajemen Data Karyawan
Tujuan: Administrasi kepegawaian, penggajian, compliance
Dasar Hukum: Kontrak kerja, UU Ketenagakerjaan
Kategori Data:
  - Data identitas (Nama, NIK, NPWP)
  - Data kontak (Email, Phone)
  - Data pekerjaan (NIP, Posisi, Gaji)
  - Data sensitif (Medical records)
Kategori Subjek Data: Karyawan
Penerima Data: HR Dept, Finance Dept, Management
Transfer Data: Tidak ada
Retensi: 5 tahun setelah berakhir hubungan kerja
Keamanan:
  - Encryption at rest
  - Access control
  - Audit logging
  - Regular backup
PIC: HR Director
Terakhir Update: 2025-10-15
```

---

## ✅ Implementation Checklist

### Immediate (Critical)

- [ ] **Enable MongoDB encryption** for sensitive fields
- [ ] **Implement data masking** for KTP/NPWP display
- [ ] **Add audit logging** for all sensitive data access
- [ ] **Create privacy policy** (Kebijakan Privasi)
- [ ] **Prepare breach response plan**
- [ ] **Document legal basis** for each data field
- [ ] **Add consent tracking** to employee onboarding

### Short Term (1-2 months)

- [ ] **Implement field-level access control**
- [ ] **Add data export** functionality (GDPR/PDP compliance)
- [ ] **Add data deletion** functionality
- [ ] **Create employee consent forms**
- [ ] **Implement data retention policies**
- [ ] **Add justification** requirement for sensitive data access
- [ ] **Implement rate limiting** on sensitive queries
- [ ] **Add IP whitelisting** for admin access

### Medium Term (3-6 months)

- [ ] **Data Processing Agreements** with vendors
- [ ] **Regular security audits**
- [ ] **Penetration testing**
- [ ] **Staff training** on data privacy
- [ ] **Appoint Data Protection Officer** (DPO)
- [ ] **Implement intrusion detection**
- [ ] **Regular backup testing**
- [ ] **Disaster recovery plan**

### Long Term (6-12 months)

- [ ] **ISO 27001 certification** (optional but recommended)
- [ ] **Regular compliance audits**
- [ ] **Bug bounty program**
- [ ] **Advanced threat detection**
- [ ] **Data anonymization** for analytics
- [ ] **Blockchain audit trail** (optional)

---

## 🎯 Recommended Architecture Changes

### Option 1: Keep Current Model with Enhancements

```
users (auth only)
  ↓ userId reference
employees (HR data)
  + Field-level encryption
  + Role-based field access
  + Audit all access
  + Data masking
```

**Pros**: Minimal code changes
**Cons**: Still stores sensitive data

### Option 2: Separate Sensitive Data (Recommended)

```
users (auth)
  ↓
employees (basic profile)
  ↓
employee_sensitive (encrypted vault)
  - KTP
  - NPWP
  - Date of birth
  - Medical records
  - Salary info
```

**Pros**: Better security, easier compliance
**Cons**: More complex queries

### Option 3: External HR System Integration

```
users (auth) ← Aksara SSO
  ↓ API
external_hr_system (employee data)
  - Dedicated HR system
  - ISO 27001 certified
  - Full GDPR/PDP compliant
```

**Pros**: Best practice separation, vendor responsibility
**Cons**: Additional cost, integration complexity

---

## 💼 Legal Liability

### Who is Responsible?

Under UU PDP:
- **Data Controller** (Pengendali Data Pribadi): Company using Aksara SSO
- **Data Processor** (Pemroses Data Pribadi): Aksara SSO system

### Penalties for Non-Compliance

**Administrative Sanctions**:
- Written warning
- Temporary suspension of data processing
- Data deletion
- Fine up to IDR 2 billion per violation

**Criminal Penalties**:
- Prison up to 6 years
- Fine up to IDR 6 billion

### Risk Areas

1. **Unauthorized Access**: Employee data accessed by unauthorized person
2. **Data Breach**: External attacker steals employee data
3. **Data Misuse**: Using employee data for unauthorized purposes
4. **Retention Violations**: Keeping data longer than necessary
5. **No Consent**: Processing data without proper consent
6. **No Notification**: Failing to notify breach within 72 hours

---

## 📞 Recommended Contacts

### Data Protection Officer (DPO)
- Should be appointed
- Responsible for compliance
- Contact for data subjects
- Reports to management

### External Consultants
- Legal counsel (privacy law specialist)
- Security auditor (penetration tester)
- Compliance consultant (UU PDP expert)

---

**Last Updated**: October 15, 2025
**Requires Review By**: Legal Counsel, DPO, CISO
**Next Review Date**: Every 6 months or when law changes
