# Organization Structure Versioning System - Complete Redesign Plan

**Created:** 2025-10-29
**Status:** Planning Phase
**Estimated Timeline:** 3 weeks

---

## Executive Summary

This document outlines a comprehensive redesign of the organization structure versioning system to properly support:
- **Snapshot-based versioning** for complete historical records
- **Live reference queries** for current operations (onboarding/offboarding)
- **Idempotent publishing** without MongoDB transactions
- **Data correction utilities** for fixing mistakes
- **Clean separation** between historical snapshots and current operational data

---

## Key Architecture Principles

### 1. Snapshots = Historical Records Only
- Created **only when version is published**
- Contains **full denormalized data** (names, codes, complete employee info)
- **Read-only** after creation - never updated
- Used for historical queries like "show org structure on 2024-01-01"

### 2. Current Operations = Live References
- Onboarding, offboarding, transfers use **live collections** (org_units, positions, identities)
- Uses **ObjectId references** - normalized, fast writes
- Queries current state directly from collections
- No snapshot dependency for daily operations

### 3. Simplified Workflow
- **Draft** → **Publish** (no approval gates - SK document = already approved)
- Publish = snapshot current state + activate version + update identities
- Version corrections update **embedded snapshot data only**, not live data

### 4. No MongoDB Transactions Required
- Idempotent operations that can be safely retried
- Progress tracking for resumable publishes
- Compensating logic for error recovery
- Works with standalone MongoDB instances

---

## Current System Issues

### Critical Bugs Found
1. **Date parsing missing** in `resolveIdentityReferences()` - causes `toISOString()` errors
2. **Empty strings vs null** - CSV parser stores `""` instead of proper nulls
3. **joinDate mutability** - Should be immutable but can be edited
4. **Missing date columns** in identities.csv seed data

### Design Gaps
1. **No employee snapshot** in versions - only stores orgUnits and positions
2. **No transaction support** - partial failures leave system inconsistent
3. **Collection name mismatch** - Code references `employees` but should use `identities`
4. **No rollback mechanism** - Can't undo mistaken version activations
5. **SK Penempatan execution missing** - CSV import works but no execute endpoint

### Data Integrity Issues
1. **Orphaned references** - Deleted units don't cascade to employees
2. **No circular reference checks** - Can create infinite loops in hierarchy
3. **History ObjectId mismatch** - Should use NIK string, not identity _id
4. **No validation** before version activation

---

## Part 1: Schema Changes

### 1.1 Update OrgStructureVersionSchema

**File:** `src/lib/db/schemas.ts` (lines 221-302)

**Add employee snapshot:**
```typescript
export const OrgStructureVersionSchema = z.object({
  _id: z.custom<ObjectId>().optional(),
  versionNumber: z.number(),
  versionName: z.string(),
  organizationId: z.string(),
  effectiveDate: z.date(),
  endDate: z.date().optional(),

  // SIMPLIFIED: Remove 'pending_approval' status
  status: z.enum(['draft', 'active', 'archived']).default('draft'),

  // Snapshot of the structure at this version
  structure: z.object({
    // Existing: orgUnits and positions
    orgUnits: z.array(z.object({
      _id: z.string(),
      code: z.string(),
      name: z.string(),
      parentId: z.string().optional(),
      type: z.string(),
      level: z.number(),
      sortOrder: z.number(),
      headEmployeeId: z.string().optional(),
    })),

    positions: z.array(z.object({
      _id: z.string(),
      code: z.string(),
      name: z.string(),
      level: z.string(),
      grade: z.string(),
      reportingToPositionId: z.string().optional(),
    })),

    // NEW: Full employee snapshot (denormalized)
    employees: z.array(z.object({
      // Identity reference
      identityId: z.string(), // MongoDB _id
      employeeId: z.string(), // NIK

      // Personal info (denormalized for history)
      fullName: z.string(),
      email: z.string().optional(),

      // Assignment at snapshot time (denormalized)
      orgUnitId: z.string(),
      orgUnitCode: z.string(),
      orgUnitName: z.string(),
      positionId: z.string(),
      positionCode: z.string(),
      positionName: z.string(),

      // Manager (denormalized)
      managerId: z.string().optional(),
      managerName: z.string().optional(),

      // Employment details
      employmentType: z.string(),
      employmentStatus: z.string(),
      workLocation: z.string().optional(),
      joinDate: z.date(),

      // Snapshot metadata
      snapshotDate: z.date()
    })),

    // Metadata
    snapshotCreatedAt: z.date()
  }),

  // Changes from previous version
  changes: z.array(z.object({
    type: z.enum(['unit_added', 'unit_removed', 'unit_renamed', 'unit_moved',
                  'unit_merged', 'position_added', 'position_removed', 'position_changed']),
    entityType: z.enum(['org_unit', 'position']),
    entityId: z.string(),
    entityName: z.string(),
    oldValue: z.any().optional(),
    newValue: z.any().optional(),
    description: z.string(),
  })).default([]),

  // SK Information
  skNumber: z.string().optional(),
  skDate: z.date().optional(),
  skSignedBy: z.string().optional(),
  skAttachments: z.array(z.object({
    filename: z.string(),
    fileUrl: z.string(),
    fileType: z.string(),
    uploadedAt: z.date(),
  })).default([]),

  // Employee Reassignments
  reassignments: z.array(z.object({
    employeeId: z.string(),
    employeeName: z.string(),
    oldOrgUnitId: z.string().optional(),
    oldOrgUnitName: z.string().optional(),
    oldPositionId: z.string().optional(),
    oldPositionName: z.string().optional(),
    newOrgUnitId: z.string().optional(),
    newOrgUnitName: z.string().optional(),
    newPositionId: z.string().optional(),
    newPositionName: z.string().optional(),
    effectiveDate: z.date(),
    reason: z.string().optional(),
  })).default([]),

  // NEW: Publish progress tracking (for idempotency)
  publishStatus: z.enum(['not_started', 'in_progress', 'completed', 'failed']).optional(),
  publishProgress: z.object({
    startedAt: z.date().optional(),
    completedAt: z.date().optional(),
    steps: z.array(z.object({
      name: z.string(), // 'archive_old', 'activate_new', 'update_identities', 'create_history'
      status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
      completedAt: z.date().optional(),
      error: z.string().optional()
    })),
    totalIdentitiesUpdated: z.number().default(0),
    totalHistoryEntriesCreated: z.number().default(0)
  }).optional(),

  // Mermaid diagram
  mermaidDiagram: z.string().optional(),

  // Metadata
  createdBy: z.string(),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
```

