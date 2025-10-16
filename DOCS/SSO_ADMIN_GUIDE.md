# Aksara SSO - Administrator Guide

**Complete guide for administering Aksara SSO and managing client integrations**

Version: 1.0
Last Updated: October 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Client Application Registration](#client-application-registration)
4. [User & Employee Management](#user--employee-management)
5. [Organization & Realm Management](#organization--realm-management)
6. [Security Configuration](#security-configuration)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Integration Support](#integration-support)
9. [Troubleshooting](#troubleshooting)
10. [Backup & Recovery](#backup--recovery)

---

## Overview

As an Aksara SSO administrator, you are responsible for:

- ✅ Registering and managing OAuth clients
- ✅ Managing users, employees, and partners
- ✅ Configuring realms/organizations
- ✅ Monitoring authentication activity
- ✅ Ensuring security compliance
- ✅ Supporting client application integrations
- ✅ Maintaining system availability

### Admin Roles

Aksara SSO supports multiple admin levels:

| Role | Permissions | Scope |
|------|------------|-------|
| **Super Admin** | Full system access | All realms/organizations |
| **Realm Admin** | Manage realm settings, users, clients | Single realm |
| **HR Admin** | Employee lifecycle management | Organization-specific |
| **Audit Viewer** | Read-only access to logs | Configurable |

---

## Installation & Setup

### Prerequisites

**System Requirements**:
- **Runtime**: Bun v1.0+ or Node.js 18+
- **Database**: MongoDB Atlas (or self-hosted MongoDB 6.0+)
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: 10GB minimum (for logs and backups)
- **Network**: HTTPS/TLS certificate (production)

**Development Environment**:
```bash
# Clone repository
git clone https://github.com/yourorg/aksara-sso.git
cd aksara-sso

# Install dependencies
bun install

# Setup environment variables
cp .env.example .env
```

### Environment Configuration

Edit `.env` file:

```bash
# ============================================
# DATABASE
# ============================================
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=aksara_sso

# ============================================
# JWT & ENCRYPTION
# ============================================
# Generate with: openssl rand -hex 32
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ISSUER=https://sso.yourcompany.com

# Session secret for admin portal
SESSION_SECRET=your-session-secret-32-chars-min

# ============================================
# SERVER
# ============================================
PORT=5173
NODE_ENV=production
PUBLIC_URL=https://sso.yourcompany.com

# ============================================
# EMAIL (for notifications)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sso@yourcompany.com
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=Aksara SSO <sso@yourcompany.com>

# ============================================
# MICROSOFT ENTRA ID SYNC (optional)
# ============================================
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=your-client-secret

# ============================================
# SECURITY
# ============================================
# Comma-separated list of allowed origins
CORS_ALLOWED_ORIGINS=https://app1.com,https://app2.com

# Rate limiting (requests per minute)
RATE_LIMIT_MAX=100
```

### Database Initialization

**Option 1: Seed with sample data** (development):
```bash
bun run seed
```

This creates:
- Default admin user: `admin@ias.co.id` / `password123`
- Sample organization (IAS)
- Test OAuth client
- Sample employees

**Option 2: Manual setup** (production):

```bash
# Run migration scripts
bun run migrate

# Create first admin user
bun run create-admin
```

### Start the Server

**Development**:
```bash
bun run dev
```

**Production**:
```bash
# Build
bun run build

# Start
bun start

# Or with PM2
pm2 start ecosystem.config.js
```

**Docker**:
```bash
docker-compose up -d
```

### Verify Installation

1. Open browser: `https://sso.yourcompany.com`
2. Login with admin credentials
3. Check dashboard shows system status
4. Navigate to **OAuth Clients** - should be empty (or show test client if seeded)

---

## Client Application Registration

### Pre-Registration Checklist

Before registering a client application, collect:

- ✅ **Application name** (e.g., "OFM - Office Facility Management")
- ✅ **Description** (brief purpose of the app)
- ✅ **Redirect URIs** (all callback URLs)
- ✅ **Required scopes** (openid, email, profile, roles)
- ✅ **Grant types** (authorization_code, refresh_token)
- ✅ **Contact person** (email, phone)
- ✅ **Environment** (production, staging, development)

### Registration Methods

#### Method 1: Admin UI (Recommended)

1. **Navigate to OAuth Clients**
   - Login to admin portal
   - Click **Integrasi** → **OAuth Clients**
   - Click **+ Register New Client**

2. **Fill Client Details**
   ```yaml
   Client Name: OFM - Office Facility Management
   Description: Employee facility booking and management system
   Client Type: Confidential (server-side app)

   Redirect URIs:
     - https://ofm.yourcompany.com/auth/callback
     - https://ofm.yourcompany.com/auth/silent-refresh
     - http://localhost:5174/auth/callback  # Development only

   Allowed Scopes:
     ☑ openid (required for OIDC)
     ☑ email
     ☑ profile
     ☑ roles

   Grant Types:
     ☑ authorization_code
     ☑ refresh_token

   Token Expiration:
     Access Token: 3600 (1 hour)
     Refresh Token: 2592000 (30 days)

   Status: ☑ Active
   ```

3. **Generate Credentials**
   - Click **Generate Client Secret**
   - **CRITICAL**: Copy client secret immediately (shown only once!)
   - Download credentials as JSON for safekeeping

4. **Save Client**
   - Click **Create Client**
   - Note the generated `client_id`

#### Method 2: Script (Bulk Registration)

Create `scripts/register-client.ts`:

```typescript
import { getDB } from '$lib/db/connection';
import { hash } from 'argon2';
import { generateClientId, generateClientSecret } from '$lib/crypto';

async function registerClient() {
  const db = getDB();

  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const hashedSecret = await hash(clientSecret);

  await db.collection('oauth_clients').insertOne({
    clientId,
    clientSecret: hashedSecret,
    clientName: 'OFM - Office Facility Management',
    description: 'Employee facility booking system',
    redirectUris: [
      'https://ofm.yourcompany.com/auth/callback',
      'https://ofm.yourcompany.com/auth/silent-refresh',
      'http://localhost:5174/auth/callback'
    ],
    allowedScopes: ['openid', 'email', 'profile', 'roles'],
    grantTypes: ['authorization_code', 'refresh_token'],
    tokenExpirations: {
      accessToken: 3600,
      refreshToken: 2592000
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('✅ Client registered successfully!');
  console.log('Client ID:', clientId);
  console.log('Client Secret:', clientSecret);
  console.log('⚠️  Save these credentials securely!');
}

registerClient();
```

Run:
```bash
bun run scripts/register-client.ts
```

#### Method 3: MongoDB Direct Insert

**CRITICAL**: Client secret MUST be hashed with Argon2!

```javascript
// In MongoDB shell or Compass
use aksara_sso;

// Generate hashed secret first (use Argon2 library)
// Example hashed secret: $argon2id$v=19$m=65536,t=3,p=4$...

db.oauth_clients.insertOne({
  clientId: "ofm-client",
  clientSecret: "$argon2id$v=19$m=65536,t=3,p=4$...",  // Argon2 hash!
  clientName: "OFM - Office Facility Management",
  description: "Employee facility booking system",
  redirectUris: [
    "https://ofm.yourcompany.com/auth/callback",
    "https://ofm.yourcompany.com/auth/silent-refresh"
  ],
  allowedScopes: ["openid", "email", "profile", "roles"],
  grantTypes: ["authorization_code", "refresh_token"],
  tokenExpirations: {
    accessToken: 3600,
    refreshToken: 2592000
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Provide Credentials to Client Team

**Secure Delivery Methods**:

1. **Option A: Encrypted Email**
   - Use PGP/GPG encryption
   - Send client_id and client_secret separately

2. **Option B: Password-Protected Document**
   ```json
   {
     "client_id": "ofm-client",
     "client_secret": "ofm-secret-2025",
     "issuer": "https://sso.yourcompany.com",
     "authorization_endpoint": "https://sso.yourcompany.com/oauth/authorize",
     "token_endpoint": "https://sso.yourcompany.com/oauth/token",
     "userinfo_endpoint": "https://sso.yourcompany.com/oauth/userinfo",
     "introspection_endpoint": "https://sso.yourcompany.com/oauth/introspect",
     "revocation_endpoint": "https://sso.yourcompany.com/oauth/revoke",
     "scopes_supported": ["openid", "email", "profile", "roles"],
     "grant_types_supported": ["authorization_code", "refresh_token"]
   }
   ```
   - Protect PDF/DOCX with strong password
   - Share password via different channel (SMS, phone call)

3. **Option C: Secret Management System**
   - Use HashiCorp Vault, AWS Secrets Manager, Azure Key Vault
   - Grant access to client team

### Post-Registration Configuration

#### 1. Update CORS Settings

If client app is on different domain:

```typescript
// src/hooks.server.ts
const allowedOrigins = [
  'https://ofm.yourcompany.com',
  'http://localhost:5174'  // Development
];

export const handle: Handle = async ({ event, resolve }) => {
  const origin = event.request.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    event.setHeaders({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true'
    });
  }

  return resolve(event);
};
```

#### 2. Configure Rate Limiting

Prevent abuse:

```typescript
// Per client rate limits
const clientRateLimits = {
  'ofm-client': {
    requestsPerMinute: 100,
    tokensPerHour: 1000
  }
};
```

#### 3. Setup Monitoring

Add client to monitoring dashboard:
- Track authentication requests
- Monitor token usage
- Alert on failures

#### 4. Enable Audit Logging

```typescript
await db.collection('audit_logs').insertOne({
  event: 'client_registered',
  clientId: 'ofm-client',
  adminUser: 'admin@ias.co.id',
  timestamp: new Date(),
  details: {
    clientName: 'OFM',
    redirectUris: [...]
  }
});
```

---

## User & Employee Management

### User Types in Aksara SSO

| Type | Description | Use Case |
|------|-------------|----------|
| **SSO User** | Authentication account | Login credentials |
| **Employee** | HR record with org assignment | Company staff |
| **Partner** | External collaborator | Vendors, consultants |

### Creating SSO Users

#### Via Admin UI

1. Navigate to **Identitas** → **SSO Users**
2. Click **+ Create User**
3. Fill form:
   ```yaml
   Email: john.doe@company.com
   Name: John Doe
   Password: <generate secure password>
   Roles:
     ☑ user (default)
     ☐ hr
     ☐ manager
     ☐ admin
   Status: ☑ Active
   Email Verified: ☑ Yes
   ```
4. Click **Create**
5. Send welcome email with credentials

#### Bulk User Import (CSV)

Prepare CSV file:
```csv
email,name,password,role,active
john.doe@company.com,John Doe,P@ssw0rd123,user,true
jane.smith@company.com,Jane Smith,S3cure!Pass,hr,true
```

Import:
```bash
bun run import-users --file users.csv --realm ias
```

#### Via API (Programmatic)

```bash
curl -X POST https://sso.yourcompany.com/api/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@company.com",
    "name": "John Doe",
    "password": "P@ssw0rd123",
    "roles": ["user"],
    "isActive": true
  }'
```

### Employee Onboarding Workflow

**Complete Employee Lifecycle**:

1. **Onboarding** (New Hire)
   - Navigate to **Identitas** → **Karyawan** → **Onboard Employee**
   - Wizard Steps:
     - Step 1: Personal Information
     - Step 2: Employment Details (PKWT/Permanent/Outsource)
     - Step 3: Organization Assignment (Realm → Unit → Position)
     - Step 4: SSO Access (optional)
     - Step 5: Review & Confirm
   - Creates employee record + optional SSO user
   - Sends welcome email

2. **Mutation/Transfer**
   - Open employee detail page
   - Click **Mutasi**
   - Select new org unit/position
   - Set effective date
   - Approve
   - Automatically creates history entry

3. **Offboarding** (Termination)
   - Open employee detail page
   - Click **Offboard**
   - Enter termination date and reason
   - Optionally revoke SSO access
   - Complete checklist
   - Archives employee record

### User Permission Management

**Role-Based Access Control (RBAC)**:

```typescript
const roles = {
  user: {
    permissions: ['read:own_profile', 'update:own_profile']
  },
  hr: {
    permissions: [
      'read:employees',
      'create:employees',
      'update:employees',
      'read:org_structure'
    ]
  },
  manager: {
    permissions: [
      'read:employees',
      'approve:requests',
      'read:reports'
    ]
  },
  admin: {
    permissions: ['*']  // All permissions
  }
};
```

**Assign Roles**:
1. Navigate to user detail page
2. Click **Edit Roles**
3. Toggle role checkboxes
4. Click **Save**

### User Account Actions

**Reset Password**:
```bash
# Generate reset token
bun run reset-password --email john.doe@company.com

# Or via UI
# Navigate to user → Click "Reset Password" → Send email
```

**Disable Account** (suspension):
```typescript
await db.collection('users').updateOne(
  { email: 'john.doe@company.com' },
  { $set: { isActive: false, disabledAt: new Date() } }
);
```

**Revoke All Sessions**:
```typescript
await db.collection('refresh_tokens').deleteMany({
  user_id: userId
});

await db.collection('access_tokens').deleteMany({
  user_id: userId
});
```

---

## Organization & Realm Management

### Realm Concept

In Aksara SSO, **Realm = Organization**. Each company/entity is a realm.

**Hierarchy**:
```
Holding Company (Injourney)
  └─ Subsidiary 1 (IAS - Indonesia Aviation Services)
       ├─ Directorate (BOD)
       ├─ Division (Commercial, Operations, Risk, Finance, HR)
       └─ Department (Sales, Logistics, Accounting, etc.)
  └─ Subsidiary 2 (Another Company)
```

### Creating Organizations

1. Navigate to **Organisasi** → **Realm/Entitas**
2. Click **+ Create Realm**
3. Fill form:
   ```yaml
   Organization Name: Indonesia Aviation Services (IAS)
   Code: IAS
   Type: Subsidiary
   Parent Organization: Injourney
   Status: ☑ Active
   ```

### Creating Organizational Units

1. Navigate to **Organisasi** → **Unit Kerja**
2. Click **+ Create Unit**
3. Fill form:
   ```yaml
   Unit Name: Commercial Division
   Code: DIV-COM
   Type: Division
   Parent Unit: IAS (Root)
   Head of Unit: John Doe (select from employees)
   Status: ☑ Active
   ```

### Organization Structure Versioning

**Use Case**: Track org structure changes over time (restructuring, mergers, etc.)

**Process**:

1. **Create New Version**
   - Navigate to **Organisasi** → **Versi Struktur**
   - Click **+ Create Version**
   - Fill details:
     ```yaml
     Version Name: Q1 2025 Restructuring
     Effective Date: 2025-01-01
     SK Number: SK/001/DIR/2025
     SK Date: 2024-12-15
     Description: New commercial structure for expansion
     Status: Draft
     ```

2. **Make Structural Changes**
   - Modify units, positions, reporting lines
   - All changes tracked in version snapshot

3. **Review & Approve**
   - Change status: Draft → Pending Approval → Approved

4. **Activate Version**
   - Set effective date
   - Change status: Approved → Active
   - All employees automatically see new structure

5. **Archive Old Versions**
   - Previous versions remain for historical reference
   - Status: Active → Archived

### Position Management

1. Navigate to **Organisasi** → **Posisi**
2. Click **+ Create Position**
3. Fill form:
   ```yaml
   Position Title: Regional Sales Manager
   Code: POS-RSM
   Level: Manager
   Department: Commercial Division
   Reports To: Director of Commercial
   Job Description: Manage regional sales operations...
   Required Qualifications:
     - 5+ years sales experience
     - Bachelor's degree in business
   ```

---

## Security Configuration

### Password Policies

Configure in Admin Portal → Settings → Security:

```yaml
Minimum Length: 12 characters
Require Uppercase: ☑ Yes
Require Lowercase: ☑ Yes
Require Numbers: ☑ Yes
Require Special Characters: ☑ Yes
Password Expiry: 90 days
Password History: 5 (prevent reuse of last 5 passwords)
Max Login Attempts: 5
Lockout Duration: 30 minutes
```

Apply policy:
```typescript
// src/lib/auth/password-policy.ts
export const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  expiryDays: 90,
  historyCount: 5
};

export function validatePassword(password: string): boolean {
  if (password.length < passwordPolicy.minLength) return false;
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) return false;
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) return false;
  if (passwordPolicy.requireNumbers && !/[0-9]/.test(password)) return false;
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*]/.test(password)) return false;
  return true;
}
```

### Two-Factor Authentication (2FA/MFA)

**Status**: 🔜 Coming Soon

**Planned Configuration**:
1. Navigate to Settings → Security → MFA
2. Enable MFA enforcement:
   ```yaml
   Enforce MFA for:
     ☑ Admin users (required)
     ☑ HR users
     ☐ All users (optional)

   Allowed MFA Methods:
     ☑ TOTP (Google Authenticator, Authy)
     ☑ SMS OTP
     ☑ Email OTP
     ☐ Hardware tokens (YubiKey)

   Backup Codes: ☑ Generate 10 codes per user
   Grace Period: 7 days (before enforcement)
   ```

### Session Management

Configure session policies:

```typescript
// Session timeout settings
export const sessionConfig = {
  accessTokenTTL: 3600,           // 1 hour
  refreshTokenTTL: 2592000,        // 30 days
  sessionIdleTimeout: 1800,        // 30 minutes
  absoluteSessionTimeout: 43200,   // 12 hours (force re-login)

  // Concurrent sessions
  maxConcurrentSessions: 3,        // per user

  // Remember me
  rememberMeTTL: 7776000          // 90 days
};
```

### IP Whitelisting

Restrict OAuth clients to specific IPs:

```typescript
const clientIPRestrictions = {
  'ofm-client': {
    allowedIPs: [
      '203.0.113.0/24',      // Production network
      '192.168.1.0/24'       // Office network
    ]
  }
};

