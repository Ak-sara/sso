# Microsoft Entra ID Sync - Implementation Guide

## Overview

The Microsoft Entra ID (formerly Azure AD) sync feature allows Aksara SSO to synchronize employee data with Microsoft's cloud identity platform. This enables centralized identity management across both systems.

## ✅ What's Implemented

### 1. Database Schema (`src/lib/db/schemas.ts`)

**EntraIDConfig Schema:**
- Stores Microsoft Entra ID connection credentials (Tenant ID, Client ID, Client Secret)
- Manages sync configuration (sync users/groups, auto-sync settings)
- Stores field mapping configuration with direction support
- Tracks connection status and test results

**EntraIDSyncLog Schema:**
- Records all sync attempts with status tracking
- Stores success/failure counts
- Maintains error logs for troubleshooting

**Collection Names:**
- `entraid_configs` - Configuration per organization
- `entraid_sync_logs` - Sync history and logs

### 2. Microsoft Graph API Client (`src/lib/entraid/microsoft-graph.ts`)

**Functions:**
- `getMicrosoftGraphToken()` - OAuth 2.0 token acquisition
- `testEntraIDConnection()` - Connection validation
- `getEntraIDUsers()` - Fetch users from Entra ID
- `createEntraIDUser()` - Create new user in Entra ID
- `updateEntraIDUser()` - Update existing user
- `deleteEntraIDUser()` - Delete user from Entra ID
- `mapEmployeeToEntraUser()` - Field mapping utility

### 3. Server Actions (`src/routes/(app)/entraid-sync/+page.server.ts`)

**Available Actions:**
1. **`testConnection`** - Tests Microsoft Entra ID credentials
2. **`saveConfig`** - Saves configuration and auto-tests connection
3. **`updateFieldMapping`** - Updates field mapping configuration
4. **`syncNow`** - Triggers manual synchronization

**Load Function:**
- Loads existing configuration for the organization
- Masks the client secret for security
- Fetches recent sync history (last 10 syncs)

### 4. UI Implementation (`src/routes/(app)/entraid-sync/+page.svelte`)

**Features:**
- ✅ Reactive form with Svelte 5 runes
- ✅ Connection status badge (Connected/Failed/Not Connected)
- ✅ Test connection button with loading state
- ✅ Save configuration with validation
- ✅ Sync options (users/groups/auto-sync)
- ✅ Field mapping table with enable/disable toggles
- ✅ Direction selector (→ To Entra, ← From Entra, ↔ Bidirectional)
- ✅ Sync history table with status indicators
- ✅ Manual sync trigger button
- ✅ Success/error message display

## 📋 Field Mapping Configuration

### Default Mappings

| Aksara SSO Field | Entra ID Field      | Enabled | Direction   |
|------------------|---------------------|---------|-------------|
| email            | userPrincipalName   | ✅ Yes  | → To Entra  |
| firstName        | givenName           | ✅ Yes  | → To Entra  |
| lastName         | surname             | ✅ Yes  | → To Entra  |
| phone            | mobilePhone         | ❌ No   | → To Entra  |
| jobTitle         | jobTitle            | ❌ No   | → To Entra  |
| department       | department          | ❌ No   | → To Entra  |

### Direction Options:
- **`to_entra`** - One-way sync from Aksara SSO → Microsoft Entra ID
- **`from_entra`** - One-way sync from Microsoft Entra ID → Aksara SSO
- **`bidirectional`** - Two-way sync (updates both systems)

### Adding New Field Mappings

To add new field mappings:

1. **Update the default in server code:**
```typescript
// In +page.server.ts or schemas.ts
fieldMapping: {
  // ... existing mappings
  customField: {
    entraField: 'extension_customProperty',
    enabled: false,
    direction: 'to_entra'
  },
}
```

2. **Use the UI:**
   - Click "+ Add Field" button (feature coming soon)
   - Select Aksara field and Entra field
   - Choose sync direction
   - Enable/disable as needed

## 🔐 Security Considerations

### Current Implementation:
- ✅ Client secret is masked in UI (shows `••••••••••••`)
- ✅ HTTPS-only for Microsoft Graph API calls
- ✅ OAuth 2.0 client credentials flow
- ⚠️ Client secret stored in plaintext in database

