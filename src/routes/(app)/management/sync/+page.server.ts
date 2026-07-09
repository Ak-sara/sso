import type { PageServerLoad, Actions } from './$types';

// Short-lived server-side preview cache — avoids sending large JSON through the form sanitizer
const previewCache = new Map<string, { data: any; expiresAt: number }>();
function cachePreview(data: any): string {
	const id = crypto.randomUUID();
	previewCache.set(id, { data, expiresAt: Date.now() + 30 * 60_000 }); // 30 min TTL
	for (const [k, v] of previewCache) if (v.expiresAt < Date.now()) previewCache.delete(k);
	return id;
}
function consumePreview(id: string): any | null {
	const entry = previewCache.get(id);
	if (!entry || entry.expiresAt < Date.now()) return null;
	previewCache.delete(id);
	return entry.data;
}
import { fail } from '@sveltejs/kit';
import { db } from '$lib/db/db';
import { listAuditLogs } from '$lib/services/audit-service';
import type { Identity } from '$lib/db/schemas';
import { findIdentityByEmployeeId, findIdentityByEmail } from '$lib/db/schemas';
import { listOrganizations } from '$lib/services/organization-service';
import { createIdentity, updateIdentity } from '$lib/services/identity-service';
import { testEntraIDConnection, getMicrosoftGraphToken, getEntraIDUsers } from '$lib/entraid/microsoft-graph';
import { logAudit } from '$lib/audit/logger';
import {
	detectNIKEmailConflicts,
	normalizeCSVColumns,
	validateIdentityFields,
	generateDataWarnings
} from '$lib/utils/identity-import';
import { serializeObjectIds } from '$lib/utils/serialize';
import { parseCSVLine } from '$lib/utils/csv-parser';
import { passwordService } from '$lib/auth/password';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
	const tab = locals.query?.tab || 'csv';
	const selectedOrgId = locals.query?.org;

	const organizations = await listOrganizations();
	const orgsList = organizations.map(org => ({ _id: org._id, name: org.name, code: org.code }));

	let selectedOrg: any = selectedOrgId ? organizations.find(o => o._id === selectedOrgId) : null;
	if (!selectedOrg) selectedOrg = organizations.find(o => o.code === 'IAS') || organizations[0];

	let entraConfig = null;
	let syncHistory: any[] = [];

	if (tab === 'entra' && selectedOrg) {
		const config = await db.entraidConfigs.findOne({ organizationId: selectedOrg._id.toString() } as any) as any;
		if (config) entraConfig = { ...config, _id: config._id?.toString(), clientSecret: '••••••••••••' };

		const { items: logs } = await listAuditLogs(
			{ page: 1, pageSize: 10 },
			{ action: { $in: ['sync_completed', 'sync_failed', 'sync_started'] }, organizationId: selectedOrg._id.toString() }
		);
		syncHistory = logs;
	}

	return {
		currentTab: tab,
		organizations: orgsList,
		selectedOrganization: selectedOrg ? { _id: selectedOrg._id.toString(), name: selectedOrg.name, code: selectedOrg.code } : null,
		organizationId: selectedOrg?._id?.toString() || null,
		entraConfig,
		syncHistory
	};
};

