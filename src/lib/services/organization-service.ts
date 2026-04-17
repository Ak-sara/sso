import { useLogger } from '@ak-sara/fbao/foundation';
import { db } from '$lib/db/db';
import type { PaginationInput, PaginatedResult } from '$lib/db/db';
import type { Organization } from '$lib/db/schemas/organization';
import type { ServiceResult,MongoFilter, MongoUpdate } from './types';

const log = useLogger({ module: 'service:organization' });

export type { ServiceResult } from './types';

export type OrganizationSerialized = Omit<Organization, '_id'> & {
	_id: string;
	parentId: string | null;
	userCount?: number;
};

// ── Serialization ──────────────────────────────────────────────────────────

export function serializeOrg(doc: any, userCount?: number): OrganizationSerialized {
	return {
		...doc,
		_id: doc._id.toString(),
		parentId: doc.parentId?.toString() || null,
		...(userCount !== undefined ? { userCount } : {}),
	};
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function listActiveOrgs(): Promise<Pick<OrganizationSerialized, '_id' | 'code' | 'name' | 'type'>[]> {
	const orgs = await db.organizations.col
		.find({ isActive: true })
		.project({ _id: 1, code: 1, name: 1, type: 1 })
		.toArray();
	return (orgs as any[]).map((o) => ({ _id: o._id.toString(), code: o.code, name: o.name, type: o.type }));
}

export async function listOrganizations(withUserCounts?: boolean): Promise<OrganizationSerialized[]>;
export async function listOrganizations(params: PaginationInput, withUserCounts?: boolean): Promise<PaginatedResult<OrganizationSerialized>>;
export async function listOrganizations(
	paramsOrCounts?: PaginationInput | boolean,
	withUserCounts = false
): Promise<OrganizationSerialized[] | PaginatedResult<OrganizationSerialized>> {
	const isPaginated = paramsOrCounts !== undefined && typeof paramsOrCounts === 'object';
	const counts = isPaginated ? withUserCounts : (paramsOrCounts as boolean ?? false);

	if (isPaginated) {
		const result = await db.organizations.findPaginated(paramsOrCounts as PaginationInput, {}, ['name', 'code']);
		const items = await Promise.all((result.items as any[]).map(async (o) => {
			const userCount = counts ? await db.identities.count({ organizationId: o._id.toString() } as MongoFilter<Organization>) : undefined;
			return serializeOrg(o, userCount);
		}));
		return { ...result, items };
	}

	const orgs = await db.organizations.find({}, { name: 1 });
	if (!counts) return (orgs as any[]).map((o) => serializeOrg(o));
	return Promise.all((orgs as any[]).map(async (org) => {
		const userCount = await db.identities.count({ organizationId: org._id.toString() } as MongoFilter<Organization>);
		return serializeOrg(org, userCount);
	}));
}

export async function getOrganizationById(id: string): Promise<ServiceResult<OrganizationSerialized>> {
	const doc = await db.organizations.findById(id) as any;
	if (!doc) return { ok: false, error: 'Realm tidak ditemukan', status: 404 };
	return { ok: true, data: serializeOrg(doc) };
}

export async function getOrganizationByCode(code: string): Promise<ServiceResult<OrganizationSerialized>> {
	const doc = await db.organizations.findOne({ code } as MongoFilter<Organization>) as any;
	if (!doc) return { ok: false, error: 'Realm tidak ditemukan', status: 404 };
	return { ok: true, data: serializeOrg(doc) };
}

// ── Mutations ──────────────────────────────────────────────────────────────

export async function createOrganization(
	input: Pick<Organization, 'code' | 'name' | 'type' | 'description'> & Partial<Organization>
): Promise<ServiceResult<{ code: string }>> {
	if (!input.name || !input.code) return { ok: false, error: 'Nama dan kode wajib diisi', status: 400 };

	const existing = await db.organizations.findOne({ code: input.code } as MongoFilter<Organization>);
	if (existing) return { ok: false, error: 'Kode organisasi sudah digunakan', status: 400 };

	try {
		await db.organizations.insertOne({
			...input,
			legalName: input.legalName || input.name,
			isActive: true,
		} as any);
		return { ok: true, data: { code: input.code } };
	} catch (err) {
		log.error('Failed to create organization', { error: err });
		return { ok: false, error: 'Gagal membuat realm', status: 500 };
	}
}

export async function deleteOrganization(code: string): Promise<ServiceResult<null>> {
	const userCount = await db.identities.count({ 'customProperties.organizationCode': code } as MongoFilter<Organization>);
	if (userCount > 0) return { ok: false, error: `Cannot delete realm. It has ${userCount} user(s).`, status: 400 };

	const orgUnitCount = await db.orgUnits.count({ organization: code } as MongoFilter<Organization>);
	if (orgUnitCount > 0) return { ok: false, error: `Cannot delete realm. It has ${orgUnitCount} organizational unit(s).`, status: 400 };

	try {
		const deleted = await db.organizations.deleteOne({ code } as MongoFilter<Organization>);
		if (!deleted) return { ok: false, error: 'Realm not found', status: 404 };
		return { ok: true, data: null };
	} catch (err) {
		log.error('Failed to delete organization', { error: err, code });
		return { ok: false, error: 'Gagal menghapus realm', status: 500 };
	}
}

export async function updateOrganization(code: string, updates: Partial<Organization>): Promise<ServiceResult<null>> {
	try {
		const updated = await db.organizations.updateOne(
			{ code } as MongoFilter<Organization>,
			{ ...updates, updatedAt: new Date() } as MongoUpdate<Organization>
		);
		if (!updated) return { ok: false, error: 'Realm tidak ditemukan', status: 404 };
		return { ok: true, data: null };
	} catch (err) {
		log.error('Failed to update organization', { error: err, code });
		return { ok: false, error: 'Gagal memperbarui realm', status: 500 };
	}
}
