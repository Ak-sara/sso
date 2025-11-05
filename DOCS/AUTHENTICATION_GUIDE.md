# Authentication Guide - Aksara SSO

> **Last Updated**: November 2025
> **Auth System**: Unified Identity Model with Multi-Login Support

---

## Overview

Aksara SSO provides a comprehensive authentication system built on top of the unified identity model. Users can authenticate with email, username, or NIK (employee ID), and the system supports multiple authentication flows including OAuth 2.0, OIDC, and SCIM.

---

## Supported Authentication Methods

### 1. Multi-Login Support

Users can log in using any of the following identifiers:
- **Email address** (e.g., `john@ias.co.id`)
- **Username** (e.g., `john.doe`)
- **NIK / Employee ID** (e.g., `NIK001`) - For employees only

**Implementation**:
```typescript
// Login query
const identity = await db.collection('identities').findOne({
  $or: [
    { email: loginInput },
    { username: loginInput },
    { 'employee.employeeId': loginInput }
  ],
  isActive: true
});
```

### 2. Password Authentication

- **Hashing**: Argon2 (stronger than bcrypt)
- **Password Policy**:
  - Minimum 12 characters
  - Must include: uppercase, lowercase, number, special character
  - Cannot contain username or email
  - Expires every 90 days (configurable)

**Password Verification**:
```typescript
import { verify } from '@node-rs/argon2';

const isValid = await verify(identity.password, submittedPassword);
```

### 3. Session Management

- **Session Duration**: 24 hours
- **Idle Timeout**: 2 hours
- **Storage**: MongoDB sessions collection
- **Cookie**: HttpOnly, Secure, SameSite=Lax

**Session Structure**:
```typescript
{
  _id: "session_uuid",
  identityId: ObjectId,
  expiresAt: Date,
  data: {
    identityType: 'employee',
    email: 'user@example.com',
    roles: ['user', 'hr'],
    lastActivity: Date
  },
  createdAt: Date
}
```

---

## Authentication Flows

### 1. Standard Login Flow

```
┌─────────┐                ┌─────────────┐              ┌──────────────┐
│ Browser │                │  SSO Server │              │   Database   │
└────┬────┘                └──────┬──────┘              └───────┬──────┘
     │                            │                             │
     │  1. POST /login            │                             │
     │  (email/username/NIK +     │                             │
     │   password)                │                             │
     ├───────────────────────────>│                             │
     │                            │                             │
     │                            │  2. Query identities        │
     │                            │  collection (multi-field)   │
     │                            ├────────────────────────────>│
     │                            │                             │
     │                            │  3. Return identity         │
     │                            │<────────────────────────────┤
     │                            │                             │
     │                            │  4. Verify password         │
     │                            │  (Argon2)                   │
     │                            │                             │
     │                            │  5. Create session          │
     │                            ├────────────────────────────>│
     │                            │                             │
     │  6. Set session cookie     │                             │
     │  + redirect to dashboard   │                             │
     │<───────────────────────────┤                             │
     │                            │                             │
     │  7. Access protected pages │                             │
     │  (cookie sent automatically)│                            │
     ├───────────────────────────>│                             │
     │                            │                             │
     │                            │  8. Validate session        │
     │                            ├────────────────────────────>│
     │                            │                             │
     │                            │  9. Return identity + roles │
     │                            │<────────────────────────────┤
     │                            │                             │
     │  10. Render page with      │                             │
     │   user context             │                             │
     │<───────────────────────────┤                             │
```

### 2. OAuth 2.0 Authorization Code Flow