### 1.2 EmployeeHistorySchema (Create if Not Exists)

**File:** `src/lib/db/schemas.ts`

```typescript
export const EmployeeHistorySchema = z.object({
  _id: z.custom<ObjectId>().optional(),

  // References
  identityId: z.custom<ObjectId>(), // MongoDB _id of identity
  employeeId: z.string(),            // NIK for quick lookup

  // Event details
  eventType: z.enum(['onboarding', 'mutation', 'transfer', 'promotion',
                     'demotion', 'offboarding', 'org_restructure']),
  eventDate: z.date(),

  // Previous state (before event)
  previousOrgUnitId: z.custom<ObjectId>().optional(),
  previousPositionId: z.custom<ObjectId>().optional(),
  previousWorkLocation: z.string().optional(),

  // New state (after event)
  newOrgUnitId: z.custom<ObjectId>().optional(),
  newPositionId: z.custom<ObjectId>().optional(),
  newWorkLocation: z.string().optional(),

  // Context
  reason: z.string().optional(),
  notes: z.string().optional(),

  // Links to org structure version (if applicable)
  versionId: z.string().optional(),
  versionNumber: z.number().optional(),
  skNumber: z.string().optional(),

  // Metadata
  createdAt: z.date().default(() => new Date()),
  createdBy: z.string()
});

export type EmployeeHistory = z.infer<typeof EmployeeHistorySchema>;
```

---

## Part 2: Utility Library Implementation

### Directory Structure

```
src/lib/org-structure/
├── types.ts                   # TypeScript interfaces
├── snapshot-builder.ts        # Build denormalized snapshots
├── version-manager.ts         # Main API for version operations
├── publisher.ts               # Idempotent publish with progress tracking
├── corrector.ts               # Data correction utilities
├── query-helper.ts            # Historical queries
└── validator.ts               # Pre-publish validation
```

### 2.1 snapshot-builder.ts

```typescript
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import type { SnapshotOrgUnit, SnapshotPosition, SnapshotEmployee } from './types';

/**
 * Build full denormalized snapshot of current org structure
 * Called ONLY when creating/publishing a new version
 */
export async function buildOrgStructureSnapshot(
  organizationId: string
): Promise<{
  orgUnits: SnapshotOrgUnit[],
  positions: SnapshotPosition[],
  employees: SnapshotEmployee[],
  snapshotCreatedAt: Date
}> {
  const db = getDB();
  const now = new Date();

  // Query live collections
  const orgUnits = await db.collection('org_units')
    .find({ organizationId: new ObjectId(organizationId) })
    .toArray();

  const positions = await db.collection('positions')
    .find({ organizationId: new ObjectId(organizationId) })
    .toArray();

  const identities = await db.collection('identities')
    .find({
      organizationId,
      identityType: 'employee',
      employmentStatus: { $in: ['active', 'probation'] }
    })
    .toArray();

  // Denormalize org units
  const snapshotOrgUnits: SnapshotOrgUnit[] = orgUnits.map(u => ({
    _id: u._id.toString(),
    code: u.code,
    name: u.name,
    parentId: u.parentId?.toString(),
    type: u.type,
    level: u.level || 0,
    sortOrder: u.sortOrder || 0,
    headEmployeeId: u.managerId?.toString()
  }));

  // Denormalize positions
  const snapshotPositions: SnapshotPosition[] = positions.map(p => ({
    _id: p._id.toString(),
    code: p.code,
    name: p.name,
    level: p.level,
    grade: p.grade || '',
    reportingToPositionId: null // TODO: Add this field to Position schema
  }));

  // Denormalize employees with resolved references
  const snapshotEmployees: SnapshotEmployee[] = await Promise.all(
    identities.map(async (identity) => {
      const orgUnit = orgUnits.find(u =>
        identity.orgUnitId && u._id.equals(new ObjectId(identity.orgUnitId))
      );

      const position = positions.find(p =>
        identity.positionId && p._id.equals(new ObjectId(identity.positionId))
      );

      const manager = identity.managerId
        ? await db.collection('identities').findOne({
            _id: new ObjectId(identity.managerId)
          })
        : null;

      return {
        identityId: identity._id.toString(),
        employeeId: identity.employeeId || '',
        fullName: identity.fullName,
        email: identity.email,
        orgUnitId: identity.orgUnitId?.toString() || '',
        orgUnitCode: orgUnit?.code || '',
        orgUnitName: orgUnit?.name || '',
        positionId: identity.positionId?.toString() || '',
        positionCode: position?.code || '',
        positionName: position?.name || '',
        managerId: identity.managerId?.toString(),
        managerName: manager?.fullName,
        employmentType: identity.employmentType || 'permanent',
        employmentStatus: identity.employmentStatus || 'active',
        workLocation: identity.workLocation,
        joinDate: identity.joinDate || now,
        snapshotDate: now
      };
    })
  );

  return {
    orgUnits: snapshotOrgUnits,
    positions: snapshotPositions,
    employees: snapshotEmployees,
    snapshotCreatedAt: now
  };
}

/**
 * Build employee-only snapshot (for partial updates)
 */
export async function buildEmployeeSnapshot(
  organizationId: string
): Promise<SnapshotEmployee[]> {
  const snapshot = await buildOrgStructureSnapshot(organizationId);
  return snapshot.employees;
}
```

