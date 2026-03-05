# Aksara SSO - Development Guide

> **Last Updated**: November 2025

# FEATURES

> This section describes what the final application will be capable of (the vision/target state).

## F1. Authentication & Security

### F1.1 Core Authentication
- **F1.1.1 OAuth 2.0 / OIDC Provider** ✅ - Full-featured identity provider with authorization code flow
- **F1.1.2 PKCE Support** - Enhanced security for public clients
- **F1.1.3 Token Management** ✅ - Access tokens, refresh tokens, token introspection, token revocation
- **F1.1.4 Session Management** ✅ - 24-hour session duration, 2-hour idle timeout, httpOnly secure cookies
- **F1.1.5 Password Security** ✅ - Argon2 hashing, complexity requirements (min 12 chars)
- **F1.1.6 Multi-Login Support** ✅ - Login with email, username, or NIK (employee ID)
- **F1.1.7 Role-Based Access Control (RBAC)** ✅ - Flexible role assignment per identity

### F1.2 Advanced Security
- **F1.2.1 Multi-Factor Authentication (MFA/2FA)** ✅ - Email OTP-based 2FA with backup codes
  - Enable/disable 2FA from user profile (`/profile/two-factor`)
  - 10 backup codes generated on activation
  - OTP codes sent via email (10-minute expiry, 5 wrong attempt limit)
  - Backup code verification for account recovery
  - Audit logging for all 2FA events
- **F1.2.2 IP Whitelisting** - CIDR notation support for admin access and SCIM endpoints
- **F1.2.3 Rate Limiting** ✅ - Implemented for email operations (2-5 minute cooldowns)
- **F1.2.4 Field-Level Encryption** - MongoDB Client-Side FLE for sensitive data (KTP, NPWP, DOB, phone)
- **F1.2.5 Data Masking** ✅ - UI-level masking for KTP, NPWP, phone, email (configuration UI complete, API integration ready)
- **F1.2.6 Security Headers** - CORS policies, CSRF protection, XSS prevention
- **F1.2.7 Input Validation** - Comprehensive sanitization across all endpoints
- **F1.2.8 Session Management** ✅ - Enhanced session tracking with:
  - User agent and IP address tracking
  - Session invalidation on security events (password reset)
  - View all active sessions per user
  - Remote session termination
  - Automatic cleanup of expired sessions
- **F1.2.9 Audit Logging** ✅ - Comprehensive authentication event tracking:
  - Login attempts (success/failure)
  - Password changes/resets
  - 2FA events
  - Email changes
  - Session creation/invalidation
  - Suspicious activity detection
  - 90-day retention policy

---

## F2. Identity & User Management

### F2.1 Unified Identity Model ✅
- **F2.1.1 Single Collection** ✅ - Polymorphic `identities` collection for all user types
- **F2.1.2 Identity Types** ✅:
  - **Employees** - NIK, position, org unit, employment type (PKWT/OS/Permanent)
  - **Partners** - Company affiliation, contract dates, partner type categorization
  - **External Users** - Temporary access, limited permissions
  - **Service Accounts** - OAuth client credentials, API-only access

### F2.2 Employee Lifecycle Management
- **F2.2.1 Onboarding Wizard** (5 steps):
  1. Personal Information (NIK, name, DOB, KTP, NPWP)
  2. Employment Information (type, status, join date)
  3. Assignment (Realm → Org Unit → Position → Location)
  4. SSO Access (optional account creation)
  5. Review & Confirmation
- **F2.2.2 Mutation/Transfer Workflow**:
  - Types: Transfer, Promosi (promotion), Demosi (demotion)
  - Entity/unit/position selection via lookup modals
  - Effective date tracking
  - Previous assignment capture
- **F2.2.3 Offboarding Workflow**:
  - Termination date and reason
  - Optional SSO access revocation
  - Automated checklist (IT asset return, final payroll, exit interview)
  - Integration with external systems (SCIM deprovision)
- **F2.2.4 Assignment History Timeline**:
  - Color-coded events (🟢 Onboarding, 🔵 Mutation, 🔴 Offboarding)
  - Visual timeline with connecting lines
  - Full context for each historical event

### F2.3 User Profile & Self-Service
- **F2.3.1 Employee Detail Page** ✅ - 4 tabs (Overview, Penempatan, SSO Access, History)
- **F2.3.2 Inline Edit Mode** - Edit employee details directly on detail page
- **F2.3.3 Account Self-Service Portal** ✅:
  - Profile editing (personal information)
  - Password change ✅
  - MFA setup and management ✅ (`/profile/two-factor`)
  - Email change with OTP verification ✅ (`/profile/change-email`)
  - View active sessions ✅
  - View SSO-connected applications
  - Download personal data (GDPR/PDP compliance)
  - Account deletion request (GDPR/PDP right to be forgotten)
- **F2.3.4 Password Reset Flow** ✅ - Email-based password recovery with token expiry
  - Forgot password (`/auth/forgot-password`)
  - Reset password with secure token (`/auth/reset-password`)
  - 1-hour token expiry
  - Session invalidation on password reset
- **F2.3.5 Email Verification** ✅ - Verify email addresses on registration:
  - Automatic verification email on registration
  - 24-hour token expiry
  - Resend verification (`/auth/resend-verification`)
  - Email verification endpoint (`/auth/verify-email`)
  - Welcome email after successful verification
- **F2.3.6 Passwordless Login** ✅ - OTP-based login without password:
  - Email OTP login (`/login-otp`)
  - 10-minute OTP expiry
  - Alternative to password authentication
  - Audit logging for OTP login attempts

### F2.4 Secondary Assignments
- **F2.4.1 Multi-Company Placement** - Employees can be assigned to multiple entities simultaneously
- **F2.4.2 Cross-Entity Roles** - Different roles in different organizational contexts

## F3. Organization Structure

### F3.1 Organizational Hierarchy ✅
- **F3.1.1 Realm/Organization Management** ✅ - Merged concept (each organization IS a realm)
- **F3.1.2 Organizational Units** ✅ - Direktorat, Divisi, Departemen, Bagian, Seksi
- **F3.1.3 Multi-Level Hierarchy** ✅ - Holding → Subsidiary → Branch → Divisions → Departments
- **F3.1.4 Position/Jabatan Management** ✅ - Job titles with levels, manager flags
- **F3.1.5 Mermaid Diagram Visualization** ✅ - Auto-generated org charts with pan/zoom
- **F3.1.6 Matrix Reporting Structures** - Support for multiple reporting lines

### F3.2 Organization Structure Versioning ✅
- **F3.2.1 Snapshot-Based Versioning** ✅ - Complete structure capture at any point in time
- **F3.2.2 SK (Surat Keputusan) Tracking** ✅ - Official decree documentation
- **F3.2.3 Employee Snapshot** ✅ - Captured with each version
- **F3.2.4 Workflow** ✅ - Draft → Active → Archived (no approval step)
- **F3.2.5 Idempotent Publishing** ✅ - Resume-capable, no MongoDB transactions needed
- **F3.2.6 Automatic Mermaid Generation** ✅ - Visual org charts from structure data
- **F3.2.7 Active Version Live Data** ✅ - STO page uses live org_units data for active versions
- **F3.2.8 Historical Snapshots** ✅ - Non-active versions remain read-only with frozen data
- **F3.2.9 Validation & Correction** - Detect orphaned units, circular references, detect promotion chains

### F3.3 SK Penempatan Karyawan (Employee Assignment Decree) 🚧
- **F3.3.1 Bulk Reassignment System** 🚧 - Manage hundreds of employees at once (UI complete)
- **F3.3.2 CSV Import** 🚧 - Mass import with flexible column mapping (UI complete)
- **F3.3.3 CSV Template Download** - Pre-formatted template for users
- **F3.3.4 Smart Validation** - Validates employee IDs, org units, positions
- **F3.3.5 Previous Assignment Capture** - Automatic tracking of current assignments
- **F3.3.6 Error Reporting** - Line-by-line validation errors
- **F3.3.7 Workflow** - Draft → Pending Approval → Approved → Executed
- **F3.3.8 History Integration** - Creates employee history entries on execution
- **F3.3.9 Excel Export** - Export SK attachment for official documentation

## F4. SCIM 2.0 Integration (Enterprise-Grade)

### F4.1 Core SCIM API ✅
- **F4.1.1 Users Endpoint** ✅ (`/scim/v2/Users`):
  - GET (list with pagination & filtering) - Returns employee identities
  - GET /{id} (single user)
  - POST (create user) - Creates employee identity
  - PUT (full update)
  - PATCH (partial update)
  - DELETE (deactivate)
- **F4.1.2 Groups Endpoint** ✅ (`/scim/v2/Groups`):
  - Full CRUD for organizational units
  - Hierarchical group membership
  - Member management (add/remove)
