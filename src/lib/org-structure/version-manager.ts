import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { buildOrgStructureSnapshot } from './snapshot-builder';
import { generateOrgStructureMermaid } from '$lib/utils/mermaid-generator';

/**
 * Main API for version operations
 * Provides high-level functions for creating and querying versions
 */
export class VersionManager {
	/**
	 * Create new version with snapshot of current state
	 *
	 * @param organizationId - Organization ID
	 * @param versionName - Human-readable version name
	 * @param effectiveDate - When this structure becomes active
	 * @param notes - Optional notes about this version
	 * @returns Version ID
	 */
	async createVersion(
		organizationId: string,
		versionName: string,
		effectiveDate: Date,
		notes?: string
	): Promise<string> {
		const db = getDB();

		// Get latest version number
		const latestVersion = await db
			.collection('org_structure_versions')
			.find({ organizationId })
			.sort({ versionNumber: -1 })
			.limit(1)
			.toArray();

		const nextVersionNumber = latestVersion.length > 0 ? latestVersion[0].versionNumber + 1 : 1;

		console.log(`Creating version ${nextVersionNumber} for organization ${organizationId}`);

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

		console.log(`Version created with ID: ${result.insertedId.toString()}`);

		return result.insertedId.toString();
	}

	/**
	 * Get structure at specific version (uses snapshot)
	 *
	 * @param versionId - Version ID
	 * @returns Snapshot structure
	 */
	async getStructureAtVersion(versionId: string) {
		const db = getDB();
		const version = await db
			.collection('org_structure_versions')
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
	 *
	 * @param organizationId - Organization ID
	 * @returns Live org structure data
	 */
	async getCurrentStructure(organizationId: string) {
		const db = getDB();

		// Query live collections - fast for current operations
		const [orgUnits, positions, employees] = await Promise.all([
			db.collection('org_units')
				.find({ organizationId: new ObjectId(organizationId) })
				.toArray(),

			db.collection('positions')
				.find({ organizationId: new ObjectId(organizationId) })
				.toArray(),

			db.collection('identities')
				.find({ organizationId, identityType: 'employee' })
				.toArray()
		]);

		return { orgUnits, positions, employees };
	}

	/**
	 * Get active version for organization
	 *
	 * @param organizationId - Organization ID
	 * @returns Active version or null
	 */
	async getActiveVersion(organizationId: string) {
		const db = getDB();
		return await db
			.collection('org_structure_versions')
			.findOne({ organizationId, status: 'active' });
	}

	/**
	 * Get all versions for organization
	 *
	 * @param organizationId - Organization ID
	 * @returns Array of versions sorted by version number descending
	 */
	async getAllVersions(organizationId: string) {
		const db = getDB();
		return await db
			.collection('org_structure_versions')
			.find({ organizationId })
			.sort({ versionNumber: -1 })
			.toArray();
	}

	/**
	 * Get version by ID
	 *
	 * @param versionId - Version ID
	 * @returns Version document or null
	 */
	async getVersionById(versionId: string) {
		const db = getDB();
		return await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });
	}

	/**
	 * Update version metadata (draft versions only)
	 *
	 * @param versionId - Version ID
	 * @param updates - Fields to update
	 */
	async updateVersion(
		versionId: string,
		updates: {
			versionName?: string;
			effectiveDate?: Date;
			notes?: string;
			skNumber?: string;
			skDate?: Date;
			skSignedBy?: string;
		}
	) {
		const db = getDB();

		const version = await this.getVersionById(versionId);
		if (!version) {
			throw new Error('Version not found');
		}

		if (version.status !== 'draft') {
			throw new Error('Can only update draft versions');
		}

		await db.collection('org_structure_versions').updateOne(
			{ _id: new ObjectId(versionId) },
			{
				$set: {
					...updates,
					updatedAt: new Date()
				}
			}
		);
	}

	/**
	 * Delete version (draft versions only)
	 *
	 * @param versionId - Version ID
	 */
	async deleteVersion(versionId: string) {
		const db = getDB();

		const version = await this.getVersionById(versionId);
		if (!version) {
			throw new Error('Version not found');
		}

		if (version.status !== 'draft') {
			throw new Error('Can only delete draft versions');
		}

		await db.collection('org_structure_versions').deleteOne({
			_id: new ObjectId(versionId)
		});
	}

	/**
	 * Get organization structure at specific date
	 * Finds the version that was active at that date
	 *
	 * @param organizationId - Organization ID
	 * @param date - Date to query
	 * @returns Structure snapshot at that date
	 */
	async getStructureAtDate(organizationId: string, date: Date) {
		const db = getDB();

		const version = await db
			.collection('org_structure_versions')
			.findOne({
				organizationId,
				status: { $in: ['active', 'archived'] },
				effectiveDate: { $lte: date },
				$or: [{ endDate: null }, { endDate: { $gt: date } }]
			})
			.sort({ effectiveDate: -1 });

		if (!version) {
			throw new Error(`No organization structure found for ${organizationId} at ${date}`);
		}

		return version.structure;
	}
}

// Export singleton instance
export const versionManager = new VersionManager();
