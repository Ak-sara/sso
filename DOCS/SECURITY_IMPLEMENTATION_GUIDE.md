# Security Implementation Guide
# Aksara SSO - Data Protection & Cybersecurity

**Date**: October 15, 2025
**Priority**: 🔴 CRITICAL
**Compliance**: UU PDP No. 27 Tahun 2022

---

## 📋 Overview

This guide provides step-by-step technical implementation for securing sensitive employee data in Aksara SSO, ensuring compliance with Indonesian Data Protection Law (UU PDP).

---

## 🔐 Phase 1: MongoDB Field-Level Encryption (IMMEDIATE)

### Why This is Critical

Employee data contains:
- NIK (KTP) - National ID Card
- NPWP - Tax ID
- Date of Birth
- Phone numbers

These are **highly regulated** under UU PDP and must be encrypted at rest.

### Implementation

#### Step 1: Generate Master Key

```bash
# Generate a 96-byte master encryption key
openssl rand -base64 96 > master-key.txt

# Store securely in environment variable
export MONGODB_MASTER_KEY=$(cat master-key.txt)
```

⚠️ **IMPORTANT**: Store this key in:
- AWS Secrets Manager, OR
- Azure Key Vault, OR
- HashiCorp Vault

**NEVER** commit to git or store in code.

#### Step 2: Create Client-Side Field Level Encryption

**File**: `src/lib/db/encryption.ts`

```typescript
import { MongoClient, ClientEncryption } from 'mongodb';
import { Binary } from 'mongodb';

const masterKey = Buffer.from(process.env.MONGODB_MASTER_KEY!, 'base64');

const kmsProviders = {
  local: {
    key: masterKey
  }
};

const keyVaultNamespace = 'encryption.__keyVault';

export async function createEncryptedClient() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();

  const encryption = new ClientEncryption(client, {
    keyVaultNamespace,
    kmsProviders
  });

  // Create data encryption key if not exists
  const dataKeyId = await encryption.createDataKey('local', {
    keyAltNames: ['employee_sensitive_data_key']
  });

  return { client, encryption, dataKeyId };
}

// Encrypt sensitive field
export async function encryptField(
  encryption: ClientEncryption,
  value: string,
  algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic' | 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
): Promise<Binary> {
  return await encryption.encrypt(value, {
    keyAltName: 'employee_sensitive_data_key',
    algorithm
  });
}

// Decrypt sensitive field
export async function decryptField(
  encryption: ClientEncryption,
  encrypted: Binary
): Promise<string> {
  return await encryption.decrypt(encrypted);
}
```

#### Step 3: Update Employee Repository

**File**: `src/lib/db/repositories/employee.ts`

```typescript
import { encryptField, decryptField, createEncryptedClient } from '../encryption';

export class EmployeeRepository {
  private encryption?: ClientEncryption;

  async init() {
    const { encryption } = await createEncryptedClient();
    this.encryption = encryption;
  }

  async create(employee: Omit<Employee, '_id'>): Promise<Employee> {
    if (!this.encryption) await this.init();

    // Encrypt sensitive fields before saving
    const encryptedEmployee = {
      ...employee,
      idNumber: employee.idNumber
        ? await encryptField(
            this.encryption!,
            employee.idNumber,
            'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          )
        : undefined,
      taxId: employee.taxId
        ? await encryptField(
            this.encryption!,
            employee.taxId,
            'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          )
        : undefined,
      dateOfBirth: employee.dateOfBirth
        ? await encryptField(
            this.encryption!,
            employee.dateOfBirth.toISOString(),
            'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
          )
        : undefined,
      phone: employee.phone
        ? await encryptField(
            this.encryption!,
            employee.phone,
            'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
          )
        : undefined
    };

    const result = await this.collection.insertOne(encryptedEmployee as any);
    return { ...employee, _id: result.insertedId } as Employee;
  }

  async findById(id: string): Promise<Employee | null> {
    if (!this.encryption) await this.init();

    const employee = await this.collection.findOne({ _id: new ObjectId(id) });
    if (!employee) return null;

    // Decrypt sensitive fields
    return {
      ...employee,
      idNumber: employee.idNumber
        ? await decryptField(this.encryption!, employee.idNumber)
        : undefined,
      taxId: employee.taxId
        ? await decryptField(this.encryption!, employee.taxId)
        : undefined,
      dateOfBirth: employee.dateOfBirth
        ? new Date(await decryptField(this.encryption!, employee.dateOfBirth))
        : undefined,
      phone: employee.phone
        ? await decryptField(this.encryption!, employee.phone)
        : undefined
    } as Employee;
  }
}
```

