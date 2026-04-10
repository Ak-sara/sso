# Aksara SSO - Development Guide

A Keycloak-like SSO system with advanced employee lifecycle management, organization structure versioning, and Microsoft Entra ID sync.

## Test Credentials
- Email: admin@ias.co.id
- Password: password123
- OAuth Client ID: test-client
- OAuth Client Secret: test-secret


Fix #4 — depends + invalidate (4 server loads + 3 Svelte components)
- Server loads: { locals, url } + void url.search → { locals, depends } + depends('app:pagination')
- Components: goto(url) → await goto(url) + invalidate('app:pagination') — pagination functions made async
- Replaced invalidateAll imports with invalidate

Fix #5 — MongoFilter<T> / MongoUpdate<T> (5 service files)
- Added import type { MongoFilter, MongoUpdate } from './types' to all service files
- Replaced as any on filter objects (.findOne({ code } as any), .count({...} as any), etc.) with as MongoFilter<T>
- Replaced as any on update payloads with as MongoUpdate<T>

Fix #6 — Zod validation (src/lib/utils/validate.ts)
- validateBody<T>(schema, input) — returns ServiceResult<T> so errors propagate uniformly
- Reusable field schemas: nonEmptyString, optionalString, emailField, booleanFromString
- Applied to createIdentity and updateIdentity in identity-service.ts as examples

## Development
### Project Objectives
1. Create a **Keycloak-like SSO system** with Realm/Organization management
2. **SCIM 2.0 module** for automated employee provisioning to connected apps
3. **Organization structure versioning** with `@ak-sara/sto-diagram` visualization
4. Focus on **employee lifecycle management** (onboarding, mutation, offboarding)
5. **Microsoft Entra ID sync** (bidirectional) with conflict resolution UI
6. **Multi-company support** - employees can be assigned to multiple entities
7. **Custom employee properties** (PKWT, OS/Outsource employment types)
8. **Partner/external user management** (non-employees)

### Technology Stack
- **Runtime**: Bun
- **Framework**: SvelteKit 5 with Runes
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB Atlas
- **CSS**: TailwindCSS
- **Foundation Library**: `@ak-sara/fbao` (FBA) — auth, db, logging, queue, mailer
- **Authentication**: OAuth 2.0 / OIDC, Argon2 password hashing (via FBA)
- **Logging**: Structured logger via FBA's `useLogger()` — no `console.*` in codebase
- **Org Chart**: `@ak-sara/sto-diagram` (replaced Mermaid)
- **Testing**: FBA test runner (`tests/foundation/`), Playwright (e2e)

### FBA Library Integration

SSO uses `@ak-sara/fbao` (linked via `bun link`) as its foundation library. Key rules:

**Server-side code** (`.server.ts`, `+server.ts`, lib modules):
```typescript
import { useLogger, Repository, PasswordService } from '@ak-sara/fbao/foundation';
```

**Svelte components** (`.svelte` files) — NEVER import from FBA barrel:
```typescript
// CORRECT — use local browser-safe logger
import { useLogger } from '$lib/logger';

// WRONG — pulls in mongodb, argon2, etc. via barrel re-exports
// import { useLogger } from '@ak-sara/fbao/foundation';
```

**Why**: FBA's `@ak-sara/fbao/foundation` barrel re-exports everything including server-only modules (mongodb, argon2, bullmq). Vite follows ALL re-exports in the browser and crashes. `$lib/logger.ts` provides a browser-safe logger wrapper.

**After changing FBA**: Rebuild with `cd /path/to/FBA && bun run package`

**`vite.config.ts`**: Externalizes FBA's optional peer deps (`SERVER_ONLY_PKGS` array) for SSR and build. FBA adapters use `lazyImport()` (`new Function`) to hide optional dynamic imports from Vite's static analysis.

### Documentation
See `DOCS/` folder:
- `_DEV_GUIDE.md` - Feature roadmap and implementation plan
- `DATA_ARCHITECTURE.md` - Database schema reference
- `AUTHENTICATION_GUIDE.md` - Auth flows and security
- `EMPLOYEE_MANAGEMENT.md` - Employee lifecycle workflows
- `SCIM_COMPLETE_GUIDE.md` - SCIM 2.0 API documentation

