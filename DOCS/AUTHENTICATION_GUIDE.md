# Authentication Guide - Aksara SSO

> **Last Updated**: July 2026
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
  sessionId: "hex_string",
  userId: "identity_id",
  email: 'user@example.com',
  username: 'user@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  // 'admin' if identity.isAdmin, otherwise empty — this is the ONLY value the
  // array can hold. See "Role-Based Access Control" below for what actually
  // gates access (Realm Roles / Client Roles), which live on the identity's
  // assignment, not in this session array.
  roles: ['admin'] /* or [] */,
  organizationId: "org_id",
  createdAt: Date,
  expiresAt: Date,
  lastActivity: Date
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

> Note on step 17: the **access token is an opaque random string**, not a JWT —
> the resource server looks it up in the `access_tokens` collection rather than
> verifying a signature. The only JWT issued by the OAuth flow is the **ID
> token** (step 15, when `scope` includes `openid`) — see [ID Token](#3-id-token-jwt-rs256) below.

#### Client Authentication Methods (`/oauth/token`)

The token endpoint accepts client credentials via **either** standard method
(RFC 6749 §2.3.1) — whichever the RP sends is used, with no special-casing per
client:

| Method | How credentials are sent |
|--------|---------------------------|
| `client_secret_basic` | `Authorization: Basic base64(client_id:client_secret)` header |
| `client_secret_post` | `client_id` / `client_secret` fields in the POST body |

This matters because different RPs default to different methods — e.g.
**Cloudflare Access** defaults to `client_secret_basic`, while many simple
OAuth libraries use `client_secret_post`. Both are supported simultaneously
(body takes precedence if a request somehow sends both).

All token-endpoint errors are returned in the RFC 6749 §5.2 shape —
`{ "error": "invalid_client", "error_description": "..." }` — so any RP can
surface the actual failure reason instead of a generic message.

#### PKCE (RFC 7636)

If an authorization request included a `code_challenge`, the token endpoint
now **requires** a matching `code_verifier` at exchange time — it's no longer
silently skipped if the verifier is omitted. `S256` is the only supported
challenge method (advertised in `code_challenge_methods_supported`); `plain`
is accepted by the request schema but not actually verified, so don't rely on
it.

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

There is no free-form roles array on the identity anymore. Access is split
into three independent layers that answer three different questions:

| Layer | Question it answers | Where it lives | Enforced by |
|---|---|---|---|
| `isAdmin` | Can this identity manage the SSO admin console itself, across every realm? | `identity.isAdmin: boolean` | `access-control.ts` / `access-control.server.ts` |
| Realm Role | Can this identity even authenticate to a given OAuth client at all? | Assignment's `realmRoleIds`, resolved via the Realm Role's `allowedClientIds` | `canIdentityAccessClient()` — blocks login if false |
| Client Role (App Role) | What in-app permission label should this specific client see for this identity? | Assignment's `clientRoleIds`, scoped per client | **Not enforced here** — just handed to the RP as a claim |

### 1. `isAdmin` — SSO admin console access

A single boolean on the identity ([identity.ts](../src/lib/db/schemas/identity.ts)).
`true` grants full access to every realm in this admin console; anyone else is
a **restricted user**: read-only on `/organization/*`, scoped to their own
realm(s), and redirected to `/profile` for everything else.

```typescript
// src/lib/auth/access-control.ts
const ELEVATED_ROLES = ['admin']; // the only value session.roles can hold

export function isRestrictedUser(roles: string[] | undefined): boolean {
  return !roles?.some((r) => ELEVATED_ROLES.includes(r));
}
```

`getAccessibleRealmIds()` (`access-control.server.ts`) resolves which realms a
restricted user may see — their primary `organizationId` plus any
`secondaryAssignments` — and is used both by the realm switcher
(`+layout.server.ts`) and by `/api/realm/switch` to reject switching into a
realm the user isn't actually assigned to.

This layer has **nothing to do with OAuth clients or connected apps** — it
only governs this SSO's own console.

### 2. Realm Role — gates which OAuth clients an identity may use

A Realm Role is an organization-scoped bundle: it names a list of
`allowedClientIds` (which registered OAuth clients/apps it grants access to).
It's assigned to an identity via a specific assignment's `realmRoleIds`, so
access follows that assignment — end it and the granted apps go with it.

```typescript
// src/lib/auth/realm-access.ts
export async function canIdentityAccessClient(identityId: string, clientId: string): Promise<boolean> {
  const client = await db.oauthClients.findOne({ clientId });
  if (!client.organizationId) return true; // realm-agnostic client — open to any authenticated identity

  const assignments = activeAssignments(identity, client.organizationId);
  const realmRoleIds = assignments.flatMap((a) => a.realmRoleIds || []);
  const realmRoles = await db.realmRoles.find({ _id: { $in: toObjectIds(realmRoleIds) }, isActive: true });

  return realmRoles.some((role) => role.allowedClientIds.includes(clientId));
}
```

**This is a hard gate.** It's checked at `/oauth/authorize` (both on page load
if already logged in, and after the login form submits) and again at
`/oauth/token` on both code exchange and refresh. If it returns `false`, the
user gets a `403 "Your account is not authorized to access this application"`
— login to that client is blocked outright, regardless of any Client Role.

