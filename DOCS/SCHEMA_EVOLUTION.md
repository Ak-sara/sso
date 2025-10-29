# Schema Evolution & Data Migration Guide

**For Development Phase - October 2025**

This guide explains how to handle database schema changes during development.

---

## Problem

During development, your schema will frequently change:
- Add new fields (e.g., `organization.branding`, `identity.department`)
- Remove fields (e.g., deprecated `user.legacyId`)
- Rename fields (e.g., `employeeNumber` → `employeeId`)
- Change field types (e.g., `hireDate` from string to Date)

**Old approach**: Manually update hardcoded configs every time → tedious and error-prone

**New approach**: Auto-detect mode + smart import

---

## Solution: Two Export Modes

### 1. **Configured Mode** (Default - For Production)
Uses hardcoded column definitions from `csv-exporter.ts`.

**Pros:**
- ✅ Consistent output (same columns every time)
- ✅ Only exports important fields
- ✅ Reference resolution works perfectly
- ✅ Controlled column order

**Cons:**
- ❌ Must update config when schema changes
- ❌ Misses new fields unless config is updated

**Usage:**
```bash
bun run scripts/db-export.ts organizations
bun run scripts/db-export.ts --all
```

**When to use:**
- Production backups
- Seeding clean environments
- Sharing data with external systems
- When you need consistent CSV format

---

### 2. **Auto-Detect Mode** (New - For Development)
Scans your database and exports **ALL fields** automatically.

**Pros:**
- ✅ Captures ALL fields (including new ones)
- ✅ No config updates needed
- ✅ Adapts to schema changes automatically
- ✅ Great for development/testing

**Cons:**
- ❌ Includes system fields you might not want
- ❌ Column order changes based on data
- ❌ Reference resolution disabled (outputs ObjectIds)

**Usage:**
```bash
# Export all collections with auto-detect
bun run scripts/db-export.ts --auto-detect

# Export specific collection
bun run scripts/db-export.ts identities --auto

# Custom output directory
bun run scripts/db-export.ts --auto --output ./dev-backup/
```

**When to use:**
- Development environment backups
- Testing schema changes
- Exploring what fields exist
- Moving data between dev databases
- When schema is rapidly changing

---

## Import Handling

The import script is **smart** and handles both modes:

✅ **Handles ObjectIds**: Skips ObjectId strings with warnings
✅ **Flexible columns**: Works with any CSV column order
✅ **Reference resolution**: Converts human-readable names to ObjectIds
✅ **Missing fields**: Ignores unknown CSV columns
✅ **Extra fields**: Accepts new fields not in config

```bash
# Import from auto-detected export
bun run scripts/db-import.ts --dir ./scripts/output/ --upsert

# Import will:
# 1. Detect ObjectId strings (e.g., "68f511f8fc205f99615b5b77")
# 2. Skip them with warnings
# 3. Still import the valid data
```

---

## Development Workflow

### Scenario 1: Adding a New Field

**Example:** Add `department` field to identities collection

1. **Update your code** to add the field:
   ```typescript
   // src/lib/db/schemas.ts
   export const identitySchema = z.object({
     // ... existing fields
     department: z.string().optional(),  // NEW FIELD
   });
   ```

2. **Export with auto-detect** to capture the new field:
   ```bash
   bun run scripts/db-export.ts identities --auto
   ```

3. **Update CSV if needed** (add department values):
   ```csv
   email,firstName,lastName,department
   john@example.com,John,Doe,Engineering
   ```

4. **Import back**:
   ```bash
   bun run scripts/db-import.ts identities ./scripts/output/identities.csv --upsert
   ```

5. **Optional: Update hardcoded config** (for production use):
   ```typescript
   // src/lib/utils/csv-exporter.ts
   identities: {
     columns: [
       // ... existing
       { name: 'department', field: 'department' }  // ADD THIS
     ]
   }
   ```

---

### Scenario 2: Renaming a Field

**Example:** Rename `employeeNumber` → `employeeId`

1. **Export current data** with auto-detect:
   ```bash
   bun run scripts/db-export.ts identities --auto
   ```

2. **Update CSV header** manually:
   ```csv
   # Change from:
   email,firstName,employeeNumber

   # To:
   email,firstName,employeeId
   ```

3. **Update schema**:
   ```typescript
   export const identitySchema = z.object({
     employeeId: z.string(),  // NEW NAME
     // Remove: employeeNumber
   });
   ```

