import { z } from 'zod';
import { useLogger } from '@ak-sara/fbao/foundation';
import { db, type PaginationInput } from '$lib/db/db';
import { getDB } from '$lib/db/connection';
import type { Identity } from '$lib/db/schemas/identity';
import { getMaskedIdentity, getMaskedIdentities } from '$lib/utils/data-masking';
import type { MaskingConfig } from '$lib/utils/data-masking';
import type { ServiceResult, MongoFilter, MongoUpdate } from './types';
import { ObjectId, type Filter } from 'mongodb';
import { validateBody, nonEmptyString, optionalString, emailField, booleanFromString } from '$lib/utils/validate';
import { parseJsonArrayField } from '$lib/utils/form-json';

const log = useLogger({ module: 'service:identity' });

export type { ServiceResult } from './types';

export type IdentitySerialized = Omit<Identity, '_id' | 'password'> & { _id: string };

export type TabCounts = {
	employee: number;
	partner: number;
	external: number;
	service_account: number;
};

// ── Serialization ──────────────────────────────────────────────────────────

function toStr(v: any): string | undefined {
	if (!v) return undefined;
	return typeof v === 'string' ? v : v.toString();
}

function toISO(v: any): string | undefined {
	if (!v) return undefined;
	if (typeof v === 'string') return v;
	try { return new Date(v).toISOString(); } catch { return undefined; }
}

