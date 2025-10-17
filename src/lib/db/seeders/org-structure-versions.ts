import type { Db } from 'mongodb';
import type { OrgStructureVersion } from '../schemas';

/**
 * Seed organization structure versions (for testing versioning feature)
 */
export async function seedOrgStructureVersions(db: Db, options: { clear?: boolean; iasId?: string; adminUserId?: string } = {}) {
	console.log('📋 Seeding organization structure versions...');

	if (options.clear) {
		await db.collection('org_structure_versions').deleteMany({});
	}

	// Get IAS organization if not provided
	let iasId = options.iasId;
	if (!iasId) {
		const ias = await db.collection('organizations').findOne({ code: 'IAS' });
		if (!ias) {
			console.warn('⚠️  IAS organization not found. Run db:seed:orgs first.');
			return;
		}
		iasId = ias._id.toString();
	}

	// Get admin user if not provided
	let adminUserId = options.adminUserId;
	if (!adminUserId) {
		const admin = await db.collection('users').findOne({ email: 'admin@ias.co.id' });
		if (!admin) {
			console.warn('⚠️  Admin user not found. Creating placeholder.');
			adminUserId = 'placeholder';
		} else {
			adminUserId = admin._id.toString();
		}
	}

	// Fetch all org units for snapshot
	const allOrgUnits = await db.collection('org_units').find({ organizationId: iasId }).toArray();
	const allPositions = await db.collection('positions').find({ organizationId: iasId }).toArray();

	if (allOrgUnits.length === 0) {
		console.warn('⚠️  No org units found. Run db:seed:org_units first.');
		return;
	}

	const orgStructureSnapshot = {
		orgUnits: allOrgUnits.map(unit => ({
			_id: unit._id.toString(),
			code: unit.code,
			name: unit.name,
			parentId: unit.parentId ? unit.parentId.toString() : undefined,
			type: unit.type,
			level: unit.level,
			sortOrder: unit.sortOrder,
			headEmployeeId: undefined
		})),
		positions: allPositions.map(pos => ({
			_id: pos._id.toString(),
			code: pos.code,
			name: pos.name,
			level: pos.level,
			grade: pos.grade || '',
			reportingToPositionId: undefined
		}))
	};

	const mermaidDiagram = undefined; // Generated on-demand

	// VERSION 1: 2023 Structure (Archived)
	const orgVersion2023: Partial<OrgStructureVersion> = {
		versionNumber: 1,
		versionName: '2023 Structure - Legacy Organization',
		organizationId: iasId,
		effectiveDate: new Date('2023-01-01'),
		status: 'archived',
		structure: orgStructureSnapshot,
		changes: [{
			type: 'unit_added',
			entityType: 'org_unit',
			entityId: 'INITIAL',
			entityName: 'Initial Structure',
			description: '2023 organizational structure (legacy)'
		}],
		skNumber: 'SK-001/IAS/ORG/2023',
		skDate: new Date('2022-12-01'),
		skSignedBy: adminUserId,
		reassignments: [],
		mermaidDiagram,
		createdBy: adminUserId,
		notes: '2023 organizational structure - archived for historical reference',
		createdAt: new Date('2023-01-01'),
		updatedAt: new Date('2024-01-01'),
	};

	// VERSION 2: 2024 Structure (Archived)
	const orgVersion2024: Partial<OrgStructureVersion> = {
		versionNumber: 2,
		versionName: '2024 Structure - Transformation Phase 1',
		organizationId: iasId,
		effectiveDate: new Date('2024-01-01'),
		status: 'archived',
		structure: orgStructureSnapshot,
		changes: [{
			type: 'unit_restructured',
			entityType: 'org_unit',
			entityId: 'TRANSFORMATION',
			entityName: 'Organizational Transformation',
			description: 'Phase 1 transformation - restructured several divisions'
		}],
		skNumber: 'SK-012/IAS/ORG/2024',
		skDate: new Date('2023-11-15'),
		skSignedBy: adminUserId,
		reassignments: [],
		mermaidDiagram,
		createdBy: adminUserId,
		notes: '2024 organizational structure - transformation phase 1',
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2025-01-01'),
	};

	// VERSION 3: 2025 Structure (Active)
	const orgVersion2025: Partial<OrgStructureVersion> = {
		versionNumber: 3,
		versionName: '2025 Enhanced Structure - Complete IAS Organization',
		organizationId: iasId,
		effectiveDate: new Date('2025-01-01'),
		status: 'active',
		structure: orgStructureSnapshot,
		changes: [{
			type: 'unit_added',
			entityType: 'org_unit',
			entityId: 'ENHANCED',
			entityName: 'Enhanced Structure',
			description: 'Complete IAS organizational structure with all directorates, divisions, and departments.'
		}],
		skNumber: 'SK-001/IAS/ORG/2025',
		skDate: new Date('2024-12-15'),
		skSignedBy: adminUserId,
		reassignments: [],
		mermaidDiagram,
		createdBy: adminUserId,
		notes: 'Current active organizational structure - comprehensive and production-ready',
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	await db.collection('org_structure_versions').insertMany([orgVersion2023, orgVersion2024, orgVersion2025]);
	console.log('✅ Created 3 organization structure versions (2023-archived, 2024-archived, 2025-active)');
}

// CLI support
if (import.meta.main) {
	const { connectDB, disconnectDB } = await import('../connection');
	try {
		const db = await connectDB();
		await seedOrgStructureVersions(db, { clear: true });
	} catch (error) {
		console.error('Error:', error);
	} finally {
		await disconnectDB();
	}
}
