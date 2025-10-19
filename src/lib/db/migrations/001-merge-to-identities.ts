/**
 * Migration: Merge Users, Employees, and Partners into Unified Identities Collection
 *
 * This migration:
 * 1. Creates new 'identities' collection
 * 2. Migrates all users → identities with identityType
 * 3. Merges employees into identities (linking or creating new)
 * 4. Migrates partners → identities
 * 5. Updates references in other collections (oauth, audit, etc.)
 * 6. Backs up old collections (for rollback)
 *
 * Run with: bun run src/lib/db/migrations/001-merge-to-identities.ts
 */

import { getDB } from '../connection';
import { identityRepository } from '../identity-repository';
import { hash } from '@node-rs/argon2';

interface MigrationResult {
	success: boolean;
	usersProcessed: number;
	employeesProcessed: number;
	partnersProcessed: number;
	identitiesCreated: number;
	errors: string[];
	duration: number;
}

async function generateTempPassword(): Promise<string> {
	const tempPassword = Math.random().toString(36).slice(-12);
	return await hash(tempPassword, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});
}

export async function migrate(): Promise<MigrationResult> {
	const startTime = Date.now();
	const db = getDB();
	const result: MigrationResult = {
		success: false,
		usersProcessed: 0,
		employeesProcessed: 0,
		partnersProcessed: 0,
		identitiesCreated: 0,
		errors: [],
		duration: 0
	};

	try {
		console.log('🚀 Starting migration to unified identities collection...\n');

		// Step 1: Check if migration already ran
		const identitiesCount = await db.collection('identities').countDocuments();
		if (identitiesCount > 0) {
			console.warn('⚠️  Identities collection already has documents. Skipping migration.');
			console.warn('   If you want to re-run, please drop the identities collection first.');
			result.errors.push('Migration already completed');
			return result;
		}

		// Step 2: Backup existing collections
		console.log('📦 Creating backups...');
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

		const usersCount = await db.collection('users').countDocuments();
		if (usersCount > 0) {
			await db.collection('users').aggregate([
				{ $match: {} },
				{ $out: `users_backup_${timestamp}` }
			]).toArray();
			console.log(`   ✓ Backed up ${usersCount} users`);
		}

		const employeesCount = await db.collection('employees').countDocuments();
		if (employeesCount > 0) {
			await db.collection('employees').aggregate([
				{ $match: {} },
				{ $out: `employees_backup_${timestamp}` }
			]).toArray();
			console.log(`   ✓ Backed up ${employeesCount} employees`);
		}

		const partnersCount = await db.collection('partners').countDocuments();
		if (partnersCount > 0) {
			await db.collection('partners').aggregate([
				{ $match: {} },
				{ $out: `partners_backup_${timestamp}` }
			]).toArray();
			console.log(`   ✓ Backed up ${partnersCount} partners\n`);
		}

		// Step 3: Migrate Users → Identities
		console.log('👥 Migrating users...');
		const users = await db.collection('users').find().toArray();

		for (const user of users) {
			try {
				await db.collection('identities').insertOne({
					...user,
					identityType: user.employeeId ? 'employee' : 'external',
					fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
					isActive: user.isActive ?? true
				});
				result.usersProcessed++;
				result.identitiesCreated++;
			} catch (error: any) {
				result.errors.push(`User ${user.email}: ${error.message}`);
			}
		}
		console.log(`   ✓ Migrated ${result.usersProcessed} users\n`);

		// Step 4: Merge Employees into Identities
		console.log('👨‍💼 Merging employees...');
		const employees = await db.collection('employees').find().toArray();

		for (const emp of employees) {
			try {
				// Check if identity already exists (from user migration)
				const existing = emp.userId
					? await db.collection('identities').findOne({ _id: emp.userId })
					: null;

				if (existing) {
					// UPDATE: Merge employee data into existing identity
					await db.collection('identities').updateOne(
						{ _id: existing._id },
						{
							$set: {
								identityType: 'employee',
								employeeId: emp.employeeId,
								fullName: emp.fullName,
								firstName: emp.firstName || existing.firstName,
								lastName: emp.lastName || existing.lastName,
								phone: emp.phone || existing.phone,
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
								isRemote: emp.isRemote ?? false,
								dateOfBirth: emp.dateOfBirth,
								gender: emp.gender,
								idNumber: emp.idNumber,
								taxId: emp.taxId,
								personalEmail: emp.personalEmail,
								secondaryAssignments: emp.secondaryAssignments || [],
								customProperties: emp.customProperties || {},
								updatedAt: new Date()
							}
						}
					);
				} else {
					// CREATE: New identity for employee without linked user
					await db.collection('identities').insertOne({
						identityType: 'employee',
						username: emp.email || emp.employeeId,
						email: emp.email || null,
						password: await generateTempPassword(),
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
						isRemote: emp.isRemote ?? false,
						dateOfBirth: emp.dateOfBirth,
						gender: emp.gender,
						idNumber: emp.idNumber,
						taxId: emp.taxId,
						personalEmail: emp.personalEmail,
						secondaryAssignments: emp.secondaryAssignments || [],
						customProperties: emp.customProperties || {},
						createdAt: emp.createdAt || new Date(),
						updatedAt: emp.updatedAt || new Date(),
						createdBy: emp.createdBy,
						updatedBy: emp.updatedBy
					});
					result.identitiesCreated++;
				}
				result.employeesProcessed++;
			} catch (error: any) {
				result.errors.push(`Employee ${emp.employeeId}: ${error.message}`);
			}
		}
		console.log(`   ✓ Processed ${result.employeesProcessed} employees\n`);

		// Step 5: Migrate Partners → Identities
		console.log('🤝 Migrating partners...');
		const partners = await db.collection('partners').find().toArray();

		for (const partner of partners) {
			try {
				const nameParts = (partner.contactName || '').split(' ');
				await db.collection('identities').insertOne({
					identityType: 'partner',
					username: partner.email,
					email: partner.email,
					password: await generateTempPassword(),
					isActive: partner.isActive ?? true,
					emailVerified: false,
					roles: ['user'],
					firstName: nameParts[0] || partner.contactName,
					lastName: nameParts.slice(1).join(' ') || '',
					fullName: partner.contactName,
					phone: partner.phone,
					organizationId: partner.organizationId,
					partnerType: partner.type,
					companyName: partner.companyName,
					contractNumber: partner.contractNumber,
					contractStartDate: partner.contractStartDate,
					contractEndDate: partner.contractEndDate,
					accessLevel: partner.accessLevel || 'read',
					allowedModules: partner.allowedModules || [],
					customProperties: partner.customProperties || {},
					createdAt: partner.createdAt || new Date(),
					updatedAt: partner.updatedAt || new Date()
				});
				result.partnersProcessed++;
				result.identitiesCreated++;
			} catch (error: any) {
				result.errors.push(`Partner ${partner.email}: ${error.message}`);
			}
		}
		console.log(`   ✓ Migrated ${result.partnersProcessed} partners\n`);

		// Step 6: Update references in other collections
		console.log('🔗 Updating references in other collections...');

		// Update OAuth AuthCodes: userId → identityId
		const authCodesUpdated = await db.collection('auth_codes').updateMany(
			{},
			[
				{
					$set: {
						identityId: '$userId'
					}
				}
			]
		);
		console.log(`   ✓ Updated ${authCodesUpdated.modifiedCount} auth codes`);

		// Update OAuth RefreshTokens: userId → identityId
		const refreshTokensUpdated = await db.collection('refresh_tokens').updateMany(
			{},
			[
				{
					$set: {
						identityId: '$userId'
					}
				}
			]
		);
		console.log(`   ✓ Updated ${refreshTokensUpdated.modifiedCount} refresh tokens`);

		// Update Audit Logs: userId → identityId
		const auditLogsUpdated = await db.collection('audit_logs').updateMany(
			{},
			[
				{
					$set: {
						identityId: '$userId'
					}
				}
			]
		);
		console.log(`   ✓ Updated ${auditLogsUpdated.modifiedCount} audit logs\n`);

		// Step 7: Create indexes on identities collection
		console.log('📇 Creating indexes...');
		await db.collection('identities').createIndex({ email: 1 }, { sparse: true });
		await db.collection('identities').createIndex({ username: 1 }, { unique: true });
		await db.collection('identities').createIndex({ employeeId: 1 }, { sparse: true });
		await db.collection('identities').createIndex({ identityType: 1 });
		await db.collection('identities').createIndex({ organizationId: 1 });
		await db.collection('identities').createIndex({ isActive: 1 });
		await db.collection('identities').createIndex({ orgUnitId: 1 }, { sparse: true });
		console.log('   ✓ Indexes created\n');

		// Success!
		result.success = true;
		result.duration = Date.now() - startTime;

		console.log('✅ Migration completed successfully!');
		console.log(`   Users processed: ${result.usersProcessed}`);
		console.log(`   Employees processed: ${result.employeesProcessed}`);
		console.log(`   Partners processed: ${result.partnersProcessed}`);
		console.log(`   Total identities created: ${result.identitiesCreated}`);
		console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s\n`);

		if (result.errors.length > 0) {
			console.warn(`⚠️  ${result.errors.length} errors occurred:`);
			result.errors.forEach(err => console.warn(`   - ${err}`));
		}

		console.log('\n📝 Next steps:');
		console.log('   1. Verify the identities collection looks correct');
		console.log('   2. Test login with email and NIK');
		console.log('   3. Update application code to use identityRepository');
		console.log('   4. Once verified, you can drop old collections:');
		console.log('      - db.collection("users").drop()');
		console.log('      - db.collection("employees").drop()');
		console.log('      - db.collection("partners").drop()');
		console.log(`   5. Backups are stored with timestamp: ${timestamp}\n`);

	} catch (error: any) {
		result.errors.push(`Fatal error: ${error.message}`);
		result.duration = Date.now() - startTime;
		console.error('❌ Migration failed:', error);
	}

	return result;
}

// Run migration if executed directly
if (import.meta.main) {
	migrate()
		.then(result => {
			if (result.success) {
				process.exit(0);
			} else {
				process.exit(1);
			}
		})
		.catch(error => {
			console.error('Migration error:', error);
			process.exit(1);
		});
}