// In token endpoint
const clientIP = event.getClientAddress();
if (!isIPAllowed(clientId, clientIP)) {
  throw error(403, 'IP not allowed');
}
```

### Audit Logging Configuration

Enable comprehensive logging:

```typescript
// Events to log
const auditEvents = [
  // Authentication
  'user.login.success',
  'user.login.failed',
  'user.logout',
  'user.password_reset',
  'user.mfa_enabled',

  // OAuth
  'oauth.authorize',
  'oauth.token_issued',
  'oauth.token_refreshed',
  'oauth.token_revoked',

  // Admin actions
  'client.created',
  'client.updated',
  'client.deleted',
  'user.created',
  'user.updated',
  'user.disabled',

  // Employee lifecycle
  'employee.onboarded',
  'employee.mutated',
  'employee.offboarded'
];

// Log retention
const logRetention = {
  authLogs: 90,        // days
  auditLogs: 365,      // days (1 year)
  errorLogs: 30        // days
};
```

### Security Headers

Configure security headers:

```typescript
// src/hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
};
```

---

## Monitoring & Maintenance

### Health Check Endpoints

Setup monitoring:

```typescript
// src/routes/health/+server.ts
export const GET: RequestHandler = async () => {
  const checks = {
    database: await checkDatabase(),
    oauth: await checkOAuthEndpoints(),
    email: await checkEmailService(),
    timestamp: new Date().toISOString()
  };

  const isHealthy = Object.values(checks).every(c => c === true);

  return json({
    status: isHealthy ? 'healthy' : 'degraded',
    checks
  }, {
    status: isHealthy ? 200 : 503
  });
};
```

Monitor with:
```bash
# Uptime monitoring
curl https://sso.yourcompany.com/health