### 2.2 version-manager.ts

```typescript
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { buildOrgStructureSnapshot } from './snapshot-builder';
import { generateOrgStructureMermaid } from '$lib/utils/mermaid-generator';

/**
 * Main API for version operations
 */
export class VersionManager {
  /**
   * Create new version with snapshot of current state
   */
  async createVersion(
    organizationId: string,
    versionName: string,
    effectiveDate: Date,
    notes?: string
  ): Promise<string> {
    const db = getDB();

    // Get latest version number
    const latestVersion = await db.collection('org_structure_versions')
      .find({ organizationId })
      .sort({ versionNumber: -1 })
      .limit(1)
      .toArray();

    const nextVersionNumber = latestVersion.length > 0
      ? latestVersion[0].versionNumber + 1
      : 1;

    // Build snapshot of current state
    const structure = await buildOrgStructureSnapshot(organizationId);

    // Generate Mermaid diagram
    const mermaidDiagram = generateOrgStructureMermaid({
      structure,
      versionNumber: nextVersionNumber
    } as any);

    // Create version document
    const version = {
      versionNumber: nextVersionNumber,
      versionName,
      organizationId,
      effectiveDate,
      status: 'draft',
      structure,
      changes: [],
      reassignments: [],
      skAttachments: [],
      mermaidDiagram,
      publishStatus: 'not_started',
      notes,
      createdBy: 'system', // TODO: Get from session
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('org_structure_versions').insertOne(version);

    return result.insertedId.toString();
  }

  /**
   * Get structure at specific version (uses snapshot)
   */
  async getStructureAtVersion(versionId: string) {
    const db = getDB();
    const version = await db.collection('org_structure_versions')
      .findOne({ _id: new ObjectId(versionId) });

    if (!version) {
      throw new Error('Version not found');
    }

    // Return snapshot - no live queries needed
    return version.structure;
  }

  /**
   * Get current/active structure (uses live references)
   * Used for day-to-day operations like onboarding
   */
  async getCurrentStructure(organizationId: string) {
    const db = getDB();

    // Query live collections - fast for current operations
    const orgUnits = await db.collection('org_units')
      .find({ organizationId: new ObjectId(organizationId) })
      .toArray();

    const positions = await db.collection('positions')
      .find({ organizationId: new ObjectId(organizationId) })
      .toArray();

    const employees = await db.collection('identities')
      .find({ organizationId, identityType: 'employee' })
      .toArray();

    return { orgUnits, positions, employees };
  }

  /**
   * Get active version for organization
   */
  async getActiveVersion(organizationId: string) {
    const db = getDB();
    return await db.collection('org_structure_versions')
      .findOne({ organizationId, status: 'active' });
  }
}

export const versionManager = new VersionManager();
```

### 2.3 publisher.ts

