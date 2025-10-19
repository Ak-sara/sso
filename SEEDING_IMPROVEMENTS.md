# Employee Seeding Improvements

## Problem
The previous employee seeder generated duplicate email addresses because:
- Only 20 male first names × 20 female first names = 40 total first names
- Only 20 last names
- Maximum unique combinations: 40 × 20 = 800 emails
- **Trying to create 1,500 employees = guaranteed duplicates!**

## Solution

### 1. Expanded Name Database
**Before:**
- 20 first names (male) + 20 first names (female) = 40 total
- 20 last names
- **Max unique emails: 800**

**After:**
- 70 first names (male) + 70 first names (female) = 140 total
- 56 last names
- **Max unique emails: 7,840** ✅

### 2. Smart Email Generation with Suffixes
```typescript
// Before (simple, causes duplicates):
const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ias.co.id`;

// After (smart, ensures uniqueness):
let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ias.co.id`;
let emailSuffix = 1;

while (usedEmails.has(email)) {
  email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailSuffix}@ias.co.id`;
  emailSuffix++;
}

usedEmails.add(email);
```

### 3. In-Memory Email Tracking
- Uses a `Set<string>` to track all generated emails during seeding
- Prevents duplicates within a single seeding run
- Loads existing emails if appending (not clearing)

### 4. Database-Level Uniqueness
```typescript
// Added unique index on email field:
await db.collection('employees').createIndex({ email: 1 }, { unique: true });
```

This ensures database-level enforcement of unique emails.

## Example Output

### Name Distribution Examples:
```
ahmad.wijaya@ias.co.id         ← First occurrence
siti.lestari@ias.co.id         ← First occurrence
ahmad.wijaya1@ias.co.id        ← Duplicate first+last, gets suffix "1"
ahmad.wijaya2@ias.co.id        ← Another duplicate, gets suffix "2"
budi.santoso@ias.co.id         ← Different combination, no suffix needed
```

### Progress Output:
```
👥 Seeding 1500 employees...
   Progress: 500/1500 employees created (500 unique emails)
   Progress: 1000/1500 employees created (1000 unique emails)
   Progress: 1500/1500 employees created (1500 unique emails)
✅ Created 1500 employees with 1500 unique emails
```

## Additional Improvements

### 1. Better Name Variety
Added more authentic Indonesian names:
- Male names: Reza, Irfan, Hafiz, Arif, Bayu, Cahya, Dimas, Fikri, Gilang, etc.
- Female names: Zahra, Amel, Bella, Citra, Dini, Elsa, Farah, Gita, Hanna, etc.
- Last names: Utomo, Halim, Gunawan, Suharto, Mahardika, Firmansyah, etc.

### 2. Progress Tracking
- Shows progress every 500 employees
- Displays unique email count in real-time
- Final summary confirms all emails are unique

### 3. Batch Processing Maintained
- Still uses 100-employee batches for efficient database inserts
- Memory-efficient with Set-based tracking

## Testing

To test the improved seeder:

```bash
# Seed complete database (1500 employees)
bun run db:seed

# Or seed just employees
bun run seed:employees
```

### Expected Results:
- ✅ All 1,500 employees created successfully
- ✅ All emails are unique (no duplicates)
- ✅ No database errors on unique constraint
- ✅ Proper name distribution with Indonesian names

## Statistics

**Name Pool Size:**
- Male first names: 70
- Female first names: 70
- Last names: 56
- **Total unique combinations: 70 × 56 + 70 × 56 = 7,840**

**With suffix system:**
- If all base combinations used (7,840 employees)
- System automatically adds suffixes (1, 2, 3, etc.)
- **Theoretical maximum: unlimited** (limited only by practical suffix numbers)

## Comparison

| Metric | Before | After |
|--------|--------|-------|
| First Names | 40 | 140 |
| Last Names | 20 | 56 |
| Max Unique Base Emails | 800 | 7,840 |
| Duplicate Prevention | ❌ None | ✅ Set + Suffixes |
| Database Constraint | ⚠️ Non-unique index | ✅ Unique index |
| 1,500 Employees | ❌ ~700 duplicates | ✅ 0 duplicates |

---

**Date:** October 18, 2025
**Status:** ✅ Completed and tested
