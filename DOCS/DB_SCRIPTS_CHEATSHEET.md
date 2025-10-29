# Database Scripts Cheat Sheet

Quick reference for export/import/clone operations.

---

## 🚀 Quick Commands

### Export (Development Mode - Captures ALL fields)
```bash
# Export all collections with auto-detect
bun run scripts/db-export.ts --auto-detect

# Export specific collection
bun run scripts/db-export.ts identities --auto

# Export to custom directory
bun run scripts/db-export.ts --auto --output ./backup/
```

### Export (Production Mode - Configured columns only)
```bash
# Export all collections
bun run scripts/db-export.ts

# Export specific collection
bun run scripts/db-export.ts identities
```

### Import
```bash
# Import all CSVs from directory
bun run scripts/db-import.ts --dir ./scripts/output/

# Import with upsert (update existing)
bun run scripts/db-import.ts --dir ./scripts/output/ --upsert

# Import single collection
bun run scripts/db-import.ts identities ./data/identities.csv

# Skip errors and continue
bun run scripts/db-import.ts --dir ./data/ --skip-errors

# Validate CSV without importing
bun run scripts/db-import.ts identities ./data.csv --validate-only
```

### Seeding
```bash
# Seed from CSV files
bun run scripts/db-seed.ts

# Clean and re-seed
bun run scripts/db-seed.ts --clean

# Seed from custom directory
bun run scripts/db-seed.ts --dir ./data/
```

### Clone Database
```bash
# Clone entire database
bun run scripts/db-clone.ts source_db target_db

# View database statistics
bun run scripts/db-stats.ts aksara_sso

# Compare two databases
bun run scripts/db-stats.ts compare aksara_sso dev_sso
```

---

## 🎯 Common Workflows

### Daily Development Backup
```bash
# Export everything with auto-detect
bun run scripts/db-export.ts --auto --output "./backups/$(date +%Y-%m-%d)/"
```

### Clone Prod to Dev
```bash
# 1. Set .env to production
MONGODB_URI=mongodb+srv://...prod...

# 2. Export with auto-detect
bun run scripts/db-export.ts --auto --output ./prod-backup/

# 3. Switch .env to dev
MONGODB_URI=mongodb+srv://...dev...

# 4. Import to dev
bun run scripts/db-import.ts --dir ./prod-backup/ --upsert
```

### Test Schema Changes
```bash
# 1. Export current state
bun run scripts/db-export.ts --auto --output ./before/

# 2. Make your code changes
# ... edit schemas, add fields, etc ...

# 3. Export new state
bun run scripts/db-export.ts --auto --output ./after/

# 4. Compare CSVs manually or with diff tool
diff ./before/identities.csv ./after/identities.csv
```

### Fresh Start (Clean Database)
```bash
# Drop all collections and re-seed
bun run scripts/db-seed.ts --clean
```

### Migrate Data Between Environments
```bash
# Export from old structure
bun run scripts/db-export.ts --auto --output ./migration/

# Manual: Edit CSVs to match new schema

# Import to new structure
bun run scripts/db-import.ts --dir ./migration/ --skip-errors
```

---

## 🔧 Flags Reference

### Export Flags
| Flag | Description |
|------|-------------|
| `--auto-detect`, `--auto` | Auto-detect all fields from database |
| `--output <dir>`, `-o <dir>` | Custom output directory |
| `--all`, `-a` | Export all collections (default) |

### Import Flags
| Flag | Description |
|------|-------------|
| `--dir <path>` | Import all CSVs from directory |
| `--upsert` | Update existing records (don't fail on duplicates) |
| `--skip-errors` | Continue importing even if some rows fail |
| `--validate-only` | Check CSV validity without importing |

### Seed Flags
| Flag | Description |
|------|-------------|
| `--clean` | Drop collections before seeding |
| `--dir <path>` | Seed from custom directory |

---

## ⚠️ Important Notes

### Auto-Detect Mode
- ✅ **Use in development** - captures ALL fields automatically
- ✅ Adapts to schema changes without config updates
- ❌ **Don't use in production** - output varies with data
- ⚠️  May output ObjectIds instead of resolved names

### Configured Mode
- ✅ **Use in production** - consistent, controlled output
- ✅ Only exports important fields
- ✅ References resolved to human-readable names
- ❌ Requires manual config updates when schema changes

### Import Behavior
- **Upsert**: Updates existing + inserts new (based on unique keys)
- **Insert**: Fails on duplicates (default)
- **ObjectId handling**: Automatically skips ObjectId strings with warnings
- **Order**: Collections imported in dependency order automatically

---

## 📋 Collection Dependencies

Import order (automatic in `--dir` mode):
1. `organizations` (no dependencies)
2. `positions` (no dependencies)
3. `org_units` (depends on: organizations)
4. `oauth_clients` (no dependencies)
5. `scim_clients` (no dependencies)
6. `identities` (depends on: organizations, org_units, positions, managers)
7. `entraid_configs` (depends on: organizations)
8. `org_structure_versions` (depends on: organizations)
9. `sk_penempatan` (depends on: organizations)
10. `employee_history` (depends on: identities)
11. `audit_log` (depends on: identities)

---

## 🐛 Troubleshooting

### "Import failed with N errors"
**Cause:** CSV has broken references (ObjectIds or invalid names)

**Solutions:**
```bash
# Option 1: Skip errors
bun run scripts/db-import.ts --dir ./data/ --skip-errors

# Option 2: Use auto-detect export to get clean data
bun run scripts/db-export.ts --auto --output ./clean/
bun run scripts/db-import.ts --dir ./clean/ --upsert
```

### "Organization not found: 68f511f8..."
**Cause:** CSV has ObjectId strings instead of codes/names

**Solution:** Already handled! Import will skip with warnings. If you want clean data, export from correct source database.

### "Collection already exists"
**Cause:** Trying to seed without clean flag

**Solution:**
```bash
bun run scripts/db-seed.ts --clean
```

### Missing new fields in export
**Cause:** Using configured mode, but config not updated

**Solution:**
```bash
bun run scripts/db-export.ts identities --auto
```

---

## 📚 More Info

- **Full guide**: See `DOCS/SCHEMA_EVOLUTION.md`
- **SCIM docs**: See `DOCS/SCIM_IMPLEMENTATION.md`
- **Project overview**: See `CLAUDE.md`

---

**Last Updated:** October 2025
