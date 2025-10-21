# Database Management Guide

Complete guide for database operations, seeding, cloning, snapshots, and multi-environment management in Aksara SSO.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Seeding Strategy](#seeding-strategy)
4. [Database Tools](#database-tools)
5. [Common Workflows](#common-workflows)
6. [Data Volumes](#data-volumes)
7. [Best Practices](#best-practices)

---

## 🎯 Overview

Aksara SSO uses MongoDB Atlas with a multi-database strategy within a single cluster. This approach allows for:

- **Development database** (`aksara-sso-dev`) - Ongoing feature development
- **UAT database** (`aksara-sso-uat`) - User Acceptance Testing
- **Test database** (`aksara-sso-test`) - Experimental testing

All databases share the same cluster for cost efficiency while maintaining data isolation.

---

## 🏗️ Database Architecture

### MongoDB Cluster
```
MongoDB Atlas Cluster: aksara-cluster.mongodb.net
├── aksara-sso-dev      (Development)
├── aksara-sso-uat      (UAT/Staging)
└── aksara-sso-test     (Testing)
```

### Collections

**Core Collections** (included in clone/snapshot):
- `identities` - Unified user/employee/partner/external/service accounts
- `organizations` - Realms and entities
- `org_units` - Organizational units hierarchy
- `positions` - Job positions/titles
- `org_structure_versions` - Historical org structure snapshots
- `sk_penempatan` - Employee reassignment decrees
- `oauth_clients` - OAuth 2.0 client applications
- `scim_clients` - SCIM integration clients
- `entraid_configs` - Microsoft Entra ID sync configurations
- `employee_history` - Employee lifecycle events
- `audit_logs` - System audit trail
- `scim_audit_logs` - SCIM API call logs

**Transient Collections** (excluded from clone/snapshot):
- `sessions` - Active user sessions
- `auth_codes` - OAuth authorization codes
- `refresh_tokens` - OAuth refresh tokens
- `scim_access_tokens` - SCIM bearer tokens

---

## 🌱 Seeding Strategy

### Maximum Data Volumes

The seeder creates **comprehensive datasets** to showcase all features:

```typescript
identities: {
  employees: 1400      // Realistic company size
  partners: 80         // Vendors, consultants
  external: 15         // Temporary users
  serviceAccounts: 5   // OAuth clients
}

organizations: 7       // MASTER + 6 companies
orgUnits: 57          // Complete IAS hierarchy
positions: 50         // All levels
orgVersions: 5        // 2020-2025 history
skPenempatan: 15      // All workflow states
```

### Seed Workflow

1. **Organizations** - Create 7 organizational entities
2. **Org Units** - Build 57-unit hierarchy
3. **Positions** - Define 50 job positions
4. **Identities** - Generate 1500 diverse identities
5. **OAuth Clients** - Setup 5 OAuth applications
6. **SCIM Clients** - Configure 3 SCIM integrations
7. **Org Versions** - Create 5 historical versions
8. **SK Penempatan** - Generate 15 reassignment decrees
9. **Employee History** - Create 3000+ lifecycle events
10. **Audit Logs** - Generate 5000+ entries (90 days)

---

## 🛠️ Database Tools

### 1. Database Seeding (`bun run db:seed`)

**Purpose**: Populate database with comprehensive test data

**Commands**:
```bash
# Full seed (all collections)
bun run db:seed

# Individual seeders
bun run seed:organizations
bun run seed:org-units
bun run seed:positions
bun run seed:identities
bun run seed:oauth
bun run seed:scim-clients
bun run seed:org-versions
bun run seed:sk-penempatan
bun run seed:employee-history
bun run seed:audit-logs
```

**Output**:
```
✨ Seeding completed successfully!

📊 Summary (UNIFIED IDENTITY MODEL):
   Organizations: 7 (including MASTER)
   Organizational Units: 57
   Positions: 50
   Identities (Total): 1500
     - Employees: 1400 (1300 active)
     - Partners: 80
     - External: 15
   OAuth Clients: 3 (test-client, ofm-client, hr-system)
   SCIM Clients: 3 (OFM, Google, Slack)
   Org Structure Versions: 3 (2023, 2024, 2025)
   SK Penempatan: 15 decrees (all workflow states)
   Employee History: 3000+ events
   Audit Logs: 5000+ entries (last 90 days)

🔑 Login credentials:
   Email: admin@ias.co.id
   NIK: IAS00001
   Password: password123
```

---

### 2. Database Clone (`bun run db:clone`)

**Purpose**: Copy entire database between environments

**Syntax**:
```bash
bun run db:clone <source> <target> [options]
```

**Options**:
- `--dry-run` - Preview without making changes
- `--clear-target` - Delete target collections first

**Examples**:

```bash
# Clone dev → uat (append mode)
bun run db:clone dev uat

# Clone dev → uat (replace mode)
bun run db:clone dev uat --clear-target

# Preview clone
bun run db:clone dev uat --dry-run

# Clone to test environment
bun run db:clone dev test --clear-target
```

**Features**:
- ✅ Preserves ObjectIds (maintains relationships)
- ✅ Collection-by-collection progress
- ✅ Skips transient collections
- ✅ Batch processing (1000 docs/batch)
- ✅ Performance metrics
- ⚡ **Speed**: ~3 minutes for 10,000+ documents

**Output**:
```
🔄 Database Clone Tool
   Source: aksara-sso-dev
   Target: aksara-sso-uat
   Mode: LIVE
   Clear target first: YES

✅ Connected to MongoDB Atlas

📋 Collections to clone: 12

📦 Cloning identities (1500 documents)...
   ✅ Completed: 1500/1500 (100%)

📦 Cloning sk_penempatan (15 documents)...
   ✅ Completed: 15/15 (100%)

🎉 Clone completed successfully!
   Total documents: 10,547
   Total time: 178.34s
   Speed: 59 docs/sec
```

---

### 3. Database Snapshot (`bun run db:snapshot`)

**Purpose**: Create point-in-time backups and restore them

**Commands**:

```bash
# Create snapshot
bun run db:snapshot create <database> <name> [description]

# Restore snapshot
bun run db:snapshot restore <snapshot-name> <target-database> [--clear-target]

# List all snapshots
bun run db:snapshot list
```

**Examples**:

```bash
# Before major refactoring
bun run db:snapshot create dev before-scim-refactor

# Before UAT deployment
bun run db:snapshot create dev pre-uat-deploy "Stable before UAT"

# Restore after bad deployment
bun run db:snapshot restore pre-uat-deploy uat --clear-target

# Save known-good state
bun run db:snapshot create uat working-state "All tests passing"

# List snapshots
bun run db:snapshot list
```

**Snapshot Storage**:
- Location: `.snapshots/` directory (git-ignored)
- Format: JSON with metadata
- Naming: `<name>_<date>_<timestamp>.json`

**Output**:
```
📸 Creating snapshot: before-scim-refactor_2025-10-21_1729512345

📋 Collections to snapshot: 12
   - identities
   - organizations
   - org_units
   ...

✅ Captured identities: 1500 documents
✅ Captured organizations: 7 documents

🎉 Snapshot created successfully!
   Path: .snapshots/before-scim-refactor_2025-10-21_1729512345.json
   Size: 23.45 MB
   Documents: 10,547
```

---

### 4. Database Statistics (`bun run db:stats`)

**Purpose**: Analyze database size and document counts

**Syntax**:
```bash
bun run db:stats <database> [--detailed]
bun run db:stats compare <database1> <database2>
```

**Examples**:

```bash
# Basic stats
bun run db:stats dev

# Detailed stats (with indexes, avg size)
bun run db:stats dev --detailed

# Compare two databases
bun run db:stats compare dev uat
```

**Output** (Basic):
```
📊 Database Statistics: aksara-sso-dev

📈 Summary:
   Total Documents: 10,547
   Total Data Size: 45.67 MB
   Storage Size: 52.34 MB
   Total Indexes: 42
   Collections: 12

📦 Collections (sorted by document count):

Collection              Count         Size
─────────────────────────────────────────
audit_logs              5,000    12.34 MB
employee_history        3,120     8.56 MB
identities              1,500     5.67 MB
org_units                  57   234.56 KB
positions                  50   187.23 KB
```

**Output** (Comparison):
```
🔍 Database Comparison

   Database 1: aksara-sso-dev
   Database 2: aksara-sso-uat

Collection              DB1 Count    DB2 Count    Difference
──────────────────────────────────────────────────────────────
identities                  1,500        1,500             0 ✅
audit_logs                  5,000        4,876          -124 🔴
sk_penempatan                  15           15             0 ✅
employee_history            3,120        3,120             0 ✅

📊 Summary:
   DB1 Total Documents: 10,547
   DB2 Total Documents: 10,423
   Difference: -124 🔴
```

---

### 5. Database Deep Compare (`bun run db:compare`)

**Purpose**: Document-level comparison between databases

**Syntax**:
```bash
bun run db:compare <database1> <database2> [options]
```

**Options**:
- `--sample <n>` - Only compare first N documents per collection
- `--details` - Show added/removed/modified documents

**Examples**:

```bash
# Quick comparison (counts only)
bun run db:compare dev uat

# Detailed comparison
bun run db:compare dev uat --details

# Sample comparison (faster)
bun run db:compare dev uat --sample 100

# Full detailed with sampling
bun run db:compare dev uat --sample 500 --details
```

**Output**:
```
🔍 Database Deep Comparison

   Database 1: aksara-sso-dev
   Database 2: aksara-sso-uat

📦 Comparing 12 collections...

✅ IDENTICAL identities
✅ IDENTICAL organizations
❌ DIFFERS audit_logs

📊 Comparison Summary:

Collection          DB1    DB2  Only DB1  Only DB2  Modified    Same
───────────────────────────────────────────────────────────────────
✅ identities      1500   1500         0         0         0    1500
✅ organizations      7      7         0         0         0       7
⚠️  audit_logs     5000   4876       124         0         0    4876

🎯 Final Result:
   ⚠️  Found 124 total differences
   Use --details flag to see specific changes
```

**Detailed Output** (with `--details`):
```
📝 Detailed Differences:

📦 audit_logs (124 differences):
   🔴 Removed in DB2: 124
      - 673f511fafc205f99615b61a0
      - 673f511fafc205f99615b61a1
      ... and 122 more

📦 identities (3 differences):
   🟡 Modified: 3
      Document: IAS00042
         email: old@ias.co.id → new@ias.co.id
         fullName: "John Doe" → "John Smith"
      ... and 2 more documents
```

---

## 🔄 Common Workflows

### Workflow 1: Fresh Development Setup

```bash
# 1. Seed development database
bun run db:seed

# 2. Verify seeding
bun run db:stats dev

# 3. Create snapshot for safety
bun run db:snapshot create dev fresh-seed "Initial seed completed"
```

---

### Workflow 2: Deploy to UAT

```bash
# 1. Create pre-deployment snapshot
bun run db:snapshot create uat pre-deploy-$(date +%Y%m%d)

# 2. Clone dev → uat
bun run db:clone dev uat --clear-target

# 3. Verify clone
bun run db:stats compare dev uat

# 4. Deep compare (optional)
bun run db:compare dev uat --sample 100
```

---

### Workflow 3: Rollback After Bad Deployment

```bash
# 1. List available snapshots
bun run db:snapshot list

# 2. Restore previous snapshot
bun run db:snapshot restore pre-deploy-20251021 uat --clear-target

# 3. Verify restoration
bun run db:stats uat
```

---

### Workflow 4: Investigate Data Discrepancies

```bash
# 1. Quick comparison
bun run db:stats compare dev uat

# 2. Deep comparison with details
bun run db:compare dev uat --details

# 3. Sample comparison for large databases
bun run db:compare dev uat --sample 500 --details
```

---

### Workflow 5: Reset Development Environment

```bash
# 1. Create backup snapshot
bun run db:snapshot create dev backup-before-reset

# 2. Re-seed database
bun run db:seed

# 3. Verify new data
bun run db:stats dev
```

---

## 📊 Data Volumes

### Production-Like Seed Data

| Collection | Count | Purpose |
|-----------|-------|---------|
| `identities` | 1,500 | Employees, partners, external users, service accounts |
| `organizations` | 7 | MASTER realm + 6 companies |
| `org_units` | 57 | Complete organizational hierarchy |
| `positions` | 50 | All job levels (executive → staff) |
| `org_structure_versions` | 5 | Historical versions (2020-2025) |
| `sk_penempatan` | 15 | All workflow states (draft → executed) |
| `oauth_clients` | 5 | test-client, ofm, hr-system, mobile, analytics |
| `scim_clients` | 3 | OFM, Google Workspace, Slack |
| `employee_history` | 3,000+ | Onboarding, mutations, transfers, offboarding |
| `audit_logs` | 5,000+ | Last 90 days of activity |

**Total Documents**: ~10,500+
**Total Size**: ~45-50 MB
**Seed Time**: ~2-3 minutes

---

### SK Penempatan Distribution

| Status | Count | Total Reassignments | Purpose |
|--------|-------|---------------------|---------|
| Executed | 5 | 650 | Completed historical decrees |
| Approved | 3 | 130 | Ready to execute |
| Pending Approval | 3 | 130 | Awaiting director sign-off |
| Draft | 2 | 45 | HR working on data |
| Cancelled | 2 | 50 | Business decision changed |
| **TOTAL** | **15** | **1,005** | Covers all workflow states |

---

### Identity Type Distribution

| Type | Count | Percentage | Description |
|------|-------|------------|-------------|
| Employee | 1,400 | 93.3% | Full-time, contract, outsource |
| Partner | 80 | 5.3% | Vendors, consultants, contractors |
| External | 15 | 1.0% | Temporary access users |
| Service Account | 5 | 0.3% | OAuth client credentials |
| **TOTAL** | **1,500** | **100%** | Complete identity coverage |

---

### Employee Status Distribution

| Status | Count | Percentage |
|--------|-------|------------|
| Active | 1,300 | 92.8% |
| Terminated | 100 | 7.2% |

---

### Audit Log Actions (Last 90 Days)

| Action | Percentage | Count |
|--------|------------|-------|
| `user_login` | 40% | 2,000 |
| `employee_update` | 15% | 750 |
| `oauth_token_generated` | 15% | 750 |
| `scim_user_sync` | 10% | 500 |
| `employee_create` | 10% | 500 |
| `sk_penempatan_create` | 5% | 250 |
| `sk_penempatan_approve` | 3% | 150 |
| `org_structure_update` | 2% | 100 |
| **TOTAL** | **100%** | **5,000** |

---

## ✅ Best Practices

### 1. Always Snapshot Before Major Changes

```bash
# Before SCIM refactoring
bun run db:snapshot create dev before-scim-refactor

# Before UAT deployment
bun run db:snapshot create dev pre-uat-$(date +%Y%m%d)
```

### 2. Verify Clone/Restore Operations

```bash
# After cloning
bun run db:stats compare dev uat

# After restoring
bun run db:compare dev uat --sample 100
```

### 3. Use Dry-Run First

```bash
# Preview clone operation
bun run db:clone dev uat --dry-run

# Then execute
bun run db:clone dev uat --clear-target
```

### 4. Regular Database Health Checks

```bash
# Weekly UAT check
bun run db:stats uat --detailed

# Compare with dev
bun run db:stats compare dev uat
```

### 5. Clean Up Old Snapshots

```bash
# List snapshots
bun run db:snapshot list

# Manually delete old snapshots from .snapshots/
rm .snapshots/old-snapshot-name_*.json
```

### 6. Use Clear-Target for Clean Deployments

```bash
# For UAT deployments, always use --clear-target
bun run db:clone dev uat --clear-target

# For snapshots too
bun run db:snapshot restore backup uat --clear-target
```

---

## 🚨 Troubleshooting

### Issue: Clone is Slow

**Solution**: Use sampling for verification instead of full clone
```bash
# Quick verification
bun run db:compare dev uat --sample 100
```

### Issue: Snapshot File Too Large

**Solution**: Snapshots include all data. For large databases:
1. Use selective seeding
2. Clone instead of snapshot
3. Compress snapshot files manually

### Issue: Collections Missing After Clone

**Solution**: Check included/excluded collections
```typescript
// src/lib/db/seeders/config.ts
export const CLONE_INCLUDED_COLLECTIONS = [
  'identities',
  'organizations',
  // ... add missing collection
];
```

### Issue: ObjectId Relationships Broken

**Solution**: Always use `--clear-target` to avoid ObjectId conflicts
```bash
bun run db:clone dev uat --clear-target
```

---

## 📚 Related Documentation

- [SCIM Implementation](./SCIM_IMPLEMENTATION.md)
- [Organization Structure Versioning](./ORG_STRUCTURE_VERSIONING.md)
- [Employee Lifecycle Management](./EMPLOYEE_MANAGEMENT.md)
- [Main README](../CLAUDE.md)

---

**Last Updated**: 2025-10-21
**Version**: 1.0.0