```typescript
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';

export interface PublishResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Idempotent publish operations (no MongoDB transactions)
 */
export class VersionPublisher {
  /**
   * Publish version - idempotent and resumable
   */
  async publishVersion(versionId: string): Promise<PublishResult> {
    const db = getDB();

    const version = await db.collection('org_structure_versions')
      .findOne({ _id: new ObjectId(versionId) });

    if (!version) {
      return { success: false, error: 'Version not found' };
    }

    if (version.status === 'active') {
      return { success: true, message: 'Version already active' };
    }

    // Initialize progress tracking
    await this.initializeProgress(versionId);

    try {
      // Step 1: Archive old active versions (idempotent)
      await this.archiveOldVersions(version.organizationId, versionId);
      await this.markStepComplete(versionId, 'archive_old');

      // Step 2: Activate new version (idempotent)
      await this.activateVersion(versionId);
      await this.markStepComplete(versionId, 'activate_new');

      // Step 3: Update identities (idempotent - check before update)
      if (version.reassignments && version.reassignments.length > 0) {
        await this.applyReassignments(versionId, version.reassignments);
        await this.markStepComplete(versionId, 'update_identities');
      }

      // Step 4: Create history entries (idempotent - check duplicates)
      if (version.reassignments && version.reassignments.length > 0) {
        await this.createHistoryEntries(versionId, version);
        await this.markStepComplete(versionId, 'create_history');
      }

      // Mark complete
      await db.collection('org_structure_versions').updateOne(
        { _id: new ObjectId(versionId) },
        {
          $set: {
            publishStatus: 'completed',
            'publishProgress.completedAt': new Date()
          }
        }
      );

      return { success: true, message: 'Version published successfully' };

    } catch (error: any) {
      await this.markFailed(versionId, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume failed publish from last checkpoint
   */
  async resumePublish(versionId: string): Promise<PublishResult> {
    const db = getDB();
    const version = await db.collection('org_structure_versions')
      .findOne({ _id: new ObjectId(versionId) });

    if (!version?.publishProgress) {
      return { success: false, error: 'No publish progress found' };
    }

    if (version.publishStatus === 'completed') {
      return { success: true, message: 'Version already published' };
    }

    // Simply retry the full publish - idempotency ensures no duplicates
    return await this.publishVersion(versionId);
  }

  private async initializeProgress(versionId: string) {
    const db = getDB();
    await db.collection('org_structure_versions').updateOne(
      { _id: new ObjectId(versionId) },
      {
        $set: {
          publishStatus: 'in_progress',
          publishProgress: {
            startedAt: new Date(),
            steps: [
              { name: 'archive_old', status: 'pending' },
              { name: 'activate_new', status: 'pending' },
              { name: 'update_identities', status: 'pending' },
              { name: 'create_history', status: 'pending' }
            ],
            totalIdentitiesUpdated: 0,
            totalHistoryEntriesCreated: 0
          }
        }
      }
    );
  }

  private async archiveOldVersions(organizationId: string, currentVersionId: string) {
    const db = getDB();

    // Idempotent: only update if status is currently 'active'
    await db.collection('org_structure_versions').updateMany(
      {
        organizationId,
        status: 'active',
        _id: { $ne: new ObjectId(currentVersionId) }
      },
      {
        $set: {
          status: 'archived',
          endDate: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  private async activateVersion(versionId: string) {
    const db = getDB();

    // Idempotent: only update if not already active
    await db.collection('org_structure_versions').updateOne(
      {
        _id: new ObjectId(versionId),
        status: { $ne: 'active' }
      },
      {
        $set: {
          status: 'active',
          approvedBy: 'system', // TODO: Get from session
          approvedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  private async applyReassignments(versionId: string, reassignments: any[]) {
    const db = getDB();
    let updated = 0;

    for (const r of reassignments) {
      // Find identity by employeeId (NIK)
      const identity = await db.collection('identities')
        .findOne({ employeeId: r.employeeId, identityType: 'employee' });

      if (!identity) {
        console.warn(`Identity not found for employeeId: ${r.employeeId}`);
        continue;
      }

      // Idempotent check: only update if not already updated
      const needsUpdate =
        identity.orgUnitId?.toString() !== r.newOrgUnitId ||
        identity.positionId?.toString() !== r.newPositionId;

      if (needsUpdate) {
        await db.collection('identities').updateOne(
          { _id: identity._id },
          {
            $set: {
              orgUnitId: r.newOrgUnitId ? new ObjectId(r.newOrgUnitId) : null,
              positionId: r.newPositionId ? new ObjectId(r.newPositionId) : null,
              updatedAt: new Date()
            }
          }
        );
        updated++;
      }
    }

    await db.collection('org_structure_versions').updateOne(
      { _id: new ObjectId(versionId) },
      { $set: { 'publishProgress.totalIdentitiesUpdated': updated } }
    );
  }

  private async createHistoryEntries(versionId: string, version: any) {
    const db = getDB();
    let created = 0;

    for (const r of version.reassignments) {
      // Idempotent check: verify history entry doesn't already exist
      const existing = await db.collection('employee_history').findOne({
        employeeId: r.employeeId,
        eventType: 'org_restructure',
        'details.versionId': versionId
      });

      if (!existing) {
        await db.collection('employee_history').insertOne({
          employeeId: r.employeeId,
          eventType: 'org_restructure',
          eventDate: version.effectiveDate,
          previousOrgUnitId: r.oldOrgUnitId ? new ObjectId(r.oldOrgUnitId) : null,
          previousPositionId: r.oldPositionId ? new ObjectId(r.oldPositionId) : null,
          newOrgUnitId: r.newOrgUnitId ? new ObjectId(r.newOrgUnitId) : null,
          newPositionId: r.newPositionId ? new ObjectId(r.newPositionId) : null,
          reason: r.reason,
          details: {
            versionId,
            versionNumber: version.versionNumber,
            skNumber: version.skNumber
          },
          createdAt: new Date(),
          createdBy: 'system'
        });
        created++;
      }
    }

    await db.collection('org_structure_versions').updateOne(
      { _id: new ObjectId(versionId) },
      { $set: { 'publishProgress.totalHistoryEntriesCreated': created } }
    );
  }

  private async markStepComplete(versionId: string, stepName: string) {
    const db = getDB();
    await db.collection('org_structure_versions').updateOne(
      {
        _id: new ObjectId(versionId),
        'publishProgress.steps.name': stepName
      },
      {
        $set: {
          'publishProgress.steps.$.status': 'completed',
          'publishProgress.steps.$.completedAt': new Date()
        }
      }
    );
  }

  private async markFailed(versionId: string, error: string) {
    const db = getDB();
    await db.collection('org_structure_versions').updateOne(
      { _id: new ObjectId(versionId) },
      {
        $set: {
          publishStatus: 'failed',
          'publishProgress.error': error
        }
      }
    );
  }
}

export const versionPublisher = new VersionPublisher();
```

### 2.4 corrector.ts

