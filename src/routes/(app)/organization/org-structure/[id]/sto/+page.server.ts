import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { ObjectId } from 'mongodb';
import { error, fail } from '@sveltejs/kit';
import { serializeObjectIds } from '$lib/utils/serialize';
import { getOrganizationOptions } from '$lib/utils/select-options';
import { useLogger } from '@ak-sara/fbao/foundation';
import { getOrgUnitsByOrg, updateOrgUnit } from '$lib/services/org-unit-service';
import { OrgUnitSchema, type OrgUnit } from '$lib/db/schemas/org-unit';
import { fromForm } from '$lib/utils/form-parser';

const log = useLogger({ module: 'app:org-structure-sto' });

export const load: PageServerLoad = async ({ params }) => {
	try {
		const version = await db.orgStructureVersions.findById(params.id);
		if (!version) throw error(404, 'Organization structure version not found');

		const organization = await db.organizations.findById(version.organizationId);
		if (!organization) throw error(404, 'Organization not found');

		// Active version: load live data; otherwise use snapshot
		if (version.status === 'active') {
			log.debug('Loading LIVE data for active version');
			version.structure.orgUnits = await getOrgUnitsByOrg(version.organizationId.toString());
		} else {
			log.debug('Using snapshot data for non-active version');
		}

		const serializedVersion = serializeObjectIds(version);
		const rawUnits: any[] = serializedVersion.structure?.orgUnits || [];

		// Build id→code map for resolving parentCode/groupCode/picCode
		const idToCode: Record<string, string> = {};
		rawUnits.forEach((u: any) => { idToCode[u._id] = u.code; });

		// Batch-fetch managers, positions, employees
		const managerIds = [...new Set(rawUnits.filter((u: any) => u.managerId).map((u: any) => u.managerId))] as string[];
		const orgIdStr = version.organizationId.toString();

		const [managers, positions, employees] = await Promise.all([
			managerIds.length > 0
				? db.identities.col.find({ _id: { $in: managerIds.map(id => new ObjectId(id)) } }).toArray()
				: [],
			db.positions.col.find({ organizationId: orgIdStr }).toArray(),
			db.identities.col.find({ identityType: 'employee', organizationId: orgIdStr, isActive: true }).toArray()
		]);

		const managerMap: Record<string, any> = {};
		managers.forEach((m: any) => { managerMap[m._id.toString()] = m; });

		const positionMap: Record<string, any> = {};
		positions.forEach((p: any) => { positionMap[p._id.toString()] = p; });

		const employeesByUnit: Record<string, any[]> = {};
		employees.forEach((emp: any) => {
			const unitId = emp.orgUnitId?.toString();
			if (!unitId) return;
			if (!employeesByUnit[unitId]) employeesByUnit[unitId] = [];
			employeesByUnit[unitId].push({
				_id: emp._id.toString(),
				employeeId: emp.employeeId || '',
				fullName: emp.fullName || '',
				email: emp.email || '',
				positionId: emp.positionId?.toString() || null,
				positionName: emp.positionId ? (positionMap[emp.positionId.toString()]?.name ?? '') : ''
			});
		});

		const orgUnitsEnriched = rawUnits.map((u: any) => ({
			...u,
			parentCode: u.parentId ? (idToCode[u.parentId] ?? null) : null,
			groupCode: u.groupId ? (idToCode[u.groupId] ?? null) : null,
			picCode: u.picId ? (idToCode[u.picId] ?? null) : null,
			managerName: u.managerId ? (managerMap[u.managerId]?.fullName ?? null) : null,
			managerPosition: u.managerId ? (managerMap[u.managerId]?.customProperties?.positionTitle ?? managerMap[u.managerId]?.customProperties?.position ?? null) : null,
			employees: employeesByUnit[u._id] || []
		}));

		return {
			organization: { _id: organization._id?.toString(), code: organization.code, name: organization.name },
			version: serializedVersion,
			orgUnitsEnriched,
			positions: positions.map((p: any) => ({
				_id: p._id.toString(), code: p.code, name: p.name,
				level: p.level, description: p.description || '', isActive: p.isActive ?? true
			})),
			employees: employees.map((emp: any) => ({
				_id: emp._id.toString(),
				employeeId: emp.employeeId || '',
				fullName: emp.fullName || '',
				email: emp.email || '',
				orgUnitId: emp.orgUnitId?.toString() || null,
				positionId: emp.positionId?.toString() || null,
				positionName: emp.positionId ? (positionMap[emp.positionId.toString()]?.name ?? '') : '',
				employmentType: emp.employmentType || '',
				employmentStatus: emp.employmentStatus || ''
			})),
			organizationOptions: await getOrganizationOptions()
		};
	} catch (err) {
		log.error('Load org structure STO error', { error: err });
		if (err instanceof Response) throw err;
		throw error(500, 'Failed to load organization structure');
	}
};

export const actions: Actions = {
	update: async ({ locals }) => {
		try {
			const unit = fromForm<OrgUnit>(OrgUnitSchema, locals.body);
			if (!unit.code) return fail(400, { error: 'Code is required' });
			const { code, ...fields } = unit;
			const result = await updateOrgUnit(code, fields);
			if (!result.ok) return fail(result.status ?? 400, { error: result.error });
			return { success: true };
		} catch (err) {
			log.error('Unexpected error in update action', { error: err });
			return fail(500, { error: 'Unexpected error' });
		}
	}
};