```
┌──────────┐          ┌─────────────┐          ┌─────────────┐          ┌──────────────┐
│  Client  │          │   Browser   │          │  SSO Server │          │   Database   │
│   App    │          │             │          │             │          │              │
└────┬─────┘          └──────┬──────┘          └──────┬──────┘          └───────┬──────┘
     │                       │                        │                         │
     │  1. Redirect to /oauth/authorize               │                         │
     │    + client_id, redirect_uri, scope            │                         │
     ├──────────────────────>│                        │                         │
     │                       │                        │                         │
     │                       │  2. GET /oauth/authorize                         │
     │                       ├───────────────────────>│                         │
     │                       │                        │                         │
     │                       │  3. Check if logged in │                         │
     │                       │  (session cookie)      │                         │
     │                       │                        │                         │
     │                       │  4. If not logged in   │                         │
     │                       │  → Show login page     │                         │
     │                       │<───────────────────────┤                         │
     │                       │                        │                         │
     │                       │  5. User logs in       │                         │
     │                       │  (email/username/NIK   │                         │
     │                       │   + password)          │                         │
     │                       ├───────────────────────>│                         │
     │                       │                        │                         │
     │                       │                        │  6. Verify identity     │
     │                       │                        ├────────────────────────>│
     │                       │                        │                         │
     │                       │  7. Show consent screen│                         │
     │                       │  (if first time)       │                         │
     │                       │<───────────────────────┤                         │
     │                       │                        │                         │
     │                       │  8. User approves      │                         │
     │                       ├───────────────────────>│                         │
     │                       │                        │                         │
     │                       │                        │  9. Create auth code    │
     │                       │                        ├────────────────────────>│
     │                       │                        │                         │
     │                       │  10. Redirect to       │                         │
     │                       │   redirect_uri?code=XXX│                         │
     │                       │<───────────────────────┤                         │
     │                       │                        │                         │
     │  11. Browser redirects with code               │                         │
     │<──────────────────────┤                        │                         │
     │                       │                        │                         │
     │  12. POST /oauth/token                         │                         │
     │    (code, client_id, client_secret)            │                         │
     ├───────────────────────────────────────────────>│                         │
     │                       │                        │                         │
     │                       │                        │  13. Verify code        │
     │                       │                        │   & client              │
     │                       │                        ├────────────────────────>│
     │                       │                        │                         │
     │                       │                        │  14. Generate tokens    │
     │                       │                        │   (access + refresh)    │
     │                       │                        │                         │
     │  15. Return tokens:                            │                         │
     │   { access_token, refresh_token, ... }         │                         │
     │<───────────────────────────────────────────────┤                         │
     │                       │                        │                         │
     │  16. Call API with                             │                         │
     │   Bearer token                                 │                         │
     ├───────────────────────────────────────────────>│                         │
     │                       │                        │                         │
     │                       │                        │  17. Verify JWT         │
     │                       │                        │   signature             │
     │                       │                        │                         │
     │  18. Return protected resource                 │                         │
     │<───────────────────────────────────────────────┤                         │
```

### 3. SCIM 2.0 Authentication (OAuth Client Credentials)

```
┌──────────────┐              ┌─────────────┐              ┌──────────────┐
│ SCIM Client  │              │  SSO Server │              │   Database   │
│ (e.g., OFM)  │              │             │              │              │
└──────┬───────┘              └──────┬──────┘              └───────┬──────┘
       │                             │                             │
       │  1. POST /scim/v2/token     │                             │
       │  grant_type=client_credentials                            │
       │  client_id=xxx              │                             │
       │  client_secret=yyy          │                             │
       ├────────────────────────────>│                             │
       │                             │                             │
       │                             │  2. Verify client credentials│
       │                             ├────────────────────────────>│
       │                             │                             │
       │                             │  3. Check IP whitelist      │
       │                             │                             │
       │                             │  4. Apply rate limiting     │
       │                             │                             │
       │                             │  5. Generate JWT access token│
       │                             │  (expires in 1 hour)        │
       │                             │                             │
       │  6. Return:                 │                             │
       │  { access_token,            │                             │
       │    token_type: "Bearer",    │                             │
       │    expires_in: 3600,        │                             │
       │    scope: "read:users ..."  }│                            │
       │<────────────────────────────┤                             │
       │                             │                             │
       │  7. GET /scim/v2/Users      │                             │
       │  Authorization: Bearer XXX   │                             │
       ├────────────────────────────>│                             │
       │                             │                             │
       │                             │  8. Verify JWT signature    │
       │                             │  & check scopes             │
       │                             │                             │
       │                             │  9. Query identities        │
       │                             │  (identityType='employee')  │
       │                             ├────────────────────────────>│
       │                             │                             │
       │                             │  10. Return identities      │
       │                             │<────────────────────────────┤
       │                             │                             │
       │  11. Transform to SCIM      │                             │
       │   format & return           │                             │
       │<────────────────────────────┤                             │
```