```typescript
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';

/**
 * Data correction utilities for embedded snapshot data
 */
export class VersionCorrector {
  /**
   * Correct employee data in version snapshot
   * Does NOT affect live identity data
   */
  async correctEmployeeInSnapshot(
    versionId: string,
    employeeId: string,
    corrections: {
      fullName?: string;
      orgUnitName?: string;
      positionName?: string;
      [key: string]: any;
    }
  ) {
    const db = getDB();

    const version = await db.collection('org_structure_versions')
      .findOne({ _id: new ObjectId(versionId) });

    if (!version) {
      throw new Error('Version not found');
    }

    // Find employee in snapshot
    const employeeIndex = version.structure.employees
      .findIndex((e: any) => e.employeeId === employeeId);

    if (employeeIndex === -1) {
      throw new Error(`Employee ${employeeId} not found in snapshot`);
    }

    // Update embedded document
    const updateFields: any = {};
    for (const [key, value] of Object.entries(corrections)) {
      updateFields[`structure.employees.${employeeIndex}.${key}`] = value;
    }
    updateFields.updatedAt = new Date();

    await db.collection('org_structure_versions').updateOne(
      { _id: new ObjectId(versionId) },
      { $set: updateFields }
    );

    // Log correction
    await this.logCorrection(versionId, 'employee', employeeId, corrections);
  }

  /**
   * Sync org unit changes to both snapshot and live collection
   */
  async syncOrgUnitChanges(
    versionId: string,
    orgUnitId: string,
    updates: { name?: string; code?: string; parentId?: string }
  ) {
    const db = getDB();

    // 1. Update in version snapshot
    await db.collection('org_structure_versions').updateOne(
      {
        _id: new ObjectId(versionId),
        'structure.orgUnits._id': orgUnitId
      },
      {
        $set: {
          'structure.orgUnits.$': updates,
          updatedAt: new Date()
        }
      }
    );

    // 2. Update live collection (affects current operations)
    await db.collection('org_units').updateOne(
      { _id: new ObjectId(orgUnitId) },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    // 3. Update employees in snapshot that reference this unit
    if (updates.name) {
      const version = await db.collection('org_structure_versions')
        .findOne({ _id: new ObjectId(versionId) });

      if (version) {
        const updatedEmployees = version.structure.employees.map((emp: any) => {
          if (emp.orgUnitId === orgUnitId) {
            return { ...emp, orgUnitName: updates.name };
          }
          return emp;
        });

        await db.collection('org_structure_versions').updateOne(
          { _id: new ObjectId(versionId) },
          { $set: { 'structure.employees': updatedEmployees } }
        );
      }
    }

    await this.logCorrection(versionId, 'org_unit', orgUnitId, updates);
  }

  /**
   * Detect inconsistencies between snapshot and live data
   */
  async detectInconsistencies(versionId: string) {
    const db = getDB();

    const version = await db.collection('org_structure_versions')
      .findOne({ _id: new ObjectId(versionId) });

    if (!version) {
      throw new Error('Version not found');
    }

    const issues = [];

    // Check for employees with invalid org unit references
    for (const emp of version.structure.employees) {
      const unitExists = version.structure.orgUnits
        .some((u: any) => u._id === emp.orgUnitId);

      if (!unitExists && emp.orgUnitId) {
        issues.push({
          type: 'missing_org_unit',
          employeeId: emp.employeeId,
          orgUnitId: emp.orgUnitId
        });
      }

      const positionExists = version.structure.positions
        .some((p: any) => p._id === emp.positionId);

      if (!positionExists && emp.positionId) {
        issues.push({
          type: 'missing_position',
          employeeId: emp.employeeId,
          positionId: emp.positionId
        });
      }
    }

    // Check for circular references in org units
    const visited = new Set();
    for (const unit of version.structure.orgUnits) {
      if (this.hasCircularReference(unit._id, version.structure.orgUnits, visited)) {
        issues.push({
          type: 'circular_reference',
          orgUnitId: unit._id,
          orgUnitName: unit.name
        });
      }
    }

    return issues;
  }

  private hasCircularReference(unitId: string, allUnits: any[], visited: Set<string>): boolean {
    if (visited.has(unitId)) {
      return true; // Circular reference detected
    }

    visited.add(unitId);
    const unit = allUnits.find(u => u._id === unitId);

    if (unit?.parentId) {
      return this.hasCircularReference(unit.parentId, allUnits, visited);
    }

    return false;
  }

  private async logCorrection(
    versionId: string,
    entityType: string,
    entityId: string,
    corrections: any
  ) {
    const db = getDB();

    await db.collection('audit_logs').insertOne({
      action: 'version_correction',
      versionId,
      entityType,
      entityId,
      corrections,
      timestamp: new Date(),
      performedBy: 'system' // TODO: Get from session
    });
  }
}

export const versionCorrector = new VersionCorrector();
```

### 2.5 query-helper.ts

