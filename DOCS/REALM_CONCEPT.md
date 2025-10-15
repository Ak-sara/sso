# Realm Concept in Aksara SSO

## What is a Realm?

In Keycloak, a **Realm** is a space where you manage objects, including users, applications, roles, and groups. A realm is a way to isolate users and applications from each other.

## How Aksara SSO Implements Realms

Aksara SSO uses **Organizations** as the realm concept. Each organization acts as an isolated realm with its own:

- **Users** - People who can authenticate
- **Employees** - Staff members with employment data
- **OAuth Clients** - Applications that can authenticate against this realm
- **Organizational Structure** - Hierarchy and positions
- **Partners** - External entities with access

## Key Differences from Keycloak

| Keycloak | Aksara SSO |
|----------|------------|
| Realm (abstract concept) | Organization (concrete entity) |
| Realm can have multiple clients | Organization can have multiple clients |
| Users belong to one realm | Users belong to one organization |
| Realms are completely isolated | Organizations can have parent-child relationships |

## Organization Types (Realm Types)

1. **Parent** - Main holding company (e.g., Injourney)
2. **Subsidiary** - Child company (e.g., IAS, TWC, ITDC)
3. **Branch** - Regional office

## Multi-Tenancy

Aksara SSO supports multi-tenancy through organizations:

```
Injourney (Parent Realm)
├── IAS (Subsidiary Realm)
│   ├── Users: admin@ias.co.id, staff@ias.co.id
│   ├── OAuth Clients: HR System, Payroll App
│   └── Employees: 150 people
├── TWC (Subsidiary Realm)
│   ├── Users: admin@twc.co.id
│   └── Employees: 80 people
└── ITDC (Subsidiary Realm)
    └── ...
```

## Realm Switching

Users can switch between realms (organizations) if they have access to multiple organizations. This is indicated by the realm badge in the header:

```
🌐 IAS Realm  ▼
```

## Current Realm Context

When working in the admin UI, you're always in a specific realm context. All operations (creating users, clients, etc.) are scoped to that realm/organization.

## API Endpoints per Realm

Each realm has its own OAuth endpoints:

```
# IAS Realm
/oauth/authorize?realm=IAS&client_id=...
/oauth/token (with realm context)
/oauth/userinfo (scoped to realm)

# TWC Realm
/oauth/authorize?realm=TWC&client_id=...
```

## Creating a New Realm

To create a new realm:

1. Go to **Realm Management** page
2. Click **Create New Realm**
3. Fill in:
   - Name (e.g., "PT New Company")
   - Code (e.g., "NEW")
   - Type (parent/subsidiary/branch)
   - Description
4. The new organization becomes a new realm

## Default Realm

The default realm is **IAS** (Injourney Aviation Service), which is pre-configured with:
- Sample users
- Sample employees
- Sample organizational structure
- OAuth clients for testing
