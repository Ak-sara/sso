# Aksara SSO E2E Tests

End-to-end tests for SCIM 2.0 API using Playwright.

## Setup

This is a **completely separate test project** that won't bloat your Docker image.

### 1. Install Dependencies

```bash
cd e2e
bun install
bunx playwright install
```

### 2. Configure Test Credentials

Edit `.env.test` with your SCIM client credentials:

```bash
SCIM_CLIENT_ID=scim-ba4ab5a03b58ff56
SCIM_CLIENT_SECRET=zM39gStrdh1ZNEOD6cCRmDkyLhV5JyzCCcfN/S6cJKs=
```

Get credentials from: http://localhost:5173/scim-clients

### 3. Start SSO Server

In another terminal:

```bash
cd ..
bun run dev
```

### 4. Run Tests

```bash
# Run all tests
bun test

# Run with UI (interactive)
bun test:ui

# Run in headed mode (see browser)
bun test:headed

# Debug mode
bun test:debug
```

## View Test Results

### HTML Report (Recommended)

After running tests:

```bash
bun run report
```

This opens a beautiful HTML report with:
- ✅ Test results summary
- ✅ Full request/response bodies
- ✅ Screenshots on failure
- ✅ Network traces
- ✅ Execution timeline

### Console Output

Tests also print to console:

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
```

## Test Coverage

### SCIM Groups API (`scim-groups.spec.ts`)

1. **OAuth 2.0 Authentication**
   - ✅ Client credentials grant
   - ✅ Token format validation
   - ✅ Scope verification

2. **List Groups**
   - ✅ GET /scim/v2/Groups
   - ✅ SCIM schema validation
   - ✅ Returns 57 org units from seed

3. **Hierarchical Structure**
   - ✅ x-orgUnit extension
   - ✅ Parent-child relationships
   - ✅ Unit types (directorate, division, department)
   - ✅ Levels (1-4)

4. **Pagination**
   - ✅ startIndex parameter
   - ✅ count parameter
   - ✅ Correct page results

5. **Group Members**
   - ✅ Members array populated
   - ✅ Member structure (value, $ref, type, display)

6. **Unit-Level Managers** (Unique Feature)
   - ✅ x-orgUnit.managerId present
   - ✅ Manager assignment verification

7. **Create Group**
   - ✅ POST /scim/v2/Groups
   - ✅ 201 Created status
   - ✅ Location header returned

8. **Security**
   - ✅ Rejects invalid tokens
   - ✅ Rejects missing tokens

## Project Structure

```
e2e/
├── package.json             # Separate dependencies (Playwright)
├── playwright.config.ts     # Playwright configuration
├── .env.test               # Test credentials
├── README.md               # This file
└── tests/
    ├── scim-groups.spec.ts # Groups endpoint tests
    ├── scim-users.spec.ts  # Users endpoint tests (TODO)
    └── scim-auth.spec.ts   # Authentication tests (TODO)
```

## Why Separate Project?

✅ **Zero Docker bloat** - Tests completely excluded from production image
✅ **Separate dependencies** - Playwright won't be installed in main project
✅ **Clean separation** - Tests isolated from production code
✅ **Can be versioned separately** - Or even in different repo

## CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install SSO dependencies
        run: bun install

      - name: Start SSO server
        run: bun run dev &

      - name: Install E2E dependencies
        run: cd e2e && bun install && bunx playwright install

      - name: Run E2E tests
        run: cd e2e && bun test

      - name: Upload report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

## Troubleshooting

### "Server not running"

Make sure SSO server is running on http://localhost:5173:

```bash
cd ..
bun run dev
```

### "Invalid credentials"

Update `.env.test` with valid SCIM client credentials from `/scim-clients`

### "No groups found"

Run seed data:

```bash
cd ..
bun run db:seed
```

## Next Steps

- [ ] Add SCIM Users endpoint tests
- [ ] Add SCIM Bulk operations tests
- [ ] Add SCIM filtering tests
- [ ] Add webhook tests
- [ ] Add performance tests

---

**Maintained by:** Aksara Team
**License:** MIT
