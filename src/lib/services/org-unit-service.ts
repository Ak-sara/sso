import { ObjectId, type Filter } from 'mongodb';
import { useLogger } from '@ak-sara/fbao/foundation';
import { sanitizeString } from '@ak-sara/fbao/foundation/sanitize';
import { db, type PaginationInput } from '$lib/db/db';
import { OrgUnitSchema, type OrgUnit, orgUnitHasChildren, orgUnitHasEmployees } from '$lib/db/schemas/org-unit';
import type { ServiceResult, MongoFilter, MongoUpdate } from './types';

const log = useLogger({ module: 'service:org-unit' });

export type { ServiceResult } from './types';

// OrgUnit serialized for API response — _id as string + resolved display names not in DB
export type OrgUnitDetail = Omit<OrgUnit, '_id'> & {
	_id: string;
	parentName: string | null;
	groupName: string | null;
	picName: string | null;
	managerName: string | null;
};

function toObjId(id: string | null | undefined): ObjectId | null {
	if (!id || !ObjectId.isValid(id)) return null;
	return new ObjectId(id);
}

// ── Queries ────────────────────────────────────────────────────────────────

export function makeEmpty(organizationId?: string): OrgUnitDetail {
	return {
		_id: '', code: '', name: '', shortName: '', type: 'department', description: '',
		organizationId: organizationId as string,
		parentId: '', parentName: null,
		groupId: '', groupName: null,
		picId: '', picName: null,
		managerId: '', managerName: null,
		diagram:'logical',
	} as OrgUnitDetail;
}

export async function getOrgUnitsByOrg(organizationId: string): Promise<OrgUnitDetail[]> {
	const units = await db.orgUnits.col
		.find({ organizationId: new ObjectId(organizationId), isActive: true } as any)
		.toArray();
	return units.map((u: any) => ({
		...u,
		_id: u._id.toString(),
		organizationId: u.organizationId?.toString() || null,
		parentId: u.parentId?.toString() || null,
		groupId: u.groupId?.toString() || null,
		picId: u.picId?.toString() || null,
		managerId: u.managerId?.toString() || null,
		parentName: null, groupName: null, picName: null, managerName: null,
	})) as OrgUnitDetail[];
}

export async function listOrgUnits(params: PaginationInput, organizationId?: string) {
	const sanitizedParams = {
		...params,
		search: params.search ? sanitizeString(params.search) : undefined,
	};
	const filter: any = {organizationId: new ObjectId(organizationId)};

	const docs = await db.orgUnits.col.
		find({ organizationId: new ObjectId(organizationId), isActive: true } as any).toArray();
	const nodes: Record<string, any> = {};
	docs.map( doc =>{ nodes[doc._id.toString()]= doc })
	
	const result = await db.orgUnits.findPaginated(sanitizedParams, filter, ['name', 'code', 'shortName']);
	return {
		items: result.items.map((u: any) => ({
			...u,
			_id: u._id.toString(),
			organizationId: u.organizationId?.toString() || null,
			parentId: u.parentId?.toString() || null,
			parentName:(nodes[u.parentId?.toString()])?.code,
			groupId: u.groupId?.toString() || null,
			groupName:(nodes[u.groupId?.toString()])?.code,
			picId: u.picId?.toString() || null,
			managerId: u.managerId?.toString() || null,
		})) as OrgUnitDetail[],
		page: result.page,
		pageSize: result.pageSize,
		total: result.total,
		totalPages: result.totalPages,
	};
}

export async function getOrgUnitById(id: string): Promise<ServiceResult<OrgUnitDetail>> {
	const doc = await db.orgUnits.findById( id ) as any;
	if (!doc) return { ok: false, error: 'Organization unit not found', status: 404 };

	const [parent, manager, group, pic] = await Promise.all([
		doc.parentId ? db.orgUnits.findById(doc.parentId.toString()) as any : null,
		doc.managerId ? db.identities.findById(doc.managerId.toString()) as any : null,
		doc.groupId ? db.orgUnits.findById(doc.groupId.toString()) as any : null,
		doc.picId ? db.orgUnits.findById(doc.picId.toString()) as any : null
	]);

	return {
		ok: true,
		data: {
			...doc,
			_id: doc._id.toString(),
			organizationId: doc.organizationId?.toString() || null,
			parentId: doc.parentId?.toString() || null,
			parentName: parent?.name || null,
			groupId: doc.groupId?.toString() || null,
			groupName: group?.name || null,
			picId: doc.picId?.toString() || null,
			picName: pic?.name || null,
			managerId: doc.managerId?.toString() || null,
			managerName: manager?.fullName || null,
		} as OrgUnitDetail
	};
}

// ── Mutations ──────────────────────────────────────────────────────────────

export async function createOrgUnit(input: OrgUnit): Promise<ServiceResult<{ code: string }>> {
	if (!input.code || !input.name) return { ok: false, error: 'Code and name are required', status: 400 };

	const exists = await db.orgUnits.exists({ code: input.code } as MongoFilter<OrgUnit>);
	if (exists) return { ok: false, error: 'Unit code already in use', status: 400 };
	const data={
		...input,
		organizationId: toObjId(input.organizationId) as any,
		parentId: toObjId(input.parentId) as any,
		groupId: toObjId(input.groupId) as any,
		picId: toObjId(input.picId) as any,
		managerId: toObjId(input.managerId) as any,
		isActive: true,
	}  as OrgUnit;
	try {
		await db.orgUnits.insertOne( data );
		return { ok: true, data: { code: input.code } };
	} catch (err) {
		log.error('Failed to create org unit', { error: err });
		return { ok: false, error: 'Failed to create unit', status: 500 };
	}
}

export async function updateOrgUnit(code: string|undefined, input: Partial<OrgUnit>): Promise<ServiceResult<null>> {
	const {_id, ...INP}=input
	const update = {
		...INP,
		organizationId: toObjId(input.organizationId) as any,
		parentId: toObjId(input.parentId) as any,
		groupId: toObjId(input.groupId) as any,
		picId: toObjId(input.picId) as any,
		managerId: toObjId(input.managerId) as any,
		updatedAt: new Date(),
	};

	try {
		const updated = await db.orgUnits.updateOne({ _id:new ObjectId(code) } as MongoFilter<OrgUnit>, update as MongoUpdate<OrgUnit>);
		if (!updated) return { ok: false, error: 'Organization unit not found', status: 404 };
		return { ok: true, data: null };
	} catch (err) {
		log.error('Failed to update org unit', { error: err, code });
		return { ok: false, error: 'Failed to update unit', status: 500 };
	}
}

export async function deleteOrgUnit(code: string): Promise<ServiceResult<null>> {
	const doc = await db.orgUnits.findOne({ code } as MongoFilter<OrgUnit>) as any;
	if (!doc) return { ok: false, error: 'Organization unit not found', status: 404 };

	const id = doc._id.toString();

	if (await orgUnitHasChildren(id))
		return { ok: false, error: 'Cannot delete unit with child units. Reassign them first.', status: 400 };

	if (await orgUnitHasEmployees(id))
		return { ok: false, error: 'Cannot delete unit with assigned employees. Reassign them first.', status: 400 };

	try {
		await db.orgUnits.deleteOne({  _id:new ObjectId(id) } as MongoFilter<OrgUnit>);
		return { ok: true, data: null };
	} catch (err) {
		log.error('Failed to delete org unit', { error: err, code });
		return { ok: false, error: 'Failed to delete unit', status: 500 };
	}
}