# Database connectivity
curl https://sso.yourcompany.com/health/db

# OAuth endpoints
curl https://sso.yourcompany.com/health/oauth
```

### Metrics Dashboard

**Key Metrics to Monitor**:

1. **Authentication Metrics**
   - Login success rate
   - Login failure rate
   - Average login time
   - Active sessions

2. **OAuth Metrics**
   - Authorization requests/min
   - Token exchanges/min
   - Token refresh rate
   - Failed token validations

3. **User Metrics**
   - Total users (active/inactive)
   - New users (daily/weekly/monthly)
   - User growth rate
   - MFA adoption rate

4. **System Metrics**
   - Response time (p50, p95, p99)
   - Error rate
   - Database connection pool
   - Memory usage
   - CPU usage

**Setup Grafana Dashboard**:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'aksara-sso'
    static_configs:
      - targets: ['localhost:5173']
    metrics_path: '/metrics'
```

### Log Management

**Log Levels**:
```typescript
// src/lib/logger.ts
export enum LogLevel {
  ERROR = 'error',    // Critical errors requiring immediate attention
  WARN = 'warn',      // Warning conditions
  INFO = 'info',      // Informational messages
  DEBUG = 'debug'     // Debug-level messages (dev only)
}
```

**Centralized Logging** (ELK Stack):
```bash
# Ship logs to Elasticsearch
filebeat -e -c filebeat.yml

# Query logs in Kibana
GET /aksara-sso-*/\_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "event": "user.login.failed" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}
```

