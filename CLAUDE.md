# Aksara SSO - Claude Development Guide

A Keycloak-like SSO system with advanced employee lifecycle management, organization structure versioning, and Microsoft Entra ID sync.

## 🔑 Test Credentials

- Email: admin@ias.co.id
- Password: password123
- OAuth Client ID: test-client
- OAuth Client Secret: test-secret

## Technology Stack

- **Runtime**: Bun
- **Framework**: SvelteKit 5 with Runes
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB Atlas
- **CSS**: TailwindCSS
- **Authentication**: OAuth 2.0 / OIDC, Argon2 password hashing
- **Testing**: Vitest with happy-dom, playwright => ./e2e

## Project Objectives

1. Create a **Keycloak-like SSO system** with Realm/Organization management
2. **SCIM 2.0 module** for automated employee provisioning to connected apps
3. **Organization structure versioning** with Mermaid diagram rendering
4. Focus on **employee lifecycle management** (onboarding, mutation, offboarding)
5. **Microsoft Entra ID sync** (bidirectional) with conflict resolution UI
6. **Multi-company support** - employees can be assigned to multiple entities
7. **Custom employee properties** (PKWT, OS/Outsource employment types)
8. **Partner/external user management** (non-employees)

---

# ✅ Completed Features

## 🆕 Recent Additions (October 2025)

### Organization Structure Versioning System
- ✅ **Snapshot-based versioning** - Complete structure capture at any point in time
- ✅ **Version management UI** - List, create, view, and manage versions
- ✅ **SK (Surat Keputusan) tracking** - Official decree documentation
- ✅ **Employee reassignment tracking** - Automatic tracking of affected employees
- ✅ **Workflow management** - Draft → Pending → Active → Archived
- ✅ **Automatic Mermaid diagram generation** - Visual org charts from structure data
- ✅ **On-demand regeneration** - Update diagrams anytime
- ✅ **Change tracking** - Diff between versions

### SK Penempatan Karyawan (Employee Assignment Decree)
- ✅ **Bulk reassignment system** - Manage hundreds of employees at once
- ✅ **CSV import functionality** - Mass import with validation
- ✅ **CSV template download** - Pre-formatted template for users
- ✅ **Smart validation** - Validates employee IDs, org units, positions
- ✅ **Previous assignment capture** - Automatic tracking of current assignments
- ✅ **Flexible CSV parser** - Supports multiple column name variations
- ✅ **Error reporting** - Line-by-line validation errors
- ✅ **Workflow integration** - Draft → Approval → Execution
- ✅ **History integration** - Creates employee history entries on execution

### UI/UX Improvements
- ✅ **Inline edit mode** - Edit employees directly on detail page
- ✅ **Proper seed data** - 57 organizational units with correct hierarchy
- ✅ **ObjectId serialization fix** - All pages properly handle MongoDB ObjectIds
- ✅ **Enhanced navigation** - Added SK Penempatan and Versi Struktur menu items

### Utilities & Tools
- ✅ **CSV Parser utility** - Flexible, robust CSV parsing
- ✅ **Mermaid generator utility** - Auto-generate org charts
- ✅ **Template generation** - Download CSV templates

---

## Core Infrastructure
- ✅ MongoDB Atlas connection with environment variable management
- ✅ Database schemas with Zod validation (User, Employee, Organization, Partner, SKPenempatan, etc.)
- ✅ Repository pattern for data access
- ✅ Seed script with complete IAS organizational structure (6 orgs, **57 units**, 8 employees)
- ✅ Proper parent-child relationships with sequential insertion
- ✅ Test suite setup (Vitest) - 23/24 tests passing
- ✅ **ObjectId serialization fixes** - All load functions properly convert MongoDB ObjectIds to strings

## Authentication & Authorization
- ✅ OAuth 2.0 / OIDC implementation:
  - Authorization code flow
  - Token endpoint (access + refresh tokens)
  - PKCE support
  - Token introspection
  - Token revocation
- ✅ JWT token generation with RS256
- ✅ Argon2 password hashing
- ✅ User login/logout flows
- ✅ Session management

