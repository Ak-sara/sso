# Data Privacy & Compliance - Aksara SSO

> **Last Updated**: November 2025
> **Compliance**: UU PDP No. 27 Tahun 2022 (Indonesian Data Protection Law)
> **Status**: ⚠️ **SECURITY ENHANCEMENTS REQUIRED**

---

## 🎯 Executive Summary

Aksara SSO stores **sensitive Personal Identifiable Information (PII)** including NIK (KTP), NPWP, date of birth, and phone numbers in the unified `identities` collection. Currently, this data is **unencrypted at rest**, posing **significant legal and security risks** under Indonesian Data Protection Law (UU No. 27 Tahun 2022).

**Bottom Line**: System requires immediate security enhancements to comply with UU PDP regulations.

---

## 📊 Current Data Architecture

### Unified Identity Model

Aksara SSO uses a single `identities` collection with polymorphic schema for all user types:

```
┌────────────────────────────────────────┐
│         IDENTITIES COLLECTION          │
│   (Unified, Polymorphic Schema)        │
├────────────────────────────────────────┤
│                                        │
│  Common Fields (All Types):            │
│  - email, username, password (hashed)  │
│  - identityType, isActive, roles       │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ identityType: 'employee'         │ │
│  │ employee: {                      │ │
│  │   employeeId (NIK) 🔴 SENSITIVE  │ │
│  │   idNumber (KTP)   🔴 SENSITIVE  │ │
│  │   taxId (NPWP)     🔴 SENSITIVE  │ │
│  │   dateOfBirth      🔴 SENSITIVE  │ │
│  │   phone            🔴 SENSITIVE  │ │
│  │   organizationId, orgUnitId,     │ │
│  │   positionId, managerId          │ │
│  │ }                                │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ identityType: 'partner'          │ │
│  │ partner: {                       │ │
│  │   companyName, contractDates     │ │
│  │ }                                │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ identityType: 'external'         │ │
│  │ external: {                      │ │
│  │   accessLevel, expiryDate        │ │
│  │ }                                │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ identityType: 'service_account'  │ │
│  │ serviceAccount: {                │ │
│  │   oauthClientId, scopes          │ │
│  │ }                                │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

**Key Points**:
- ✅ Single source of truth for all identities
- ✅ Type-specific fields in nested objects
- ⚠️ **BUT** employee sensitive data is currently **unencrypted**

---

## ⚠️ Critical Compliance Gaps

### 1. **No Encryption at Rest**

**Risk**: Data breach exposes all employee NIK, NPWP, date of birth, phone numbers
**Penalty**: Up to IDR 2 billion fine + criminal charges (UU PDP Article 67)
**Fix**: Implement MongoDB Field-Level Encryption (**Priority 1**)

**Sensitive Fields in `identities` Collection**:
```typescript
{
  identityType: 'employee',
  employee: {
    idNumber: "3174012345670001",    // 🔴 KTP - Must encrypt
    taxId: "31.740.123.4-567.000",   // 🔴 NPWP - Must encrypt
    dateOfBirth: "1990-01-01",       // 🔴 DOB - Must encrypt
    phone: "+628123456789",          // 🔴 Phone - Must encrypt
  }
}
```

### 2. **No Access Control on Sensitive Fields**

**Risk**: Any HR role can see ALL employee data including NIK/NPWP
**Penalty**: Violation of data minimization principle (UU PDP Article 13)
**Fix**: Implement role-based field-level access control (**Priority 1**)

**Required Controls**:
- HR can view masked data by default
- Viewing unmasked data requires justification
- Access audit trail for sensitive fields
- Manager can only view their team's data

### 3. **No Audit Trail for Data Access**

**Risk**: Cannot prove who accessed sensitive data when
**Penalty**: Cannot comply with investigation requests (UU PDP Article 46)
**Fix**: Implement comprehensive audit logging (**Priority 2**)

**Currently Logged** ✅:
- Authentication events
- Employee lifecycle events (onboarding, mutation, offboarding)
- OAuth operations
- Organization management

**Missing** ❌:
- Sensitive field access (who viewed NIK/NPWP)
- Data export events
- Data deletion events

### 4. **No Data Masking**

**Risk**: Sensitive data displayed in plain text on screen
**Penalty**: Shoulder surfing, unauthorized viewing
**Fix**: Implement data masking by default (**Priority 1**)

**Required Masking**:
- KTP: `3174************01` (show first 4 and last 2)
- NPWP: `31.***.***.***-000` (show first 2 and last 3)
- Phone: `+6281*****89` (show first 4 and last 2)
- Email: `jo***@example.com` (show first 2 chars)

---

## 🔐 UU PDP No. 27 Tahun 2022 Requirements

### Personal Data Categories (Article 4)

**General Personal Data** (Basic):
- Full name
- Gender
- Place/date of birth
- Marital status
- Personal ID number (NIK) 🔴
- Phone number 🔴
- Email address

**Specific Personal Data** (Higher Protection):
- Health information
- Biometric data
- Genetic data
- Sexual orientation
- Political views
- Criminal records
- Financial data 🔴 (NPWP)

**In Aksara SSO**:
- ✅ We store General Personal Data (NIK, phone, email, DOB)
- ✅ We store Specific Personal Data (NPWP - financial identifier)
- ⚠️ **BOTH require encryption and strict access control**

### Data Subject Rights (Articles 4-6)

1. **Right to Know** (Article 5):
   - ✅ Purpose of data processing
   - ✅ Duration of data storage
   - ✅ Third parties who receive data

2. **Right to Access** (Article 6):
   - ⏳ **TODO**: Employee self-service portal to view own data
   - ⏳ **TODO**: Download personal data in machine-readable format

3. **Right to Rectification** (Article 6):
   - ✅ Employees can request updates via HR
   - ⏳ **TODO**: Self-service profile editing for non-sensitive fields

4. **Right to Erasure** (Article 6):
   - ⏳ **TODO**: Account deletion request workflow
   - ⏳ **TODO**: Data anonymization (instead of hard delete)

5. **Right to Data Portability** (Article 6):
   - ⏳ **TODO**: Export personal data as JSON/CSV

6. **Right to Object** (Article 6):
   - ⏳ **TODO**: Opt-out mechanism for non-essential processing

### Lawful Basis for Processing (Article 20)

**For Employee Data**:
1. ✅ **Contract Performance** - Employment relationship requires processing
2. ✅ **Legitimate Interest** - HR management, payroll, org structure
3. ⏳ **TODO: Consent** - Employee must provide explicit consent

**Required Actions**:
- ⏳ Create employee consent form
- ⏳ Collect consent during onboarding
- ⏳ Allow consent withdrawal
- ⏳ Document consent in database

### Data Minimization (Article 13)

**Principle**: Only collect data that is necessary and relevant

**Currently Collected**:
- ✅ NIK (required for identification)
- ✅ NPWP (required for tax reporting)
- ✅ Date of birth (required for age verification, retirement planning)
- ✅ Phone (required for emergency contact)
- ✅ Email (required for communication)
- ✅ Org unit, position (required for access control)

**Assessment**: ✅ All fields are necessary and justified

### Purpose Limitation (Article 14)

**Declared Purposes**:
1. ✅ Employee identity verification
2. ✅ Organization structure management
3. ✅ Access control to connected applications
4. ✅ Payroll processing
5. ✅ Compliance with labor laws

**Restrictions**:
- ❌ Cannot use employee data for marketing
- ❌ Cannot sell employee data to third parties
- ❌ Cannot process for purposes not disclosed

### Data Retention (Article 15)

**Principle**: Delete data after it's no longer needed

**Recommended Retention Periods**:

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Active employee data | Until termination + 5 years | Labor law requirement |
| Terminated employee data | 5 years after termination | Tax & audit requirements |
| Audit logs | 7 years | Compliance & investigation |
| Session data | 24 hours | Security |
| Password reset tokens | 1 hour | Security |

**Current Status**:
- ❌ No automatic deletion
- ❌ No retention policy configuration
- ⏳ **TODO**: Implement data retention automation

### Breach Notification (Article 62)

**Requirement**: Notify within **3x24 hours** (72 hours)

**Notification Recipients**:
1. Data Protection Officer (DPO)
2. Affected employees
3. Ministry of Communication and Informatics (if > 1,000 affected)

**Current Status**:
- ⏳ **TODO**: Breach detection system
- ⏳ **TODO**: Breach notification template
- ⏳ **TODO**: Automated notification workflow
- ⏳ **TODO**: Incident response playbook

### Data Protection Officer (Article 54)

**Requirement**: Appoint a DPO responsible for compliance

**DPO Responsibilities**:
1. Monitor compliance with UU PDP
2. Conduct privacy impact assessments
3. Handle data subject requests
4. Liaise with regulatory authorities
5. Training and awareness

**Current Status**:
- ❌ No DPO appointed
- ⏳ **TODO**: Hire or designate DPO
- ⏳ **TODO**: Document DPO responsibilities
- ⏳ **TODO**: Add DPO contact to privacy policy

---

## 💰 Penalties for Non-Compliance

### Criminal Penalties (Article 67)

**Unauthorized Processing**:
- Prison: Up to 5 years
- Fine: Up to IDR 5 billion

**Data Breach (Due to Negligence)**:
- Prison: Up to 6 years
- Fine: Up to IDR 6 billion

### Administrative Penalties (Article 57)

1. Written warning
2. Temporary suspension of operations
3. Deletion or destruction of personal data
4. Administrative fine: Up to 2% of annual revenue or IDR 2 billion (whichever is higher)

---

## 📋 Required Policies & Documents

### Must Have (Legal Requirement)

1. ✅ **Kebijakan Privasi** (Privacy Policy)
   - What data is collected
   - Why and how it's used
   - Data subject rights
   - Contact for DPO
   - See: `KEBIJAKAN_PRIVASI_TEMPLATE.md`

2. ⏳ **Formulir Persetujuan** (Consent Form)
   - Signed by each employee
   - Explicit consent for data processing
   - Can be withdrawn anytime

3. ⏳ **Kebijakan Keamanan Data** (Data Security Policy)
   - Technical and organizational measures
   - Access control procedures
   - Incident response plan

4. ⏳ **Kebijakan Retensi Data** (Data Retention Policy)
   - Retention periods per data type
   - Deletion procedures
   - Archival rules

5. ⏳ **ROPA** (Record of Processing Activities)
   - What data is processed
   - Why it's processed
   - Who has access
   - Where it's stored
   - How long it's kept

---

## 💡 Recommended Options

### Option 1: Minimal Compliance (2-4 weeks)
**Budget**: $5,000-10,000
**Timeline**: Weeks 1-3 (Phase 1 in _DEV_GUIDE.md)

- ✅ Implement MongoDB Field-Level Encryption
- ✅ Add data masking in UI
- ✅ Create basic audit logging (already done)
- ✅ Draft privacy policy
- ✅ Get employee consent
- ✅ Appoint DPO

**Result**: Meets minimum UU PDP requirements

### Option 2: Standard Security (2-3 months)
**Budget**: $20,000-30,000
**Timeline**: Phases 1-2 in _DEV_GUIDE.md

- ✅ Everything in Option 1
- ✅ Advanced access control (field-level)
- ✅ MFA/2FA
- ✅ Account self-service portal
- ✅ Breach notification system
- ✅ Data retention automation
- ✅ Compliance dashboard

**Result**: Industry standard security + full UU PDP compliance

### Option 3: Enterprise-Grade (6-12 months)
**Budget**: $50,000-100,000
**Timeline**: All phases in _DEV_GUIDE.md

- ✅ Everything in Option 2
- ✅ ISO 27001 certification
- ✅ External security audits (quarterly)
- ✅ Penetration testing
- ✅ Bug bounty program
- ✅ Advanced threat detection
- ✅ Data anonymization for analytics

**Result**: Best-in-class security posture

---

## 📌 Action Items by Role

### For Management

1. **Current system has significant compliance gaps** that could result in **IDR 2B+ fines**
2. **Immediate action required** to avoid legal liability
3. **Budget allocation needed**: Minimum $5,000 for critical fixes
4. **Appoint Data Protection Officer (DPO)** - legal requirement
5. **Staff training required** on data protection

### For Developers

1. **Never store PII in plain text** - always encrypt
2. **Implement audit logging** for all sensitive data access
3. **Use data masking** by default in UI
4. **Test with realistic data** (but never use production PII in dev/staging)
5. **Follow secure coding practices** (OWASP guidelines)

### For HR Department

1. **Collect employee consent** for data processing
2. **Handle data subject requests** (access, rectification, deletion)
3. **Ensure data accuracy** - regular data quality checks
4. **Report breaches immediately** to DPO and employees
5. **Delete data** after retention period ends

---

## 🗺️ Implementation Roadmap

> **Note**: Detailed implementation plan with timelines, checklists, and dependencies is available in `_DEV_GUIDE.md` → Phase 1: Security & Compliance

### Phase 1: Critical Security (Weeks 1-3) 🔴 HIGH PRIORITY

1. **MongoDB Field-Level Encryption** (1 week)
   - Generate encryption keys (DEK + KEK)
   - Setup Azure Key Vault or AWS KMS
   - Encrypt: KTP, NPWP, DOB, phone

2. **Data Masking** (3 days)
   - Create masking utility
   - Apply to all UI components
   - Add field-level access control

3. **UU PDP Compliance** (1 week)
   - Appoint DPO
   - Create Kebijakan Privasi
   - Implement employee consent forms
   - Create breach notification template

4. **MFA/2FA** (1 week)
   - TOTP implementation
   - Email OTP
   - Backup codes

### Phase 2: User Experience (Weeks 4-6)

5. **Account Self-Service Portal** (5 days)
   - Profile editing
   - Password change
   - MFA setup
   - Data export (GDPR/PDP compliance)
   - Account deletion request

6. **Password Reset Flow** (3 days)
   - Email-based reset
   - Token generation
   - Security controls

### Phase 3: Advanced Features (Weeks 7+)

7. **Data Retention Automation**
8. **Breach Detection System**
9. **Compliance Dashboard**
10. **ISO 27001 Certification (optional)**

---

## 📚 Additional Resources

### Documentation

- `DATA_ARCHITECTURE.md` - Current database schema
- `AUTHENTICATION_GUIDE.md` - Auth system details
- `SECURITY_IMPLEMENTATION_GUIDE.md` - Technical implementation guide
- `KEBIJAKAN_PRIVASI_TEMPLATE.md` - Privacy policy template (Indonesian)
- `_DEV_GUIDE.md` - Complete feature and implementation roadmap

### External Resources

- [Full text of UU PDP No. 27/2022](https://peraturan.go.id/)
- [Kementerian Kominfo - Data Protection](https://www.kominfo.go.id/)
- [ISO 27001 Standard](https://www.iso.org/isoiec-27001-information-security.html)
- [OWASP Security Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [MongoDB Field-Level Encryption](https://www.mongodb.com/docs/manual/core/security-client-side-encryption/)

---

## ⚖️ Legal Disclaimer

This document provides technical and compliance guidance based on UU No. 27 Tahun 2022. **It does not constitute legal advice**. Please consult with qualified legal counsel specializing in Indonesian data protection law for specific legal guidance.

---

**Prepared By**: Claude Code (AI Assistant)
**Date**: November 2025
**Document Version**: 2.0 (Updated for Unified Identity Model)
**Classification**: 🔴 CONFIDENTIAL - Internal Use Only

---

**URGENT**: This document should be reviewed by:
- ☐ Legal Counsel (within 3 days)
- ☐ CISO / IT Security Lead (within 3 days)
- ☐ HR Director (within 1 week)
- ☐ Company Management (within 1 week)