```typescript
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';

/**
 * Historical query utilities
 */
export class QueryHelper {
  /**
   * Get organization structure at specific date
   * Finds the active version at that date
   */
  async getOrgStructureAt(organizationId: string, date: Date) {
    const db = getDB();

    const version = await db.collection('org_structure_versions')
      .findOne({
        organizationId,
        status: { $in: ['active', 'archived'] },
        effectiveDate: { $lte: date },
        $or: [
          { endDate: null },
          { endDate: { $gt: date } }
        ]
      })
      .sort({ effectiveDate: -1 });

    if (!version) {
      throw new Error(`No organization structure found for ${organizationId} at ${date}`);
    }

    return version.structure;
  }

  /**
   * Get employee's assignment at specific date
   */
  async getEmployeeAssignmentAt(employeeId: string, date: Date) {
    const db = getDB();

    // Find versions that include this employee
    const versions = await db.collection('org_structure_versions')
      .find({
        'structure.employees.employeeId': employeeId,
        effectiveDate: { $lte: date }
      })
      .sort({ effectiveDate: -1 })
      .limit(1)
      .toArray();

    if (versions.length === 0) {
      throw new Error(`No assignment history found for employee ${employeeId} at ${date}`);
    }

    const employee = versions[0].structure.employees
      .find((e: any) => e.employeeId === employeeId);

    return employee;
  }

  /**
   * Get all employees in org unit at specific version
   */
  async getOrgUnitMembersAt(orgUnitId: string, versionId: string) {
    const db = getDB();

    const version = await db.collection('org_structure_versions')
      .findOne({ _id: new ObjectId(versionId) });

    if (!version) {
      throw new Error('Version not found');
    }

    return version.structure.employees
      .filter((e: any) => e.orgUnitId === orgUnitId);
  }

  /**
   * Track employee's time in specific org unit
   */
  async getEmployeeTimelineInUnit(employeeId: string, orgUnitId: string) {
    const db = getDB();

    // Get all versions where employee was in this unit
    const versions = await db.collection('org_structure_versions')
      .find({
        'structure.employees': {
          $elemMatch: {
            employeeId,
            orgUnitId
          }
        }
      })
      .sort({ effectiveDate: 1 })
      .toArray();

    return versions.map(v => ({
      versionNumber: v.versionNumber,
      versionName: v.versionName,
      effectiveDate: v.effectiveDate,
      endDate: v.endDate,
      employee: v.structure.employees.find((e: any) => e.employeeId === employeeId)
    }));
  }

  /**
   * Compare two versions to see changes
   */
  async compareVersions(versionId1: string, versionId2: string) {
    const db = getDB();

    const [v1, v2] = await Promise.all([
      db.collection('org_structure_versions').findOne({ _id: new ObjectId(versionId1) }),
      db.collection('org_structure_versions').findOne({ _id: new ObjectId(versionId2) })
    ]);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    return {
      orgUnitsAdded: this.findAdded(v1.structure.orgUnits, v2.structure.orgUnits),
      orgUnitsRemoved: this.findRemoved(v1.structure.orgUnits, v2.structure.orgUnits),
      employeesAdded: this.findAdded(v1.structure.employees, v2.structure.employees, 'employeeId'),
      employeesRemoved: this.findRemoved(v1.structure.employees, v2.structure.employees, 'employeeId'),
      employeesMoved: this.findMoved(v1.structure.employees, v2.structure.employees)
    };
  }

  private findAdded(oldList: any[], newList: any[], idField = '_id') {
    const oldIds = new Set(oldList.map(item => item[idField]));
    return newList.filter(item => !oldIds.has(item[idField]));
  }

  private findRemoved(oldList: any[], newList: any[], idField = '_id') {
    const newIds = new Set(newList.map(item => item[idField]));
    return oldList.filter(item => !newIds.has(item[idField]));
  }

  private findMoved(oldEmployees: any[], newEmployees: any[]) {
    const moved = [];

    for (const oldEmp of oldEmployees) {
      const newEmp = newEmployees.find(e => e.employeeId === oldEmp.employeeId);

      if (newEmp && (
        oldEmp.orgUnitId !== newEmp.orgUnitId ||
        oldEmp.positionId !== newEmp.positionId
      )) {
        moved.push({
          employeeId: oldEmp.employeeId,
          employeeName: oldEmp.fullName,
          from: {
            orgUnitName: oldEmp.orgUnitName,
            positionName: oldEmp.positionName
          },
          to: {
            orgUnitName: newEmp.orgUnitName,
            positionName: newEmp.positionName
          }
        });
      }
    }

    return moved;
  }
}

export const queryHelper = new QueryHelper();
```

---

## Part 3: On/Offboarding Workflows

### 3.1 Onboarding Uses Live References

```typescript
// File: src/lib/workflows/onboarding.ts

import { getDB } from '$lib/db/connection';
import { identityRepository } from '$lib/db/identity-repository';
import { ObjectId } from 'mongodb';

export async function onboardEmployee(data: {
  nik: string;
  fullName: string;
  email?: string;
  organizationId: string;
  orgUnitId: string;          // Current live org unit
  positionId: string;          // Current live position
  employmentType: string;
  joinDate: Date;
  workLocation?: string;
}) {
  const db = getDB();

  // 1. Create identity with live references
  const identity = await identityRepository.create({
    identityType: 'employee',
    username: data.nik,
    employeeId: data.nik,
    email: data.email,
    password: 'temp-password', // Should be hashed
    firstName: data.fullName.split(' ')[0],
    lastName: data.fullName.split(' ').slice(1).join(' '),
    fullName: data.fullName,
    organizationId: data.organizationId,     // Current org
    orgUnitId: data.orgUnitId,               // Live reference
    positionId: data.positionId,             // Live reference
    employmentStatus: 'probation',
    employmentType: data.employmentType as any,
    joinDate: data.joinDate,                 // IMMUTABLE - set once
    workLocation: data.workLocation,
    isActive: true,
    roles: ['user'],
    secondaryAssignments: [],
    customProperties: {}
  });

  // 2. Create history entry
  await db.collection('employee_history').insertOne({
    identityId: identity._id,
    employeeId: data.nik,
    eventType: 'onboarding',
    eventDate: data.joinDate,
    newOrgUnitId: new ObjectId(data.orgUnitId),
    newPositionId: new ObjectId(data.positionId),
    newWorkLocation: data.workLocation,
    details: {
      notes: 'New employee onboarded'
    },
    createdAt: new Date(),
    createdBy: 'system'
  });

  // 3. No snapshot update needed
  // Next version snapshot will automatically include this employee

  return identity;
}
```

