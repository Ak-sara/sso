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

# 📂 File Structure Reference

```
src/
├── lib/
│   ├── components/
│   │   ├── DataTable.svelte       # Reusable data table with pagination, search, sort
│   │   └── LookupModal.svelte     # Modal-based lookup with server-side pagination (NEW!)
│   ├── db/
│   │   ├── connection.ts          # MongoDB connection
│   │   ├── schemas.ts             # Zod schemas for all collections
│   │   └── repositories.ts        # Data access layer
│   ├── utils/
│   │   ├── csv-parser.ts          # Generic CSV parser with column mapping
│   │   ├── csv-exporter.ts        # Export collections to CSV
│   │   ├── reference-resolver.ts  # Resolve human-readable refs to ObjectIds
│   │   └── mermaid-generator.ts   # Generate org chart diagrams
│   └── oauth/
│       └── server.ts              # OAuth 2.0 implementation
│
├── scripts/
│   ├── db-seed.ts                 # CSV-based seeding orchestrator
│   ├── db-export.ts               # Export collections to CSV
│   ├── db-import.ts               # Import CSV to collection
│   ├── db-clone.ts                # Clone databases between environments
│   ├── db-stats.ts                # Database statistics and comparison
│   ├── seeders/                   # CSV seed data (version controlled)
│   │   ├── organizations.csv
│   │   ├── positions.csv
│   │   ├── org_units.csv
│   │   ├── identities.csv
│   │   └── ...                    # 10+ CSV files
│   └── output/                    # Temporary exports (gitignored)
│
├── routes/
│   ├── (app)/                     # Admin console routes
│   │   ├── +layout.svelte         # Main layout with navigation
│   │   ├── +page.svelte           # Dashboard
│   │   ├── identities/            # Unified identity management (NEW!)
│   │   │   └── +page.svelte       # Tabbed interface for all identity types
│   │   ├── org-units/             # Org unit management
│   │   │   └── +page.svelte       # List with edit modal (uses LookupModal)
│   │   ├── org-structure/         # Org chart visualizer
│   │   │   └── [id]/sto/
│   │   │       ├── +page.svelte   # Interactive diagram with pan/zoom
│   │   │       └── +page.server.ts # Live data for active versions (NEW!)
│   │   ├── positions/             # Position management
│   │   ├── realms/                # Realm/Organization management
│   │   ├── clients/               # OAuth client management
│   │   ├── clients-scim/          # SCIM client management
│   │   ├── sk-penempatan/         # Employee assignment decrees
│   │   ├── entraid-sync/          # Entra ID sync config
│   │   └── audit/                 # Audit log viewer
│   │
│   ├── api/                       # API endpoints (NEW section!)
│   │   ├── identities/
│   │   │   └── search/+server.ts  # Paginated identity search for lookup
│   │   ├── org-units/
│   │   │   ├── [code]/+server.ts  # Get/Update org unit by code
│   │   │   └── search/+server.ts  # Paginated org unit search for lookup
│   │   └── org-structure-versions/
│   │       └── [id]/save-config/+server.ts
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

## Important Reminders
- **Make reusable code** dont make more than ~500 lines of codes in one file, implements utils/library
- **dont make Documentation if user not request it**, just very quick and important summary is enought.
- **scope of works and the check list of implementation todo**, (`./DOCS/_DEV_GUIDE.md`) _Important: read to track, Update (mark with `[✅]`) as you complete tasks_
- **example of organizations structure we need to implement**, (`./DOCS/example_org_structure.md`)
- **Complete SCIM API documentation** (`DOCS/SCIM_IMPLEMENTATION.md`)
- **OFM integration guide** (`DOCS/OFM_SCIM_INTEGRATION_GUIDE.md`)
- **Industry comparison** (`DOCS/SCIM_INDUSTRY_COMPARISON.md`)

---

# 💡 Development Tips

## Running the Application
```bash
# Install dependencies
bun install

# Seed database (first time only)
bun run db:seed

# Seed database with clean (drop collections with CSV files)
bun run db:seed --clean

# Export collections to CSV
bun run db:export                    # All collections to scripts/output/
bun run db:export identities         # Single collection

# Import from CSV
bun run db:import identities ./data.csv
bun run db:import --dir ./scripts/seeders/  # Import all CSVs

# Start development server
bun run dev

# Run tests
bun test

# Build for production
bun run build
```

## Database Management
```bash
# Clone database between environments
bun run scripts/db-clone.ts source_db target_db

# View database statistics
bun run scripts/db-stats.ts aksara_sso

# Compare two databases
bun run scripts/db-stats.ts compare aksara_sso dev_sso
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
const employees = await db.collection('identities').find({
  identityType: 'employee'
}).toArray();
```

## CSV Seeding

Seed data stored in `scripts/seeders/*.csv` (human-readable, version-controlled).

**Commands**:
```bash
bun run db:seed              # Import all CSVs
bun run db:seed --clean      # Drop + re-import
bun run db:export            # Export to CSV
```

**Format**: Use codes/names for references (auto-resolved to ObjectIds). See existing CSV files in `scripts/seeders/`.

---

# 📚 Documentation

See `DOCS/` folder:
- `_DEV_GUIDE.md` - Feature roadmap and implementation plan
- `DATA_ARCHITECTURE.md` - Database schema reference
- `AUTHENTICATION_GUIDE.md` - Auth flows and security
- `EMPLOYEE_MANAGEMENT.md` - Employee lifecycle workflows
- `SCIM_COMPLETE_GUIDE.md` - SCIM 2.0 API documentation

---

**Last Updated**: November 2025