### Scheduled Maintenance Tasks

**Daily**:
```bash
# Cleanup expired tokens
0 0 * * * /usr/bin/bun /app/scripts/cleanup-tokens.ts

# Backup database
0 2 * * * /usr/bin/mongodump --uri=$MONGODB_URI --out=/backups/$(date +\%Y\%m\%d)
```

**Weekly**:
```bash
# Rotate logs
0 0 * * 0 /usr/sbin/logrotate /etc/logrotate.d/aksara-sso

# Generate usage reports
0 6 * * 1 /usr/bin/bun /app/scripts/weekly-report.ts
```

**Monthly**:
```bash
# Archive old audit logs
0 0 1 * * /usr/bin/bun /app/scripts/archive-logs.ts

# Review inactive users
0 9 1 * * /usr/bin/bun /app/scripts/inactive-users-report.ts
```

### Performance Optimization

**Database Indexing**:
```javascript
// Ensure indexes exist
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ ssoUserId: 1 });
db.oauth_clients.createIndex({ clientId: 1 }, { unique: true });
db.access_tokens.createIndex({ token: 1 }, { unique: true });
db.access_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
db.refresh_tokens.createIndex({ token: 1 }, { unique: true });
db.refresh_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
```

**Caching Strategy**:
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache user info
async function getUserInfo(userId: string) {
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);

  const user = await db.collection('users').findOne({ _id: userId });
  await redis.setex(`user:${userId}`, 300, JSON.stringify(user));

  return user;
}

