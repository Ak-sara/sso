# Database Seeders

Modular database seeding system for Aksara SSO.

## Individual Seeders

Each collection has its own independent seeder that can be run without affecting other collections:

### Run Individual Seeders

```bash
# Organizations (with MASTER branding)
bun run seed:organizations

# Organizational Units (57 units)
bun run seed:org-units

# Positions (6 positions)
bun run seed:positions

# Users (admin user)
bun run seed:users

# OAuth Clients (test-client, ofm-client, hr-system)
bun run seed:oauth

# Partners (2 partners)
bun run seed:partners

# Organization Structure Versions (2023, 2024, 2025)
bun run seed:org-versions

# Employees (1500 employees)
bun run seed:employees
```

## Full Database Seed

Run complete database seed with production-like dataset:

```bash
# Full seed (1500 employees, all collections)
bun run db:seed
```

## Features

### 1. Independent Execution
Each seeder can run independently without affecting other collections:
```bash
# Only reseed org structure versions without touching employees
bun run seed:org-versions
```

### 2. Auto-Detection
Seeders automatically detect required dependencies:
- If IAS organization doesn't exist, it will warn you
- If org units don't exist, it will skip dependent seeders

### 3. No Data Loss
By default, individual seeders **clear** their own collection.
The main orchestrator (`db:seed`) clears all collections.

### 4. CLI Support
Each seeder can be run directly:
```bash
bun run src/lib/db/seeders/organizations.ts
bun run src/lib/db/seeders/employees.ts
```

## Typical Workflows

### Full Reset
```bash
bun run db:seed:large
```

### Add More Employees (without clearing)
```bash
# Run employees seeder with higher count
# (modify index.ts temporarily or create new command)
```

### Refresh Only Org Structure Versions
```bash
bun run seed:org-versions
```

### Add New OAuth Client
Edit `oauth-clients.ts`, then:
```bash
bun run seed:oauth
```

## File Structure

```
src/lib/db/seeders/
├── index.ts                      # Main orchestrator
├── organizations.ts               # MASTER + INJ + IAS + subsidiaries
├── org-units.ts                   # 57 organizational units
├── positions.ts                   # 6 position levels
├── employees.ts                   # Bulk employee generator
├── users.ts                       # Admin user
├── oauth-clients.ts               # OAuth clients
├── partners.ts                    # Partner/vendor data
├── org-structure-versions.ts     # Historical org structures
└── README.md                      # This file
```

## Adding New Seeders

1. Create new seeder file: `src/lib/db/seeders/your-collection.ts`
2. Export async function: `export async function seedYourCollection(db, options)`
3. Add CLI support at bottom of file
4. Import in `index.ts`
5. Add npm script to `package.json`: `"seed:your-collection": "bun run src/lib/db/seeders/your-collection.ts"`

Example template:
```typescript
import type { Db } from 'mongodb';

export async function seedYourCollection(db: Db, options: { clear?: boolean } = {}) {
  console.log('🎯 Seeding your collection...');

  if (options.clear) {
    await db.collection('your_collection').deleteMany({});
  }

  // Your seeding logic here

  console.log('✅ Seeded your collection');
}

// CLI support
if (import.meta.main) {
  const { connectDB, disconnectDB } = await import('../connection');
  try {
    const db = await connectDB();
    await seedYourCollection(db, { clear: true });
  } finally {
    await disconnectDB();
  }
}
```

## Notes

- **MASTER organization** includes IAS branding (teal theme)
- **Employee generator** uses realistic Indonesian names
- **Org structure versions** demonstrate versioning feature with 3 historical snapshots
- All seeders validate dependencies and provide helpful warnings