export function serializeIdentity(doc: any): IdentitySerialized {
	const { password: _pw, ...rest } = doc;
	doc.assignments?.map((x:any,i)=>{
		doc.assignments[i]._id=toStr(x._id)
		doc.assignments[i].identityId=String(x.identityId)
		doc.assignments[i].startDate=toISO(x.startDate)
		doc.assignments[i].endDate=toISO(x.endDate)
	});
	return {
		...rest,
		_id: toStr(doc._id) || '',
		organizationId: toStr(doc.organizationId),
		orgUnitId: toStr(doc.orgUnitId),
		positionId: toStr(doc.positionId),
		managerId: toStr(doc.managerId),
		createdAt: toISO(doc.createdAt) ?? new Date().toISOString(),
		updatedAt: toISO(doc.updatedAt) ?? new Date().toISOString(),
		lastLogin: toISO(doc.lastLogin),
		joinDate: toISO(doc.joinDate),
		endDate: toISO(doc.endDate),
		probationEndDate: toISO(doc.probationEndDate),
		dateOfBirth: toISO(doc.dateOfBirth),
		contractStartDate: toISO(doc.contractStartDate),
		contractEndDate: toISO(doc.contractEndDate),
	} as IdentitySerialized;
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function listIdentities(
	params: PaginationInput,
	filter: Record<string, any>,
	maskingConfig: MaskingConfig,
	userRoles: string[]
) {
	const SEARCH_FIELDS = ['fullName', 'email', 'employeeId', 'phone', 'companyName', 'partnerType'];
	const result = await db.identities.findPaginated(params, filter, SEARCH_FIELDS);
	const serialized = result.items.map(serializeIdentity);
	return {
		items: getMaskedIdentities(serialized as any[], maskingConfig, userRoles) as IdentitySerialized[],
		page: result.page,
		pageSize: result.pageSize,
		total: result.total,
		totalPages: result.totalPages,
	};
}

export async function getTabCounts(realmFilter: MongoFilter<Identity>): Promise<TabCounts> {
	const [employee, partner, external, service_account] = await Promise.all([
		db.identities.count({ ...realmFilter, identityType: 'employee' } as MongoFilter<Identity>),
		db.identities.count({ ...realmFilter, identityType: 'partner' } as MongoFilter<Identity>),
		db.identities.count({ ...realmFilter, identityType: 'external' } as MongoFilter<Identity>),
		db.identities.count({ ...realmFilter, identityType: 'service_account' } as MongoFilter<Identity>),
	]);
	return { employee, partner, external, service_account };
}

export async function getIdentityById(
	id: string,
	opts?: { maskingConfig?: MaskingConfig; userRoles?: string[]; applyMask?: boolean }
): Promise<ServiceResult<IdentitySerialized>> {
	const doc = await db.identities.findById(id) as any;
	if (!doc) return { ok: false, error: 'Identitas tidak ditemukan', status: 404 };

	let serialized = serializeIdentity(doc);
	if (opts?.applyMask && opts.maskingConfig) {
		serialized = getMaskedIdentity(serialized as any, opts.maskingConfig, opts.userRoles || []) as any;
	}
	return { ok: true, data: serialized };
}

// ── Input schemas ──────────────────────────────────────────────────────────

const CreateIdentitySchema = z.object({
	identityType: z.enum(['employee', 'partner', 'external', 'service_account']),
	password: nonEmptyString,
	firstName: nonEmptyString,
	lastName: optionalString,
	email: emailField,
	phone: optionalString,
	isActive: booleanFromString.default(true),
	organizationId: optionalString,
});

const UpdateIdentitySchema = z.object({
	firstName: nonEmptyString,
	lastName: optionalString,
	email: emailField,
	phone: optionalString,
	isActive: booleanFromString.default(true),
	organizationId: optionalString,
}).partial();

// ── Mutations ──────────────────────────────────────────────────────────────

export async function createIdentity(
	input: Omit<Identity, '_id'> & { password: string }
): Promise<ServiceResult<{ _id: string }>> {
	const validation = validateBody(CreateIdentitySchema, input);
	if (!validation.ok) return validation;
	try {
		const doc = await db.identities.insertOne(input as any);
		const identityId = doc._id!.toString();

		// assignments[] is the source of truth for org membership (realm roles,
		// client roles) — keep it populated from day one instead of relying on
		// an admin to add one manually via the Assignment History form later.
		await upsertAssignment(identityId, {
			organizationId: input.organizationId,
			orgUnitId: input.orgUnitId,
			positionId: input.positionId,
			employeeId: input.employeeId,
			region: input.region,
			workLocation: input.workLocation,
			isRemote: input.isRemote,
			employmentType: input.employmentType,
			employmentStatus: input.employmentStatus,
			startDate: input.joinDate || new Date(),
			createdBy: input.createdBy || 'system',
		});

		return { ok: true, data: { _id: identityId } };
	} catch (err) {
		log.error('Failed to create identity', { error: err });
		return { ok: false, error: 'Gagal membuat identitas', status: 500 };
	}
}

export async function updateIdentity(id: string, updates: Partial<Identity>): Promise<ServiceResult<string>> {
	const validation = validateBody(UpdateIdentitySchema, updates);
	if (!validation.ok) return validation;

	try {
		const updated = await db.identities.updateById(id, { ...updates, updatedAt: new Date() } as MongoUpdate<Identity>);
		if (!updated) return { ok: false, error: 'Identitas tidak ditemukan', status: 404 };
		return { ok: true, data: `${updated?'updated':'none'}` };
	} catch (err) {
		log.error('Failed to update identity', { error: err, id });
		return { ok: false, error: 'Gagal memperbarui identitas', status: 500 };
	}
}

export async function upsertAssignment(
	identityId: string,
	data: Record<string, any>
): Promise<ServiceResult<null>> {
	try {
		const col = getDB().collection('identities');
		const oid = new ObjectId(identityId);

		const assignment: any = {
			identityId: oid,
			organizationId: data.organizationId || '',
			orgUnitId: data.orgUnitId || undefined,
			positionId: data.positionId || undefined,
			employeeId: data.employeeId || undefined,
			region: data.region || undefined,
			workLocation: data.workLocation || undefined,
			isRemote: data.isRemote === 'true' || data.isRemote === true,
			employmentType: data.employmentType || undefined,
			employmentStatus: data.employmentStatus || undefined,
			realmRoleIds: parseJsonArrayField(data.realmRoleIds),
			clientRoleIds: parseJsonArrayField(data.clientRoleIds),
			letterId: data.letterId || undefined,
			letterNo: data.letterNo || undefined,
			startDate: data.startDate ? new Date(data.startDate) : undefined,
			endDate: data.endDate ? new Date(data.endDate) : undefined,
			createdBy: data.createdBy || 'system',
			createdAt: new Date(),
		};
		// strip undefined
		for (const k of Object.keys(assignment)) {
			if (assignment[k] === undefined) delete assignment[k];
		}

		if (data._id) {
			const result = await col.updateOne(
				{ _id: oid },
				{ $set: { 'assignments.$[elem]': { ...assignment, _id: new ObjectId(data._id) } } },
				{ arrayFilters: [{ 'elem._id': new ObjectId(data._id) }] }
			);
			if (result.matchedCount === 0) return { ok: false, error: 'Identity not found', status: 404 };
		} else {
			await col.updateOne(
				{ _id: oid },
				{ $push: { assignments: { ...assignment, _id: new ObjectId() } } } as any
			);
		}

		// Sync primary identity fields from assignment so realm/org filters work
		const topLevel: Record<string, any> = { updatedAt: new Date() };
		if (assignment.organizationId) topLevel.organizationId = assignment.organizationId;
		if (assignment.orgUnitId) topLevel.orgUnitId = assignment.orgUnitId;
		if (assignment.positionId) topLevel.positionId = assignment.positionId;
		if (assignment.employeeId) topLevel.employeeId = assignment.employeeId;
		if (assignment.employmentType) topLevel.employmentType = assignment.employmentType;
		if (assignment.employmentStatus) topLevel.employmentStatus = assignment.employmentStatus;
		if (assignment.region) topLevel.region = assignment.region;
		if (assignment.workLocation) topLevel.workLocation = assignment.workLocation;
		if ('isRemote' in assignment) topLevel.isRemote = assignment.isRemote;
		if (assignment.startDate) topLevel.joinDate = assignment.startDate;
		if (assignment.endDate) topLevel.endDate = assignment.endDate;
		await col.updateOne({ _id: oid }, { $set: topLevel });

		return { ok: true, data: null };
	} catch (err) {
		log.error('Failed to upsert assignment', { error: err, identityId });
		return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan assignment', status: 500 };
	}
}

export async function deleteAssignment(identityId: string, assignmentId: string): Promise<ServiceResult<null>> {
	try {
		const col = getDB().collection('identities');
		const result = await col.updateOne(
			{ _id: new ObjectId(identityId) },
			{ $pull: { assignments: { _id: new ObjectId(assignmentId) } } } as any
		);
		if (result.matchedCount === 0) return { ok: false, error: 'Identity not found', status: 404 };
		return { ok: true, data: null };
	} catch (err) {
		log.error('Failed to delete assignment', { error: err, identityId, assignmentId });
		return { ok: false, error: err instanceof Error ? err.message : 'Gagal menghapus assignment', status: 500 };
	}
}

export async function deleteIdentity(id: string): Promise<ServiceResult<null>> {
	try {
		const deleted = await db.identities.deleteById(id);
		if (!deleted) return { ok: false, error: 'Identitas tidak ditemukan', status: 404 };
		return { ok: true, data: null };
	} catch (err) {
		log.error('Failed to delete identity', { error: err, id });
		return { ok: false, error: 'Gagal menghapus identitas', status: 500 };
	}
}