---

## Identity Types & Authentication

### 1. Employee Authentication

**Allowed Login Methods**:
- Email (work email)
- Username
- NIK (employee ID)

**Example**:
```typescript
// Login with NIK
const employee = await db.collection('identities').findOne({
  'employee.employeeId': 'NIK001',
  identityType: 'employee',
  isActive: true
});
```

**SSO Integration**:
- Employees can access connected applications via OAuth 2.0
- Automatic SSO account creation during onboarding (optional)
- SSO account revocation on offboarding

### 2. Partner Authentication

**Allowed Login Methods**:
- Email
- Username

**Restrictions**:
- Cannot use NIK-based login (employees only)
- May have limited access to certain resources
- Access may expire based on contract dates

### 3. External User Authentication

**Allowed Login Methods**:
- Email
- Username

**Features**:
- Temporary access with expiry date
- Sponsored by an employee (tracked via `sponsorId`)
- Limited permissions

### 4. Service Account Authentication

**Authentication Method**: OAuth 2.0 Client Credentials Grant

**Usage**:
- API-only access (no web login)
- Linked to OAuth clients
- Used for machine-to-machine communication

**Example**:
```bash
curl -X POST https://sso.ias.co.id/oauth/token \
  -d grant_type=client_credentials \
  -d client_id=service-123 \
  -d client_secret=secret-456
```

---

## Role-Based Access Control (RBAC)

### Roles

Roles are assigned at the identity level:

```typescript
{
  email: 'user@example.com',
  roles: ['user', 'hr', 'admin'],
  identityType: 'employee',
  ...
}
```

### Common Roles

1. **user** - Basic authenticated user
2. **employee** - Regular employee access
3. **manager** - Manager-level permissions
4. **hr** - HR department access
5. **admin** - System administrator
6. **super_admin** - Full system access

### Permission Checks

**Server-Side (SvelteKit hooks)**:
```typescript
export async function handle({ event, resolve }) {
  const session = await getSession(event.cookies);

  if (!session) {
    throw redirect(303, '/login');
  }

  const identity = await db.collection('identities').findOne({
    _id: session.identityId
  });

  // Check roles
  if (requiredRole && !identity.roles.includes(requiredRole)) {
    throw error(403, 'Forbidden');
  }

  event.locals.identity = identity;
  return resolve(event);
}
```

**Client-Side (Svelte components)**:
```svelte
<script>
  export let data;
  const { identity } = data;
</script>

{#if identity.roles.includes('admin')}
  <AdminPanel />
{/if}

{#if identity.roles.includes('hr')}
  <EmployeeManagement />
{/if}
```

---

## Multi-Factor Authentication (MFA)

> **Status**: ⏳ Planned (Phase 1: Security & Compliance)

### Supported Methods

1. **TOTP** (Time-based One-Time Password)
   - Google Authenticator compatible
   - 6-digit codes
   - 30-second validity

2. **Email OTP**
   - 6-digit code sent via email
   - 10-minute validity

3. **Backup Codes**
   - 10 one-time-use codes
   - For account recovery

### MFA Flow

```
1. User enters email/username/NIK + password
2. System verifies password
3. If MFA enabled:
   a. Show MFA challenge page
   b. User enters TOTP code or email OTP
   c. System verifies code
   d. Create session if valid
4. If MFA not enabled:
   → Create session immediately
```

### MFA Schema (Planned)

```typescript
// In identities collection
{
  mfa: {
    enabled: boolean,
    method: 'totp' | 'email',
    totpSecret: string (encrypted),
    backupCodes: string[] (hashed),
    lastUsedAt: Date
  }
}
```

---

## Password Reset Flow

### 1. Request Reset

```
User → Enter email → System sends reset link
```

**Implementation**:
```typescript
// Generate secure token
const token = crypto.randomUUID();
const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

// Store token
await db.collection('password_reset_tokens').insertOne({
  identityId: identity._id,
  token,
  expiresAt,
  used: false
});

// Send email
await sendEmail({
  to: identity.email,
  subject: 'Reset Password',
  body: `Click here: https://sso.ias.co.id/reset-password?token=${token}`
});
```

### 2. Verify Token & Reset

```
User → Click link → Enter new password → System updates password
```

**Implementation**:
```typescript
// Verify token
const resetToken = await db.collection('password_reset_tokens').findOne({
  token,
  used: false,
  expiresAt: { $gt: new Date() }
});