// Cache client info
async function getClient(clientId: string) {
  const cached = await redis.get(`client:${clientId}`);
  if (cached) return JSON.parse(cached);

  const client = await db.collection('oauth_clients').findOne({ clientId });
  await redis.setex(`client:${clientId}`, 600, JSON.stringify(client));

  return client;
}
```

---

## Integration Support

### Pre-Integration Checklist

Before onboarding a new client application:

- ✅ **Technical Review**
  - Application architecture documented
  - Security requirements defined
  - Redirect URIs finalized
  - Development/staging/production environments identified

- ✅ **Security Assessment**
  - Client application security audit
  - Data handling policies reviewed
  - Compliance requirements (GDPR, SOC2, etc.)

- ✅ **Onboarding Documentation**
  - Provide SSO Client Integration Guide
  - Share API documentation
  - Schedule kickoff meeting

### Testing OAuth Flow

**Provide Test Environment**:

```yaml
Test SSO Server: https://sso-staging.yourcompany.com
Test Client ID: test-client-id
Test Client Secret: test-client-secret
Test User:
  Email: test.user@yourcompany.com
  Password: Test@2025
```

**Integration Testing Checklist**:

1. ✅ Authorization flow completes successfully
2. ✅ Token exchange returns valid tokens
3. ✅ User info endpoint returns correct data
4. ✅ Token refresh works
5. ✅ Token revocation works
6. ✅ Logout clears sessions
7. ✅ Error handling (invalid credentials, expired tokens)
8. ✅ PKCE validation works
9. ✅ State parameter validated correctly
10. ✅ Redirect URI validation enforced

**Test Script**:
```bash
#!/bin/bash

