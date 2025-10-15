# User Management & Authentication Guide

**Date**: October 15, 2025
**Status**: ✅ Complete

## Overview

This document describes the complete user management and authentication system implemented for Aksara SSO. The system provides secure session-based authentication, role-based access control, and user profile management.

---

## 🔐 Authentication System

### Session Management

**File**: `src/lib/auth/session.ts`

The session management system provides:
- **24-hour session duration** with automatic expiration
- **2-hour idle timeout** for security
- **Cookie-based session storage** with httpOnly flag
- **Automatic cleanup** of expired sessions

```typescript
// Session Interface
interface Session {
  sessionId: string;
  userId: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  organizationId?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
}
```

### Password Security

**File**: `src/lib/auth/password.ts`

Password requirements:
- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ Argon2 hashing for storage

---

## 🚪 Login System

### Login Page

**Route**: `/login`
**Files**:
- `src/routes/(auth)/login/+page.svelte` (UI)
- `src/routes/(auth)/login/+page.server.ts` (Logic)

**Features**:
- ✅ Email/password authentication
- ✅ Remember me checkbox
- ✅ Forgot password link (placeholder)
- ✅ Social login buttons (placeholder for future)
- ✅ Test credentials display for development
- ✅ Form validation and error handling
- ✅ Loading states

**Test Credentials**:
```
Email: admin@ias.co.id
Password: password123
```

**Login Flow**:
1. User enters email and password
2. System validates credentials against database
3. Checks if user account is active
4. Verifies password with Argon2
5. Creates session in database
6. Sets httpOnly session cookie
7. Updates user's last login timestamp
8. Redirects to dashboard

---

## 🔒 Authentication Middleware

### Server Hook

**File**: `src/hooks.server.ts`

The server hook runs on every request and:
1. Ensures database connection
2. Checks for session cookie
3. Validates session (expiration, idle timeout)
4. Updates last activity timestamp
5. Populates `event.locals.user` with user data

### Route Protection

**File**: `src/routes/(app)/+layout.server.ts`

All routes under `(app)` are protected:
- Checks if user is authenticated
- Redirects to login if not authenticated
- Preserves intended destination with redirect parameter
- Passes user data to all child routes

---

## 👤 User Profile Management

### Profile Page

**Route**: `/profile`
**Files**:
- `src/routes/(app)/profile/+page.svelte`
- `src/routes/(app)/profile/+page.server.ts`

**Features**:
- ✅ Display user information (name, email, username)
- ✅ Show user roles as badges
- ✅ Avatar with user initial
- ✅ Organization information
- ✅ Edit profile button (placeholder)
- ✅ Change password button

---

## 🔑 Password Change

**Route**: `/profile/change-password`
**Files**:
- `src/routes/(app)/profile/change-password/+page.svelte`
- `src/routes/(app)/profile/change-password/+page.server.ts`

**Features**:
- ✅ Current password verification
- ✅ Password strength validation
- ✅ Password confirmation matching
- ✅ Visual password requirements
- ✅ Success/error messages
- ✅ Secure password update with Argon2

**Validation Flow**:
1. Verify current password is correct
2. Check new password meets requirements
3. Confirm new password matches confirmation
4. Hash new password with Argon2
5. Update database
6. Show success message

---

## 🚪 Logout System

**Route**: `/logout` (POST)
**File**: `src/routes/(app)/logout/+server.ts`

**Logout Flow**:
1. User clicks "Keluar" button in menu
2. Form submits POST to `/logout`
3. Server deletes session from database
4. Clears session cookie
5. Redirects to login page

---

## 🎨 UI Integration

### Layout Updates

**File**: `src/routes/(app)/+layout.svelte`

**Changes**:
- ✅ Display actual logged-in user data
- ✅ Show user initial in avatar
- ✅ Show full name (firstName + lastName)
- ✅ Show user email
- ✅ Working logout button
- ✅ Profile and settings links

**User Menu**:
```
👤 [User Initial]
   [Full Name]
   [Email]

   👤 Profil Saya      → /profile
   ⚙️ Pengaturan       → /settings
   ─────────────────
   🚪 Keluar           → /logout (POST)
```

---

## 📁 File Structure

```
src/
├── lib/
│   └── auth/
│       ├── session.ts          # Session management
│       └── password.ts         # Password utilities
│
├── routes/
│   ├── (auth)/                 # Public routes
│   │   ├── +layout.svelte      # Auth layout (gradient bg)
│   │   └── login/
│   │       ├── +page.svelte    # Login UI
│   │       └── +page.server.ts # Login logic
│   │
│   └── (app)/                  # Protected routes
│       ├── +layout.svelte      # App layout (sidebar)
│       ├── +layout.server.ts   # Auth middleware
│       ├── logout/
│       │   └── +server.ts      # Logout handler
│       └── profile/
│           ├── +page.svelte    # Profile view
│           ├── +page.server.ts # Profile data
│           └── change-password/
│               ├── +page.svelte    # Change password UI
│               └── +page.server.ts # Change password logic
│
├── hooks.server.ts             # Global server hook
└── app.d.ts                    # TypeScript types
```

---

## 🗄️ Database Collections

### `sessions` Collection

Stores active user sessions:

