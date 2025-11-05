# Aksara SSO - Development Guide

> **Last Updated**: November 2025

---

## Industry Comparison (Our Advantages)

- 🏆 **Better than Okta**: 2x bulk operations limit (1000 vs 500)
- 🏆 **Better than Azure AD**: Full filter syntax support
- 🏆 **Better than Google**: All advanced features they lack
- 🏆 **Unique**: Hierarchical org units with unit-level managers
- 🏆 **Free**: No per-user pricing, unlimited API calls

**Benefits for Consumer Apps (OFM, etc):**
- Auto-sync employees and org structure
- Approval workflows determine managers dynamically
- Team member queries run locally (no SSO calls)
- Bulk operations for mass onboarding/offboarding
- Single source of truth for organizational hierarchy
- Enterprise-grade security with OAuth 2.0

---

# FEATURES

> This section describes what the final application will be capable of (the vision/target state).

## 1. Authentication & Security

### Core Authentication
- **OAuth 2.0 / OIDC Provider** - Full-featured identity provider with authorization code flow
- **PKCE Support** - Enhanced security for public clients
- **Token Management** - Access tokens, refresh tokens, token introspection, token revocation
- **Session Management** - 24-hour session duration, 2-hour idle timeout, httpOnly secure cookies
- **Password Security** - Argon2 hashing, complexity requirements (min 12 chars)
- **Multi-Login Support** - Login with email, username, or NIK (employee ID)
- **Role-Based Access Control (RBAC)** - Flexible role assignment per identity

### Advanced Security
- **Multi-Factor Authentication (MFA/2FA)** - TOTP (Google Authenticator), SMS OTP, Email OTP, backup codes
- **IP Whitelisting** - CIDR notation support for admin access and SCIM endpoints
- **Rate Limiting** - Sliding window algorithm, per-client configuration, default 100 req/min
- **Field-Level Encryption** - MongoDB Client-Side FLE for sensitive data (KTP, NPWP, DOB, phone)
- **Data Masking** - UI-level masking for KTP, NPWP, phone, email
- **Security Headers** - CORS policies, CSRF protection, XSS prevention
- **Input Validation** - Comprehensive sanitization across all endpoints

---

## 2. Identity & User Management

### Unified Identity Model
- **Single Collection** - Polymorphic `identities` collection for all user types
- **Identity Types**:
  - **Employees** - NIK, position, org unit, employment type (PKWT/OS/Permanent)
  - **Partners** - Company affiliation, contract dates, partner type categorization
  - **External Users** - Temporary access, limited permissions
  - **Service Accounts** - OAuth client credentials, API-only access

### Employee Lifecycle Management
- **Onboarding Wizard** (5 steps):
  1. Personal Information (NIK, name, DOB, KTP, NPWP)
  2. Employment Information (type, status, join date)
  3. Assignment (Realm → Org Unit → Position → Location)
  4. SSO Access (optional account creation)
  5. Review & Confirmation
- **Mutation/Transfer Workflow**:
  - Types: Transfer, Promosi (promotion), Demosi (demotion)
  - Entity/unit/position selection via lookup modals
  - Effective date tracking
  - Previous assignment capture
- **Offboarding Workflow**:
  - Termination date and reason
  - Optional SSO access revocation
  - Automated checklist (IT asset return, final payroll, exit interview)
  - Integration with external systems (SCIM deprovision)
- **Assignment History Timeline**:
  - Color-coded events (🟢 Onboarding, 🔵 Mutation, 🔴 Offboarding)
  - Visual timeline with connecting lines
  - Full context for each historical event

### User Profile & Self-Service
- **Employee Detail Page** - 4 tabs (Overview, Penempatan, SSO Access, History)
- **Inline Edit Mode** - Edit employee details directly on detail page
- **Account Self-Service Portal**:
  - Profile editing (personal information)
  - Password change
  - MFA setup and management
  - View SSO-connected applications
  - Download personal data (GDPR/PDP compliance)
  - Account deletion request (GDPR/PDP right to be forgotten)
- **Password Reset Flow** - Email-based password recovery
- **Email Verification** - Verify email addresses on registration

### Secondary Assignments
- **Multi-Company Placement** - Employees can be assigned to multiple entities simultaneously
- **Cross-Entity Roles** - Different roles in different organizational contexts