4. **Clean database and re-import**:
   ```bash
   bun run scripts/db-seed.ts --clean
   ```

---

### Scenario 3: Cloning Between Environments

**Example:** Clone prod schema to dev

1. **Export from prod** with auto-detect:
   ```bash
   # In production environment (.env points to prod DB)
   bun run scripts/db-export.ts --auto --output ./prod-backup/
   ```

2. **Switch to dev environment**:
   ```bash
   # Update .env to point to dev DB
   MONGODB_URI=mongodb+srv://...dev-database...
   ```

3. **Import to dev**:
   ```bash
   bun run scripts/db-import.ts --dir ./prod-backup/ --upsert
   ```

**Note:** Auto-detect captures the REAL production schema, including any fields you forgot to document!

---

## Best Practices

### During Active Development ✅

- Use `--auto-detect` for daily backups
- Keep CSV files in `./scripts/dev-backup/` (gitignored)
- Don't worry about hardcoded configs yet
- Import with `--upsert` to update existing records

### Before Production Release ⚠️

1. **Stabilize your schema** (minimize changes)
2. **Update hardcoded configs** in `csv-exporter.ts`
3. **Test configured exports** match auto-detect
4. **Document all fields** in schema files
5. **Use configured mode** for production data

### Production ⛔

- **NEVER use auto-detect** for production exports
- Use configured mode only (consistent, reliable)
- Version control your CSV configs
- Test imports in staging first

---

## Comparison Table

| Feature | Configured Mode | Auto-Detect Mode |
|---------|----------------|------------------|
| **Captures new fields** | ❌ No (must update config) | ✅ Yes (automatic) |
| **Consistent output** | ✅ Yes (same columns) | ❌ No (varies with data) |
| **Reference resolution** | ✅ Yes (names/codes) | ⚠️  Partial (ObjectIds) |
| **Column order** | ✅ Controlled | ❌ Alphabetical |
| **Excludes sensitive fields** | ✅ Yes (by default) | ✅ Yes (password, __v, etc) |
| **Production-ready** | ✅ Yes | ❌ No (dev only) |
| **Schema changes** | ❌ Manual updates | ✅ Automatic |
| **Performance** | ✅ Fast | ✅ Fast |

---

## Examples

### Export Examples

```bash
# Development: Capture everything
bun run scripts/db-export.ts --auto-detect

# Production: Controlled export
bun run scripts/db-export.ts --all

# Single collection with all fields
bun run scripts/db-export.ts identities --auto

# Backup to date-stamped folder
bun run scripts/db-export.ts --auto --output "./backups/$(date +%Y-%m-%d)/"
```

### Import Examples

```bash
# Import with conflict resolution
bun run scripts/db-import.ts identities ./data/identities.csv --upsert

# Bulk import all CSVs
bun run scripts/db-import.ts --dir ./scripts/output/

# Import but skip errors
bun run scripts/db-import.ts --dir ./data/ --skip-errors

# Validate CSV without importing
bun run scripts/db-import.ts identities ./data.csv --validate-only
```

---

## Troubleshooting

### Problem: Export missing new fields

**Cause:** Using configured mode, but config not updated

**Solution:**
```bash
# Use auto-detect instead
bun run scripts/db-export.ts identities --auto
```

### Problem: Import fails with "not found" errors

**Cause:** CSV has ObjectId strings instead of names

**Solution:** Import will skip them automatically with warnings. If you want clean data:
```bash
# 1. Export from correct source database
# 2. Or manually replace ObjectIds with names in CSV
```

### Problem: Too many fields in auto-detect export

**Cause:** Auto-detect captures ALL fields

**Solution:** Use configured mode or update exclusion list:
```typescript
// In csv-exporter.ts autoDetectColumns()
const defaultExclude = [
  '_id', '__v', 'createdAt', 'updatedAt',
  'password', 'passwordHash',
  'internalNotes', 'debugData'  // ADD MORE
];
```

---

## Summary

**For Development (Right Now):**
- ✅ Use `--auto-detect` mode
- ✅ Don't worry about hardcoded configs
- ✅ Export/import frequently
- ✅ Let the system adapt to changes

**For Production (Later):**
- ✅ Update hardcoded configs
- ✅ Use configured mode only
- ✅ Version control CSV schemas
- ✅ Test thoroughly before deployment

---

**Last Updated:** October 2025
**Status:** Auto-detect feature just added - ready for development use!
