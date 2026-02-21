import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import type { PublishResult } from './types';

/**
 * Idempotent publish operations (no MongoDB transactions required)
 * Each step checks if already completed before executing
 * Can safely retry entire publish process
 */
export class VersionPublisher {
	/**
	 * Publish version - idempotent and resumable
	 * Activates version and applies all reassignments
	 *
	 * @param versionId - Version ID to publish
	 * @returns Publish result with success/error
	 */
	async publishVersion(versionId: string): Promise<PublishResult> {
		const db = getDB();

		console.log(`Publishing version: ${versionId}`);

		const version = await db
			.collection('org_structure_versions')
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

			console.log(`Version ${versionId} published successfully`);

			return { success: true, message: 'Version published successfully' };
		} catch (error: any) {
			console.error('Publish error:', error);
			await this.markFailed(versionId, error.message);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Resume failed publish from last checkpoint
	 * Simply retries the full publish - idempotency ensures no duplicates
	 *
	 * @param versionId - Version ID to resume
	 * @returns Publish result
	 */
	async resumePublish(versionId: string): Promise<PublishResult> {
		const db = getDB();
		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version?.publishProgress) {
			return { success: false, error: 'No publish progress found' };
		}

		if (version.publishStatus === 'completed') {
			return { success: true, message: 'Version already published' };
		}

		console.log(`Resuming publish for version: ${versionId}`);

		// Simply retry the full publish - idempotency ensures safety
		return await this.publishVersion(versionId);
	}

	/**
	 * Initialize progress tracking
	 * Sets up the progress object with all steps
	 */
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

	/**
	 * Archive old active versions
	 * Idempotent: only updates if status is currently 'active'
	 */
	private async archiveOldVersions(organizationId: string, currentVersionId: string) {
		const db = getDB();

		console.log(`Archiving old versions for org: ${organizationId}`);

		const result = await db.collection('org_structure_versions').updateMany(
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

		console.log(`Archived ${result.modifiedCount} old versions`);
	}

	/**
	 * Activate version
	 * Idempotent: only updates if not already active
	 */
	private async activateVersion(versionId: string) {
		const db = getDB();

		console.log(`Activating version: ${versionId}`);

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

	/**
	 * Apply reassignments to identities collection
	 * Idempotent: checks if update needed before applying
	 */
	private async applyReassignments(versionId: string, reassignments: any[]) {
		const db = getDB();
		let updated = 0;

		console.log(`Applying ${reassignments.length} reassignments`);

		for (const r of reassignments) {
			try {
				// Find identity by employeeId (NIK)
				const identity = await db.collection('identities').findOne({
					employeeId: r.employeeId,
					identityType: 'employee'
				});

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
			} catch (error) {
				console.error(`Error applying reassignment for ${r.employeeId}:`, error);
				// Continue with next reassignment
			}
		}

		console.log(`Updated ${updated} identities`);

		await db.collection('org_structure_versions').updateOne(
			{ _id: new ObjectId(versionId) },
			{ $set: { 'publishProgress.totalIdentitiesUpdated': updated } }
		);
	}

	/**
	 * Create history entries for all reassignments
	 * Idempotent: checks for existing entries before creating
	 */
	private async createHistoryEntries(versionId: string, version: any) {
		const db = getDB();
		let created = 0;

		console.log(`Creating history entries for ${version.reassignments.length} reassignments`);

		for (const r of version.reassignments) {
			try {
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
							skNumber: version.skNumber,
							previousOrgUnitName: r.oldOrgUnitName,
							previousPositionName: r.oldPositionName,
							newOrgUnitName: r.newOrgUnitName,
							newPositionName: r.newPositionName
						},
						createdAt: new Date(),
						createdBy: 'system'
					});
					created++;
				}
			} catch (error) {
				console.error(`Error creating history for ${r.employeeId}:`, error);
				// Continue with next entry
			}
		}

		console.log(`Created ${created} history entries`);

		await db.collection('org_structure_versions').updateOne(
			{ _id: new ObjectId(versionId) },
			{ $set: { 'publishProgress.totalHistoryEntriesCreated': created } }
		);
	}

	/**
	 * Mark a step as complete
	 */
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

	/**
	 * Mark publish as failed
	 */
	private async markFailed(versionId: string, errorMessage: string) {
		const db = getDB();
		await db.collection('org_structure_versions').updateOne(
			{ _id: new ObjectId(versionId) },
			{
				$set: {
					publishStatus: 'failed',
					'publishProgress.error': errorMessage
				}
			}
		);
	}

	/**
	 * Get publish status
	 * Returns current progress for UI display
	 */
	async getPublishStatus(versionId: string) {
		const db = getDB();
		const version = await db
			.collection('org_structure_versions')
			.findOne({ _id: new ObjectId(versionId) });

		if (!version) {
			return null;
		}

		return {
			status: version.publishStatus,
			progress: version.publishProgress
		};
	}
}

// Export singleton instance
export const versionPublisher = new VersionPublisher();