---

## 3. Organization Structure

### Organizational Hierarchy
- **Realm/Organization Management** - Merged concept (each organization IS a realm)
- **Organizational Units** - Direktorat, Divisi, Departemen, Bagian, Seksi
- **Multi-Level Hierarchy** - Holding → Subsidiary → Branch → Divisions → Departments
- **Regional Office Structure** - Regional 1-4 with stations
- **Position/Jabatan Management** - Job titles with levels, manager flags
- **Mermaid Diagram Visualization** - Auto-generated org charts with pan/zoom
- **Matrix Reporting Structures** - Support for multiple reporting lines

### Organization Structure Versioning
- **Snapshot-Based Versioning** - Complete structure capture at any point in time
- **SK (Surat Keputusan) Tracking** - Official decree documentation
- **Employee Snapshot** - Captured with each version
- **Workflow** - Draft → Active → Archived (no approval step)
- **Idempotent Publishing** - Resume-capable, no MongoDB transactions needed
- **Automatic Mermaid Generation** - Visual org charts from structure data
- **On-Demand Regeneration** - Update diagrams anytime
- **Change Tracking** - Diff between versions
- **Active Version Live Data** - STO page uses live org_units data for active versions
- **Historical Snapshots** - Non-active versions remain read-only with frozen data
- **Validation & Correction** - Detect orphaned units, circular references, detect promotion chains

### SK Penempatan Karyawan (Employee Assignment Decree)
- **Bulk Reassignment System** - Manage hundreds of employees at once
- **CSV Import** - Mass import with flexible column mapping
- **CSV Template Download** - Pre-formatted template for users
- **Smart Validation** - Validates employee IDs, org units, positions
- **Previous Assignment Capture** - Automatic tracking of current assignments
- **Error Reporting** - Line-by-line validation errors
- **Workflow** - Draft → Pending Approval → Approved → Executed
- **History Integration** - Creates employee history entries on execution
- **Excel Export** - Export SK attachment for official documentation

---

## 4. SCIM 2.0 Integration (Enterprise-Grade)

### Core SCIM API
- **Full RFC Compliance** - SCIM 2.0 (RFC 7643/7644)
- **Unified Identity Model** - All endpoints query the single `identities` collection
- **Users Endpoint** (`/scim/v2/Users`):
  - GET (list with pagination & filtering) - Returns employee identities
  - GET /{id} (single user)
  - POST (create user) - Creates employee identity
  - PUT (full update)
  - PATCH (partial update)
  - DELETE (deactivate)
- **Groups Endpoint** (`/scim/v2/Groups`):
  - Full CRUD for organizational units
  - Hierarchical group membership
  - Member management (add/remove)