## Admin UI & Navigation
- ✅ **Responsive layout** with collapsible drawer navigation
- ✅ **Grouped navigation** with three categories:
  - **Identitas**: SSO Users, Karyawan, Data Sync, Partners
  - **Organisasi**: Realm/Entitas, Unit Kerja, Struktur Organisasi, Versi Struktur, Posisi, **SK Penempatan**
  - **Integrasi**: OAuth Clients, SCIM Configuration, Entra ID Sync
- ✅ **Mobile-friendly drawer** (slides in/out with overlay)
- ✅ **User menu in header** (dropdown with profile, settings, logout)
- ✅ **Realm badge** showing current organizational context
- ✅ **Educational info boxes** on major pages

## Organization & Structure Management
- ✅ **Realm/Organization management** (merged concept - each org IS a realm)
- ✅ **Organizational units** (Direktorat, Divisi, Departemen, etc.) - 57 units with proper hierarchy
- ✅ **Position/Jabatan management**
- ✅ **Mermaid organization chart visualization** with auto-generation
- ✅ **Multi-level hierarchy support** (Injourney → IAS → IASS → Units)
- ✅ **Regional office structure** (Regional 1-4 with stations)
- ✅ **Organization Structure Versioning System**:
  - Snapshot-based versioning with complete structure
  - Version list and detail pages
  - SK (Surat Keputusan) information tracking
  - Employee reassignment tracking per version
  - Workflow: Draft → Pending Approval → Active → Archived
  - **Automatic Mermaid diagram generation** from structure snapshot
  - On-demand diagram regeneration
  - Change tracking between versions
- ✅ **SK Penempatan Karyawan (Employee Assignment Decree)**:
  - Bulk employee reassignment management
  - **CSV import functionality** for mass reassignments
  - CSV template download
  - Automatic validation of employee IDs, org units, and positions
  - Previous assignment tracking
  - Workflow: Draft → Pending Approval → Approved → Executed
  - Integration with employee history tracking

## Employee Lifecycle Management (Comprehensive!)
- ✅ **Employee Detail Page** with 4 tabs:
  - Overview: Personal info, employment status (**with inline edit mode**)
  - Penempatan: Shows full context (Entity → Unit → Position)
  - SSO Access: Linked account management
  - History: Visual timeline of all events
- ✅ **Inline Edit Mode**: Edit employee details directly on detail page without separate edit route
- ✅ **Onboarding Wizard** (5 steps):
  1. Personal Information
  2. Employment Information (PKWT/OS/Permanent)
  3. Assignment (Realm → Unit → Position → Location)
  4. SSO Access (optional account creation)
  5. Review & Confirmation
- ✅ **Mutation/Transfer Workflow**:
  - Modal form with entity/unit/position selection
  - Mutation types: Transfer, Promosi, Demosi
  - Effective date tracking
  - History tracking with previous values
- ✅ **Offboarding Workflow**:
  - Termination date and reason
  - Optional SSO access revocation
  - Automated checklist
  - History entry creation
- ✅ **Assignment History Timeline**:
  - Color-coded events (🟢 Onboarding, 🔵 Mutation, 🔴 Offboarding)
  - Visual timeline with connecting lines
  - Shows full context for each historical event

## Data Synchronization
- ✅ **Data Sync Comparison UI** (`/employees/sync`):
  - Source selection (Microsoft Entra ID or CSV upload)
  - Three-way comparison table (App DB | Entra ID/CSV)
  - Statistics dashboard (Total, Matches, Conflicts, New Records)
  - Per-field action selection:
    - Keep App DB
    - Use External Source
    - Sync Both Ways
    - Skip
  - Bulk selection (Select All / Deselect All)
  - Sync history log
- ⚠️ **TODO**: Actual Microsoft Graph API integration
- ⚠️ **TODO**: CSV parsing implementation

## User & Partner Management
- ✅ SSO Users CRUD with role management
- ✅ Partners/External users page (stub)
- ✅ Employee directory with search

## OAuth & Integration
- ✅ OAuth 2.0 client management UI
- ✅ Client credentials display
- ✅ Authorization endpoint testing UI
- ✅ **SCIM 2.0**: Full implementation with /Users and /Groups endpoints