export const actions: Actions = {
	uploadCSV: async ({ locals }) => {
		const file = locals.body?.file as File;
		if (!file || typeof file.text !== 'function') return fail(400, { error: 'No file uploaded' });

		try {
			const content = await file.text();
			const lines = content.split(/\r?\n/).filter(line => line.trim());
			if (lines.length === 0) return fail(400, { error: 'CSV file is empty' });

			const headers = parseCSVLine(lines[0]).map(h => h.trim());
			const rows = lines.slice(1).map(line => {
				const values = parseCSVLine(line);
				const row: Record<string, string> = {};
				headers.forEach((header, index) => { row[header] = values[index]?.trim() || ''; });
				return row;
			});

			const preview = {
				toCreate: [] as Array<Partial<Identity>>,
				toUpdate: [] as Array<{ identity: Identity; changes: Partial<Identity> }>,
				warnings: [] as Array<{ row: any; warning: string }>,
				errors: [] as Array<{ row: any; error: string }>
			};

			for (const row of rows) {
				const normalized = normalizeCSVColumns(row);
				const { nik, email, firstName, lastName, employmentType, workLocation, org, orgUnit, position } = normalized;

				const validation = validateIdentityFields({ nik, email, firstName, lastName });
				if (!validation.valid) {
					validation.errors.forEach(error => preview.errors.push({ row, error }));
					continue;
				}

				// Resolve ORG code/name → organizationId
				let resolvedOrgId: string | undefined;
				if (org) {
					const orgDoc = await db.organizations.findOne({ $or: [{ code: org }, { name: org }] } as any) as any;
					resolvedOrgId = orgDoc?._id?.toString();
				}

				// Resolve orgUnit code/name → ObjectId string
				let orgUnitId: string | undefined;
				if (orgUnit) {
					const unit = await db.orgUnits.findOne({ $or: [{ code: orgUnit }, { name: orgUnit }] } as any) as any;
					orgUnitId = unit?._id?.toString();
				}

				// Resolve position title → ObjectId string
				let positionId: string | undefined;
				if (position) {
					const pos = await db.positions.findOne({ title: position } as any) as any;
					positionId = pos?._id?.toString();
				}

				let existing = null;
				if (nik) existing = await findIdentityByEmployeeId(nik);
				if (!existing && email) existing = await findIdentityByEmail(email);

				if (existing) {
					const changes: Partial<Identity> = {};
					if (email && email !== existing.email) changes.email = email;
					if (nik && nik !== existing.employeeId) changes.employeeId = nik;
					if (firstName !== existing.firstName) changes.firstName = firstName;
					if (lastName !== existing.lastName) changes.lastName = lastName;
					changes.fullName = `${firstName} ${lastName || ''}`.trim();
					if (orgUnitId) changes.orgUnitId = orgUnitId;
					if (positionId) changes.positionId = positionId;
					if (workLocation) changes.workLocation = workLocation;
					if (resolvedOrgId) changes.organizationId = resolvedOrgId;
					if (Object.keys(changes).length > 1) preview.toUpdate.push({ identity: existing, changes });
				} else {
					const joinDate = row.JoinDate ? new Date(row.JoinDate) : new Date();
					preview.toCreate.push({
						identityType: 'employee',
						email: email || undefined,
						employeeId: nik || undefined,
						firstName, lastName,
						fullName: `${firstName} ${lastName || ''}`.trim(),
						employmentType: (employmentType || 'permanent') as Identity['employmentType'],
						employmentStatus: 'active', isActive: true,
						roles: ['user'], joinDate,
						workLocation, orgUnitId, positionId,
						organizationId: resolvedOrgId,
						assignments: [], customProperties: {},
						// _assignmentSeed carries data to build the first assignment in applyImport
						_assignmentSeed: { nik, resolvedOrgId, workLocation, orgUnitId, positionId, employmentType, joinDate }
					} as any);
					generateDataWarnings({ nik, email, firstName: firstName!, lastName: lastName || '' })
						.forEach(warning => preview.warnings.push({ row, warning }));
				}
			}

			const allIdentities = [...preview.toCreate, ...preview.toUpdate.map(u => ({ ...u.identity, ...u.changes }))];
			detectNIKEmailConflicts(allIdentities).forEach(conflict => {
				preview.warnings.push({ row: {}, warning: `⚠️ ${conflict.message}` });
			});

			const serialized = serializeObjectIds(preview);
			const previewId = cachePreview(serialized);
			return { success: true, previewId, preview: serialized };
		} catch (err: any) {
			return fail(500, { error: err.message });
		}
	},

	applyImport: async ({ locals }) => {
		const previewId = locals.body?.previewId as string;
		if (!previewId) return fail(400, { error: 'No preview ID provided' });
		const preview = consumePreview(previewId);
		if (!preview) return fail(400, { error: 'Preview expired or not found — please re-upload the CSV' });

		try {
			let created = 0, updated = 0;
			const errors: string[] = [];

			const defaultPassword = await passwordService.hashPassword('Aksara@2025');

			for (const identity of preview.toCreate) {
				const seed = identity._assignmentSeed;
				const firstAssignment = seed ? {
					_id: new ObjectId(),
					organizationId: seed.resolvedOrgId || identity.organizationId || locals.user?.organizationId || '',
					employeeId: seed.nik || undefined,
					workLocation: seed.workLocation || undefined,
					orgUnitId: seed.orgUnitId || undefined,
					positionId: seed.positionId || undefined,
					employmentType: seed.employmentType || 'permanent',
					employmentStatus: 'active',
					startDate: seed.joinDate ? new Date(seed.joinDate) : new Date(),
					createdAt: new Date(),
					createdBy: 'csv-import'
				} : null;

				const { _assignmentSeed: _, ...identityData } = identity;
				const result = await createIdentity({
					...identityData,
					organizationId: identity.organizationId || locals.user?.organizationId || '',
					password: defaultPassword,
					isActive: true, emailVerified: false,
					assignments: firstAssignment ? [firstAssignment] : [],
				} as any);
				if (result.ok) created++;
				else errors.push(`Failed to create ${identity.fullName}: ${result.error}`);
			}

			for (const update of preview.toUpdate) {
				const result = await updateIdentity(update.identity._id.toString(), update.changes as any);
				if (result.ok) updated++;
				else errors.push(`Failed to update ${update.identity.fullName}: ${result.error}`);
			}

			return {
				success: true,
				message: `Successfully imported: ${created} created, ${updated} updated`,
				stats: { created, updated, errors }
			};
		} catch (err: any) {
			return fail(500, { error: err.message });
		}
	},

	testEntraConnection: async ({ locals }) => {
		const formData = locals.body
		const tenantId = formData?.tenantId;
		const clientId = formData?.clientId;
		let clientSecret = formData?.clientSecret;
		const organizationId = formData?.organizationId;
		const useExistingSecret = formData?.useExistingSecret === 'true';

		if (!tenantId || !clientId) return fail(400, { error: 'Missing required fields: tenantId, clientId' });

		if (!clientSecret && useExistingSecret && organizationId) {
			const existing = await db.entraidConfigs.findOne({ organizationId } as any) as any;
			if (!existing?.clientSecret) return fail(400, { error: 'No existing client secret found.' });
			clientSecret = existing.clientSecret;
		}
		if (!clientSecret) return fail(400, { error: 'Client secret is required' });

		try {
			const result = await testEntraIDConnection({ tenantId, clientId, clientSecret });
			if (!result.success) return fail(400, { error: result.error || 'Connection test failed' });

			if (organizationId) {
				await db.entraidConfigs.updateOne(
					{ organizationId } as any,
					{ isConnected: true, lastTestedAt: new Date(), lastTestStatus: 'success' } as any
				);
			}

			return { success: true, message: result.message || 'Connection successful!' };
		} catch (err: any) {
			if (organizationId) {
				await db.entraidConfigs.updateOne(
					{ organizationId } as any,
					{ isConnected: false, lastTestedAt: new Date(), lastTestStatus: 'failed', lastTestError: err.message } as any
				);
			}
			return fail(500, { error: err.message || 'Failed to test connection' });
		}
	},

	saveEntraConfig: async ({  locals }) => {
		const formData = locals.body
		const tenantId = formData?.tenantId;
		const clientId = formData?.clientId;
		const clientSecret = formData?.clientSecret;
		const organizationId = formData?.organizationId;
		const autoSync = formData?.autoSync === 'true';

		if (!tenantId || !clientId || !organizationId) return fail(400, { error: 'Missing required fields' });

		try {
			const existing = await db.entraidConfigs.findOne({ organizationId } as any) as any;
			const finalSecret = clientSecret || existing?.clientSecret;
			if (!finalSecret) return fail(400, { error: 'Client secret is required for new configuration' });

			const testResult = await testEntraIDConnection({ tenantId, clientId, clientSecret: finalSecret });

			await db.entraidConfigs.upsertOne({ organizationId } as any, {
				organizationId, tenantId, clientId, clientSecret: finalSecret,
				isConnected: testResult.success,
				lastTestedAt: new Date(), lastTestStatus: testResult.success ? 'success' : 'failed',
				lastTestError: testResult.error, syncUsers: true, syncGroups: false, autoSync,
				updatedBy: locals.user?.userId || 'system'
			} as any);

			return {
				success: true,
				message: testResult.success ? 'Configuration saved and connection successful!' : 'Configuration saved but connection failed.',
				connectionStatus: testResult.success ? 'connected' : 'failed'
			};
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to save configuration' });
		}
	},

	fetchEntraUsers: async ({ locals }) => {
		const formData = locals.body
		const organizationId = formData?.organizationId;
		const filterQuery = formData?.filterQuery;
		const exportToCsv = formData?.exportToCsv === 'true';

		if (!organizationId) return fail(400, { error: 'Organization ID is required' });

		try {
			const config = await db.entraidConfigs.findOne({ organizationId } as any) as any;
			if (!config) return fail(400, { error: 'EntraID configuration not found' });

			const tokenResponse = await getMicrosoftGraphToken(config.tenantId, config.clientId, config.clientSecret);
			let url = exportToCsv
				? 'https://graph.microsoft.com/v1.0/users?$top=999'
				: 'https://graph.microsoft.com/v1.0/users?$top=3';
			url += '&$select=id,displayName,givenName,surname,userPrincipalName,mail,mobilePhone,businessPhones,jobTitle,department,companyName,officeLocation,employeeId,userType,accountEnabled,createdDateTime';
			if (filterQuery) url += `&$filter=${encodeURIComponent(filterQuery)}`;

			const response = await fetch(url, { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } });
			if (!response.ok) return fail(400, { error: `Failed to fetch users: ${await response.text()}` });

			const data = await response.json();
			const users = data.value || [];

			if (exportToCsv) {
				const allFields = new Set<string>();
				users.forEach((u: any) => Object.keys(u).forEach(k => allFields.add(k)));
				const fields = Array.from(allFields).sort();
				const csvLines = [fields.join(',')];
				users.forEach((u: any) => {
					csvLines.push(fields.map(f => {
						const v = u[f];
						if (v == null) return '';
						const s = String(v);
						return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
					}).join(','));
				});
				return { success: true, csvContent: csvLines.join('\n'), userCount: users.length };
			}

			return { success: true, sampleUsers: users };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to fetch users from EntraID' });
		}
	},

	updateFieldMapping: async ({ locals }) => {
		const formData = locals.body
		const organizationId = formData?.organizationId;
		const fieldMappingJson = formData?.fieldMapping;

		if (!organizationId || !fieldMappingJson) return fail(400, { error: 'Missing required fields' });

		try {
			await db.entraidConfigs.updateOne(
				{ organizationId } as any,
				{ fieldMapping: JSON.parse(fieldMappingJson) } as any
			);
			return { success: true, message: 'Field mapping updated successfully!' };
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to update field mapping' });
		}
	},

	syncEntraUsers: async ({  locals }) => {
		const formData = locals.body
		const organizationId = formData?.organizationId;
		if (!organizationId) return fail(400, { error: 'Organization ID is required' });

		try {
			const config = await db.entraidConfigs.findOne({ organizationId } as any) as any;
			if (!config) return fail(400, { error: 'EntraID configuration not found' });
			if (!config.fieldMapping) return fail(400, { error: 'Field mapping not configured.' });

			const tokenResponse = await getMicrosoftGraphToken(config.tenantId, config.clientId, config.clientSecret);
			const result = await getEntraIDUsers(tokenResponse.access_token);
			const entraUsers = result.users;

			let created = 0, updated = 0;
			const errors: string[] = [];

			for (const entraUser of entraUsers) {
				try {
					const mappedData: Partial<Identity> = { identityType: 'employee' };
					const customProps: Record<string, any> = {};

					for (const [identityField, mappingConfig] of Object.entries(config.fieldMapping)) {
						const mc = mappingConfig as any;
						if (mc.enabled && mc.direction !== 'to_entra') {
							let value = (entraUser as any)[mc.entraField];
							if (value != null) {
								if (mc.transformation === 'orgCodeToId') {
									const org = await db.organizations.findOne({ code: value } as any) as any;
									value = org?._id?.toString() || value;
								} else if (mc.transformation === 'orgUnitNameToId') {
									const unit = await db.orgUnits.findOne({ name: value } as any) as any;
									value = unit?._id?.toString() || value;
								} else if (mc.transformation === 'positionNameToId') {
									const pos = await db.positions.findOne({ title: value } as any) as any;
									value = pos?._id?.toString() || value;
								} else if (mc.transformation === 'lowercase') value = String(value).toLowerCase();
								else if (mc.transformation === 'uppercase') value = String(value).toUpperCase();
								else if (mc.transformation === 'trim') value = String(value).trim();
								else if (mc.transformation === 'toCustomProperty') { customProps[mc.entraField] = value; continue; }
								(mappedData as any)[identityField] = value;
							}
						}
					}

					if (Object.keys(customProps).length > 0) mappedData.customProperties = customProps;
					if (!mappedData.email && entraUser.userPrincipalName) mappedData.email = entraUser.userPrincipalName;
					if (!mappedData.firstName && entraUser.givenName) mappedData.firstName = entraUser.givenName;
					if (!mappedData.lastName && entraUser.surname) mappedData.lastName = entraUser.surname;
					mappedData.fullName = `${mappedData.firstName || ''} ${mappedData.lastName || ''}`.trim();

					if (!mappedData.email) { errors.push(`Skipped: No email for ${entraUser.displayName}`); continue; }

					const existing = await findIdentityByEmail(mappedData.email);
					if (existing) {
						await updateIdentity(existing._id!.toString(), { ...mappedData } as any);
						updated++;
					} else {
						await createIdentity({
							...mappedData, organizationId, password: 'temp-password-hash',
							isActive: true, emailVerified: false, roles: ['user'],
							employmentStatus: 'active', secondaryAssignments: [], customProperties: {},
						} as any);
						created++;
					}
				} catch (err: any) {
					errors.push(`Failed to sync ${entraUser.displayName}: ${err.message}`);
				}
			}

			await logAudit({ action: 'sync_completed', resource: 'sync', identityId: locals.user?.userId || 'manual', status: errors.length > 0 ? 'failed' : 'success', organizationId, details: { syncType: 'entra_id_user', recordsProcessed: entraUsers.length, successCount: created + updated, failureCount: errors.length, errorMessage: errors.length > 0 ? errors.join('; ') : undefined } });

			return {
				success: true,
				message: `Sync completed! Created: ${created}, Updated: ${updated}, Errors: ${errors.length}`,
				stats: { created, updated, errors }
			};
		} catch (err: any) {
			return fail(500, { error: err.message || 'Failed to sync users from EntraID' });
		}
	}
};