if (!resetToken) {
  throw error(400, 'Invalid or expired token');
}

// Hash new password
const hashedPassword = await hash(newPassword);

// Update identity
await db.collection('identities').updateOne(
  { _id: resetToken.identityId },
  { $set: { password: hashedPassword } }
);

// Mark token as used
await db.collection('password_reset_tokens').updateOne(
  { _id: resetToken._id },
  { $set: { used: true } }
);
```

---

## Security Best Practices

### 1. Password Storage

✅ **DO**:
- Use Argon2 for hashing
- Never store passwords in plain text
- Enforce strong password policy

❌ **DON'T**:
- Use MD5 or SHA-1
- Store passwords in logs
- Allow weak passwords

### 2. Session Management

✅ **DO**:
- Use httpOnly cookies
- Set secure flag (HTTPS only)
- Implement idle timeout
- Rotate session IDs on login

❌ **DON'T**:
- Store tokens in localStorage
- Allow indefinite sessions
- Expose session IDs in URLs

### 3. Rate Limiting

✅ **DO**:
- Limit login attempts (5 per 15 minutes)
- Implement CAPTCHA after failures
- Rate limit password reset requests

❌ **DON'T**:
- Allow unlimited login attempts
- Reveal whether email exists

### 4. Audit Logging

✅ **DO**:
- Log all authentication events
- Include IP address and user agent
- Store failed login attempts

❌ **DON'T**:
- Log passwords (even hashed)
- Store sensitive data in logs

---

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/login` | POST | Standard login |
| `/logout` | POST | Logout and destroy session |
| `/oauth/authorize` | GET | OAuth authorization |
| `/oauth/token` | POST | Exchange code for tokens |
| `/oauth/introspect` | POST | Validate access token |
| `/oauth/revoke` | POST | Revoke token |
| `/oauth/userinfo` | GET | Get user info (OIDC) |
| `/scim/v2/token` | POST | SCIM client credentials |
| `/reset-password` | POST | Request password reset |
| `/reset-password/verify` | POST | Verify token & reset |

---

## Token Types

### 1. Access Token (JWT)

**Format**: JWT (JSON Web Token)
**Expiration**: 1 hour
**Use**: API authentication

**Structure**:
```json
{
  "sub": "identity_id",
  "email": "user@example.com",
  "identityType": "employee",
  "roles": ["user", "hr"],
  "scope": "read:users write:users",
  "iat": 1699000000,
  "exp": 1699003600
}
```

### 2. Refresh Token

**Format**: Opaque string (UUID)
**Expiration**: 30 days
**Use**: Obtain new access token

**Storage**: MongoDB `oauth_tokens` collection

### 3. Session Cookie

**Name**: `session`
**Format**: Encrypted session ID
**Expiration**: 24 hours
**Flags**: HttpOnly, Secure, SameSite=Lax

---

## Troubleshooting

### Login Issues

**Problem**: "Invalid credentials"
- Verify email/username/NIK exists
- Check if account is active (`isActive: true`)
- Ensure password is correct
- Check if identity type allows web login

**Problem**: "Account locked"
- Check failed login attempts
- Wait for lockout period to expire
- Contact admin to unlock

**Problem**: "Session expired"
- User idle for > 2 hours
- Session expired (> 24 hours)
- Session manually invalidated
- Solution: Login again

### OAuth Issues

**Problem**: "Invalid redirect URI"
- Verify redirect URI is registered for client
- Check for trailing slashes

**Problem**: "Invalid scope"
- Verify requested scope is allowed for client
- Check client configuration

---

## Related Documentation

- `DATA_ARCHITECTURE.md` - Database schema and relationships
- `_DEV_GUIDE.md` - Feature roadmap (MFA, password reset, etc.)
- `SSO_CLIENT_GUIDE.md` - OAuth client integration
- `SSO_ADMIN_GUIDE.md` - Admin console usage
- `SCIM_COMPLETE_GUIDE.md` - SCIM authentication details

---

**Document Version**: 1.0
**Last Updated**: November 2025
**Status**: ✅ Current and Accurate