### 3. Client Role (App Role) — a claim, not a gate

Client Roles are named, in-app permissions defined **per OAuth client** (e.g.
`employee` / `driver` / `admin` for one app, `sase` for another) — configured
in `/settings/clients` → a client's **App Roles**. They're assigned to an
identity via the assignment's `clientRoleIds`, and surfaced as a `roles` claim
in that client's ID token and userinfo response:

```typescript
// src/lib/auth/realm-access.ts
export async function getClientRoleNames(identityId: string, clientId: string): Promise<string[]> {
  const assignments = client.organizationId
    ? activeAssignments(identity, client.organizationId)
    : (identity.assignments || []);
  const clientRoleIds = assignments.flatMap((a) => a.clientRoleIds || []);
  const roles = await db.clientRoles.find({ _id: { $in: toObjectIds(clientRoleIds) }, clientId });
  return roles.map((r) => r.name);
}
```

**Nothing in this SSO reads or blocks on this value.** It only appears in the
token if the requested `scope` includes `openid`, and it's included in
`/oauth/userinfo` only when non-empty. Whether a missing/wrong Client Role
actually denies access to something is entirely up to the **relying party**:

- **OFM** (`../ofm`) matches Client Role names 1:1 against its own
  `roles` collection (keyed by `roleId` — e.g. `employee`/`driver`/`admin`),
  via `resolveSsoRoles()` in `src/lib/services/roles-service.ts`. Unknown
  names from the SSO are dropped, not trusted blindly. Roles resolved this
  way are stored separately as `session.ssoRoles` (additive to OFM's own
  locally-managed `roleIds`, not a replacement) and unioned into OFM's
  permission resolution in `hooks.server.ts`. Re-validated on every OAuth
  token refresh, not just at login — so a role revoked in the SSO takes
  effect on OFM's next token refresh rather than lingering until the user's
  next full login.
