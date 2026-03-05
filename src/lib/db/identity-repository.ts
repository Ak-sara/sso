import { getDB } from './connection';
import type { Identity } from './schemas';
import { ObjectId } from 'mongodb';
import { verify } from '@node-rs/argon2';
import type { PaginationParams, PaginationResult } from '$lib/utils/pagination';
import { getPaginationOffset, createPaginationResult, getMongoSort, buildSearchQuery } from '$lib/utils/pagination';

/**
 * Identity Repository
 *
 * Unified repository for all identity types (employees, partners, external users, service accounts)
 * Replaces UserRepository, EmployeeRepository, and PartnerRepository
 */
export class IdentityRepository {
	get collection() {
		return getDB().collection<Identity>('identities');
	}

	// ============== Basic CRUD ==============

	async create(identity: Omit<Identity, '_id'>): Promise<Identity> {
		const result = await this.collection.insertOne(identity as Identity);
		return { ...identity, _id: result.insertedId } as Identity;
	}

	async findById(id: string): Promise<Identity | null> {
		try {
			return await this.collection.findOne({ _id: new ObjectId(id) });
		} catch {
			return null;
		}
	}

	async findByEmail(email: string): Promise<Identity | null> {
		return await this.collection.findOne({ email });
	}

	async findByUsername(username: string): Promise<Identity | null> {
		return await this.collection.findOne({ username });
	}

	async findByEmployeeId(employeeId: string): Promise<Identity | null> {
		return await this.collection.findOne({
			employeeId,
			identityType: 'employee'
		});
	}

	/**
	 * Find identity by email OR NIK (employeeId)
	 * Useful for login (users can login with email or NIK)
	 */
	async findByEmailOrNIK(identifier: string): Promise<Identity | null> {
		return await this.collection.findOne({
			$or: [
				{ email: identifier },
				{ username: identifier },
				{ employeeId: identifier, identityType: 'employee' }
			]
		});
	}

	async findAll(filter: Partial<Identity> = {}): Promise<Identity[]> {
		return await this.collection.find(filter).toArray();
	}

	async updateById(id: string, updates: Partial<Identity>): Promise<Identity | null> {
		const result = await this.collection.findOneAndUpdate(
			{ _id: new ObjectId(id) },
			{
				$set: {
					...updates,
					updatedAt: new Date()
				}
			},
			{ returnDocument: 'after' }
		);
		return result;
	}

	async deleteById(id: string): Promise<boolean> {
		const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
		return result.deletedCount > 0;
	}

	// ============== Authentication ==============

	async verifyPassword(identity: Identity, password: string): Promise<boolean> {
		return await verify(identity.password, password);
	}

	async updateLastLogin(identityId: string): Promise<void> {
		await this.collection.updateOne(
			{ _id: new ObjectId(identityId) },
			{ $set: { lastLogin: new Date() } }
		);
	}

	async updatePassword(identityId: string, hashedPassword: string): Promise<void> {
		await this.collection.updateOne(
			{ _id: new ObjectId(identityId) },
			{ $set: { password: hashedPassword, updatedAt: new Date() } }
		);
	}

	// ============== Query by Identity Type ==============

	async findEmployees(filter: Partial<Identity> = {}): Promise<Identity[]> {
		return await this.collection.find({
			...filter,
			identityType: 'employee'
		}).toArray();
	}

	async findPartners(filter: Partial<Identity> = {}): Promise<Identity[]> {
		return await this.collection.find({
			...filter,
			identityType: 'partner'
		}).toArray();
	}

	async findExternal(filter: Partial<Identity> = {}): Promise<Identity[]> {
		return await this.collection.find({
			...filter,
			identityType: 'external'
		}).toArray();
	}

	async findServiceAccounts(filter: Partial<Identity> = {}): Promise<Identity[]> {
		return await this.collection.find({
			...filter,
			identityType: 'service_account'
		}).toArray();
	}

	// ============== Pagination ==============

	async listPaginated(
		params: PaginationParams,
		filter: Partial<Identity> = {}
	): Promise<PaginationResult<Identity>> {
		const { page, pageSize, sortKey, sortDirection, search } = params;

		// Build search query
		const searchQuery = search
			? buildSearchQuery(search, ['email', 'username', 'firstName', 'lastName', 'fullName', 'employeeId'])
			: {};

		const query = { ...filter, ...searchQuery };
		const offset = getPaginationOffset(page, pageSize);
		const sort = getMongoSort(sortKey, sortDirection);

		const [items, total] = await Promise.all([
			this.collection.find(query).sort(sort).skip(offset).limit(pageSize).toArray(),
			this.collection.countDocuments(query)
		]);

		return createPaginationResult(items, total, page, pageSize);
	}

	// ============== Employee-specific Queries ==============

	async findByOrgUnit(orgUnitId: string): Promise<Identity[]> {
		return await this.collection.find({
			orgUnitId,
			identityType: 'employee'
		}).toArray();
	}