#### Step 4: Environment Variables

Add to `.env`:
```bash
MONGODB_MASTER_KEY=<your-96-byte-base64-key>
MONGODB_KEY_VAULT_NAMESPACE=encryption.__keyVault
```

---

## 🎭 Phase 2: Data Masking (IMMEDIATE)

### Implementation

**File**: `src/lib/utils/masking.ts`

```typescript
export function maskKTP(ktp: string): string {
  if (!ktp || ktp.length < 16) return '***';
  return ktp.slice(0, 4) + '*'.repeat(12);
}

export function maskNPWP(npwp: string): string {
  if (!npwp || npwp.length < 15) return '***';
  // Format: 01.234.567.8-901.234
  return npwp.slice(0, 9) + '*'.repeat(6);
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 10) return '***';
  // Show first 4 and last 4 digits
  const visible = 4;
  return phone.slice(0, visible) + '*'.repeat(phone.length - visible * 2) + phone.slice(-visible);
}

export function maskEmail(email: string): string {
  if (!email) return '***';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visibleLocal = Math.min(3, local.length);
  return local.slice(0, visibleLocal) + '***@' + domain;
}

// Helper to check if user can view unmasked data
export function canViewSensitiveData(userRoles: string[], field: string): boolean {
  const sensitiveDataPermissions = {
    idNumber: ['hr', 'admin'],
    taxId: ['hr', 'admin', 'payroll'],
    dateOfBirth: ['hr', 'admin'],
    phone: ['hr', 'admin', 'manager']
  };

  const allowedRoles = sensitiveDataPermissions[field as keyof typeof sensitiveDataPermissions] || [];
  return userRoles.some(role => allowedRoles.includes(role));
}
```

**Usage in Svelte Components**:

```svelte
<script lang="ts">
  import { maskKTP, maskNPWP, canViewSensitiveData } from '$lib/utils/masking';
  import { page } from '$app/stores';

  let { employee } = $props();
  const userRoles = $derived($page.data.user?.roles || []);

  const displayKTP = $derived(
    canViewSensitiveData(userRoles, 'idNumber')
      ? employee.idNumber
      : maskKTP(employee.idNumber)
  );
</script>

<div>
  <label>NIK (KTP):</label>
  <span>{displayKTP}</span>
  {#if !canViewSensitiveData(userRoles, 'idNumber')}
    <button onclick={() => requestFullAccess('idNumber')}>
      👁️ Lihat Lengkap (Memerlukan Justifikasi)
    </button>
  {/if}
</div>
```

---

## 📝 Phase 3: Comprehensive Audit Logging (HIGH PRIORITY)

### Audit Schema

**File**: `src/lib/db/schemas/audit.ts`

```typescript
export const SensitiveDataAccessLogSchema = z.object({
  _id: z.custom<ObjectId>().optional(),

  // Who
  userId: z.string(),
  userEmail: z.string(),
  userRoles: z.array(z.string()),

  // What
  action: z.enum(['VIEW', 'EDIT', 'EXPORT', 'DELETE']),
  resource: z.enum(['employee', 'partner', 'user']),
  resourceId: z.string(),
  field: z.string(), // 'idNumber', 'taxId', etc

  // Why
  justification: z.string().optional(), // Required for sensitive access
  approvedBy: z.string().optional(),

  // When
  timestamp: z.date(),

  // Where
  ipAddress: z.string(),
  userAgent: z.string(),

  // Context
  previousValue: z.string().optional(), // For EDIT actions
  newValue: z.string().optional(),

  // Risk assessment
  riskLevel: z.enum(['low', 'medium', 'high']),
  flagged: z.boolean().default(false), // For suspicious activity
});

export type SensitiveDataAccessLog = z.infer<typeof SensitiveDataAccessLogSchema>;
```