# Test token endpoint
curl -X POST https://sso-staging.yourcompany.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=test-code" \
  -d "client_id=test-client" \
  -d "client_secret=test-secret" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "code_verifier=test-verifier"

# Test userinfo endpoint
curl https://sso-staging.yourcompany.com/oauth/userinfo \
  -H "Authorization: Bearer <access-token>"

# Test introspection
curl -X POST https://sso-staging.yourcompany.com/oauth/introspect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=<access-token>" \
  -d "client_id=test-client" \
  -d "client_secret=test-secret"
```

### Common Integration Issues

**Issue 1: Client Secret Mismatch**

**Symptoms**: `401 Invalid client credentials`

**Admin Actions**:
1. Verify client secret is hashed with Argon2 in database
2. Check token endpoint uses `verify()` not plain text comparison
3. Regenerate client secret if needed:
   ```bash
   bun run regenerate-secret --client-id ofm-client
   ```

**Issue 2: Redirect URI Mismatch**

**Symptoms**: `400 Invalid redirect URI`

**Admin Actions**:
1. Check registered redirect URIs for client
2. Ensure exact match (trailing slash matters!)
3. Add missing URIs if needed:
   ```typescript
   await db.collection('oauth_clients').updateOne(
     { clientId: 'ofm-client' },
     { $push: { redirectUris: 'https://ofm.company.com/auth/callback' } }
   );
   ```

**Issue 3: Token Expiration**

**Symptoms**: `401 Access token has expired`

**Admin Actions**:
1. Check if client implements token refresh
2. Verify refresh token expiration settings
3. Adjust token TTL if needed:
   ```typescript
   await db.collection('oauth_clients').updateOne(
     { clientId: 'ofm-client' },
     {
       $set: {
         'tokenExpirations.accessToken': 7200,  // 2 hours
         'tokenExpirations.refreshToken': 7776000  // 90 days
       }
     }
   );
   ```

### Post-Integration Monitoring

**First 30 Days**:
- ✅ Monitor error rates daily
- ✅ Review user feedback
- ✅ Check performance metrics
- ✅ Ensure no security incidents
- ✅ Weekly sync meetings with client team

**Ongoing**:
- ✅ Monthly usage reports
- ✅ Quarterly security reviews
- ✅ Annual access certification

---

## Troubleshooting

### Common Admin Tasks

#### Reset User Password

**Option A: Send Reset Email**
```typescript
// Via UI: User → Reset Password → Send Email