### Production Recommendations:
1. **Encrypt client secrets** using encryption at rest
2. **Use Azure Key Vault** for credential storage
3. **Implement secret rotation** mechanism
4. **Add audit logging** for all sync operations
5. **Use managed identities** if running on Azure

## 🚀 How to Use

### Step 1: Get Microsoft Entra ID Credentials

1. Go to **Azure Portal** → **Microsoft Entra ID**
2. Create an **App Registration**:
   - Name: "Aksara SSO Sync"
   - Supported account types: Single tenant
3. Note the **Tenant ID** and **Application (client) ID**
4. Create a **Client Secret**:
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Copy the secret value (only shown once!)
5. Grant **API Permissions**:
   - Microsoft Graph API
   - Application permissions:
     - `User.ReadWrite.All` - Read/write all users
     - `Group.ReadWrite.All` - Read/write all groups (optional)
     - `Directory.ReadWrite.All` - Read/write directory data
   - **Important**: Admin must grant consent!

### Step 2: Configure in Aksara SSO

1. Navigate to **Entra ID Sync** page (`/entraid-sync`)
2. Enter your credentials:
   - Tenant ID
   - Client ID
   - Client Secret
3. Click **"Test Connection"** to verify
4. Configure sync options:
   - ✅ Sync Users to Entra ID
   - Sync Groups (optional)
   - Auto Sync (hourly)
5. Click **"Save Configuration"**

### Step 3: Configure Field Mapping

1. Review the default field mappings
2. Enable/disable fields as needed
3. Change sync direction if needed
4. Click **"Save Field Mapping"**

### Step 4: Run Manual Sync

1. Click **"Sync Now"** button
2. Check **Sync History** table for results
3. Review any errors in the log

## 📊 Sync Status Indicators

| Status      | Color  | Meaning                          |
|-------------|--------|----------------------------------|
| Connected   | 🟢 Green | Successfully connected to Entra ID |
| Failed      | 🟡 Yellow | Config exists but connection failed |
| Not Connected | 🔴 Red | No configuration saved yet |

### Sync Log Statuses:
- **pending** - Sync queued
- **running** - Sync in progress
- **completed** - ✅ Sync successful
- **failed** - ❌ Sync failed (check errors)

## 🔧 Troubleshooting

### Connection Test Fails

**Error: "Failed to get token"**
- ✅ Check Tenant ID is correct
- ✅ Check Client ID is correct
- ✅ Check Client Secret hasn't expired
- ✅ Verify app registration is not disabled

**Error: "Graph API failed: 403"**
- ✅ Grant admin consent for API permissions
- ✅ Ensure required permissions are added
- ✅ Wait a few minutes after granting consent

### Sync Fails

**Error: "User not found"**
- Check employee email format matches Entra ID UPN format
- Verify domain is correct

**Error: "Insufficient privileges"**
- Grant `User.ReadWrite.All` permission
- Ensure admin consent is granted

### Field Mapping Issues

**Field not syncing:**
1. Check if field is **enabled** in mapping table
2. Verify sync direction is correct
3. Check if Entra ID field name is correct
4. Some fields require specific permissions

## 🎯 Implementation Roadmap

> **Note**: For detailed implementation plan and timeline, see `_DEV_GUIDE.md` → Phase 2: Integration → Microsoft Entra ID Sync Backend

## 📚 API Reference

### Microsoft Graph API Endpoints Used:

```
GET  https://graph.microsoft.com/v1.0/organization
GET  https://graph.microsoft.com/v1.0/users?$top=999
POST https://graph.microsoft.com/v1.0/users
PATCH https://graph.microsoft.com/v1.0/users/{id}
DELETE https://graph.microsoft.com/v1.0/users/{id}
```

### OAuth Token Endpoint:
```
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
```

## 🔗 Related Documentation

- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/api/overview)
- [Azure AD App Registration Guide](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [OAuth 2.0 Client Credentials Flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)

---

**Last Updated:** October 18, 2025
**Status:** ✅ UI and Configuration Complete, Sync Logic Pending
**Version:** 1.0