- **F4.1.3 Bulk Operations** ✅ (`/scim/v2/Bulk`):
  - Up to 1,000 operations per request (beats Okta's 500!)
  - POST, PUT, PATCH, DELETE in single request
  - 10MB max payload
  - Error handling with `failOnErrors` parameter

### F4.2 Advanced SCIM Features
- **F4.2.1 Advanced Filter Parser** 🚧 - ALL operators supported (3 tests failing):
  - Comparison: `eq`, `ne`, `co`, `sw`, `ew`, `gt`, `ge`, `lt`, `le`, `pr`
  - Logical: `and`, `or`, `not`, `()`
  - Complex queries: `(active eq true and userName ew "@ias.co.id") or x-position.isManager eq true`
- **F4.2.2 Pagination** ✅ - startIndex + count (max 1,000 results per page)
- **F4.2.3 Sorting** ✅ - sortBy + sortOrder (ascending/descending)
- **F4.2.4 Attribute Selection** - Return only specified attributes
- **F4.2.5 Manager Lookup** - Automatically determines manager from org hierarchy
- **F4.2.6 Team Member Lookup** - Finds all employees in same org unit

### F4.3 Custom Extensions
- **F4.3.1 x-position** - Employee position details (isManager, level, title)
- **F4.3.2 x-orgUnit** - Hierarchical org unit metadata (type, parent, manager, path)

### F4.4 SCIM Authentication & Security ✅
- **F4.4.1 OAuth 2.0 Client Credentials Grant** ✅ (RFC 6749)
- **F4.4.2 JWT Access Tokens** ✅ - 1-hour expiration
- **F4.4.3 Scope-Based Permissions** ✅ - 7 scopes (read:users, write:users, delete:users, read:groups, write:groups, delete:groups, bulk:operations)
- **F4.4.4 IP Whitelisting** - CIDR notation support
- **F4.4.5 Per-Client Rate Limiting** - Configurable, default 100 req/min

### F4.5 SCIM Admin UI ✅
- **F4.5.1 Client Management Dashboard** ✅ (`/clients-scim`):
  - Create/deactivate clients
  - Generate and rotate secrets
  - View usage statistics
  - Monitor performance metrics
  - Track error rates

### F4.6 SCIM Webhooks
- **F4.6.1 Real-Time Event Notifications** - Push changes to consumer apps
- **F4.6.2 HMAC-SHA256 Signatures** - Verify webhook authenticity
- **F4.6.3 Event Types** - user.created, user.updated, user.deleted, group.created, etc.
- **F4.6.4 Retry Logic** - Exponential backoff with DLQ (Dead Letter Queue)
- **F4.6.5 Webhook Management UI** - Subscribe/unsubscribe, view logs

## F5. Microsoft Entra ID Sync

### F5.1 Bidirectional Synchronization
- **F5.1.1 Sync Directions**:
  - Aksara SSO → Entra ID (push)
  - Entra ID → Aksara SSO (pull)
  - Bidirectional (two-way sync)
- **F5.1.2 Microsoft Graph API Integration** - OAuth 2.0 authentication
- **F5.1.3 User Sync** - Employee identity synchronization
- **F5.1.4 Group Sync** - Organizational unit synchronization

### F5.2 Sync Configuration
- **F5.2.1 Field Mapping** - Flexible mapping between Aksara and Entra ID fields
- **F5.2.2 Custom Field Support** - Add new field mappings via UI
- **F5.2.3 Sync Direction Per Field** - Control per-field sync direction
- **F5.2.4 Connection Testing** - Test Entra ID credentials before saving

### F5.3 Conflict Resolution
- **F5.3.1 Three-Way Comparison UI** - App DB | Entra ID | Result
- **F5.3.2 Per-Field Actions** - Keep App DB value, Use Entra ID value, Sync both ways, Skip field
- **F5.3.3 Bulk Selection** - Select All / Deselect All
- **F5.3.4 Preview Changes** - Show what will change before sync

### F5.4 Sync Management
- **F5.4.1 Manual Sync Trigger** - On-demand sync execution
- **F5.4.2 Auto-Sync Scheduling** - Cron-based scheduled sync (hourly, daily, weekly)
- **F5.4.3 Sync History Log** - Track all sync operations with timestamps
- **F5.4.4 Error Handling** - Detailed error messages with retry logic
- **F5.4.5 Progress Tracking** - Real-time sync progress indicator
- **F5.4.6 Export Sync Logs** - Download sync history as CSV
- **F5.4.7 Webhook Notifications** - Notify on sync completion/failure

## F6. Email Infrastructure & Communication

### F6.1 Email Service Configuration ✅
- **F6.1.1 Multi-Provider Support** ✅ - Configured via `/settings`
  - Gmail SMTP (500 emails/day free)
  - Microsoft 365 SMTP (10,000 emails/day)
  - SendGrid API (100 emails/day free tier)
  - Generic SMTP (custom mail servers)
- **F6.1.2 Dynamic Configuration** ✅ - Stored in database, no code changes needed
- **F6.1.3 Test Email Function** ✅ - Verify configuration before saving
- **F6.1.4 Connection Pooling** ✅ - Reusable SMTP connections via nodemailer

### F6.2 Email Templates ✅
- **F6.2.1 Email Verification** ✅ - Welcome email with verification link (24-hour expiry)
- **F6.2.2 OTP Codes** ✅ - 6-digit codes for login, 2FA, verification (10-minute expiry)
- **F6.2.3 Password Reset** ✅ - Secure reset link (1-hour expiry)
- **F6.2.4 Welcome Email** ✅ - Sent after successful email verification
- **F6.2.5 HTML & Plain Text** ✅ - All templates include both formats
- **F6.2.6 Responsive Design** ✅ - Mobile-friendly email templates

### F6.3 OTP System ✅
- **F6.3.1 OTP Generation** ✅ - Cryptographically secure random codes
- **F6.3.2 Multiple Purposes** ✅:
  - Login (passwordless authentication)
  - 2FA verification
  - Email change verification
  - Password reset
  - Account recovery
- **F6.3.3 Security Features** ✅:
  - 10-minute expiry (configurable)
  - 5 wrong attempt limit
  - Rate limiting (2 minutes between requests)
  - One-time use enforcement
  - Automatic cleanup of expired codes
- **F6.3.4 Database Storage** ✅ - `otp_codes` collection with expiry tracking

### F6.4 Token Management ✅
- **F6.4.1 Verification Tokens** ✅ - URL-safe base64 tokens for email/password flows
- **F6.4.2 Secure Hashing** ✅ - SHA-256 hashing before database storage
- **F6.4.3 Expiry Management** ✅:
  - Email verification: 24 hours
  - Password reset: 1 hour
- **F6.4.4 Token Invalidation** ✅ - Automatic invalidation after use or expiry
- **F6.4.5 Database Storage** ✅ - `verification_tokens` collection

## F7. Audit & Compliance

### F7.1 Comprehensive Audit Logging ✅
- **F7.1.1 Authentication Event Logging** ✅ - Specialized auth event tracker (`src/lib/audit/auth-logger.ts`)
- **F7.1.2 Event Types Tracked** ✅:
  - Login attempts (success/failure)
  - Logout events
  - Registration
  - Email verification
  - Email changes
  - Password changes/resets
  - 2FA enable/disable/verification
  - Session creation/invalidation
  - Account lockout events
  - Suspicious activity detection
- **F7.1.3 Metadata Capture** ✅ - IP address, user agent, session ID, timestamps
- **F7.1.4 Non-Blocking** ✅ - Audit failures don't break operations
- **F7.1.5 Query Helpers** ✅:
  - Get identity audit logs
  - Get recent failed login attempts (for rate limiting)
  - Automatic cleanup (90-day retention)
- **F7.1.6 Database Storage** ✅ - `audit_logs` collection

### F7.2 General Audit Logging ✅
- **F7.2.1 Reusable Audit Logger Utility** ✅ - Helper functions for logging
- **F7.2.2 Middleware** ✅ - Automatic 401/403 tracking
- **F7.2.3 Type-Safe Actions** ✅ - TypeScript enum for audit actions
- **F7.2.4 Request Metadata** ✅ - IP address, user agent, timestamp
- **F7.2.5 Audit Log UI** ✅ - Pagination, search, filters, export

### F7.3 Logged Events ✅
- **Authentication** ✅ - login, logout, login failures, password changes
- **Employee Lifecycle** ✅ - onboarding, mutation, transfer, promotion, demotion, offboarding
- **OAuth Operations** ✅ - token grants, token refresh, client operations
- **Identity Operations** ✅ - create, update, delete, activate, deactivate
- **Organization Management** ✅ - org/unit/position CRUD
- **SCIM API Requests** ✅ - All SCIM operations with request/response

### F6.3 UU PDP No. 27 Tahun 2022 Compliance (Indonesia Data Protection Law)
- **F6.3.1 Lawful Basis Tracking** - Document legal basis for data processing
- **F6.3.2 Data Minimization** - Collect only necessary data
- **F6.3.3 Purpose Limitation** - Use data only for stated purposes
- **F6.3.4 Data Subject Rights**:
  - Right to access personal data
  - Right to rectification (correction)
  - Right to erasure (deletion)
  - Right to data portability (export)
  - Right to object to processing
- **F6.3.5 Breach Notification** - 3x24 hours notification requirement
- **F6.3.6 Data Retention Policies** - Automatic deletion after retention period
- **F6.3.7 Consent Management** - Employee consent forms for data processing
- **F6.3.8 Kebijakan Privasi** - Privacy Policy in Bahasa Indonesia
- **F6.3.9 Data Protection Officer (DPO)** - Appointed for compliance oversight

### F6.4 GDPR-Style Features
- **F6.4.1 Data Export** - Download personal data in machine-readable format (JSON/CSV)
- **F6.4.2 Right to Be Forgotten** - Complete data erasure with anonymization option
- **F6.4.3 Data Anonymization** - Remove PII for analytics/reporting
- **F6.4.4 ROPA** - Record of Processing Activities documentation
- **F6.4.5 Compliance Reports** - SOC2, ISO 27001 readiness reports

### F6.5 Advanced Security Features
- **F6.5.1 Breach Detection System** - Automated anomaly detection
- **F6.5.2 Security Monitoring** - Real-time threat detection
- **F6.5.3 Penetration Testing** - Regular security assessments
- **F6.5.4 Bug Bounty Program** - Incentivize security research
- **F6.5.5 Field-Level Access Control** - Justification required for sensitive data access

## F7. Admin UI & Navigation

### F7.1 Responsive Layout ✅
- **F7.1.1 Collapsible Drawer Navigation** ✅ - Mobile-friendly with overlay
- **F7.1.2 Grouped Navigation** ✅ - Three categories (Identitas, Organisasi, Integrasi)
- **F7.1.3 User Menu Dropdown** ✅ - Profile, settings, logout
- **F7.1.4 Realm Badge** ✅ - Current organizational context indicator
- **F7.1.5 Educational Info Boxes** - Contextual help on major pages

### F7.2 Reusable UI Components ✅
- **F7.2.1 DataTable Component** ✅:
  - Server-side pagination
  - Multi-column sorting
  - Search/filtering
  - CSV export
  - Row click events for lookups
  - Configurable action buttons
- **F7.2.2 LookupModal Component** ✅:
  - Modal-based lookup with DataTable
  - Server-side pagination
  - Replaces long dropdown lists
  - Used for parent unit selection, manager selection
- **F7.2.3 Form Components**:
  - Inline edit mode (employee detail page)
  - Multi-step wizards (onboarding)
  - Modal forms (mutation, offboarding)

### F7.3 Unified Identities Page ✅
- **F7.3.1 Tabbed Interface** ✅ - Employees, Partners, External Users, Service Accounts
- **F7.3.2 DataTable Integration** ✅ - Sortable columns, search, CSV export
- **F7.3.3 Tab-Specific Columns** ✅:
  - Employees: NIK, Name, Position, Org Unit, Status
  - Partners: Name, Company, Contract Dates, Type
  - External: Name, Email, Access Level, Expiry
  - Service Accounts: Name, Linked OAuth Client, Scopes

### F7.4 Themes & Branding ⚠️ PARTIAL
- **F7.4.1 Branding Infrastructure** ✅ - Schema, utilities, storage in organizations collection
- **F7.4.2 Customizable Login Pages** - Logo, colors, background images (pending UI implementation)
- **F7.4.3 Email Templates** - Branded transactional emails
- **F7.4.4 Error Pages** - Consistent error page design
- **F7.4.5 Admin Console Themes** - Light/dark mode support

## F8. OAuth 2.0 Provider

### F8.1 OAuth 2.0 / OIDC Implementation ✅
- **F8.1.1 Authorization Code Flow** ✅ - Standard OAuth flow for web apps
- **F8.1.2 PKCE Support** - Enhanced security for SPAs and mobile apps
- **F8.1.3 Token Endpoint** ✅ - `/oauth/token` for access + refresh tokens
- **F8.1.4 Token Introspection** ✅ - `/oauth/introspect` to validate tokens
- **F8.1.5 Token Revocation** ✅ - `/oauth/revoke` to invalidate tokens
- **F8.1.6 OIDC UserInfo Endpoint** ✅ - `/oauth/userinfo` for user details

### F8.2 Client Management ✅
- **F8.2.1 OAuth Client Management UI** ✅ - Create, configure, deactivate clients
- **F8.2.2 Service Account Auto-Creation** ✅ - Each OAuth client gets a linked service account identity
- **F8.2.3 Client Credentials Display** ✅ - Show/hide client ID and secret
- **F8.2.4 Authorization Endpoint Testing UI** - Test OAuth flows directly from admin console
- **F8.2.5 Client Scopes Configuration**:
  - Predefined scopes (profile, email, roles, openid)
  - Custom scopes
  - Scope mapping to claims
  - Consent screen for scope approval

### F8.3 Token Mappers
- **F8.3.1 User Attribute Mappers** - Map user attributes to token claims
- **F8.3.2 Role Name Mappers** - Include roles in access tokens
- **F8.3.3 Audience Mappers** - Control token audience (aud claim)
- **F8.3.4 Custom Claim Mappers** - Add custom data to tokens

### F8.4 Multi-App SSO Integration
- **F8.4.1 Single Sign-On** - Login once, access all connected apps
- **F8.4.2 Single Sign-Out (SLO)**:
  - Backchannel logout - Server-to-server logout notifications
  - Frontchannel logout - Browser-based logout propagation
  - Session monitoring - Track active sessions across apps

### F8.5 Social Login / Identity Provider Integration (REMOVED FROM ROADMAP)
- Social login features have been deprioritized and removed from the implementation roadmap

## F9. Database Management

### F9.1 CSV-Based Seeding System ✅
- **F9.1.1 Human-Readable CSV Files** ✅ - Use organization names/codes instead of ObjectIds
- **F9.1.2 Version-Controlled Seed Data** ✅ - CSV files in `scripts/seeders/`
- **F9.1.3 Reference Resolver** ✅ - Converts names/codes to MongoDB ObjectIds automatically
- **F9.1.4 Dependency-Aware Import** ✅ - Sequential insertion respecting foreign key relationships
- **F9.1.5 Safe --clean Mode** ✅ - Only drops collections with corresponding CSV files (preserves transient data)

### F9.2 Database Utilities ✅
- **F9.2.1 CSV Export Tool** ✅ - Export collections to human-readable CSVs
  - Reference resolution (ObjectIds → names/codes)
  - Auto-detect mode (exports ALL fields, adapts to schema changes)
  - Configured mode (consistent columns for production)
- **F9.2.2 CSV Import Tool** ✅ - Import CSVs with automatic ObjectId reference resolution
- **F9.2.3 Database Cloning Tool** ✅ - Clone entire databases between environments (dev → staging → prod)
- **F9.2.4 Database Statistics Tool** ✅ - Compare document counts across databases
- **F9.2.5 Flexible Column Mapping** ✅ - Support multiple CSV column name variations

### F9.3 Schema Management
- **F9.3.1 Zod Validation** ✅ - Type-safe schema definitions
- **F9.3.2 Schema Evolution** - Track changes over time
- **F9.3.3 Migration Scripts** - Safe schema migrations with rollback support

## F10. Developer Experience

### F10.1 API Documentation
- **F10.1.1 OpenAPI/Swagger Specification** - Machine-readable API docs
- **F10.1.2 Interactive API Docs** - Try endpoints directly from browser
- **F10.1.3 Code Examples** - curl, JavaScript, Python, Go examples
- **F10.1.4 API Versioning** - `/api/v1`, `/api/v2` for breaking changes
- **F10.1.5 Developer Portal** - Self-service API key management

### F10.2 SDKs & Client Libraries
- **F10.2.1 JavaScript/TypeScript SDK** - npm package for Node.js and browsers
- **F10.2.2 Python SDK** - pip package
- **F10.2.3 Go SDK** - go get package
- **F10.2.4 HTTP Client Examples** - Postman collections, Insomnia workspaces

### F10.3 Webhooks & Event System
- **F10.3.1 Event Subscription Management** - Subscribe to specific events
- **F10.3.2 Webhook Endpoint Registration** - Configure callback URLs
- **F10.3.3 Event Payload Customization** - Choose which fields to include
- **F10.3.4 Retry Logic** - Exponential backoff with Dead Letter Queue
- **F10.3.5 HMAC Signatures** - Verify webhook authenticity
- **F10.3.6 Event Types**:
  - Employee events (created, updated, deleted, onboarded, mutated, offboarded)
  - OAuth events (client created, token issued)
  - Organization events (unit created, structure changed)
  - SCIM events (user provisioned, deprovisioned)

### F10.4 Advanced Features
- **F10.4.1 GraphQL Support** - Alternative to REST API (optional)
- **F10.4.2 Device Authorization Flow** - For TV/IoT devices without keyboard
- **F10.4.3 Client Registration Service** - Dynamic client registration (RFC 7591)
- **F10.4.4 Internationalization** - Multi-language support (Indonesian / English)

# ROADMAP/TODO

> This section shows the implementation plan with current status to achieve the features above.

## Phase 1: Security & Compliance (HIGH PRIORITY)
**Timeline**: Weeks 1-3
**Status**: ⏳ Planned

### 1.1 MongoDB Field-Level Encryption ⭐⭐⭐ CRITICAL
**Timeline**: 1 week
**Dependency**: None
**Source**: SECURITY_IMPLEMENTATION_GUIDE.md, DATA_PRIVACY_COMPLIANCE.md
**Implements**: F1.2.4

- [ ] Generate encryption keys (DEK and KEK)
- [ ] Setup Azure Key Vault or AWS KMS
- [ ] Implement MongoDB Client-Side FLE for sensitive fields:
  - [ ] KTP (ID card number)
  - [ ] NPWP (tax ID)
  - [ ] Date of birth
  - [ ] Phone numbers
- [ ] Update identity schema with encrypted field definitions
- [ ] Create encryption utility functions
- [ ] Test encryption/decryption with existing data
- [ ] Deploy to production with secure key management

### 1.2 Data Masking Implementation ⭐⭐⭐ CRITICAL ✅ IMPLEMENTED
**Timeline**: 3 days
**Dependency**: None
**Source**: SECURITY_IMPLEMENTATION_GUIDE.md
**Implements**: F1.2.5

- [✅] Create data masking utility (`src/lib/utils/data-masking.ts`)
- [✅] Implement masking functions:
  - [✅] `maskKTP()` - Show first 4 and last 4 digits: `3201****0123`
  - [✅] `maskNPWP()` - Not implemented yet (can use custom masking)
  - [✅] `maskPhone()` - Show first 4 and last 4: `0812****7890`
  - [✅] `maskEmail()` - Show first char: `u***@e***.com`
  - [✅] `maskDate()` - Mask year/month: `****-**-15`
  - [✅] `maskCustom()` - Generic masking with configurable showFirst/showLast
- [✅] Configuration UI at `/settings/data-masking/`:
  - [✅] Enable/disable masking globally
  - [✅] Configure masking rules per field
  - [✅] Field discovery browser (auto-detect fields)
  - [✅] Preview tool to test masking
  - [✅] Role-based exemptions (admin, superadmin)
- [✅] API integration ready via `getMaskedIdentity()` function
- [ ] Apply masking in UI components:
  - [ ] Employee list table
  - [ ] Employee detail page (with "Show" button for authorized users)
  - [ ] Identity management page
  - [ ] Audit logs (when displaying PII)
- [ ] Add field-level access control (require justification for unmasked view)

### 1.3 Multi-Factor Authentication (MFA/2FA) ⭐⭐⭐
**Timeline**: 1 week
**Dependency**: Email service configured (see 1.3.0)
**Source**: SECURITY_IMPLEMENTATION_GUIDE.md
**Implements**: F1.2.1

#### 1.3.0 Email Service Setup (REQUIRED for Email OTP & notifications)
Choose one approach:

**Option A: Free SMTP Relay (Development/Small Scale)**
- [ ] Gmail SMTP Relay:
  - [ ] Create Google account or use existing
  - [ ] Enable 2-step verification on Google account
  - [ ] Generate App Password (Security → App passwords)
  - [ ] Configure SMTP: `smtp.gmail.com:587` (TLS)
  - [ ] **Limits**: 500 emails/day, 100 recipients/email
  - [ ] **Best for**: Development, small teams (<500 users)
- [ ] Microsoft 365 SMTP:
  - [ ] Use Microsoft 365 business email
  - [ ] Configure SMTP: `smtp.office365.com:587` (STARTTLS)
  - [ ] **Limits**: Varies by plan (typically 10,000/day)
  - [ ] **Best for**: Organizations already using M365

**Option B: Transactional Email Service (Production/Scale)**
- [ ] Resend (recommended for developers):
  - [ ] Free tier: 3,000 emails/month, 100 emails/day
  - [ ] Simple API, excellent DX
  - [ ] $20/month for 50,000 emails
- [ ] SendGrid:
  - [ ] Free tier: 100 emails/day forever
  - [ ] $20/month for 50,000 emails
- [ ] AWS SES:
  - [ ] $0.10 per 1,000 emails
  - [ ] Requires AWS account setup

**Implementation:**
- [ ] Create `/src/lib/email/` directory
- [ ] Create `email-service.ts` with `sendEmail()` function
- [ ] Create email templates in `/src/lib/email/templates/`
- [ ] Add email config to environment variables:
  ```bash
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=your-app-password
  SMTP_FROM=SSO <noreply@yourdomain.com>
  ```
- [ ] Install nodemailer: `bun add nodemailer @types/nodemailer`
- [ ] Test email sending with test account

#### 1.3.1 TOTP (Time-Based OTP) Implementation ⭐⭐⭐ MOST SECURE

**Install Dependencies:**
```bash
bun add @otplib/preset-default qrcode
bun add -d @types/qrcode
```

**Database Schema (`mfa_settings` collection):**
```typescript
{
  _id: ObjectId,
  identityId: string,           // Reference to identity
  mfaEnabled: boolean,           // MFA active
  mfaMethod: 'totp' | 'email',   // Preferred method
  totpSecret?: string,           // Encrypted TOTP secret
  totpVerified: boolean,         // Setup completed
  backupCodes: string[],         // Hashed backup codes
  trustedDevices: [{             // "Remember this device"
    deviceId: string,
    deviceName: string,
    trustedUntil: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Backend Implementation:**
- [ ] Create `src/lib/auth/totp-service.ts`:
  - [ ] `generateSecret()` - Create TOTP secret for user
  - [ ] `generateQRCode(secret, email)` - Generate QR code data URL
  - [ ] `verifyToken(secret, token)` - Validate 6-digit code
  - [ ] `getBackupWindow()` - Allow ±1 time window for clock skew
- [ ] Create `src/lib/auth/mfa-repository.ts`:
  - [ ] `createMFASettings(identityId, method)` - Initialize MFA
  - [ ] `getMFASettings(identityId)` - Get user's MFA config
  - [ ] `updateTOTPSecret(identityId, encryptedSecret)` - Save secret
  - [ ] `verifyTOTPSetup(identityId)` - Mark TOTP as verified
  - [ ] `disableMFA(identityId)` - Turn off MFA

**MFA Setup Flow (`/profile/mfa/setup`):**
- [ ] Create setup wizard page:
  - [ ] Step 1: Choose method (TOTP or Email OTP)
  - [ ] Step 2 (TOTP): Display QR code + manual entry secret
    ```typescript
    const secret = generateSecret();
    const qrCode = await generateQRCode(secret, user.email);
    const manualEntryCode = secret.base32; // Show as backup
    ```
  - [ ] Step 3: Verify first code (require user to enter code from app)
  - [ ] Step 4: Generate and display 10 backup codes (allow download)
  - [ ] Step 5: Confirmation - MFA now active

**Login Flow Update (`/login`):**
- [ ] After successful password verification:
  ```typescript
  if (mfaSettings?.mfaEnabled) {
    // Store userId in temporary session
    cookies.set('mfa_pending', userId, { maxAge: 300 }); // 5 min
    redirect(302, '/mfa/verify');
  }
  ```
- [ ] Create `/mfa/verify` page:
  - [ ] Input for 6-digit code
  - [ ] "Use backup code" link
  - [ ] "Trust this device for 30 days" checkbox
  - [ ] Verify code with `verifyToken(secret, code)`
  - [ ] If valid: create session, clear mfa_pending cookie
  - [ ] If invalid: increment failed attempts, show error
  - [ ] Lock after 5 failed attempts (10-minute cooldown)

**Backup Codes:**
- [ ] Generate 10 random codes on MFA setup:
  ```typescript
  const codes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  ); // e.g., "A3F2B8C1"
  ```
- [ ] Hash codes before storage (Argon2/bcrypt)
- [ ] Store as `backupCodes: string[]` in mfa_settings
- [ ] On use: verify against all hashes, remove used code
- [ ] Warn when <3 codes remain
- [ ] Allow regeneration (invalidates old codes)

**Trust Device:**
- [ ] Generate device ID: `crypto.randomUUID()`
- [ ] Store in cookie: `trusted_device={deviceId}`
- [ ] On login: check if deviceId in `trustedDevices` array
- [ ] If found and not expired: skip MFA challenge
- [ ] Trusted until: 30 days from last use

#### 1.3.2 Email OTP Implementation ⭐⭐ USER-FRIENDLY ALTERNATIVE

**Use Cases:**
- Users without smartphone/authenticator app
- Backup method when TOTP unavailable
- Step-up authentication for sensitive actions
- Recovery when primary MFA method fails

**Database Schema (add to existing collection or create `email_otp_codes`):**
```typescript
{
  _id: ObjectId,
  identityId: string,
  code: string,              // Hashed 6-digit code
  purpose: 'login' | 'password_reset' | 'email_change' | 'sensitive_action',
  expiresAt: Date,           // 10 minutes from creation
  attempts: number,          // Failed verification attempts
  used: boolean,
  createdAt: Date
}
```

**Backend Implementation:**
- [ ] Create `src/lib/auth/email-otp-service.ts`:
  - [ ] `generateOTP()` - Create 6-digit code (000000-999999)
    ```typescript
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    ```
  - [ ] `sendOTPEmail(email, code, purpose)` - Email the code
  - [ ] `verifyOTP(identityId, code, purpose)` - Validate code
  - [ ] `cleanupExpiredCodes()` - Delete expired codes (cron job)
  - [ ] Rate limiting: Max 3 OTP requests per 10 minutes per user

**Email Template (`/src/lib/email/templates/otp-code.html`):**
```html
<h2>Your Verification Code</h2>
<p>Your one-time password is:</p>
<h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">
  {CODE}