- **Cloudflare Access** would need its own Access Policy rule (e.g. "require
  OIDC claim `roles` contains `sase`") to actually deny users lacking that
  Client Role — the SSO login itself succeeds either way as long as Realm
  Role access (layer 2 above) passes.

**Important**: for a relying party to use this at all, its Client Role
*names* must exactly match whatever identifiers that app's own role system
expects (e.g. OFM's `roles.roleId` values) — the SSO doesn't know or care what
those strings mean, it just passes them through.

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
| `/.well-known/openid_configuration` | GET | OIDC discovery document |
| `/.well-known/jwks.json` | GET | Public signing key(s) for ID token verification |
| `/scim/v2/token` | POST | SCIM client credentials |
| `/reset-password` | POST | Request password reset |
| `/reset-password/verify` | POST | Verify token & reset |

---

## Token Types

### 1. Access Token (Opaque)

**Format**: Opaque random string (not a JWT — nothing to decode)
**Expiration**: 1 hour
**Use**: API authentication — resource servers look it up in the
`access_tokens` collection to resolve identity/scope, they don't verify a
signature.

**Storage**: MongoDB `access_tokens` collection, keyed by the token string.

### 2. Refresh Token

**Format**: Opaque string (UUID)
**Expiration**: 30 days
**Use**: Obtain new access token

**Storage**: MongoDB `refresh_tokens` collection

### 3. ID Token (JWT, RS256)

**Format**: JWT, signed **RS256** (asymmetric — not a shared-secret HMAC)
**Expiration**: 1 hour
**Use**: OIDC — proves identity to the Relying Party (`scope=openid` only)

**Structure**:
```json
{
  "sub": "identity_id",
  "aud": "client_id",
  "iss": "https://sso.example.com",
  "email": "user@example.com",
  "name": "Full Name",
  "roles": ["driver"],
  "iat": 1699000000,
  "exp": 1699003600
}
```

> `roles` is the **Client Role** claim — only present when non-empty (see
> [Role-Based Access Control](#role-based-access-control-rbac) above). It's
> resolved fresh per client via `getClientRoleNames()`, not stored on the
> identity itself.

**Header** includes a `kid` matching a key published at
`/.well-known/jwks.json`:
```json
{ "alg": "RS256", "kid": "..." }
```

**Why RS256 and not HS256**: HS256 uses one shared secret for both signing and
verifying, so any RP holding that secret could theoretically mint tokens for
another RP. RS256 lets any RP verify signatures using only the **public** key
published at `/.well-known/jwks.json` — the private key never leaves this
server. This is also what most enterprise SSO consumers (Cloudflare Access,
Okta, Azure AD, ...) expect out of a real OIDC provider; a "Certificate URL" /
JWKS field in their config is asking for exactly this endpoint.

**Signing key storage**: generated once (2048-bit RSA) and persisted in the
`oidc_signing_keys` collection — deliberately **not** `system_settings`,
since that collection is returned in full by `GET /api/settings`.

- `src/lib/auth/id-token.ts` — signs with `jose`'s `SignJWT`
- `src/lib/auth/oidc-keys.ts` — generates/caches/persists the keypair
- `src/routes/.well-known/jwks.json/+server.ts` — publishes the public key(s)

### 4. Session Cookie

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

**Problem**: RP shows "Failed to exchange code for token" / a blank or "undefined" reason
- Confirm which client-auth method the RP is using — `client_secret_basic`
  (Authorization header) and `client_secret_post` (body) are both supported,
  but if the RP uses something else the request will be rejected.
- Check the raw response body: every error now returns
  `{ "error": "...", "error_description": "..." }` (RFC 6749 §5.2) — the
  `error_description` names the actual cause (unknown client, bad secret,
  expired/invalid code, PKCE mismatch, etc).
- If the RP was issued a `code_challenge` at `/oauth/authorize` but doesn't
  send `code_verifier` at `/oauth/token`, the exchange now fails with
  `invalid_grant` (PKCE is enforced, not silently skipped).

---

## Related Documentation

- `DATA_ARCHITECTURE.md` - Database schema and relationships
- `_DEV_GUIDE.md` - Feature roadmap (MFA, password reset, etc.)
- `SSO_CLIENT_GUIDE.md` - OAuth client integration
- `SSO_ADMIN_GUIDE.md` - Admin console usage
- `SCIM_COMPLETE_GUIDE.md` - SCIM authentication details

---

**Document Version**: 1.1
**Last Updated**: July 2026
**Status**: ✅ Current and Accurate