See `DOCS/backlog/` folder:
- `main.md`
- `target.csv`

### Development Tips

#### Running the Application
```bash
bun install     # Install dependencies
bun run dev     # Start development server
bun run build   # Build for production
```

#### Working with MongoDB
```typescript
import { getDB } from '$lib/db/connection';

const db = getDB();
const employees = await db.collection('identities').find({
  identityType: 'employee'
}).toArray();
```

#### Using Repository (via FBA)
```typescript
import { db, Repository, lazy } from '$lib/db/db';

// Pre-defined collections
const identity = await db.identities.findById(id);

// Custom collection
const repo = new Repository(lazy, 'my_collection');
```

#### Logging
```typescript
// Server-side (.server.ts files)
import { useLogger } from '@ak-sara/fbao/foundation';
const log = useLogger({ module: 'auth:login' });
log.info('User logged in', { userId });
log.error('Login failed', { error: err });

// Client-side (.svelte files)
import { useLogger } from '$lib/logger';
const log = useLogger({ module: 'app:clients' });
```

### Preparation
### CSV Seeding

Seed data stored in `scripts/seeders/*.csv` (human-readable, version-controlled).

**Commands**:

```bash
bun run db:seed                     # Seed database (first time only)
bun run db:seed --clean             # Seed database with clean (drop collections with CSV files)

# Export collections to CSV
bun run db:export                    # All collections to scripts/output/
bun run db:export identities         # Single collection

bun run db:import identities ./data.csv     # Import from CSV
bun run db:import --dir ./scripts/seeders/  # Import all CSVs

bun run scripts/db-clone.ts source_db target_db         # Clone database between environments
bun run scripts/db-stats.ts aksara_sso                  # View database statistics
bun run scripts/db-stats.ts compare aksara_sso dev_sso  # Compare two databases
```

**Format**: Use codes/names for references (auto-resolved to ObjectIds). See existing CSV files in `scripts/seeders/`.

### Testing
```bash
# Run tests
bun test

scripts/test/custom.sh   # run custom test script
```
PDF test result:

|Mark|Case|Info|Result|
|--|--|--|--|
|1|Login Api|{message:'success'}| Success|
|1.1|Reset password|{error:'xxx'}| Failed|

## Testing OAuth Flow
1. Navigate to `/clients` in admin console
2. Note the client ID and secret
3. Use the authorization URL generator on the client detail page
4. Complete the OAuth flow in browser
5. Exchange authorization code for tokens at `/oauth/token`

---

# File Structure Reference