- **Bulk Operations** (`/scim/v2/Bulk`):
  - Up to 1,000 operations per request (beats Okta's 500!)
  - POST, PUT, PATCH, DELETE in single request
  - 10MB max payload
  - Error handling with `failOnErrors` parameter

### Advanced SCIM Features
- **Advanced Filter Parser** - ALL operators supported:
  - Comparison: `eq`, `ne`, `co`, `sw`, `ew`, `gt`, `ge`, `lt`, `le`, `pr`
  - Logical: `and`, `or`, `not`, `()`
  - Complex queries: `(active eq true and userName ew "@ias.co.id") or x-position.isManager eq true`
- **Pagination** - startIndex + count (max 1,000 results per page)
- **Sorting** - sortBy + sortOrder (ascending/descending)
- **Attribute Selection** - Return only specified attributes
- **Manager Lookup** - Automatically determines manager from org hierarchy
- **Team Member Lookup** - Finds all employees in same org unit

### Custom Extensions
- **x-position** - Employee position details (isManager, level, title)
- **x-orgUnit** - Hierarchical org unit metadata (type, parent, manager, path)

### SCIM Authentication & Security
- **OAuth 2.0 Client Credentials Grant** (RFC 6749)
- **Per-Client Credentials** - Like Okta/Azure AD
- **JWT Access Tokens** - 1-hour expiration
- **Token Endpoint** - `/scim/v2/token`
- **Scope-Based Permissions** - 7 scopes:
  - `read:users`, `write:users`, `delete:users`
  - `read:groups`, `write:groups`, `delete:groups`
  - `bulk:operations`
- **IP Whitelisting** - CIDR notation support
- **Per-Client Rate Limiting** - Configurable, default 100 req/min
- **Argon2 Secret Hashing** - Secure credential storage

### SCIM Admin UI
- **Client Management Dashboard** (`/clients-scim`):
  - Create/deactivate clients
  - Generate and rotate secrets
  - View usage statistics
  - Monitor performance metrics
  - Track error rates

### SCIM Webhooks
- **Real-Time Event Notifications** - Push changes to consumer apps
- **HMAC-SHA256 Signatures** - Verify webhook authenticity
- **Event Types** - user.created, user.updated, user.deleted, group.created, etc.
- **Retry Logic** - Exponential backoff with DLQ (Dead Letter Queue)
- **Webhook Management UI** - Subscribe/unsubscribe, view logs

---

## 5. Microsoft Entra ID Sync

### Bidirectional Synchronization
- **Sync Directions**:
  - Aksara SSO → Entra ID (push)
  - Entra ID → Aksara SSO (pull)
  - Bidirectional (two-way sync)
- **Microsoft Graph API Integration** - OAuth 2.0 authentication
- **User Sync** - Employee identity synchronization
- **Group Sync** - Organizational unit synchronization

### Sync Configuration
- **Field Mapping** - Flexible mapping between Aksara and Entra ID fields
- **Custom Field Support** - Add new field mappings via UI
- **Sync Direction Per Field** - Control per-field sync direction
- **Connection Testing** - Test Entra ID credentials before saving

### Conflict Resolution
- **Three-Way Comparison UI** - App DB | Entra ID | Result
- **Per-Field Actions**:
  - Keep App DB value
  - Use Entra ID value
  - Sync both ways
  - Skip field
- **Bulk Selection** - Select All / Deselect All
- **Preview Changes** - Show what will change before sync

### Sync Management
- **Manual Sync Trigger** - On-demand sync execution
- **Auto-Sync Scheduling** - Cron-based scheduled sync (hourly, daily, weekly)
- **Sync History Log** - Track all sync operations with timestamps
- **Error Handling** - Detailed error messages with retry logic
- **Progress Tracking** - Real-time sync progress indicator
- **Export Sync Logs** - Download sync history as CSV
- **Webhook Notifications** - Notify on sync completion/failure

---

## 6. Audit & Compliance

### Comprehensive Audit Logging
- **Reusable Audit Logger Utility** - Helper functions for logging
- **Middleware** - Automatic 401/403 tracking
- **Type-Safe Actions** - TypeScript enum for audit actions
- **Request Metadata** - IP address, user agent, timestamp
- **Non-Blocking** - Audit failures don't break operations
- **Audit Log UI** - Pagination, search, filters, export

### Logged Events
- **Authentication** - login, logout, login failures, password changes
- **Employee Lifecycle** - onboarding, mutation, transfer, promotion, demotion, offboarding
- **OAuth Operations** - token grants, token refresh, client operations
- **Identity Operations** - create, update, delete, activate, deactivate
- **Organization Management** - org/unit/position CRUD
- **Access Control** - access granted/denied events
- **SCIM API Requests** - All SCIM operations with request/response

### UU PDP No. 27 Tahun 2022 Compliance (Indonesia Data Protection Law)
- **Lawful Basis Tracking** - Document legal basis for data processing
- **Data Minimization** - Collect only necessary data
- **Purpose Limitation** - Use data only for stated purposes
- **Data Subject Rights**:
  - Right to access personal data
  - Right to rectification (correction)
  - Right to erasure (deletion)
  - Right to data portability (export)
  - Right to object to processing
- **Breach Notification** - 3x24 hours notification requirement
- **Data Retention Policies** - Automatic deletion after retention period
- **Consent Management** - Employee consent forms for data processing
- **Kebijakan Privasi** - Privacy Policy in Bahasa Indonesia
- **Data Protection Officer (DPO)** - Appointed for compliance oversight

### GDPR-Style Features
- **Data Export** - Download personal data in machine-readable format (JSON/CSV)
- **Right to Be Forgotten** - Complete data erasure with anonymization option
- **Data Anonymization** - Remove PII for analytics/reporting
- **ROPA** - Record of Processing Activities documentation
- **Compliance Reports** - SOC2, ISO 27001 readiness reports

### Advanced Security Features
- **Breach Detection System** - Automated anomaly detection
- **Security Monitoring** - Real-time threat detection
- **Penetration Testing** - Regular security assessments
- **Bug Bounty Program** - Incentivize security research
- **Field-Level Access Control** - Justification required for sensitive data access

---

## 7. Admin UI & Navigation

### Responsive Layout
- **Collapsible Drawer Navigation** - Mobile-friendly with overlay
- **Grouped Navigation** - Three categories:
  - **Identitas**: Unified Identities Page (Employees, Partners, External, Service Accounts), Data Sync
  - **Organisasi**: Realm/Entitas, Unit Kerja, Struktur Organisasi, Versi Struktur, Posisi, SK Penempatan
  - **Integrasi**: OAuth Clients, SCIM Clients, Entra ID Sync
- **User Menu Dropdown** - Profile, settings, logout
- **Realm Badge** - Current organizational context indicator
- **Educational Info Boxes** - Contextual help on major pages

### Reusable UI Components
- **DataTable Component**:
  - Server-side pagination
  - Multi-column sorting
  - Search/filtering
  - CSV export
  - Row click events for lookups
  - Configurable action buttons
- **LookupModal Component**:
  - Modal-based lookup with DataTable
  - Server-side pagination
  - Replaces long dropdown lists
  - Used for parent unit selection, manager selection
- **Form Components**:
  - Inline edit mode (employee detail page)
  - Multi-step wizards (onboarding)
  - Modal forms (mutation, offboarding)

### Unified Identities Page
- **Tabbed Interface** - Employees, Partners, External Users, Service Accounts
- **DataTable Integration** - Sortable columns, search, CSV export
- **Tab-Specific Columns**:
  - Employees: NIK, Name, Position, Org Unit, Status
  - Partners: Name, Company, Contract Dates, Type
  - External: Name, Email, Access Level, Expiry
  - Service Accounts: Name, Linked OAuth Client, Scopes

### Themes & Branding
- **Customizable Login Pages** - Logo, colors, background images
- **Email Templates** - Branded transactional emails
- **Error Pages** - Consistent error page design
- **Admin Console Themes** - Light/dark mode support

---

## 8. OAuth 2.0 Provider

### OAuth 2.0 / OIDC Implementation
- **Authorization Code Flow** - Standard OAuth flow for web apps
- **PKCE Support** - Enhanced security for SPAs and mobile apps
- **Token Endpoint** - `/oauth/token` for access + refresh tokens
- **Token Introspection** - `/oauth/introspect` to validate tokens
- **Token Revocation** - `/oauth/revoke` to invalidate tokens
- **OIDC UserInfo Endpoint** - `/oauth/userinfo` for user details

### Client Management
- **OAuth Client Management UI** - Create, configure, deactivate clients
- **Service Account Auto-Creation** - Each OAuth client gets a linked service account identity
- **Client Credentials Display** - Show/hide client ID and secret
- **Authorization Endpoint Testing UI** - Test OAuth flows directly from admin console
- **Client Scopes Configuration**:
  - Predefined scopes (profile, email, roles, openid)
  - Custom scopes
  - Scope mapping to claims
  - Consent screen for scope approval

### Token Mappers
- **User Attribute Mappers** - Map user attributes to token claims
- **Role Name Mappers** - Include roles in access tokens
- **Audience Mappers** - Control token audience (aud claim)
- **Custom Claim Mappers** - Add custom data to tokens

### Multi-App SSO Integration
- **Single Sign-On** - Login once, access all connected apps
- **Single Sign-Out (SLO)**:
  - Backchannel logout - Server-to-server logout notifications
  - Frontchannel logout - Browser-based logout propagation
  - Session monitoring - Track active sessions across apps

### Social Login / Identity Provider Integration
- **Google OAuth** - Sign in with Google
- **Microsoft Azure AD / Entra ID** - Sign in with Microsoft (as IdP)
- **SAML Support** - SAML 2.0 for enterprise SSO
- **Social Login Buttons** - Branded buttons on login page

---

## 9. Database Management

### CSV-Based Seeding System
- **Human-Readable CSV Files** - Use organization names/codes instead of ObjectIds
- **Version-Controlled Seed Data** - CSV files in `scripts/seeders/`
- **Reference Resolver** - Converts names/codes to MongoDB ObjectIds automatically
- **Dependency-Aware Import** - Sequential insertion respecting foreign key relationships
- **Safe --clean Mode** - Only drops collections with corresponding CSV files (preserves transient data)

### Database Utilities
- **CSV Export Tool** - Export collections to human-readable CSVs
  - Reference resolution (ObjectIds → names/codes)
  - Auto-detect mode (exports ALL fields, adapts to schema changes)
  - Configured mode (consistent columns for production)
- **CSV Import Tool** - Import CSVs with automatic ObjectId reference resolution
- **Database Cloning Tool** - Clone entire databases between environments (dev → staging → prod)
- **Database Statistics Tool** - Compare document counts across databases
- **Flexible Column Mapping** - Support multiple CSV column name variations

### Schema Management
- **Zod Validation** - Type-safe schema definitions
- **Schema Evolution** - Track changes over time
- **Migration Scripts** - Safe schema migrations with rollback support

---

## 10. Developer Experience

### API Documentation
- **OpenAPI/Swagger Specification** - Machine-readable API docs
- **Interactive API Docs** - Try endpoints directly from browser
- **Code Examples** - curl, JavaScript, Python, Go examples
- **API Versioning** - `/api/v1`, `/api/v2` for breaking changes
- **Developer Portal** - Self-service API key management

### SDKs & Client Libraries
- **JavaScript/TypeScript SDK** - npm package for Node.js and browsers
- **Python SDK** - pip package
- **Go SDK** - go get package
- **HTTP Client Examples** - Postman collections, Insomnia workspaces

### Webhooks & Event System
- **Event Subscription Management** - Subscribe to specific events
- **Webhook Endpoint Registration** - Configure callback URLs
- **Event Payload Customization** - Choose which fields to include
- **Retry Logic** - Exponential backoff with Dead Letter Queue
- **HMAC Signatures** - Verify webhook authenticity
- **Event Types**:
  - Employee events (created, updated, deleted, onboarded, mutated, offboarded)
  - OAuth events (client created, token issued)
  - Organization events (unit created, structure changed)
  - SCIM events (user provisioned, deprovisioned)

### Advanced Features
- **GraphQL Support** - Alternative to REST API (optional)
- **Device Authorization Flow** - For TV/IoT devices without keyboard
- **Client Registration Service** - Dynamic client registration (RFC 7591)
- **Internationalization** - Multi-language support (Indonesian / English)

---

# ROADMAP/TODO

> This section shows the implementation plan with current status to achieve the features above.

## Phase 1: Security & Compliance (HIGH PRIORITY)
**Timeline**: Weeks 1-3
**Status**: ⏳ Planned

### 1.1 MongoDB Field-Level Encryption ⭐⭐⭐ CRITICAL
**Timeline**: 1 week
**Dependency**: None
**Source**: SECURITY_IMPLEMENTATION_GUIDE.md, SUMMARY_DATA_PRIVACY_COMPLIANCE.md

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

### 1.2 Data Masking Implementation ⭐⭐⭐ CRITICAL
**Timeline**: 3 days
**Dependency**: None
**Source**: SECURITY_IMPLEMENTATION_GUIDE.md

- [ ] Create data masking utility (`src/lib/utils/data-masking.ts`)
- [ ] Implement masking functions:
  - [ ] `maskKTP()` - Show first 4 and last 2 digits: `3174************12`
  - [ ] `maskNPWP()` - Show first 2 and last 3: `31.***.***.***-123`
  - [ ] `maskPhone()` - Show first 4 and last 2: `+6281*****89`
  - [ ] `maskEmail()` - Show first 2 chars: `jo***@example.com`
- [ ] Apply masking in UI components:
  - [ ] Employee list table
  - [ ] Employee detail page (with "Show" button for authorized users)
  - [ ] Identity management page
  - [ ] Audit logs (when displaying PII)
- [ ] Add field-level access control (require justification for unmasked view)
- [ ] Test masking across all pages

### 1.3 Multi-Factor Authentication (MFA/2FA) ⭐⭐⭐
**Timeline**: 1 week
**Dependency**: None
**Source**: SECURITY_IMPLEMENTATION_GUIDE.md, SSO_ADMIN_GUIDE.md

- [ ] Install MFA libraries (`@otplib/preset-default`, `qrcode`)
- [ ] Create MFA schema and collection
- [ ] Implement TOTP (Google Authenticator compatible):
  - [ ] Generate TOTP secret
  - [ ] Generate QR code
  - [ ] Verify TOTP code
  - [ ] Store secret securely (encrypted)
- [ ] Implement backup codes:
  - [ ] Generate 10 one-time-use codes
  - [ ] Hash and store codes
  - [ ] Validate and invalidate on use
- [ ] Implement Email OTP:
  - [ ] Generate 6-digit code
  - [ ] Send via email
  - [ ] Expire after 10 minutes
- [ ] Create MFA setup wizard:
  - [ ] Choose MFA method
  - [ ] Scan QR code / enter secret
  - [ ] Verify first code
  - [ ] Display backup codes
- [ ] Update login flow:
  - [ ] Check if MFA enabled after password verification
  - [ ] Show MFA challenge page
  - [ ] Verify MFA code before session creation
- [ ] Add "Trust this device" option (30-day bypass)
- [ ] Enforce MFA per role (e.g., require for admins)
- [ ] Add MFA management to user profile:
  - [ ] Enable/disable MFA
  - [ ] Reset MFA device
  - [ ] Regenerate backup codes
- [ ] Test MFA with TOTP apps (Google Authenticator, Authy)

### 1.4 Account Self-Service Portal ⭐⭐⭐
**Timeline**: 5 days
**Dependency**: MFA implementation
**Source**: SSO_ADMIN_GUIDE.md

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
**Source**: SSO_ADMIN_GUIDE.md

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
**Source**: SSO_ADMIN_GUIDE.md

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
**Source**: SUMMARY_DATA_PRIVACY_COMPLIANCE.md, KEBIJAKAN_PRIVASI_TEMPLATE.md

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

### 2.4 Social Login / Identity Provider Integration ⭐⭐
**Timeline**: 1 week
**Dependency**: None
**Source**: SSO_CLIENT_GUIDE.md

- [ ] **Google OAuth**:
  - [ ] Register OAuth app in Google Cloud Console
  - [ ] Implement OAuth 2.0 Authorization Code flow
  - [ ] Add "Sign in with Google" button on login page
  - [ ] Link Google account to existing identity or create new
  - [ ] Test sign-in flow
- [ ] **Microsoft Azure AD / Entra ID (as IdP)**:
  - [ ] Register app in Azure AD
  - [ ] Implement OAuth 2.0 Authorization Code flow
  - [ ] Add "Sign in with Microsoft" button on login page
  - [ ] Map Entra ID user to Aksara identity
  - [ ] Test sign-in flow
- [ ] **SAML Support**:
  - [ ] Install SAML library (`samlify`)
  - [ ] Implement SAML 2.0 Service Provider
  - [ ] Create SAML metadata endpoint
  - [ ] Create SAML ACS (Assertion Consumer Service) endpoint
  - [ ] Test with Okta/Auth0 as SAML IdP
- [ ] Add IdP configuration UI in admin console
- [ ] Test all IdP integrations

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

### 4.5 Themes & Branding ⭐
**Timeline**: 1 week
**Dependency**: None
**Source**: _DEV_GUIDE.md

- [ ] Create theme configuration schema:
  ```typescript
  {
    primaryColor: string,
    secondaryColor: string,
    logo: string (URL or base64),
    favicon: string,
    loginBackground: string,
    loginPageText: string,
    companyName: string
  }
  ```
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

---

## 🎯 Recommended Focus Order

1. **CRITICAL (Week 1-3)**: Security & Compliance (Phase 1) - Required for production deployment
2. **HIGH (Week 4-6)**: Integration (Phase 2) - Complete Entra ID sync, fix SCIM issues
3. **MEDIUM (Week 7-9)**: Organization Enhancement (Phase 3) - Improve org versioning system
4. **LOW (Week 10-14)**: Advanced Features (Phase 4) - Nice-to-have features
5. **FUTURE**: Enterprise Features (Phase 5) - Long-term roadmap