	async findByManager(managerId: string): Promise<Identity[]> {
		return await this.collection.find({
			managerId,
			identityType: 'employee'
		}).toArray();
	}

	async findActiveEmployees(organizationId: string): Promise<Identity[]> {
		return await this.collection.find({
			organizationId,
			identityType: 'employee',
			isActive: true,
			employmentStatus: { $in: ['active', 'probation'] }
		}).toArray();
	}

	async findInactiveEmployees(organizationId: string): Promise<Identity[]> {
		return await this.collection.find({
			organizationId,
			identityType: 'employee',
			$or: [
				{ isActive: false },
				{ employmentStatus: { $in: ['terminated', 'resigned'] } }
			]
		}).toArray();
	}

	async findEmployeesWithoutEmail(organizationId: string): Promise<Identity[]> {
		return await this.collection.find({
			organizationId,
			identityType: 'employee',
			$or: [
				{ email: { $exists: false } },
				{ email: null },
				{ email: '' }
			]
		}).toArray();
	}

	// ============== Import/Sync Helpers ==============

	/**
	 * Bulk upsert identities
	 * Used for CSV import and Entra ID sync
	 *
	 * @param identities - Array of identity data to upsert
	 * @param preserveFields - Fields to preserve on update (e.g., ['isActive', 'password'])
	 * @returns Object with created and updated counts
	 */
	async bulkUpsert(
		identities: Omit<Identity, '_id'>[],
		preserveFields: string[] = ['isActive', 'password', 'employmentStatus']
	): Promise<{ created: number; updated: number; errors: Array<{ identity: any; error: string }> }> {
		const results = {
			created: 0,
			updated: 0,
			errors: [] as Array<{ identity: any; error: string }>
		};

		for (const identity of identities) {
			try {
				// Find existing identity by employeeId (for employees) or email
				const existingQuery = identity.identityType === 'employee' && identity.employeeId
					? { employeeId: identity.employeeId, identityType: 'employee' }
					: { email: identity.email };

				const existing = await this.collection.findOne(existingQuery);

				if (existing) {
					// UPDATE: Preserve specified fields
					const updates: any = { ...identity };

					for (const field of preserveFields) {
						if (field in existing) {
							delete updates[field];
						}
					}

					await this.updateById(existing._id.toString(), updates);
					results.updated++;
				} else {
					// CREATE: Insert new identity
					await this.create(identity);
					results.created++;
				}
			} catch (error: any) {
				results.errors.push({
					identity,
					error: error.message || 'Unknown error'
				});
			}
		}

		return results;
	}

	/**
	 * Check for conflicts before importing
	 * Returns array of conflicts found
	 */
	async checkImportConflicts(identities: Omit<Identity, '_id'>[]): Promise<Array<{
		type: 'duplicate_email' | 'duplicate_nik' | 'invalid_org_unit' | 'invalid_position';
		identity: any;
		message: string;
	}>> {
		const conflicts: Array<{ type: any; identity: any; message: string }> = [];

		// Check for duplicate emails within the import batch
		const emailMap = new Map<string, number>();
		const nikMap = new Map<string, number>();

		for (const identity of identities) {
			if (identity.email) {
				emailMap.set(identity.email, (emailMap.get(identity.email) || 0) + 1);
			}
			if (identity.identityType === 'employee' && identity.employeeId) {
				nikMap.set(identity.employeeId, (nikMap.get(identity.employeeId) || 0) + 1);
			}
		}

		// Report duplicates
		for (const identity of identities) {
			if (identity.email && emailMap.get(identity.email)! > 1) {
				conflicts.push({
					type: 'duplicate_email',
					identity,
					message: `Duplicate email in import: ${identity.email}`
				});
			}
			if (identity.identityType === 'employee' && identity.employeeId && nikMap.get(identity.employeeId)! > 1) {
				conflicts.push({
					type: 'duplicate_nik',
					identity,
					message: `Duplicate NIK in import: ${identity.employeeId}`
				});
			}
		}

		return conflicts;
	}

	// ============== Statistics ==============

	async getStats(organizationId: string): Promise<{
		total: number;
		employees: number;
		partners: number;
		external: number;
		active: number;
		inactive: number;
	}> {
		const [total, employees, partners, external, active, inactive] = await Promise.all([
			this.collection.countDocuments({ organizationId }),
			this.collection.countDocuments({ organizationId, identityType: 'employee' }),
			this.collection.countDocuments({ organizationId, identityType: 'partner' }),
			this.collection.countDocuments({ organizationId, identityType: 'external' }),
			this.collection.countDocuments({ organizationId, isActive: true }),
			this.collection.countDocuments({ organizationId, isActive: false })
		]);

		return { total, employees, partners, external, active, inactive };
	}

	// ============== Migration Helpers ==============