### Audit Middleware

**File**: `src/lib/auth/audit-middleware.ts`

```typescript
import type { Handle } from '@sveltejs/kit';
import { getDB } from '$lib/db/connection';

const SENSITIVE_FIELDS = ['idNumber', 'taxId', 'dateOfBirth', 'salary'];
const SENSITIVE_PATHS = ['/employees/', '/partners/', '/users/'];

export const auditHandle: Handle = async ({ event, resolve }) => {
  const startTime = Date.now();
  const response = await resolve(event);
  const duration = Date.now() - startTime;

  // Check if this is a sensitive data access
  const isSensitivePath = SENSITIVE_PATHS.some(path => event.url.pathname.startsWith(path));

  if (isSensitivePath && event.locals.user) {
    await logDataAccess({
      userId: event.locals.user.userId,
      userEmail: event.locals.user.email,
      userRoles: event.locals.user.roles,
      action: event.request.method === 'GET' ? 'VIEW' : 'EDIT',
      resource: event.url.pathname.split('/')[1] as 'employee' | 'partner' | 'user',
      resourceId: event.url.pathname.split('/')[2] || 'list',
      timestamp: new Date(),
      ipAddress: event.request.headers.get('x-forwarded-for') || event.getClientAddress(),
      userAgent: event.request.headers.get('user-agent') || 'unknown',
      duration,
      riskLevel: calculateRiskLevel(event)
    });
  }

  return response;
};

function calculateRiskLevel(event: RequestEvent): 'low' | 'medium' | 'high' {
  const hour = new Date().getHours();
  const isOffHours = hour < 6 || hour > 22;
  const isWeekend = [0, 6].includes(new Date().getDay());

  // High risk: Off-hours access or bulk export
  if (isOffHours || isWeekend) return 'high';
  if (event.url.searchParams.has('export')) return 'high';

  // Medium risk: Edit operations
  if (event.request.method !== 'GET') return 'medium';

  return 'low';
}
```

---

## 🚨 Phase 4: Breach Detection & Response (HIGH PRIORITY)

### Anomaly Detection

**File**: `src/lib/security/anomaly-detection.ts`

```typescript
export class AnomalyDetector {
  // Detect suspicious patterns
  async detectAnomalies(userId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const recentAccess = await this.getRecentAccess(userId, 24); // Last 24 hours

    // Pattern 1: Excessive data access
    if (recentAccess.length > 100) {
      alerts.push({
        type: 'EXCESSIVE_ACCESS',
        severity: 'high',
        message: `User ${userId} accessed ${recentAccess.length} records in 24h`,
        action: 'NOTIFY_SECURITY_TEAM'
      });
    }

    // Pattern 2: Unusual time access
    const offHoursAccess = recentAccess.filter(a => {
      const hour = a.timestamp.getHours();
      return hour < 6 || hour > 22;
    });

    if (offHoursAccess.length > 10) {
      alerts.push({
        type: 'OFF_HOURS_ACCESS',
        severity: 'medium',
        message: `User ${userId} accessed data ${offHoursAccess.length} times off-hours`,
        action: 'REQUIRE_JUSTIFICATION'
      });
    }

    // Pattern 3: Mass export
    const exports = recentAccess.filter(a => a.action === 'EXPORT');
    if (exports.length > 5) {
      alerts.push({
        type: 'MASS_EXPORT',
        severity: 'critical',
        message: `User ${userId} exported ${exports.length} datasets`,
        action: 'SUSPEND_ACCOUNT'
      });
    }

    // Pattern 4: Access from new location
    const locations = new Set(recentAccess.map(a => a.ipAddress));
    if (locations.size > 3) {
      alerts.push({
        type: 'MULTIPLE_LOCATIONS',
        severity: 'medium',
        message: `User ${userId} accessed from ${locations.size} different IPs`,
        action: 'VERIFY_IDENTITY'
      });
    }

    return alerts;
  }

  // Automatically respond to high-severity alerts
  async respondToAlert(alert: Alert, userId: string) {
    switch (alert.action) {
      case 'SUSPEND_ACCOUNT':
        await this.suspendUser(userId);
        await this.notifySecurityTeam(alert);
        await this.notifyUser(userId, 'Account suspended due to suspicious activity');
        break;

      case 'NOTIFY_SECURITY_TEAM':
        await this.notifySecurityTeam(alert);
        break;

      case 'REQUIRE_JUSTIFICATION':
        await this.requestJustification(userId);
        break;

      case 'VERIFY_IDENTITY':
        await this.triggerMFAChallenge(userId);
        break;
    }
  }
}
```

