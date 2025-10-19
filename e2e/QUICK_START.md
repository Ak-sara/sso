# Quick Start Guide

## 1. Install (One Time)

```bash
cd e2e
bun install
bunx playwright install
```

## 2. Start SSO Server

```bash
# In terminal 1
cd ..
bun run dev
```

## 3. Run Tests

```bash
# In terminal 2
cd e2e
bun test
```

## 4. View HTML Report

```bash
bun run report
```

**That's it!** 🎉

---

## What You'll See

### Console Output:
```
✅ OAuth token obtained: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
📊 Total Groups: 57
📄 Returned: 57
✅ Sample Group: IAS - Finance Division
🌳 Sample Hierarchical Group:
   Name: IAS - Finance Division
   Type: division
   Level: 3
   Parent: 507f1f77bcf86cd799439003

Running 11 tests using 1 worker

 ✓ SCIM Groups API > should authenticate with OAuth 2.0 client credentials (1.2s)
 ✓ SCIM Groups API > should list all groups (organizational units) (0.8s)
 ✓ SCIM Groups API > should return group with correct SCIM schema (0.7s)
 ✓ SCIM Groups API > should return hierarchical org unit structure (0.6s)
 ✓ SCIM Groups API > should support pagination (1.1s)
 ✓ SCIM Groups API > should include group members (0.5s)
 ✓ SCIM Groups API > should have unit-level managers (0.5s)
 ✓ SCIM Groups API > should reject invalid OAuth token (0.3s)
 ✓ SCIM Groups API > should reject missing OAuth token (0.3s)
 ✓ SCIM Groups API > should create new group (organizational unit) (0.9s)

 11 passed (7.9s)

To open last HTML report run:
  bunx playwright show-report
```

### HTML Report Features:
- ✅ Interactive test results
- ✅ Full request/response JSON
- ✅ Network traces
- ✅ Screenshots on failure
- ✅ Execution timeline
- ✅ Filterable results

---

## Credentials Already Configured

Your credentials are in `.env.test`:
```bash
SCIM_CLIENT_ID=scim-ba4ab5a03b58ff56
SCIM_CLIENT_SECRET=zM39gStrdh1ZNEOD6cCRmDkyLhV5JyzCCcfN/S6cJKs=
```

If they don't work, create new ones at: http://localhost:5173/scim-clients