### 3.2 Offboarding

```typescript
export async function offboardEmployee(identityId: string, data: {
  lastWorkingDay: Date;
  reason: string;
  notes?: string;
  revokeSSO: boolean;
}) {
  const db = getDB();
  const identity = await identityRepository.findById(identityId);

  if (!identity) {
    throw new Error('Identity not found');
  }

  // 1. Update identity status (live data)
  await identityRepository.updateById(identityId, {
    employmentStatus: 'terminated',
    endDate: data.lastWorkingDay,
    isActive: !data.revokeSSO // Keep SSO if needed for exit procedures
  });

  // 2. Create history entry
  await db.collection('employee_history').insertOne({
    identityId: new ObjectId(identityId),
    employeeId: identity.employeeId!,
    eventType: 'offboarding',
    eventDate: data.lastWorkingDay,
    previousOrgUnitId: identity.orgUnitId ? new ObjectId(identity.orgUnitId) : null,
    previousPositionId: identity.positionId ? new ObjectId(identity.positionId) : null,
    details: {
      reason: data.reason,
      notes: data.notes,
      ssoRevoked: data.revokeSSO
    },
    createdAt: new Date(),
    createdBy: 'system'
  });

  // 3. Future version snapshots will show employee as terminated
}
```

### 3.3 Mutation/Transfer

```typescript
export async function transferEmployee(identityId: string, data: {
  newOrgUnitId: string;
  newPositionId: string;
  newWorkLocation?: string;
  effectiveDate: Date;
  reason: string;
  transferType: 'transfer' | 'promotion' | 'demotion';
}) {
  const db = getDB();
  const identity = await identityRepository.findById(identityId);

  if (!identity) {
    throw new Error('Identity not found');
  }

  // 1. Create history entry BEFORE updating (capture old values)
  await db.collection('employee_history').insertOne({
    identityId: new ObjectId(identityId),
    employeeId: identity.employeeId!,
    eventType: data.transferType,
    eventDate: data.effectiveDate,
    previousOrgUnitId: identity.orgUnitId ? new ObjectId(identity.orgUnitId) : null,
    previousPositionId: identity.positionId ? new ObjectId(identity.positionId) : null,
    previousWorkLocation: identity.workLocation,
    newOrgUnitId: new ObjectId(data.newOrgUnitId),
    newPositionId: new ObjectId(data.newPositionId),
    newWorkLocation: data.newWorkLocation,
    reason: data.reason,
    createdAt: new Date(),
    createdBy: 'system'
  });

  // 2. Update identity (live reference)
  await identityRepository.updateById(identityId, {
    orgUnitId: data.newOrgUnitId,
    positionId: data.newPositionId,
    workLocation: data.newWorkLocation
    // ❌ NOT joinDate - that never changes!
  });
}
```

---

## Part 4: Route Updates

### 4.1 Org Structure List Page

**File:** `src/routes/(app)/org-structure/+page.server.ts`

```typescript
import { versionManager } from '$lib/org-structure/version-manager';

export const actions = {
  create: async ({ request }) => {
    const formData = await request.formData();
    const versionName = formData.get('versionName') as string;
    const effectiveDate = formData.get('effectiveDate') as string;
    const notes = formData.get('notes') as string;

    if (!versionName || !effectiveDate) {
      return fail(400, { error: 'Version name and effective date are required' });
    }

    try {
      // Get organization (IAS for now)
      const db = getDB();
      const organization = await db.collection('organizations').findOne({ code: 'IAS' });
      if (!organization) {
        return fail(404, { error: 'Organization not found' });
      }

      // Use VersionManager to create version with snapshot
      const versionId = await versionManager.createVersion(
        organization._id.toString(),
        versionName,
        new Date(effectiveDate),
        notes
      );

      throw redirect(303, `/org-structure/${versionId}`);
    } catch (error) {
      console.error('Create version error:', error);
      if (error instanceof Response) throw error;
      return fail(500, { error: 'Failed to create version' });
    }
  }
};
```

### 4.2 Version Detail Page

**File:** `src/routes/(app)/org-structure/[id]/+page.server.ts`

```typescript
import { versionPublisher } from '$lib/org-structure/publisher';
import { versionCorrector } from '$lib/org-structure/corrector';

export const actions = {
  // REMOVE: submitApproval
  // REMOVE: approve

  // ADD: Simple publish action
  publish: async ({ params }) => {
    try {
      const result = await versionPublisher.publishVersion(params.id);

      if (!result.success) {
        return fail(500, { error: result.error });
      }

      return { success: true, message: result.message };
    } catch (error: any) {
      return fail(500, { error: error.message });
    }
  },

  // ADD: Resume failed publish
  resumePublish: async ({ params }) => {
    try {
      const result = await versionPublisher.resumePublish(params.id);

      if (!result.success) {
        return fail(500, { error: result.error });
      }

      return { success: true, message: result.message };
    } catch (error: any) {
      return fail(500, { error: error.message });
    }
  },

  // Keep: updateSK
  updateSK: async ({ request, params }) => {
    // ... existing code ...
  },

  // Keep: createSKPenempatan
  createSKPenempatan: async ({ params, request }) => {
    // ... existing code ...
  },

  // ADD: Correct snapshot data
  correctEmployee: async ({ request, params }) => {
    const formData = await request.formData();
    const employeeId = formData.get('employeeId') as string;
    const corrections = JSON.parse(formData.get('corrections') as string);

    try {
      await versionCorrector.correctEmployeeInSnapshot(
        params.id,
        employeeId,
        corrections
      );

      return { success: true };
    } catch (error: any) {
      return fail(500, { error: error.message });
    }
  }
};
```