### Breach Notification System

**File**: `src/lib/security/breach-notification.ts`

```typescript
interface BreachDetails {
  incidentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedDataTypes: string[]; // ['idNumber', 'taxId', etc]
  affectedUsers: string[]; // Array of user IDs
  detectedAt: Date;
  confirmedAt: Date;
  containedAt?: Date;
  rootCause?: string;
  remediation?: string;
}

export class BreachNotificationService {
  // UU PDP requires notification within 3x24 hours
  async notifyBreach(breach: BreachDetails) {
    const deadline = new Date(breach.confirmedAt.getTime() + 72 * 60 * 60 * 1000);

    // 1. Notify affected users
    await this.notifyAffectedUsers(breach);

    // 2. Notify Kementerian Kominfo
    await this.notifyKominfo(breach);

    // 3. Notify BSSN if critical infrastructure
    if (breach.severity === 'critical') {
      await this.notifyBSSN(breach);
    }

    // 4. Log notification for compliance
    await this.logNotification(breach, deadline);
  }

  private async notifyAffectedUsers(breach: BreachDetails) {
    const template = `
      PEMBERITAHUAN PENTING: Insiden Keamanan Data

      Yth. ${user.name},

      Kami memberitahukan bahwa terjadi insiden keamanan yang mungkin
      mempengaruhi data pribadi Anda:

      Tanggal Insiden: ${breach.detectedAt}
      Data yang Terpengaruh: ${breach.affectedDataTypes.join(', ')}
      Status: ${breach.containedAt ? 'Telah ditangani' : 'Dalam penanganan'}

      Langkah yang telah kami ambil:
      - Segera mengamankan sistem
      - Melakukan investigasi menyeluruh
      - Memberitahu pihak berwenang

      Langkah yang perlu Anda lakukan:
      - Ubah password Anda segera
      - Aktifkan MFA jika belum
      - Pantau aktivitas akun Anda
      - Hubungi kami jika ada aktivitas mencurigakan

      Untuk informasi lebih lanjut, hubungi:
      Email: dpo@company.co.id
      Telepon: (021) xxx-xxxx

      Nomor Incident: ${breach.incidentId}

      Terima kasih atas perhatian Anda.
    `;

    // Send to all affected users
    for (const userId of breach.affectedUsers) {
      await this.sendEmail(userId, template);
    }
  }

  private async notifyKominfo(breach: BreachDetails) {
    // Send formal notification to Kominfo
    // Format according to Kominfo requirements
  }
}
```

---

## 🔍 Phase 5: Access Control Implementation

### Role-Based Field Access

**File**: `src/lib/auth/field-access-control.ts`

```typescript
type FieldPermission = {
  canView: string[]; // List of fields
  canEdit: string[];
};

const FIELD_PERMISSIONS: Record<string, FieldPermission> = {
  user: {
    canView: ['firstName', 'lastName', 'email', 'workLocation'],
    canEdit: []
  },
  manager: {
    canView: [
      'firstName', 'lastName', 'email', 'phone',
      'organizationId', 'orgUnitId', 'positionId', 'managerId'
    ],
    canEdit: []
  },
  hr: {
    canView: ['*'], // All fields
    canEdit: [
      'organizationId', 'orgUnitId', 'positionId',
      'employmentType', 'employmentStatus', 'joinDate'
    ]
  },
  payroll: {
    canView: ['firstName', 'lastName', 'taxId', 'employeeId'],
    canEdit: []
  },
  admin: {
    canView: ['*'],
    canEdit: ['*']
  }
};

export function canAccessField(
  userRoles: string[],
  field: string,
  operation: 'view' | 'edit'
): boolean {
  for (const role of userRoles) {
    const permissions = FIELD_PERMISSIONS[role];
    if (!permissions) continue;

    const allowedFields = operation === 'view' ? permissions.canView : permissions.canEdit;

    if (allowedFields.includes('*') || allowedFields.includes(field)) {
      return true;
    }
  }

  return false;
}

// Filter object to only include accessible fields
export function filterAccessibleFields<T extends Record<string, any>>(
  data: T,
  userRoles: string[],
  operation: 'view' | 'edit'
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(data)) {
    if (canAccessField(userRoles, key, operation)) {
      result[key as keyof T] = value;
    }
  }

  return result;
}
```