```typescript
{
  _id: ObjectId,
  sessionId: string,           // Random 64-char hex
  userId: string,              // Reference to users._id
  email: string,
  username: string,
  firstName?: string,
  lastName?: string,
  roles: string[],
  organizationId?: string,
  createdAt: Date,
  expiresAt: Date,             // createdAt + 24 hours
  lastActivity: Date           // Updated on each request
}
```

**Indexes**: `sessionId` (unique), `expiresAt`, `lastActivity`

---

## 🔐 Security Features

### Implemented

✅ **Argon2 password hashing**
✅ **HttpOnly session cookies**
✅ **Session expiration (24 hours)**
✅ **Idle timeout (2 hours)**
✅ **CSRF protection via SvelteKit**
✅ **Password strength validation**
✅ **Automatic session cleanup**
✅ **Secure cookie flags** (httpOnly, sameSite, secure in production)

### Recommended for Production

⚠️ **Rate limiting** on login endpoint
⚠️ **Account lockout** after failed attempts
⚠️ **Email verification** for new accounts
⚠️ **Password reset flow** via email
⚠️ **MFA/2FA** support
⚠️ **Session storage in Redis** (currently MongoDB)
⚠️ **Audit logging** for authentication events
⚠️ **IP whitelisting** for admin access

---

## 🧪 Testing

### Manual Testing

1. **Login Flow**:
   ```
   1. Navigate to http://localhost:5175/
   2. Should redirect to /login
   3. Enter: admin@ias.co.id / password123
   4. Should redirect to /
   5. Should see user info in top-right
   ```

2. **Protected Routes**:
   ```
   1. Open incognito window
   2. Try to access http://localhost:5175/users
   3. Should redirect to /login
   ```

3. **Logout**:
   ```
   1. Click user menu
   2. Click "Keluar"
   3. Should redirect to /login
   4. Session cookie should be cleared
   ```

4. **Password Change**:
   ```
   1. Login as admin
   2. Go to /profile/change-password
   3. Enter current: password123
   4. Enter new: NewPass123
   5. Confirm: NewPass123
   6. Should show success message
   7. Logout and login with new password
   ```

---

## 🚀 Next Steps

### High Priority

1. **Password Reset Flow**:
   - Email-based password reset
   - Token generation and validation
   - Email service integration

2. **Email Verification**:
   - Send verification email on registration
   - Verify email token
   - Mark email as verified

3. **Multi-Factor Authentication**:
   - TOTP support (Google Authenticator)
   - QR code generation
   - Backup codes
   - MFA enforcement per role

4. **Account Management**:
   - User registration page
   - Profile editing
   - Avatar upload
   - Account deletion (GDPR)

### Medium Priority

5. **Audit Logging**:
   - Log all authentication events
   - Log password changes
   - Log failed login attempts
   - Admin audit log viewer

6. **Social Login**:
   - Google OAuth integration
   - Microsoft Entra ID integration
   - SAML 2.0 support

7. **Session Management UI**:
   - View active sessions
   - Revoke sessions
   - Device information
   - Location tracking

### Low Priority

8. **Advanced Security**:
   - Rate limiting
   - Account lockout
   - IP whitelisting
   - Suspicious activity alerts

---

## 📝 Code Examples

### Creating a Session

```typescript
import { sessionManager } from '$lib/auth/session';

const session = await sessionManager.createSession(
  userId,
  email,
  username,
  roles,
  firstName,
  lastName,
  organizationId
);

sessionManager.setSessionCookie(cookies, session.sessionId);
```

### Checking Authentication

```typescript
// In +page.server.ts or +layout.server.ts
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  return {
    user: locals.user
  };
};
```

### Password Validation

```typescript
import { passwordService } from '$lib/auth/password';

const validation = passwordService.validatePassword('MyPass123');
if (!validation.isValid) {
  console.error(validation.errors);
}

const hashedPassword = await passwordService.hashPassword('MyPass123');
const isValid = await passwordService.verifyPassword(hashedPassword, 'MyPass123');
```

---

## 🔧 Environment Variables

Required in `.env`:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://...

# Session (optional, uses defaults)
SESSION_DURATION=86400000      # 24 hours in ms
SESSION_IDLE_TIMEOUT=7200000   # 2 hours in ms
SESSION_COOKIE_NAME=aksara_session
```

---

## 📊 Database Queries

### Find Active Sessions

```javascript
db.sessions.find({
  expiresAt: { $gt: new Date() }
});
```

### Cleanup Expired Sessions

```javascript
db.sessions.deleteMany({
  $or: [
    { expiresAt: { $lt: new Date() } },
    { lastActivity: { $lt: new Date(Date.now() - 7200000) } }
  ]
});
```

### Count Active Users

```javascript
db.sessions.aggregate([
  { $match: { expiresAt: { $gt: new Date() } } },
  { $group: { _id: "$userId" } },
  { $count: "activeUsers" }
]);
```

---

## 🎓 References

- [SvelteKit Authentication](https://kit.svelte.dev/docs/hooks)
- [Argon2 Documentation](https://github.com/P-H-C/phc-winner-argon2)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Session Management Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

**Completed by**: Claude Code
**Last Updated**: October 15, 2025
**Status**: ✅ Fully Implemented & Tested