// Via script
bun run reset-password --email john.doe@company.com
```

**Option B: Set Temporary Password**
```typescript
import { hash } from 'argon2';

const tempPassword = 'Temp@2025';
const hashedPassword = await hash(tempPassword);

await db.collection('users').updateOne(
  { email: 'john.doe@company.com' },
  {
    $set: {
      password: hashedPassword,
      passwordResetRequired: true,
      passwordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24 hours
    }
  }
);

console.log('Temporary password set. User must change on next login.');
```

#### Revoke Client Access

**Temporary Suspension**:
```typescript
await db.collection('oauth_clients').updateOne(
  { clientId: 'ofm-client' },
  { $set: { isActive: false, suspendedAt: new Date() } }
);
```

**Permanent Revocation**:
```typescript
// Revoke all tokens for client
await db.collection('access_tokens').deleteMany({ client_id: 'ofm-client' });
await db.collection('refresh_tokens').deleteMany({ client_id: 'ofm-client' });

// Delete client
await db.collection('oauth_clients').deleteOne({ clientId: 'ofm-client' });
```

#### Unlock Locked Account

```typescript
await db.collection('users').updateOne(
  { email: 'john.doe@company.com' },
  {
    $set: {
      isLocked: false,
      loginAttempts: 0,
      lockedUntil: null
    }
  }
);
```

#### Force Logout All Users

```typescript
// Clear all sessions (emergency only!)
await db.collection('refresh_tokens').deleteMany({});
await db.collection('access_tokens').deleteMany({});

console.log('All users logged out. They must re-authenticate.');
```

### Diagnostic Commands

**Check System Status**:
```bash
# Database connectivity
bun run check-db

# OAuth endpoints
curl https://sso.company.com/.well-known/openid-configuration

# Active sessions
bun run count-sessions

# Token statistics
bun run token-stats
```

**Debug OAuth Flow**:
```bash
# Enable debug logging
DEBUG=oauth:* bun run dev

# Tail logs
tail -f logs/oauth.log | grep "client_id=ofm-client"

# Check specific authorization code
mongo aksara_sso --eval 'db.authorization_codes.findOne({code: "ABC123"})'
```

### Emergency Procedures

**Scenario: Database Compromise**

1. **Immediate Actions** (within 5 minutes):
   ```bash
   # Disable all OAuth clients
   mongo aksara_sso --eval 'db.oauth_clients.updateMany({}, {$set: {isActive: false}})'

   # Revoke all tokens
   mongo aksara_sso --eval 'db.access_tokens.deleteMany({})'
   mongo aksara_sso --eval 'db.refresh_tokens.deleteMany({})'

   # Enable maintenance mode
   echo "MAINTENANCE_MODE=true" >> .env
   pm2 restart aksara-sso
   ```

2. **Containment** (within 1 hour):
   - Change all admin passwords
   - Rotate JWT secret
   - Rotate database credentials
   - Review audit logs for compromise indicators

3. **Recovery** (within 24 hours):
   - Restore from clean backup
   - Regenerate all client secrets
   - Notify affected clients
   - Force password reset for all users

4. **Post-Incident**:
   - Conduct security audit
   - Document lessons learned
   - Update security policies

**Scenario: Service Outage**

1. **Check Health**:
   ```bash
   curl https://sso.company.com/health
   ```

2. **Restart Services**:
   ```bash
   # PM2
   pm2 restart aksara-sso

   # Docker
   docker-compose restart

   # Systemd
   systemctl restart aksara-sso
   ```

3. **Check Logs**:
   ```bash
   pm2 logs aksara-sso --lines 100
   ```

4. **Verify Recovery**:
   ```bash
   curl https://sso.company.com/oauth/authorize?client_id=test
   ```

---

## Backup & Recovery

### Backup Strategy

**Database Backups**:

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"

# Full backup
mongodump \
  --uri="$MONGODB_URI" \
  --gzip \
  --out="$BACKUP_DIR/full_$DATE"

# Incremental backup (oplog)
mongodump \
  --uri="$MONGODB_URI" \
  --oplog \
  --gzip \
  --out="$BACKUP_DIR/oplog_$DATE"

# Upload to S3
aws s3 sync "$BACKUP_DIR" s3://backups/aksara-sso/

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} \;
```