</h1>
<p>This code expires in 10 minutes.</p>
<p>If you didn't request this code, please ignore this email.</p>
```

**MFA Setup for Email OTP (`/profile/mfa/setup`):**
- [ ] User selects "Email OTP" as MFA method
- [ ] Send test OTP to user's email
- [ ] User enters code to verify email works
- [ ] Generate and show backup codes
- [ ] Enable MFA with method='email'

**Login Flow with Email OTP:**
- [ ] After password verification, if MFA method is 'email':
  ```typescript
  const code = generateOTP();
  await saveOTP(userId, code, 'login');
  await sendOTPEmail(user.email, code, 'login');
  cookies.set('mfa_pending', userId);
  redirect(302, '/mfa/verify?method=email');
  ```
- [ ] Verification page:
  - [ ] Show message: "Code sent to jo***@example.com"
  - [ ] Input for 6-digit code
  - [ ] "Resend code" button (rate limited: 1/minute)
  - [ ] Verify code, create session if valid
  - [ ] Max 5 attempts before lockout

**Step-Up Authentication (Sensitive Actions):**
- [ ] Require Email OTP for:
  - [ ] Change email address
  - [ ] Delete account
  - [ ] Add new MFA device
  - [ ] Export personal data
- [ ] Example middleware:
  ```typescript
  async function requireOTP(action: string) {
    if (!session.otpVerified || session.otpVerifiedAt < Date.now() - 300000) {
      // OTP not verified or >5 min old
      await sendOTP(user.email, action);
      redirect(302, `/verify-otp?action=${action}`);
    }
  }
  ```

**Security Considerations:**
- [ ] Hash codes before storage (even though short-lived)
- [ ] Limit attempts: 5 tries then 10-minute lockout
- [ ] Rate limit email sending: 3 codes per 10 minutes
- [ ] Log all OTP requests for audit
- [ ] Auto-cleanup expired codes (background job)

#### 1.3.3 General MFA Implementation Tasks

- [ ] Create MFA management UI at `/profile/mfa`:
  - [ ] Enable/disable MFA toggle
  - [ ] Choose MFA method (TOTP or Email)
  - [ ] Reset MFA device (requires password confirmation)
  - [ ] Regenerate backup codes
  - [ ] View trusted devices, revoke trust
- [ ] Enforce MFA by role:
  - [ ] Add `requireMFA: boolean` to role schema
  - [ ] Check on login: if role requires MFA but not enabled, force setup
  - [ ] Require for: 'admin', 'superadmin', 'hr' roles
- [ ] Add MFA status indicators:
  - [ ] Badge on user profile: "🔒 MFA Enabled (TOTP)"
  - [ ] Admin view: filter users by MFA status
  - [ ] Audit log: track MFA setup/disable events
- [ ] Account recovery:
  - [ ] "Lost MFA device?" link on MFA verify page
  - [ ] Require admin approval to reset MFA
  - [ ] Create admin tool to reset user's MFA
- [ ] Testing:
  - [ ] Test TOTP with Google Authenticator, Authy, 1Password
  - [ ] Test Email OTP delivery across different email providers
  - [ ] Test backup codes (single-use, regeneration)
  - [ ] Test device trust (remember device, expiry)
  - [ ] Test rate limiting, lockouts
  - [ ] Test recovery flows

### 1.4 Account Self-Service Portal ⭐⭐⭐
**Timeline**: 5 days
**Dependency**: MFA implementation
**Source**: _DEV_GUIDE.md
**Implements**: F2.3.3

- [ ] Create `/account` route for end-user portal
- [ ] Implement profile editing page:
  - [ ] View personal information
  - [ ] Edit non-sensitive fields (phone, address)
  - [ ] Request to update sensitive fields (name, DOB) - requires approval
- [ ] Implement password change page:
  - [ ] Verify current password
  - [ ] Enter new password (with strength indicator)
  - [ ] Confirm new password
- [ ] Implement MFA management page:
  - [ ] Enable/disable MFA
  - [ ] Change MFA method
  - [ ] Regenerate backup codes
- [ ] Implement connected apps page:
  - [ ] List all SSO-connected applications
  - [ ] Show last access time
  - [ ] Revoke app access
- [ ] Implement data export page (GDPR/PDP compliance):
  - [ ] Request personal data download
  - [ ] Generate JSON/CSV export
  - [ ] Email download link
- [ ] Implement account deletion page:
  - [ ] Request account deletion
  - [ ] Confirm with password + MFA
  - [ ] Submit deletion request to admin for approval
- [ ] Add navigation to self-service portal from user menu

### 1.5 Password Reset Flow ⭐⭐⭐
**Timeline**: 3 days
**Dependency**: None
**Source**: _DEV_GUIDE.md
**Implements**: F2.3.4

- [ ] Create "Forgot Password" link on login page
- [ ] Implement password reset request:
  - [ ] Enter email or username
  - [ ] Generate secure reset token (UUID with expiry)
  - [ ] Send reset email with token link
  - [ ] Expire token after 1 hour
- [ ] Create password reset page:
  - [ ] Verify token validity
  - [ ] Enter new password (with strength indicator)
  - [ ] Confirm new password
  - [ ] Invalidate token after successful reset
- [ ] Add rate limiting (max 3 reset requests per hour per email)
- [ ] Log password reset events in audit log
- [ ] Test reset flow with email delivery

### 1.6 Email Verification ⭐⭐
**Timeline**: 2 days
**Dependency**: None
**Source**: _DEV_GUIDE.md
**Implements**: F2.3.5

- [ ] Add `emailVerified` field to identity schema
- [ ] Generate email verification token on registration
- [ ] Send verification email with token link
- [ ] Create email verification page:
  - [ ] Verify token
  - [ ] Mark email as verified
  - [ ] Show success message
- [ ] Require email verification before allowing login (optional setting)
- [ ] Add "Resend verification email" button
- [ ] Test email delivery and verification flow

### 1.7 UU PDP Compliance Features ⭐⭐⭐
**Timeline**: 1 week
**Dependency**: Data export, account deletion
**Source**: DATA_PRIVACY_COMPLIANCE.md, KEBIJAKAN_PRIVASI_TEMPLATE.md
**Implements**: F6.3 (UU PDP Compliance)

- [ ] **Appoint Data Protection Officer (DPO)**:
  - [ ] Hire or assign DPO (can be external consultant)
  - [ ] Document DPO responsibilities
  - [ ] Add DPO contact to privacy policy
- [ ] **Create Kebijakan Privasi (Privacy Policy)**:
  - [ ] Use template from KEBIJAKAN_PRIVASI_TEMPLATE.md
  - [ ] Customize for organization
  - [ ] Translate to Bahasa Indonesia
  - [ ] Publish at `/privacy-policy`
  - [ ] Link from login page and admin console
- [ ] **Implement employee consent forms**:
  - [ ] Create consent form for data processing
  - [ ] Collect consent during onboarding
  - [ ] Store consent records with timestamp
  - [ ] Allow consent withdrawal
- [ ] **Breach notification system**:
  - [ ] Create breach detection alerts
  - [ ] Create breach notification template
  - [ ] Document 3x24 hour notification procedure
  - [ ] Test notification workflow
- [ ] **Data retention automation**:
  - [ ] Define retention periods per data type
  - [ ] Create scheduled job to check retention
  - [ ] Implement soft-delete (anonymize instead of hard delete)
  - [ ] Create admin UI to manage retention policies
- [ ] **ROPA (Record of Processing Activities)**:
  - [ ] Document all data processing activities
  - [ ] Create ROPA template
  - [ ] Export ROPA as PDF
- [ ] **Staff training on data protection**:
  - [ ] Create training materials
  - [ ] Schedule training sessions
  - [ ] Track training completion

---

## Phase 2: Integration (Weeks 4-6)
**Status**: ⚠️ Partial (UI ready, backend pending)

### 2.1 Microsoft Entra ID Sync Backend ⭐⭐⭐
**Timeline**: 2 weeks
**Dependency**: None
**Source**: ENTRAID_SYNC_IMPLEMENTATION.md

- [ ] **Setup Microsoft Graph API authentication**:
  - [ ] Register app in Azure AD
  - [ ] Request required Graph API permissions (User.ReadWrite.All, Group.ReadWrite.All)
  - [ ] Implement OAuth 2.0 Client Credentials flow
  - [ ] Test API connection
- [ ] **Implement user sync to Entra ID**:
  - [ ] Create Graph API user creation endpoint wrapper
  - [ ] Map Aksara identity fields to Entra ID user properties
  - [ ] Implement batch user creation (up to 20 per request)
  - [ ] Handle API errors and rate limits
- [ ] **Implement user sync from Entra ID**:
  - [ ] Fetch Entra ID users via Graph API
  - [ ] Map Entra ID properties to Aksara identity fields
  - [ ] Implement delta queries for incremental sync
  - [ ] Update local identities with Entra ID data
- [ ] **Implement group sync**:
  - [ ] Map org units to Entra ID security groups
  - [ ] Sync group membership
  - [ ] Handle nested groups
- [ ] **Implement conflict resolution logic**:
  - [ ] Integrate with existing comparison UI
  - [ ] Apply per-field sync direction rules
  - [ ] Log conflicts in sync history
- [ ] **Add encryption for client secrets**:
  - [ ] Encrypt Entra ID credentials at rest
  - [ ] Use environment variable for encryption key
- [ ] **Implement background job for auto-sync**:
  - [ ] Create cron job runner
  - [ ] Schedule sync based on configuration (hourly, daily, weekly)
  - [ ] Add job monitoring and error alerts
- [ ] **Add detailed error handling and retry logic**:
  - [ ] Retry failed API calls with exponential backoff
  - [ ] Store failed operations in DLQ
  - [ ] Create admin UI to view and retry failed operations
- [ ] **Implement sync preview**:
  - [ ] Show what will change before executing sync
  - [ ] Dry-run mode
- [ ] **Implement CSV sync**:
  - [ ] Parse uploaded CSV file
  - [ ] Map CSV columns to identity fields
  - [ ] Validate CSV data
  - [ ] Show preview before import
  - [ ] Execute import with progress tracking

### 2.2 SCIM Filter Improvements ⭐⭐
**Timeline**: 3 days
**Dependency**: None
**Source**: SCIM_IMPLEMENTATION.md, E2E test failures

- [ ] Identify failing filter test cases (3 tests failing)
- [ ] Debug filter parser for complex queries
- [ ] Fix logical operator precedence (AND vs OR)
- [ ] Fix nested filter parsing (parentheses handling)
- [ ] Add more unit tests for edge cases
- [ ] Update SCIM filter documentation
- [ ] Run E2E tests until 12/12 passing

### 2.3 SCIM Webhooks ⭐⭐
**Timeline**: 1 week
**Dependency**: None
**Source**: SCIM_COMPLETE_GUIDE.md

- [ ] Create webhook schema and collection
- [ ] Implement webhook subscription API:
  - [ ] POST /scim/v2/webhooks (create subscription)
  - [ ] GET /scim/v2/webhooks (list subscriptions)
  - [ ] DELETE /scim/v2/webhooks/{id} (delete subscription)
- [ ] Implement webhook event types:
  - [ ] `user.created`, `user.updated`, `user.deleted`
  - [ ] `group.created`, `group.updated`, `group.deleted`
- [ ] Implement webhook delivery:
  - [ ] HTTP POST to subscriber URL
  - [ ] HMAC-SHA256 signature in `X-Signature` header
  - [ ] JSON payload with event data
- [ ] Implement retry logic:
  - [ ] Retry up to 3 times with exponential backoff (1s, 5s, 25s)
  - [ ] Move to DLQ after 3 failures
- [ ] Create webhook management UI (`/clients-scim/{id}/webhooks`):
  - [ ] Subscribe to events
  - [ ] View webhook logs
  - [ ] Test webhook endpoint (send test event)
  - [ ] Retry failed webhooks
- [ ] Add webhook signature verification example to docs
- [ ] Test webhook delivery with external service


---

## Phase 3: Organization Structure Enhancement (Weeks 7-9)
**Status**: ⚠️ Partial (current version works, redesign planned)

### 3.1 Organization Versioning Redesign ⭐⭐
**Timeline**: 3 weeks
**Dependency**: None
**Source**: ORG_VERSIONING_REDESIGN_PLAN.md

**Week 1: Critical Fixes + Schema Updates**
- [✅] Fix date parsing in reference-resolver.ts
- [✅] Fix date rendering in identities/+page.svelte
- [✅] Fix joinDate immutability in employee edit
- [✅] Update identities.csv with date columns
- [ ] Add employee snapshot to `OrgStructureVersionSchema`:
  ```typescript
  employeeSnapshot: z.array(z.object({
    identityId: z.instanceof(ObjectId),
    nik: z.string(),
    name: z.string(),
    position: z.instanceof(ObjectId).optional(),
    orgUnit: z.instanceof(ObjectId).optional()
  })).optional()
  ```
- [ ] Add `publishStatus` field: `'unpublished' | 'publishing' | 'published' | 'failed'`
- [ ] Add `publishProgress` field: `{ current: number, total: number, message: string }`
- [ ] Remove `'pending_approval'` status (simplified workflow)
- [ ] Create `EmployeeHistorySchema`:
  ```typescript
  {
    identityId: ObjectId,
    eventType: 'onboarding' | 'mutation' | 'transfer' | 'promotion' | 'demotion' | 'offboarding',
    timestamp: Date,
    previousValues: {...},
    newValues: {...},
    versionId: ObjectId,
    notes: string
  }
  ```
- [ ] Test schema changes with existing data
- [ ] Create migration script for existing versions:
  - [ ] Add default `publishStatus: 'published'` to active versions
  - [ ] Add `employeeSnapshot` from current org_units

**Week 2: Core Library Implementation**
- [ ] Implement `snapshot-builder.ts`:
  - [ ] `captureOrgStructureSnapshot()` - Capture complete org structure
  - [ ] `captureEmployeeSnapshot()` - Capture all employee placements
  - [ ] `detectOrphanedUnits()` - Find units with invalid parents
  - [ ] `detectCircularReferences()` - Detect circular parent-child relationships
  - [ ] `detectPromotionChains()` - Find suspicious multi-level promotions
- [ ] Implement `publisher.ts` with idempotency:
  - [ ] `publishVersion()` - Main publish function
  - [ ] `updateEmployeePlacements()` - Update all employee assignments
  - [ ] `createHistoryRecords()` - Create history entry for each affected employee
  - [ ] `updateVersionStatus()` - Mark version as published
  - [ ] Resume capability: skip already-processed employees
  - [ ] Progress tracking: update `publishProgress` field
  - [ ] No MongoDB transactions (use idempotent operations)
- [ ] Implement `version-manager.ts`:
  - [ ] `createVersion()` - Create new draft version with snapshot
  - [ ] `activateVersion()` - Activate a version (only one active at a time)
  - [ ] `archiveVersion()` - Archive old version
  - [ ] `getVersionHistory()` - List all versions
  - [ ] `compareVersions()` - Show diff between two versions
- [ ] Implement `corrector.ts`:
  - [ ] `correctOrphanedUnit()` - Fix unit with invalid parent
  - [ ] `correctCircularReference()` - Break circular reference
  - [ ] `validateStructure()` - Run all validation checks
- [ ] Add comprehensive error handling and logging

**Week 3: Routes, UI, and Migration**
- [ ] Update org-structure routes:
  - [ ] Update version creation to capture snapshot
  - [ ] Remove approval workflow code
  - [ ] Add publish action: `POST /api/org-structure-versions/{id}/publish`
  - [ ] Add resume action: `POST /api/org-structure-versions/{id}/resume`
  - [ ] Add validation check: `GET /api/org-structure-versions/{id}/validate`
- [ ] Create publish progress UI:
  - [ ] Show progress bar during publish
  - [ ] Display current operation message
  - [ ] Show affected employee count
  - [ ] Allow resume if publish fails
- [ ] Create correction UI:
  - [ ] Show validation warnings (orphaned units, circular refs, promotion chains)
  - [ ] "Fix" button for each warning
  - [ ] Preview fix before applying
- [ ] Add validation warnings to version detail page
- [ ] Migrate existing versions to new schema:
  - [ ] Run migration script on production
  - [ ] Verify all versions have employee snapshots
- [ ] Run data quality checks:
  - [ ] Verify no orphaned units
  - [ ] Verify no circular references
  - [ ] Verify all employees have valid placements
- [ ] Deploy to staging and test thoroughly
- [ ] Deploy to production after approval

### 3.2 SK Penempatan Execution Workflow ⭐⭐
**Timeline**: 3 days
**Dependency**: None
**Source**: _DEV_GUIDE.md

- [ ] Create SK Penempatan detail page (`/sk-penempatan/{id}`)
- [ ] Show SK metadata (number, date, notes)
- [ ] Show list of affected employees with before/after assignments
- [ ] Add "Execute SK" button (only for approved status)
- [ ] Implement execute action:
  - [ ] Update all employee assignments
  - [ ] Create history records for each employee
  - [ ] Update SK status to "executed"
  - [ ] Log execution in audit log
- [ ] Add execution progress indicator
- [ ] Test with bulk SK (100+ employees)

### 3.3 Excel Export for SK Attachment ⭐
**Timeline**: 2 days
**Dependency**: None
**Source**: _DEV_GUIDE.md

- [ ] Install Excel library (`exceljs`)
- [ ] Create Excel template for SK Penempatan
- [ ] Implement export function:
  - [ ] Sheet 1: SK metadata
  - [ ] Sheet 2: Employee assignments (before/after)
  - [ ] Formatting: headers, borders, alignment
- [ ] Add "Export to Excel" button on SK detail page
- [ ] Test Excel file opening in Microsoft Excel and LibreOffice

### 3.4 Matrix Reporting Structures ⭐
**Timeline**: 1 week
**Dependency**: None
**Source**: _DEV_GUIDE.md

- [ ] Add `secondaryManagers` field to employee schema (array of ObjectIds)
- [ ] Update employee detail page to show primary and secondary managers
- [ ] Update org chart visualization to show dotted lines for secondary reporting
- [ ] Add UI to assign secondary managers in employee edit form
- [ ] Update SCIM API to include secondary managers in `x-position` extension
- [ ] Test with complex matrix structure

---

## Phase 4: Advanced Features (Weeks 10-14)
**Status**: 📋 Planned

### 4.1 Fine-Grained Authorization (ABAC/PBAC) ⭐⭐
**Timeline**: 2 weeks
**Dependency**: None
**Source**: SSO_ADMIN_GUIDE.md

- [ ] Design resource-permission model:
  - [ ] Resources: identities, org_units, positions, oauth_clients, etc.
  - [ ] Actions: read, create, update, delete
  - [ ] Conditions: owner, same_org_unit, manager, admin
- [ ] Create authorization schema:
  ```typescript
  {
    role: string,
    resource: string,
    actions: ['read', 'create', 'update', 'delete'],
    conditions: {
      owner: boolean,
      sameOrgUnit: boolean,
      isManager: boolean
    }
  }
  ```
- [ ] Implement policy engine:
  - [ ] `evaluatePolicy()` - Check if action is allowed
  - [ ] Support ABAC (Attribute-Based Access Control)
  - [ ] Support PBAC (Policy-Based Access Control)
- [ ] Create permission evaluation API:
  - [ ] `POST /api/authorize` - Check permission
  - [ ] Return: `{ allowed: boolean, reason: string }`
- [ ] Create authorization UI:
  - [ ] Manage roles
  - [ ] Assign permissions to roles
  - [ ] Assign roles to users
  - [ ] Test authorization with sample scenarios
- [ ] Update all admin routes to use authorization checks
- [ ] Add authorization middleware
- [ ] Test with multiple user roles

### 4.2 Client Scopes ⭐⭐
**Timeline**: 1 week
**Dependency**: None
**Source**: SSO_ADMIN_GUIDE.md

- [ ] Create scope schema and collection
- [ ] Implement predefined scopes:
  - [ ] `openid` - OIDC identity
  - [ ] `profile` - Basic profile (name, DOB)
  - [ ] `email` - Email address
  - [ ] `phone` - Phone number
  - [ ] `roles` - User roles
  - [ ] `employee` - Employee-specific data (NIK, position)
- [ ] Add custom scope creation UI
- [ ] Implement scope mapping to claims:
  - [ ] Map scope to token claims
  - [ ] Configure which attributes are included per scope
- [ ] Implement consent screen:
  - [ ] Show requested scopes to user
  - [ ] User approves or denies scopes
  - [ ] Store consent decisions
  - [ ] Allow consent revocation
- [ ] Update OAuth authorization flow to show consent screen
- [ ] Update token endpoint to include only consented scopes
- [ ] Test scope filtering in access tokens

### 4.3 User Federation (LDAP/AD) ⭐⭐
**Timeline**: 2 weeks
**Dependency**: None
**Source**: SSO_ADMIN_GUIDE.md

- [ ] Install LDAP library (`ldapjs`)
- [ ] Create LDAP/AD connector:
  - [ ] Test connection
  - [ ] Search users
  - [ ] Authenticate user
  - [ ] Fetch user attributes
- [ ] Implement sync modes:
  - [ ] **Import mode** - Copy users to local database
  - [ ] **Proxy mode** - Authenticate against LDAP, no local copy
- [ ] Implement user import from AD:
  - [ ] Map LDAP attributes to identity fields
  - [ ] Import users in batches
  - [ ] Schedule periodic sync
- [ ] Implement password delegation:
  - [ ] Authenticate against LDAP/AD instead of local password
  - [ ] Fallback to local password if LDAP unavailable
- [ ] Create LDAP configuration UI:
  - [ ] LDAP server URL
  - [ ] Bind DN and password
  - [ ] Base DN for user search
  - [ ] Attribute mapping
  - [ ] Sync schedule
- [ ] Test with Active Directory and OpenLDAP

### 4.4 API Documentation & Developer Portal ⭐⭐
**Timeline**: 1 week
**Dependency**: None
**Source**: _DEV_GUIDE.md

- [ ] Generate OpenAPI/Swagger specification:
  - [ ] Use `@sveltejs/kit` route introspection
  - [ ] Document all API endpoints
  - [ ] Add request/response schemas
  - [ ] Add authentication requirements
- [ ] Setup Swagger UI:
  - [ ] Host at `/api-docs`
  - [ ] Interactive "Try it out" functionality
- [ ] Create code examples:
  - [ ] curl commands
  - [ ] JavaScript (fetch, axios)
  - [ ] Python (requests)
  - [ ] Go (net/http)
- [ ] Implement API versioning:
  - [ ] `/api/v1` for current version
  - [ ] Deprecation warnings for old versions
- [ ] Create developer portal (`/developers`):
  - [ ] API documentation
  - [ ] Getting started guide
  - [ ] Authentication guide
  - [ ] Code examples
  - [ ] API key management
- [ ] Add API key generation and management UI
- [ ] Test API docs with external developers

### 4.5 Themes & Branding ⭐ ⚠️ PARTIAL
**Timeline**: 1 week
**Dependency**: None
**Source**: _DEV_GUIDE.md

- [✅] Create branding interface schema (`src/lib/branding.ts`):
  - [✅] appName, primaryColor, secondaryColor, accentColor
  - [✅] backgroundColor, textColor
  - [✅] logoBase64, faviconBase64, loginBackgroundBase64
  - [✅] emailFromName, emailFromAddress, supportEmail, supportUrl
- [✅] Branding storage in organizations collection
- [✅] Branding utility functions (`src/lib/branding-utils.ts`):
  - [✅] `getBrandingCSS()` - Generate CSS custom properties
  - [✅] `getBranding()` - Load branding from organization
  - [✅] `getBrandingByCode()` - Get branding by org code
- [✅] **Branding Configuration UI** (dedicated modal at `/realms`):
  - [✅] Separate "Branding" action button in DataTable
  - [✅] Dedicated branding modal with purple gradient header
  - [✅] Logo upload (base64 encoded) with preview and remove - also used as favicon
  - [✅] Color pickers (primary, secondary, accent, text color) - dual input (visual + hex)
  - [✅] Login background image upload with preview
  - [✅] Email configuration (from name, from address, support email, support URL)
  - [✅] Color preview swatches with live updates
  - [✅] File size validation (logo 2MB, background 5MB)
  - [✅] File type validation (images only)
  - [✅] Separate save endpoint for branding updates
- [✅] **Branding Applied to UI**:
  - [✅] Login page (`/login`) - uses MASTER organization branding or default
  - [✅] OAuth authorize page (`/oauth/authorize`) - uses client's organization branding
  - [✅] Admin console layout (`(app)/+layout.svelte`) - uses MASTER organization branding
    - [✅] Sidebar with dynamic brand colors (background, hover states)
    - [✅] Navigation items with brand-aware hover/active states
    - [✅] Logo displayed in sidebar
    - [✅] App name in title and badge
    - [✅] User avatar with brand color background
    - [✅] Favicon from logo
  - [✅] Dynamic color scheme (CSS custom properties via `getBrandingCSS()`)
  - [✅] Dynamic logo and favicon (logo serves as both)
  - [✅] App name customization
  - [✅] Favicon fallback when branding not configured
  - [✅] Diagnostic script: `bun run branding:check` to verify configuration
- [ ] Create theme management UI (`/settings/theme`):
  - [ ] Upload logo
  - [ ] Choose colors (color picker)
  - [ ] Upload background image
  - [ ] Preview changes
- [ ] Implement customizable login page:
  - [ ] Apply theme colors
  - [ ] Show custom logo
  - [ ] Show custom background image
  - [ ] Show custom text
- [ ] Create email templates with branding:
  - [ ] Password reset email
  - [ ] Email verification email
  - [ ] Welcome email
  - [ ] MFA setup email
- [ ] Implement light/dark mode:
  - [ ] Toggle in user menu
  - [ ] Persist preference
  - [ ] Apply across all pages
- [ ] Create customizable error pages:
  - [ ] 404 Not Found
  - [ ] 403 Forbidden
  - [ ] 500 Internal Server Error
- [ ] Test theme customization with multiple brands

### 4.6 Token Mappers ⭐
**Timeline**: 3 days
**Dependency**: None
**Source**: SSO_ADMIN_GUIDE.md

- [ ] Create token mapper schema:
  ```typescript
  {
    name: string,
    type: 'user_attribute' | 'role' | 'audience' | 'custom',
    sourceAttribute: string,
    targetClaim: string,
    transformation: 'none' | 'uppercase' | 'lowercase' | 'prefix' | 'suffix'
  }
  ```
- [ ] Implement mapper types:
  - [ ] **User Attribute Mapper** - Map identity field to token claim
  - [ ] **Role Name Mapper** - Include roles in token
  - [ ] **Audience Mapper** - Set `aud` claim
  - [ ] **Custom Claim Mapper** - Add custom data to token
- [ ] Create token mapper management UI:
  - [ ] List mappers per OAuth client
  - [ ] Add/edit/delete mappers
  - [ ] Test mapper with sample token
- [ ] Update token generation to apply mappers
- [ ] Test with various mapper configurations

---

## Phase 5: Enterprise Features (Future)
**Status**: 📋 Planned for future development

### 5.1 Enhanced Audit & Compliance
**Timeline**: 2 weeks

- [ ] **Event listeners**:
  - [ ] Subscribe to specific audit events
  - [ ] Trigger actions on events (send email, call webhook)
- [ ] **Event filters**:
  - [ ] Filter audit logs by event type, user, date range
  - [ ] Save filter presets
- [ ] **Export events to external systems**:
  - [ ] Splunk integration
  - [ ] ELK stack integration
  - [ ] SIEM integration
- [ ] **Compliance reports**:
  - [ ] SOC2 compliance report
  - [ ] ISO 27001 readiness report
  - [ ] UU PDP compliance report
- [ ] **Audit log export**:
  - [ ] Export as CSV
  - [ ] Export as JSON
  - [ ] Scheduled exports
- [ ] **ISO 27001 certification**:
  - [ ] Gap analysis
  - [ ] Implement required controls
  - [ ] Documentation
  - [ ] External audit
- [ ] **Penetration testing**:
  - [ ] Hire external pentest firm
  - [ ] Fix vulnerabilities
  - [ ] Re-test
- [ ] **Bug bounty program**:
  - [ ] Setup HackerOne or Bugcrowd
  - [ ] Define scope and rewards
  - [ ] Monitor submissions

### 5.2 Webhooks & Event System
**Timeline**: 1 week

- [ ] Create webhook collection (separate from SCIM webhooks)
- [ ] Implement event types:
  - [ ] Employee events (created, updated, deleted, onboarded, mutated, offboarded)
  - [ ] OAuth events (client_created, token_issued)
  - [ ] Organization events (org_unit_created, structure_changed)
- [ ] Implement webhook subscription API:
  - [ ] POST /api/webhooks (create subscription)
  - [ ] GET /api/webhooks (list subscriptions)
  - [ ] DELETE /api/webhooks/{id} (delete subscription)
- [ ] Implement webhook delivery:
  - [ ] HTTP POST to subscriber URL
  - [ ] HMAC-SHA256 signature
  - [ ] Customizable event payload
- [ ] Implement retry logic:
  - [ ] Exponential backoff
  - [ ] Dead Letter Queue
- [ ] Create webhook management UI
- [ ] Test webhook delivery

### 5.3 Single Sign-Out (SLO)
**Timeline**: 1 week

- [ ] **Backchannel logout**:
  - [ ] Implement logout token endpoint
  - [ ] Notify all connected apps when user logs out
  - [ ] Revoke all active sessions
- [ ] **Frontchannel logout**:
  - [ ] Implement logout iframe
  - [ ] Propagate logout across apps in browser
- [ ] **Session monitoring**:
  - [ ] Track active sessions per user
  - [ ] Show active sessions in user profile
  - [ ] Allow user to revoke sessions
- [ ] Test SLO with multiple connected apps

### 5.4 Additional Features

**Device Authorization Flow** (3 days):
- [ ] Implement RFC 8628 (Device Authorization Grant)
- [ ] Create device code generation endpoint
- [ ] Create device verification page
- [ ] Test with TV/IoT device simulator

**Client Registration Service** (3 days):
- [ ] Implement RFC 7591 (Dynamic Client Registration)
- [ ] Create client registration endpoint
- [ ] Generate client credentials dynamically
- [ ] Test with external client

**Internationalization** (1 week):
- [ ] Setup i18n library (`sveltekit-i18n`)
- [ ] Extract all UI strings to translation files
- [ ] Create Indonesian translations
- [ ] Create English translations
- [ ] Add language selector in user menu
- [ ] Persist language preference
- [ ] Test all pages in both languages

**Entity Switching (Realm Selector)** (3 days):
- [ ] Add realm dropdown in header
- [ ] Store selected realm in session
- [ ] Filter data by selected realm
- [ ] Test switching between realms

**Entity-Level Permissions** (1 week):
- [ ] Extend authorization model with entity scope
- [ ] Restrict users to specific entities
- [ ] Test with multi-entity users

**Consolidated Reporting Across Entities** (1 week):
- [ ] Create reporting dashboard
- [ ] Aggregate data across all entities
- [ ] Export reports as PDF/Excel
- [ ] Schedule automated reports

---

## Backlog

### Security & Compliance
- [ ] Add data encryption at rest (beyond FLE)
- [ ] Implement general API rate limiting (beyond SCIM)
- [ ] Create security headers and CORS policies (HTTPS enforcement, CSP)
- [ ] Add comprehensive input validation and sanitization
- [ ] Implement CSRF protection tokens
- [ ] Implement general IP whitelisting (beyond SCIM)
- [ ] Add security monitoring and alerts (intrusion detection)
- [ ] Advanced threat detection (ML-based anomaly detection)
- [ ] Data anonymization for analytics (remove PII for reporting)

### Testing & Quality
- [ ] Expand integration tests (test entire flows)
- [ ] Expand E2E tests (cover more user journeys)
- [ ] Create test data generators (faker-based)
- [ ] Setup continuous integration (GitHub Actions / GitLab CI)
- [ ] Implement code coverage tracking (target 80%+)
- [ ] Add performance testing (load testing with k6)

### DevOps & Deployment
- [ ] Create Docker configuration (multi-stage build)
- [ ] Setup environment configuration management (.env per environment)
- [ ] Implement logging and monitoring (structured logging, Grafana)
- [ ] Create backup and restore procedures (automated MongoDB backups)
- [ ] Setup continuous deployment (deploy to staging on PR, prod on merge)
- [ ] Create deployment documentation (runbook for ops team)
- [ ] Implement health check endpoints (`/health`, `/ready`)
- [ ] Add performance monitoring (APM - New Relic, Datadog)
- [ ] Setup error tracking (Sentry)

### Documentation
- [ ] Write comprehensive API documentation (beyond Swagger)
- [ ] Create administrator guide (how to manage the system)
- [ ] Write deployment guide (production deployment steps)
- [ ] Add code comments and JSDoc (improve code readability)
- [ ] Create troubleshooting guide (common issues and solutions)
- [ ] Write migration guides (upgrade between versions)
- [ ] Update documentation with unified identity model:
  - [ ] DATA_ARCHITECTURE_AND_RELATIONSHIPS.md
  - [ ] EMPLOYEE_MANAGEMENT.md
  - [ ] USER_MANAGEMENT_GUIDE.md
  - [ ] SUMMARY_DATA_PRIVACY_COMPLIANCE.md

### Optional/Future
- [ ] Add GraphQL support (alternative to REST API)
- [ ] Create SDK/client libraries (JavaScript, Python, Go)
- [ ] Employee general CSV/Excel import/export functionality (beyond SK Penempatan)