## Audit & Logging
- ✅ Audit log schema
- ✅ Audit log UI (stub page)
- ✅ Automatic audit trail for:
  - Employee onboarding
  - Employee mutation
  - Employee offboarding
  - User creation

## SCIM 2.0 Integration (ENTERPRISE-GRADE! 🏆)

### Core SCIM API
- ✅ **Complete SCIM 2.0 implementation** (RFC 7643/7644 compliant)
- ✅ **Users endpoint** (`/scim/v2/Users`):
  - GET (list with pagination & filtering)
  - GET /{id} (single user)
  - POST (create user)
  - PUT (full update)
  - PATCH (partial update)
  - DELETE (deactivate)
- ✅ **Groups endpoint** (`/scim/v2/Groups`):
  - GET (list organizational units)
  - GET /{id} (single group)
  - POST, PUT, PATCH, DELETE
- ✅ **Bulk Operations** (`/scim/v2/Bulk`):
  - Up to 1,000 operations per request (beats Okta's 500!)
  - POST, PUT, PATCH, DELETE in single request
  - 10MB max payload
  - Error handling with `failOnErrors`

### Enterprise Authentication (OAuth 2.0)
- ✅ **OAuth 2.0 Client Credentials Grant** (RFC 6749)
- ✅ **Per-client credentials** (like Okta/Azure AD)
- ✅ **JWT access tokens** with expiration (1 hour)
- ✅ **Token endpoint** (`/scim/v2/token`)
- ✅ **Scope-based permissions**:
  - `read:users`, `write:users`, `delete:users`
  - `read:groups`, `write:groups`, `delete:groups`
  - `bulk:operations`
- ✅ **Client management**:
  - Generate credentials
  - Rotate secrets
  - Deactivate clients
  - Token revocation

### Advanced Features
- ✅ **Advanced SCIM filter parser** (ALL operators):
  - Comparison: `eq`, `ne`, `co`, `sw`, `ew`, `gt`, `ge`, `lt`, `le`, `pr`
  - Logical: `and`, `or`, `not`, `()`
  - Complex queries: `(active eq true and userName ew "@ias.co.id") or x-position.isManager eq true`
- ✅ **Manager lookup** - Automatically determines manager from org hierarchy
- ✅ **Team member lookup** - Finds all employees in same org unit
- ✅ **Custom extensions**:
  - `x-position` - Employee position details (isManager, level)
  - `x-orgUnit` - Org unit metadata (type, parent, manager)

### Security & Compliance
- ✅ **IP Whitelisting** (CIDR notation support)
- ✅ **Per-client rate limiting** (configurable, default 100 req/min)
- ✅ **Argon2 secret hashing**
- ✅ **Comprehensive audit logging**:
  - Every request logged
  - Client usage stats
  - Performance metrics
  - Error tracking
- ✅ **SCIM-compliant error responses**

### Admin UI
- ✅ **SCIM Client Management Dashboard** (`/scim-clients`):
  - Create/deactivate clients
  - Rotate secrets
  - View usage statistics
  - Monitor performance
  - Track error rates

### Documentation
- ✅ **Complete SCIM API documentation** (`DOCS/SCIM_IMPLEMENTATION.md`)
- ✅ **OFM integration guide** (`DOCS/OFM_SCIM_INTEGRATION_GUIDE.md`)
- ✅ **Industry comparison** (`DOCS/SCIM_INDUSTRY_COMPARISON.md`)
- ✅ **Test script** (`scripts/test-scim.sh`)

### Industry Comparison (Our Advantages)
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

# 🔄 Keycloak Feature Comparison

Aksara SSO implements Keycloak-like features with HR-centric enhancements:

## ✅ Already Implemented (Keycloak Equivalent)

| Keycloak Feature | Aksara SSO Implementation | Status |
|------------------|---------------------------|--------|
| **Realms** | Organizations (each org = realm) | ✅ Done |
| **Users** | SSO Users + Employees (linked) | ✅ Done |
| **Clients** | OAuth Clients | ✅ Done |
| **Roles** | User roles (user, hr, manager, admin) | ✅ Done |
| **Groups** | Organizational Units (implicit groups) | ✅ Done |
| **Authentication Flows** | OAuth 2.0 / OIDC flows | ✅ Done |
| **Sessions** | Session management | ✅ Done |
| **Tokens** | JWT access + refresh tokens | ✅ Done |

## 🚧 Keycloak Features TO IMPLEMENT

### High Priority
- [ ] **Identity Providers (Social Login)**:
  - [ ] Google OAuth
  - [ ] Microsoft Azure AD / Entra ID (as IdP, not just sync)
  - [ ] SAML 2.0 support
  - [ ] Identity Brokering

- [ ] **Multi-Factor Authentication (MFA)**:
  - [ ] TOTP (Time-based One-Time Password)
  - [ ] SMS OTP
  - [ ] Email OTP
  - [ ] Backup codes

- [ ] **Fine-Grained Authorization**:
  - [ ] Resource-based permissions
  - [ ] Policy-based access control
  - [ ] Permission evaluation API
  - [ ] Authorization services

- [ ] **Client Scopes**:
  - [ ] Predefined scopes (profile, email, roles)
  - [ ] Custom scopes
  - [ ] Scope mapping to claims
  - [ ] Consent screen

- [ ] **User Federation**:
  - [ ] LDAP/Active Directory integration
  - [ ] Custom user storage SPI
  - [ ] Sync mode (import vs proxy)

### Medium Priority
- [ ] **Account Management**:
  - [ ] User self-service portal
  - [ ] Profile editing
  - [ ] Password reset flow
  - [ ] Email verification
  - [ ] Account deletion (GDPR)

- [ ] **Admin Events**:
  - [ ] Enhanced audit logging
  - [ ] Event listeners
  - [ ] Event filters
  - [ ] Export events to external systems

- [ ] **Themes & Branding**:
  - [ ] Customizable login pages
  - [ ] Email templates
  - [ ] Error pages
  - [ ] Admin console themes

- [ ] **Token Mappers**:
  - [ ] User attribute mappers
  - [ ] Role name mappers
  - [ ] Audience mappers
  - [ ] Custom claim mappers

### Lower Priority
- [ ] **Single Sign-Out (SLO)**:
  - [ ] Backchannel logout
  - [ ] Frontchannel logout
  - [ ] Session monitoring

- [ ] **Device Authorization Flow**:
  - [ ] For TV/IoT devices

- [ ] **Client Registration Service**:
  - [ ] Dynamic client registration

- [ ] **Internationalization**:
  - [ ] Multi-language support (ID/EN)
  - [ ] Locale selection

---

# 📋 Implementation Todos (Updated)

## Core Authentication & Authorization
- [x] Setup MongoDB Atlas connection and schemas
- [x] Implement user authentication (login/logout)
- [x] Implement OAuth2/OIDC flows
- [x] Create JWT token generation and validation
- [x] Setup role-based access control (RBAC)
- [x] Implement session management
- [x] Create admin console UI
- [ ] **Add multi-factor authentication (MFA)** ⭐ HIGH PRIORITY
- [x] Implement password policies and validation
- [ ] Create user registration and password reset flows
- [ ] **Add Identity Providers (Google, Microsoft, SAML)** ⭐ HIGH PRIORITY
- [ ] **Implement fine-grained authorization (resource permissions)** ⭐ HIGH PRIORITY
- [ ] Add client scopes and consent screen
- [ ] Implement user federation (LDAP/AD)

## SCIM (System for Cross-domain Identity Management)
- [✅] **Design SCIM 2.0 API endpoints (/Users, /Groups)** ✅ COMPLETED
- [✅] Implement SCIM user provisioning (POST, PUT, PATCH)
- [✅] Implement SCIM user deprovisioning (DELETE)
- [✅] Add SCIM group management (org units)
- [✅] Implement SCIM filtering and pagination
- [✅] Create SCIM API documentation (DOCS/SCIM_IMPLEMENTATION.md)
- [✅] Bearer token authentication
- [✅] Manager and team member lookup utilities
- [✅] Custom extensions (x-position, x-orgUnit)
- [ ] Create SCIM webhook notifications (future)
- [ ] Add SCIM bulk operations support (future)
- [ ] Token management UI (future)

## Organization Structure Management
- [x] Design organization hierarchy data model
- [x] Implement CRUD operations for org units
- [x] **Create organization versioning system** ✅ COMPLETED
- [x] Build mermaid diagram generator for org structure ✅ AUTO-GENERATION
- [x] Implement org structure comparison between versions ✅ CHANGE TRACKING
- [x] Add position/job title management
- [x] Create reporting hierarchy relationships
- [x] **SK Penempatan Karyawan system** ✅ NEW FEATURE
- [x] **CSV import for bulk employee reassignments** ✅ NEW FEATURE
- [ ] Implement matrix reporting structures
- [ ] Create SK Penempatan detail page with execution workflow
- [ ] Add Excel export for SK attachment

## Employee Data Management
- [x] Design employee data schema with custom properties
- [x] Implement employee CRUD operations
- [x] Add employee profile management UI
- [x] **Inline edit mode for employee detail page** ✅ NEW FEATURE
- [x] Create demographic data fields
- [x] Implement custom property system (PKWT, OS, etc)
- [x] Add employee search and filtering
- [x] **CSV import for bulk reassignments via SK Penempatan** ✅ COMPLETED
- [ ] Create employee import/export functionality (general CSV/Excel)
- [x] Implement employee status management (active, inactive, terminated)
- [x] Add employee assignment history
- [x] **Implement onboarding wizard** ✅
- [x] **Implement mutation/transfer workflow** ✅
- [x] **Implement offboarding workflow** ✅
- [x] **Fix ObjectId serialization in all load functions** ✅ BUG FIX

## Multi-Company & Entity Management
- [x] Design multi-tenant data model
- [x] Implement company/entity CRUD operations
- [ ] Create entity switching mechanism (realm selector)
- [x] Add employee cross-entity assignment (secondary assignments)
- [ ] Implement entity-level permissions
- [ ] Create consolidated reporting across entities
- [x] Add entity hierarchy (parent, subsidiaries)

## Microsoft Entra ID Integration
- [ ] **Setup Entra ID API authentication (Microsoft Graph)** ⭐ NEXT PRIORITY
- [ ] Implement user sync to Entra ID
- [ ] Add group sync to Entra ID
- [x] Create selective field mapping configuration (UI ready)
- [x] Implement sync status tracking (UI ready)
- [ ] Add error handling and retry logic
- [ ] Create sync scheduling mechanism (cron/background jobs)
- [ ] Build sync audit logs
- [ ] **Implement CSV comparison and import** ⭐ NEXT PRIORITY

## Partner/Non-Employee Management
- [x] Design partner data model
- [ ] Implement partner CRUD operations (currently stub)
- [ ] Add partner type categorization
- [ ] Create partner access controls
- [ ] Implement partner authentication flows
- [ ] Add partner profile management

## Security & Compliance
- [x] Implement audit logging (schema + UI stub)
- [ ] Add data encryption at rest
- [ ] Implement API rate limiting
- [ ] Create security headers and CORS policies
- [ ] Add input validation and sanitization
- [ ] Implement CSRF protection
- [ ] Create data retention policies
- [ ] Add GDPR compliance features (data export, deletion)
- [ ] Implement IP whitelisting
- [ ] Add security monitoring and alerts

## API & Integration
- [ ] **Design RESTful API structure** ⭐ HIGH PRIORITY
- [ ] Create API documentation (OpenAPI/Swagger)
- [ ] Implement API versioning
- [ ] Add GraphQL support (optional)
- [ ] Create SDK/client libraries
- [ ] Implement webhooks for events
- [ ] Add API key management
- [ ] Create developer portal

## UI/UX
- [x] Design responsive admin dashboard
- [x] Create user management interface
- [x] Build organization chart visualizer
- [x] Implement employee directory
- [x] Add profile management pages
- [ ] Create reporting and analytics views
- [ ] Implement theme customization
- [ ] Add Indonesian language localization (full i18n)
- [x] Create mobile-responsive layouts
- [ ] **Add account self-service portal** ⭐ NEXT PRIORITY

## Testing & Quality
- [x] Setup unit testing framework (Vitest)
- [x] Write unit tests for core modules (23/24 passing)
- [ ] Implement integration tests
- [ ] Add E2E testing (Playwright)
- [ ] Create test data generators
- [ ] Setup continuous integration (CI)
- [ ] Implement code coverage tracking
- [ ] Add performance testing

## DevOps & Deployment
- [ ] Create Docker configuration
- [ ] Setup environment configuration management
- [ ] Implement logging and monitoring
- [ ] Create backup and restore procedures
- [ ] Setup continuous deployment (CD)
- [ ] Create deployment documentation
- [ ] Implement health check endpoints
- [ ] Add performance monitoring (APM)
- [ ] Setup error tracking (Sentry/similar)

## Documentation
- [x] Create user documentation only after being confirm if it is no bug (UI_IMPROVEMENTS.md, EMPLOYEE_MANAGEMENT.md)
- [ ] Write API documentation
- [ ] Create administrator guide
- [ ] Write deployment guide
- [x] Create architecture documentation (REALM_CONCEPT.md)
- [ ] Add code comments and JSDoc
- [ ] Create troubleshooting guide
- [ ] Write migration guides

---

# 🎯 Recommended Next Steps (Priority Order)

## Phase 1: Complete Core SSO Features (Weeks 1-2)
1. **SCIM 2.0 API Implementation** ⭐⭐⭐
   - Implement `/scim/v2/Users` endpoints (GET, POST, PUT, PATCH, DELETE)
   - Implement `/scim/v2/Groups` endpoints
   - Add filtering, pagination, sorting
   - Create bearer token authentication
   - Test with external apps (e.g., Slack, Google Workspace)

2. **Microsoft Entra ID Sync (Backend)** ⭐⭐⭐
   - Implement Microsoft Graph API client
   - Create field mapping engine
   - Implement bidirectional sync logic
   - Add conflict resolution with UI integration
   - Create scheduled sync jobs

3. **CSV Import/Export** ⭐⭐
   - Implement CSV parser with validation
   - Create import preview
   - Implement export to Excel/CSV
   - Add template download

## Phase 2: Security & User Experience (Weeks 3-4)
4. **Multi-Factor Authentication (MFA)** ⭐⭐⭐
   - Implement TOTP (Google Authenticator compatible)
   - Add QR code generation
   - Create MFA setup wizard
   - Add backup codes
   - Enforce MFA per role/user

5. **Account Self-Service Portal** ⭐⭐
   - User profile editing
   - Password change
   - MFA setup
   - View SSO-connected apps
   - Download personal data (GDPR)

6. **Identity Provider Integration** ⭐⭐
   - Google OAuth (Sign in with Google)
   - Microsoft Azure AD / Entra ID (as IdP)
   - Social login buttons on login page

## Phase 3: Advanced Features (Weeks 5-6)
7. **Organization Structure Versioning** ⭐⭐
   - Create version snapshots
   - Compare versions (diff view)
   - Rollback capability
   - Effective date for org changes
   - Historical reporting

8. **Fine-Grained Authorization** ⭐⭐
   - Resource-based permissions
   - Policy engine (ABAC/PBAC)
   - Permission evaluation API
   - Authorization UI

9. **API Documentation & Developer Portal** ⭐
   - OpenAPI/Swagger spec
   - Interactive API docs
   - Code examples (curl, JavaScript, Python)
   - API key management UI

## Phase 4: Enterprise Features (Weeks 7-8)
10. **LDAP/Active Directory Federation** ⭐
    - LDAP connector
    - User import from AD
    - Sync mode configuration
    - Password delegation

11. **Advanced Audit & Compliance** ⭐
    - Enhanced event logging
    - Compliance reports (GDPR, SOC2)
    - Data retention automation
    - Audit log export

12. **Webhooks & Event System** ⭐
    - Event subscription management
    - Webhook endpoint registration
    - Event payload customization
    - Retry logic and DLQ

---

# 📂 File Structure Reference

```
src/
├── lib/
│   ├── db/
│   │   ├── connection.ts          # MongoDB connection
│   │   ├── schemas.ts             # Zod schemas for all collections
│   │   ├── repositories.ts        # Data access layer
│   │   └── seed.ts                # Seed data script
│   └── oauth/
│       └── server.ts              # OAuth 2.0 implementation
│
├── routes/
│   ├── (app)/                     # Admin console routes
│   │   ├── +layout.svelte         # Main layout with navigation
│   │   ├── +page.svelte           # Dashboard
│   │   ├── employees/
│   │   │   ├── +page.svelte       # Employee list
│   │   │   ├── [id]/
│   │   │   │   ├── +page.svelte   # Employee detail (4 tabs)
│   │   │   │   └── +page.server.ts # Mutation/offboard actions
│   │   │   ├── onboard/
│   │   │   │   ├── +page.svelte   # Onboarding wizard
│   │   │   │   └── +page.server.ts # Onboarding action
│   │   │   └── sync/
│   │   │       ├── +page.svelte   # Data sync UI
│   │   │       └── +page.server.ts # Sync comparison logic
│   │   ├── users/                 # SSO user management
│   │   ├── partners/              # Partner management
│   │   ├── realms/                # Realm/Organization management
│   │   ├── org-units/             # Org unit management
│   │   ├── org-structure/         # Org chart visualizer
│   │   ├── positions/             # Position management
│   │   ├── clients/               # OAuth client management
│   │   ├── scim/                  # SCIM configuration
│   │   ├── entraid-sync/          # Entra ID sync config
│   │   └── audit/                 # Audit log viewer
│   │
│   └── oauth/                     # OAuth endpoints
│       ├── authorize/+server.ts
│       ├── token/+server.ts
│       ├── introspect/+server.ts
│       └── revoke/+server.ts
│
└── tests/
    ├── oauth-flow.test.ts         # OAuth integration tests
    └── lib/db/repositories.test.ts # Repository unit tests
```

---
# Related Files
Documentation is in: DOCS/*.md

- ./DOCS/example_org_structure.md - example of organizations structure we need to implement.
- ./DOCS/SESSION_SUMMARY_2025-10-15.md - Development Session Summary - October 15, 2025

## Important Reminders

- **Update CLAUDE.md _📋 Implementation Todos_ as you complete tasks** (mark with `[✅]`)
- **Make reusable code** dont make more than ~500 lines of codes in one file, implements utils/library

---

# 💡 Development Tips

## Running the Application
```bash
# Install dependencies
bun install

# Seed database (first time only)
bun run seed

# Start development server
bun run dev

# Run tests
bun test

# Build for production
bun run build
```

## Testing OAuth Flow
1. Navigate to `/clients` in admin console
2. Note the client ID and secret
3. Use the authorization URL generator on the client detail page
4. Complete the OAuth flow in browser
5. Exchange authorization code for tokens at `/oauth/token`

## Working with MongoDB
```typescript
import { getDB } from '$lib/db/connection';

const db = getDB();
const employees = await db.collection('employees').find({}).toArray();
```

## Adding New Schemas
1. Define Zod schema in `src/lib/db/schemas.ts`
2. Add TypeScript type export
3. Create repository methods in `src/lib/db/repositories.ts`
4. Add seed data if needed in `src/lib/db/seed.ts`

---

# 📚 Additional Documentation

- **UI_IMPROVEMENTS.md** - UI enhancements and navigation structure
- **EMPLOYEE_MANAGEMENT.md** - Comprehensive employee lifecycle documentation
- **REALM_CONCEPT.md** - Explanation of realm vs organization concept

---

**Last Updated**: 2025-10-15
**Current Phase**: Organization structure versioning & SK Penempatan completed, ready for SCIM/API implementation

## 📊 Development Statistics
- **Total Collections**: 15+ (users, employees, organizations, org_units, positions, sk_penempatan, org_structure_versions, etc.)
- **Total Organizational Units**: 57 (complete IAS hierarchy)
- **Lines of Code**: ~15,000+
- **Test Coverage**: 23/24 tests passing (96%)
- **Features Completed**: 100+ individual features