**Backup Schedule**:
- **Full backup**: Daily at 2 AM
- **Incremental**: Every 6 hours
- **Retention**: 30 days local, 1 year S3

**Configuration Backups**:
```bash
# Backup environment files
tar -czf config_backup_$(date +%Y%m%d).tar.gz .env docker-compose.yml

# Backup client configurations
mongoexport \
  --uri="$MONGODB_URI" \
  --collection=oauth_clients \
  --out=oauth_clients_backup.json
```

### Recovery Procedures

**Full Database Restore**:
```bash
# Stop service
pm2 stop aksara-sso

# Restore from backup
mongorestore \
  --uri="$MONGODB_URI" \
  --gzip \
  --drop \
  /backups/mongodb/full_20250115_020000

# Start service
pm2 start aksara-sso

# Verify
curl https://sso.company.com/health
```

**Point-in-Time Recovery**:
```bash
# Restore to specific timestamp
mongorestore \
  --uri="$MONGODB_URI" \
  --oplogReplay \
  --oplogLimit "1737840000:1" \
  /backups/mongodb/oplog_20250115_080000
```

**Disaster Recovery Plan**:

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 6 hours

**Recovery Steps**:
1. Provision new infrastructure (cloud VM, database)
2. Restore latest backup
3. Update DNS records
4. Notify clients of new endpoints
5. Verify all integrations working
6. Resume operations

---

## Appendix

### Security Checklist

**Production Deployment**:

- ✅ HTTPS/TLS enabled with valid certificate
- ✅ JWT secret rotated from default
- ✅ Database credentials secured
- ✅ Admin password changed from default
- ✅ MFA enabled for admin accounts
- ✅ CORS configured with whitelist
- ✅ Rate limiting enabled
- ✅ Security headers configured
- ✅ Audit logging enabled
- ✅ Backup strategy implemented
- ✅ Monitoring and alerts configured
- ✅ Incident response plan documented

### Maintenance Windows

**Recommended Schedule**:
- **Patching**: Second Tuesday of each month, 11 PM - 1 AM
- **Major upgrades**: Quarterly, Saturday 2 AM - 6 AM
- **Emergency maintenance**: As needed, with 4-hour notice

**Communication Template**:
```
Subject: [Maintenance] Aksara SSO - Scheduled Maintenance

Dear Teams,

Aksara SSO will undergo scheduled maintenance:

Date: Tuesday, January 15, 2025
Time: 11:00 PM - 1:00 AM WIB
Duration: 2 hours
Impact: Service will be unavailable

Changes:
- Security patches
- Performance improvements
- Database optimization

Preparation:
- Complete critical workflows before maintenance window
- Expect brief service interruption

Contact: sso-admin@yourcompany.com for questions.

Thank you,
Aksara SSO Admin Team
```

### Useful Resources

**Internal Documentation**:
- [SSO Client Integration Guide](./SSO_CLIENT_GUIDE.md)
- [API Reference](./API_REFERENCE.md) (to be created)
- [Architecture Documentation](./ARCHITECTURE.md) (to be created)

**External Resources**:
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Spec](https://openid.net/specs/openid-connect-core-1_0.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**End of Administrator Guide**

For questions or support, contact: sso-admin@yourcompany.com

**Version History**:
- v1.0 (October 2025): Initial release