### Usage in API Endpoints

```typescript
// In +page.server.ts
export const load: PageServerLoad = async ({ locals, params }) => {
  const employee = await employeeRepository.findById(params.id);
  if (!employee) throw error(404);

  // Filter fields based on user's role
  const accessibleEmployee = filterAccessibleFields(
    employee,
    locals.user!.roles,
    'view'
  );

  return { employee: accessibleEmployee };
};
```

---

## 📊 Phase 6: Compliance Dashboard (MEDIUM PRIORITY)

### Compliance Metrics

Create admin dashboard showing:

1. **Data Inventory**:
   - Total employees with PII
   - Data types stored
   - Retention status

2. **Access Statistics**:
   - Who accessed sensitive data
   - Frequency of access
   - Unusual patterns flagged

3. **Compliance Status**:
   - % of employees with consent
   - % of data within retention period
   - Open data subject requests

4. **Security Metrics**:
   - Failed login attempts
   - Suspicious activities detected
   - Breaches (if any)

5. **Audit Reports**:
   - Downloadable audit logs
   - Compliance reports for regulators
   - ROPA (Record of Processing Activities)

---

## 🧪 Testing Security Implementation

### Security Test Checklist

```bash
# 1. Encryption Test
bun test:encryption

# 2. Access Control Test
bun test:access-control

# 3. Audit Logging Test
bun test:audit

# 4. Data Masking Test
bun test:masking

# 5. Breach Detection Test
bun test:anomaly

# 6. Penetration Test (External)
# Hire professional pentester

# 7. Compliance Audit
# Engage UU PDP compliance auditor
```

---

## 📅 Implementation Timeline

| Phase | Priority | Duration | Dependencies |
|-------|----------|----------|--------------|
| 1. Encryption | 🔴 Critical | 1 week | None |
| 2. Data Masking | 🔴 Critical | 3 days | None |
| 3. Audit Logging | 🟠 High | 1 week | None |
| 4. Breach Detection | 🟠 High | 2 weeks | Phase 3 |
| 5. Access Control | 🟡 Medium | 1 week | Phase 2 |
| 6. Compliance Dashboard | 🟡 Medium | 2 weeks | Phase 1-4 |

**Total Estimated Time**: 6-8 weeks

---

## 💰 Budget Considerations

| Item | Purpose | Est. Cost/Year (USD) |
|------|---------|----------------------|
| MongoDB Atlas (M10) | Encrypted storage | $700 |
| AWS Key Management Service | Key storage | $100 |
| Sentry/Error Tracking | Security monitoring | $300 |
| External Security Audit | Annual compliance | $5,000-10,000 |
| DPO Consultant | Legal compliance | $10,000-20,000 |
| Penetration Testing | Annual security test | $3,000-5,000 |
| **TOTAL** | | **$19,100-36,100** |

---

## 📞 Support & Maintenance

### Ongoing Tasks

- **Daily**: Monitor anomaly alerts
- **Weekly**: Review audit logs
- **Monthly**: Security patch updates
- **Quarterly**: Access permission review
- **Annually**: Full security audit, penetration test

### Incident Response Team

- Security Officer (CISO)
- IT Administrator
- Legal Counsel
- HR Director
- Data Protection Officer

---

**Document Version**: 1.0
**Last Updated**: October 15, 2025
**Next Review**: January 15, 2026