---

## Part 5: Implementation Timeline

### Week 1: Critical Fixes + Schema Updates

**Day 1-2: Critical Bug Fixes** ✅ (This session)
- Fix date parsing in reference-resolver.ts
- Fix date rendering in identities/+page.svelte
- Fix joinDate immutability in employee edit
- Update identities.csv with date columns

**Day 3-4: Schema Updates**
- Add employee snapshot to OrgStructureVersionSchema
- Add publishStatus and publishProgress fields
- Remove 'pending_approval' status
- Create EmployeeHistorySchema

**Day 5: Testing**
- Test schema changes with existing data
- Create migration script for existing versions
- Run data validation

### Week 2: Core Library Implementation

**Day 1-2: Snapshot Builder**
- Implement snapshot-builder.ts
- Test with real organizational data
- Verify denormalization is complete

**Day 3-4: Publisher**
- Implement publisher.ts with idempotency
- Add progress tracking
- Test resume functionality
- Handle edge cases

**Day 5: Version Manager + Corrector**
- Implement version-manager.ts
- Implement corrector.ts
- Add validation logic

### Week 3: Routes, UI, and Migration

**Day 1-2: Route Updates**
- Update org-structure routes
- Remove approval workflow code
- Add publish and resume actions
- Test workflows end-to-end

**Day 3-4: UI Enhancements**
- Add publish progress indicator
- Create correction UI
- Add validation warnings
- Improve error messages

**Day 5: Migration & Deployment**
- Migrate existing versions to new schema
- Run data quality checks
- Deploy to staging
- User acceptance testing

---

## Testing Strategy

### Unit Tests
- Snapshot builder with various org structures
- Publisher idempotency (retry same publish)
- Corrector validation logic
- Query helper date ranges

### Integration Tests
- Full publish workflow (draft → active)
- Resume after failure
- On/offboarding during active version
- Historical queries across multiple versions

### Edge Cases
- Empty organizations (no employees)
- Orphaned employees (unit deleted)
- Circular org unit references
- Concurrent version activations
- Failed publish recovery

---

## Rollback Strategy

Since MongoDB transactions are not available, rollback is achieved through **compensating actions**:

### If Publish Fails Mid-Way:
1. Check `publishProgress` to see which steps completed
2. **Reverse completed steps:**
   - If identities were updated → revert to previous assignment
   - If history entries created → mark as reverted (don't delete)
   - If version activated → revert to draft status
3. **Or:** Create new compensating version that restores previous state

### Prevention is Better:
- Validate before publish (check for orphaned references, circular deps)
- Show preview of changes before confirming
- Add confirmation dialog with impact summary

---

## Success Metrics

### Technical
- ✅ All date fields render correctly
- ✅ Snapshots capture 100% of employee data
- ✅ Publish succeeds on first try >95% of time
- ✅ Failed publishes can resume without data loss
- ✅ Historical queries return data <500ms

### Business
- ✅ Can answer "Who worked in IT Division on 2024-01-01?"
- ✅ Can generate reports comparing Q1 vs Q2 structure
- ✅ Onboarding doesn't require snapshot updates
- ✅ Corrections don't affect live operations
- ✅ Complete audit trail of all changes

---

## Future Enhancements

### Phase 2 (After 3-Week Implementation)
1. **Notification system** - Email employees when structure changes
2. **SCIM sync** - Auto-update connected apps after publish
3. **Approval workflow** - Multi-step approvals if needed
4. **Version comparison UI** - Visual diff between versions
5. **Batch operations** - Bulk employee transfers
6. **Scheduled publish** - Auto-activate at specific date/time

### Phase 3 (Long-term)
1. **Version branching** - Create "what-if" scenarios
2. **Rollback to version** - True rollback (if transactions available)
3. **Export/import** - Transfer structures between environments
4. **API endpoints** - External access to historical data
5. **ML insights** - Detect patterns in org changes

---

## Questions & Clarifications

### Q: When is snapshot created?
**A:** When version is published (status: draft → active), OR when explicitly requested via "Create Snapshot" button.

### Q: Can we edit a published version?
**A:** No. Published versions are immutable. Use corrector utilities to fix embedded snapshot data only.

### Q: What happens if employee is onboarded during publish?
**A:** Onboarding uses live references, so no conflict. Next version will include new employee.

### Q: How do we handle deleted org units?
**A:** Validation before publish checks for employees in units to be deleted. Must reassign first.

### Q: Can we have multiple active versions?
**A:** No. System ensures only one version per organization is active at a time.

---

## Conclusion

This redesign provides:
- ✅ **Complete historical records** via denormalized snapshots
- ✅ **Fast current operations** via live references
- ✅ **Robust publishing** via idempotent operations
- ✅ **Data correction tools** for fixing mistakes
- ✅ **No transaction dependency** - works with any MongoDB setup
- ✅ **Clear separation** between history and current state

**Next Step:** Execute Phase 1 (Critical Fixes) - see session plan.

**Document Status:** APPROVED - Ready for implementation
**Last Updated:** 2025-10-29