```
src/
├── lib/
│   ├── logger.ts                  # Browser-safe logger for Svelte components
│   ├── setup.ts                   # App initialization
│   ├── crypto.ts                  # Crypto utilities
│   ├── audit/
│   │   ├── auth-logger.ts         # Authentication audit logging
│   │   └── logger.ts              # General audit logger
│   ├── auth/
│   │   ├── password.ts            # Password service (re-exports FBA)
│   │   ├── session.ts             # Session management (re-exports FBA)
│   │   ├── otp.ts                 # OTP service (re-exports FBA)
│   │   ├── roles.ts               # Role definitions
│   │   └── two-factor.ts          # 2FA implementation
│   ├── components/
│   │   ├── DataTable.svelte       # Reusable data table with pagination, search, sort
│   │   ├── LookupModal.svelte     # Modal-based lookup with server-side pagination
│   │   └── Lookup.svelte          # Inline lookup component
│   ├── db/
│   │   ├── connection.ts          # MongoDB connection
│   │   ├── db.ts                  # Repository instances & lazy getter
│   │   ├── identity-repository.ts # Identity-specific repository
│   │   ├── schemas.ts             # Zod schemas for all collections
│   │   └── repositories.ts        # Data access layer
│   ├── email/
│   │   └── email-service.ts       # Email sending service
│   ├── entraid/
│   │   └── microsoft-graph.ts     # Microsoft Entra ID integration
│   ├── org-structure/
│   │   ├── version-manager.ts     # Org structure versioning
│   │   ├── snapshot-builder.ts    # Structure snapshot creation
│   │   ├── publisher.ts           # Version publishing
│   │   ├── corrector.ts           # Structure validation/correction
│   │   ├── query-helper.ts        # Org structure queries
│   │   └── types.ts               # Type definitions
│   ├── scim/
│   │   ├── auth.ts                # SCIM authentication
│   │   ├── auth-enhanced.ts       # Enhanced SCIM auth
│   │   ├── filter-parser.ts       # SCIM filter expression parser
│   │   ├── utils.ts               # SCIM utilities
│   │   └── webhooks.ts            # SCIM webhook handling
│   └── utils/
│       ├── csv-parser.ts          # Generic CSV parser
│       ├── csv-exporter.ts        # Export collections to CSV
│       ├── reference-resolver.ts  # Resolve refs to ObjectIds
│       ├── pagination.ts          # Pagination utilities
│       ├── email-validation.ts    # Email validation
│       ├── data-masking.ts        # Data masking config
│       ├── masking-helper.ts      # Masking utilities
│       ├── markdown.ts            # Markdown processing
│       ├── serialize.ts           # Serialization utilities
│       ├── select-options.ts      # Select/dropdown options
│       ├── identity-import.ts     # Identity CSV import
│       └── pan-zoom.ts            # Pan/zoom for diagrams
│
├── routes/
│   ├── (app)/                     # Admin console routes
│   │   ├── +layout.svelte         # Main layout with navigation
│   │   ├── +page.svelte           # Dashboard
│   │   ├── identities/[id]/       # Identity detail (tabs: Overview, Assignment, SSO, History)
│   │   ├── org-units/             # Org unit management
│   │   ├── org-structure/[id]/sto/# Org chart visualizer (sto-diagram)
│   │   ├── positions/             # Position management
│   │   ├── realms/[id]/branding/  # Realm management + branding
│   │   ├── clients/               # OAuth client management
│   │   ├── clients-scim/          # SCIM client management
│   │   ├── sk-penempatan/[id]/    # Employee assignment decrees
│   │   ├── entraid-sync/          # Entra ID sync config
│   │   ├── sync/                  # Sync operations
│   │   ├── settings/data-masking/ # Data masking configuration
│   │   └── audit/[id]/            # Audit log viewer + detail
│   │
│   ├── (auth)/                    # Auth routes (login, register, forgot-password, etc.)
│   │
│   ├── api/                       # API endpoints
│   │   ├── identities/            # Identity search
│   │   ├── org-units/             # Org unit search, parent-options
│   │   ├── realm/                 # Realm switching
│   │   └── settings/              # Settings, test-email
│   │
│   ├── oauth/                     # OAuth endpoints (authorize, token, userinfo, etc.)
│   ├── scim/v2/                   # SCIM 2.0 endpoints (Users, Groups, Bulk, Schemas)
│   └── docs/                      # Documentation pages
│
├── tests/                         # (root level) FBA test runner tests
│   └── foundation/                # Foundation tests
│
└── scripts/
    ├── seeders/                   # CSV seed data (version controlled)
    └── output/                    # Temporary exports (gitignored)
```
---

## Important Reminders
- **Make reusable code** dont make more than ~500 lines of codes in one file, implements utils/library
- **dont make Documentation if user not request it**, just very quick and important summary is enought.
- **scope of works and the check list of implementation todo**, (`./DOCS/_DEV_GUIDE.md`) _Important: read to track, Update (mark with `[✅]`) as you complete tasks_
- **example of organizations structure we need to implement**, (`./DOCS/example_org_structure.md`)
- **DO NOT EVER EVER EVER IGNORE THIS**, dont Make Documentation, Script to Create/update/delete collection (modify current collection is okay), any script for debug/check should be on /tmp, dont do database seed, do not run the project(i already run it)

---

**Last Updated**: March 2026
