/**
 * Generic CRUD API endpoint for standard entity operations.
 * Handles GET, PUT, DELETE for: org-units, positions, realms, oauth-clients, scim-clients
 * Complex/specialized endpoints (search, parent-options, etc.) remain in their own files.
 */

import { db } from '$lib/db/db';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';

type DeleteCheck = {
	repoKey: keyof typeof db;
	buildFilter: (doc: any) => Record<string, any>;
	message: (count: number) => string;
};

type CollectionConfig = {
	repoKey: keyof typeof db;
	keyField: string;
	allowedUpdateFields: string[];
	objectIdFields?: string[]; // converted to ObjectId on PUT (nullable)
	getEnrich?: (doc: any) => Promise<Record<string, any>>;
	hideFields?: string[];
	deleteChecks?: DeleteCheck[];
};

const CONFIGS: Record<string, CollectionConfig> = {
	'org-units': {
		repoKey: 'orgUnits',
		keyField: 'code',
		allowedUpdateFields: [
			'name', 'shortName', 'type', 'description', 'isActive', 'organizationId', 'parentId', 'managerId'
		],
		objectIdFields: ['organizationId', 'parentId', 'managerId'],
		getEnrich: async (doc) => {
			const [parent, manager] = await Promise.all([
				doc.parentId ? db.orgUnits.findById(doc.parentId.toString()) as any : null,
				doc.managerId ? db.identities.findById(doc.managerId.toString()) as any : null
			]);
			return { parentName: parent?.name || null, managerName: manager?.fullName || null };
		},
		deleteChecks: [
			{
				repoKey: 'orgUnits',
				buildFilter: (doc) => ({ parentId: doc._id.toString() }),
				message: (n) => `Cannot delete unit with ${n} child units. Please delete or reassign child units first.`
			},
			{
				repoKey: 'identities',
				buildFilter: (doc) => ({ identityType: 'employee', orgUnitId: doc._id.toString() }),
				message: (n) => `Cannot delete unit with ${n} assigned employees. Please reassign employees first.`
			}
		]
	},

	'positions': {
		repoKey: 'positions',
		keyField: 'code',
		allowedUpdateFields: ['name', 'grade', 'level', 'description', 'isActive'],
		deleteChecks: [
			{
				repoKey: 'identities',
				buildFilter: (doc) => ({ positionId: doc._id.toString() }),
				message: (n) => `Cannot delete position. It is assigned to ${n} employee(s).`
			}
		]
	},

	'realms': {
		repoKey: 'organizations',
		keyField: 'code',
		allowedUpdateFields: [
			'name', 'legalName', 'type', 'description',
			'isActive', 'allowedEmailDomains', 'branding'
		],
		getEnrich: async (doc) => ({
			userCount: await db.identities.count({ organizationId: doc._id.toString() } as any)
		}),
		deleteChecks: [
			{
				repoKey: 'identities',
				buildFilter: (doc) => ({ organizationId: doc._id.toString() }),
				message: (n) => `Cannot delete realm. It has ${n} user(s).`
			},
			{
				repoKey: 'orgUnits',
				buildFilter: (doc) => ({ organizationId: doc._id.toString() }),
				message: (n) => `Cannot delete realm. It has ${n} organizational unit(s).`
			}
		]
	},

	'oauth-clients': {
		repoKey: 'oauthClients',
		keyField: 'clientId',
		allowedUpdateFields: ['clientName', 'redirectUris', 'allowedScopes', 'grantTypes', 'isActive'],
		hideFields: ['clientSecret']
	},

	'scim-clients': {
		repoKey: 'scimClients',
		keyField: 'clientId',
		allowedUpdateFields: ['clientName', 'scopes', 'rateLimit', 'isActive', 'description', 'contactEmail', 'ipWhitelist'],
		hideFields: ['clientSecret']
	}
};

function serializeDoc(doc: any): any {
	const result: any = {};
	for (const [key, val] of Object.entries(doc)) {
		if (val instanceof ObjectId) result[key] = val.toString();
		else result[key] = val;
	}
	return result;
}

export const GET: RequestHandler = async ({ params }) => {
	const config = CONFIGS[params.collection];
	if (!config) throw error(404, 'Collection not found');

	const repo = db[config.repoKey] as any;
	const doc = await repo.findOne({ [config.keyField]: params.id } as any) as any;
	if (!doc) throw error(404, 'Not found');

	const enriched = config.getEnrich ? await config.getEnrich(doc) : {};
	const result = { ...serializeDoc(doc), ...enriched };

	if (config.hideFields) config.hideFields.forEach((f) => delete result[f]);

	return json(result);
};

export const PUT: RequestHandler = async ({ params, locals }) => {
	const config = CONFIGS[params.collection];
	if (!config) throw error(404, 'Collection not found');

	const repo = db[config.repoKey] as any;
	const body = locals.body
	if (!body) throw error(400, 'No body' );

	const updateData: any = {};
	for (const field of config.allowedUpdateFields) {
		if (body[field] === undefined) continue;
		if (config.objectIdFields?.includes(field)) {
			updateData[field] = body[field] ? new ObjectId(body[field]) : null;
		} else {
			updateData[field] = body[field];
		}
	}

	const updated = await repo.updateOne({ [config.keyField]: params.id } as any, updateData);
	if (!updated) throw error(404, 'Not found');

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const config = CONFIGS[params.collection];
	if (!config) throw error(404, 'Collection not found');

	const repo = db[config.repoKey] as any;
	const doc = await repo.findOne({ [config.keyField]: params.id } as any) as any;
	if (!doc) throw error(404, 'Not found');

	if (config.deleteChecks) {
		for (const check of config.deleteChecks) {
			const checkRepo = db[check.repoKey] as any;
			const count = await checkRepo.count(check.buildFilter(doc) as any);
			if (count > 0) throw error(400, check.message(count));
		}
	}

	await repo.deleteOne({ [config.keyField]: params.id } as any);
	return json({ success: true });
};