	/**
	 * Migrate old User, Employee, and Partner collections to unified Identity collection
	 * This is run once during the migration process
	 */
	async migrateFromLegacyCollections(): Promise<{
		usersMigrated: number;
		employeesMigrated: number;
		partnersMigrated: number;
		errors: string[];
	}> {
		const db = getDB();
		const results = {
			usersMigrated: 0,
			employeesMigrated: 0,
			partnersMigrated: 0,
			errors: [] as string[]
		};

		try {
			// Migrate Users → Identities
			const users = await db.collection('users').find().toArray();
			for (const user of users) {
				try {
					await this.collection.insertOne({
						...user,
						identityType: user.employeeId ? 'employee' : 'external',
						fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
					} as Identity);
					results.usersMigrated++;
				} catch (error: any) {
					results.errors.push(`User ${user.email}: ${error.message}`);
				}
			}

			// Migrate Employees → Merge into Identities
			const employees = await db.collection('employees').find().toArray();
			for (const emp of employees) {
				try {
					// Check if identity already exists (from user migration)
					const existing = emp.userId
						? await this.findById(emp.userId)
						: null;

					if (existing) {
						// Merge employee data into existing identity
						await this.updateById(existing._id.toString(), {
							identityType: 'employee',
							employeeId: emp.employeeId,
							organizationId: emp.organizationId,
							orgUnitId: emp.orgUnitId,
							positionId: emp.positionId,
							managerId: emp.managerId,
							employmentType: emp.employmentType,
							employmentStatus: emp.employmentStatus,
							joinDate: emp.joinDate,
							endDate: emp.endDate,
							probationEndDate: emp.probationEndDate,
							workLocation: emp.workLocation,
							region: emp.region,
							isRemote: emp.isRemote,
							dateOfBirth: emp.dateOfBirth,
							gender: emp.gender,
							idNumber: emp.idNumber,
							taxId: emp.taxId,
							personalEmail: emp.personalEmail,
							secondaryAssignments: emp.secondaryAssignments,
							customProperties: emp.customProperties
						});
					} else {
						// Create new identity for employee without SSO
						await this.create({
							identityType: 'employee',
							username: emp.email || emp.employeeId,
							email: emp.email,
							password: '', // Temporary, should be set later
							isActive: true, // Active by default
							emailVerified: false,
							roles: ['user'],
							firstName: emp.firstName,
							lastName: emp.lastName,
							fullName: emp.fullName,
							phone: emp.phone,
							organizationId: emp.organizationId,
							employeeId: emp.employeeId,
							orgUnitId: emp.orgUnitId,
							positionId: emp.positionId,
							managerId: emp.managerId,
							employmentType: emp.employmentType,
							employmentStatus: emp.employmentStatus,
							joinDate: emp.joinDate,
							endDate: emp.endDate,
							probationEndDate: emp.probationEndDate,
							workLocation: emp.workLocation,
							region: emp.region,
							isRemote: emp.isRemote,
							dateOfBirth: emp.dateOfBirth,
							gender: emp.gender,
							idNumber: emp.idNumber,
							taxId: emp.taxId,
							personalEmail: emp.personalEmail,
							secondaryAssignments: emp.secondaryAssignments,
							customProperties: emp.customProperties,
							createdAt: emp.createdAt,
							updatedAt: emp.updatedAt,
							createdBy: emp.createdBy,
							updatedBy: emp.updatedBy
						});
					}
					results.employeesMigrated++;
				} catch (error: any) {
					results.errors.push(`Employee ${emp.employeeId}: ${error.message}`);
				}
			}

			// Migrate Partners → Identities
			const partners = await db.collection('partners').find().toArray();
			for (const partner of partners) {
				try {
					await this.create({
						identityType: 'partner',
						username: partner.email,
						email: partner.email,
						password: '', // Temporary
						isActive: partner.isActive ?? true,
						emailVerified: false,
						roles: ['user'],
						firstName: partner.contactName.split(' ')[0] || partner.contactName,
						lastName: partner.contactName.split(' ').slice(1).join(' ') || '',
						fullName: partner.contactName,
						phone: partner.phone,
						organizationId: partner.organizationId,
						partnerType: partner.type,
						companyName: partner.companyName,
						contractNumber: partner.contractNumber,
						contractStartDate: partner.contractStartDate,
						contractEndDate: partner.contractEndDate,
						accessLevel: partner.accessLevel,
						allowedModules: partner.allowedModules,
						customProperties: partner.customProperties,
						createdAt: partner.createdAt,
						updatedAt: partner.updatedAt
					});
					results.partnersMigrated++;
				} catch (error: any) {
					results.errors.push(`Partner ${partner.email}: ${error.message}`);
				}
			}

		} catch (error: any) {
			results.errors.push(`Migration failed: ${error.message}`);
		}

		return results;
	}
}

// Export singleton instance
export const identityRepository = new IdentityRepository();
