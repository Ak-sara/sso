import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { identityRepository } from '$lib/db/identity-repository';
import type { Identity, EntraIDConfig } from '$lib/db/schemas';
import { getDB } from '$lib/db/connection';
import { testEntraIDConnection, getMicrosoftGraphToken, getEntraIDUsers } from '$lib/entraid/microsoft-graph';

export const load: PageServerLoad = async ({ url }) => {
	const tab = url.searchParams.get('tab') || 'csv';
	const selectedOrgId = url.searchParams.get('org');
	const db = getDB();

	// Get all organizations for dropdown
	const organizations = await db.collection('organizations')
		.find({})
		.sort({ name: 1 })
		.toArray();

	const orgsList = organizations.map(org => ({
		_id: org._id.toString(),
		name: org.name,
		code: org.code
	}));

	// Determine which organization to use
	let selectedOrg;
	if (selectedOrgId) {
		selectedOrg = organizations.find(o => o._id.toString() === selectedOrgId);
	}
	if (!selectedOrg) {
		// Default to first organization (or IAS if exists)
		selectedOrg = organizations.find(o => o.code === 'IAS') || organizations[0];
	}

	let entraConfig = null;
	let syncHistory = [];

	// If entra tab, load EntraID configuration and sync history
	if (tab === 'entra' && selectedOrg) {
		const config = await db.collection<EntraIDConfig>('entraid_configs').findOne({
			organizationId: selectedOrg._id.toString(),
		});

		if (config) {
			entraConfig = {
				...config,
				_id: config._id?.toString(),
				clientSecret: '••••••••••••', // Mask the secret
			};
		}

		// Get recent sync history
		const logs = await db
			.collection('entraid_sync_logs')
			.find({ organizationId: selectedOrg._id.toString() })
			.sort({ createdAt: -1 })
			.limit(10)
			.toArray();

		syncHistory = logs.map((log) => ({
			...log,
			_id: log._id?.toString(),
		}));

	}

	return {
		currentTab: tab,
		organizations: orgsList,
		selectedOrganization: selectedOrg ? {
			_id: selectedOrg._id.toString(),
			name: selectedOrg.name,
			code: selectedOrg.code
		} : null,
		organizationId: selectedOrg?._id?.toString() || null,
		entraConfig,
		syncHistory
	};
};

export const actions: Actions = {
	uploadCSV: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return fail(400, { error: 'No file uploaded' });
		}

		try {
			// Read CSV content
			const content = await file.text();
			const lines = content.split('\n').filter(line => line.trim());

			if (lines.length === 0) {
				return fail(400, { error: 'CSV file is empty' });
			}

			// Parse CSV header
			const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

			// Parse CSV rows
			const rows = lines.slice(1).map(line => {
				const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
				const row: Record<string, string> = {};
				headers.forEach((header, index) => {
					row[header] = values[index] || '';
				});
				return row;
			});

			// Preview: Check what will be created vs updated
			const preview = {
				toCreate: [] as Array<Partial<Identity>>,
				toUpdate: [] as Array<{ identity: Identity; changes: Partial<Identity> }>,
				warnings: [] as Array<{ row: any; warning: string }>,
				errors: [] as Array<{ row: any; error: string }>
			};

			for (const row of rows) {
				// Required fields
				const nik = row.NIK || row.nik || row.employeeId;
				const firstName = row.FirstName || row.firstName || row.first_name;
				const lastName = row.LastName || row.lastName || row.last_name;

				if (!nik) {
					preview.errors.push({ row, error: 'NIK is required' });
					continue;
				}

				if (!firstName || !lastName) {
					preview.errors.push({ row, error: 'FirstName and LastName are required' });
					continue;
				}

				// Check if identity exists
				const existing = await identityRepository.findByEmployeeId(nik);

				const email = row.Email || row.email;
				const orgUnit = row.OrgUnit || row.orgUnit || row.org_unit;
				const position = row.Position || row.position;
				const employmentType = (row.EmploymentType || row.employmentType || row.employment_type || 'permanent').toLowerCase() as any;
				const workLocation = row.WorkLocation || row.workLocation || row.work_location;

				if (existing) {
					// Will update
					const changes: Partial<Identity> = {};

					if (email && email !== existing.email) changes.email = email;
					if (firstName !== existing.firstName) changes.firstName = firstName;
					if (lastName !== existing.lastName) changes.lastName = lastName;
					changes.fullName = `${firstName} ${lastName}`;

					// Only add to update list if there are actual changes
					if (Object.keys(changes).length > 1) { // > 1 because fullName is always set
						preview.toUpdate.push({ identity: existing, changes });
					}
				} else {
					// Will create
					const newIdentity: Partial<Identity> = {
						identityType: 'employee',
						username: email || nik,
						email: email || undefined,
						firstName,
						lastName,
						fullName: `${firstName} ${lastName}`,
						employeeId: nik,
						employmentType,
						employmentStatus: 'active',
						isActive: true, // Active by default
						roles: ['user'],
						joinDate: new Date(),
						workLocation,
						secondaryAssignments: [],
						customProperties: {}
					};

					preview.toCreate.push(newIdentity);

					// Warning if no email
					if (!email) {
						preview.warnings.push({
							row,
							warning: `No email provided for ${firstName} ${lastName} - NIK will be used as username`
						});
					}
				}
			}

			return {
				success: true,
				preview
			};

		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	},

	applyImport: async ({ request }) => {
		const formData = await request.formData();
		const previewData = formData.get('previewData');

		if (!previewData) {
			return fail(400, { error: 'No preview data provided' });
		}

		try {
			const preview = JSON.parse(previewData as string);
			let created = 0;
			let updated = 0;
			const errors: string[] = [];

			// Create new identities
			for (const identity of preview.toCreate) {
				try {
					await identityRepository.create({
						...identity,
						organizationId: identity.organizationId || 'default-org-id', // TODO: Get from session
						password: 'temp-password-hash', // TODO: Generate temp password
						isActive: true,
						emailVerified: false,
						createdAt: new Date(),
						updatedAt: new Date()
					});
					created++;
				} catch (error: any) {
					errors.push(`Failed to create ${identity.fullName}: ${error.message}`);
				}
			}

			// Update existing identities
			for (const update of preview.toUpdate) {
				try {
					await identityRepository.updateById(update.identity._id, update.changes);
					updated++;
				} catch (error: any) {
					errors.push(`Failed to update ${update.identity.fullName}: ${error.message}`);
				}
			}

			return {
				success: true,
				message: `Successfully imported: ${created} created, ${updated} updated`,
				stats: { created, updated, errors }
			};

		} catch (error: any) {
			return fail(500, { error: error.message });
		}
	},

	testEntraConnection: async ({ request }) => {
		const formData = await request.formData();
		const db = getDB();

		const tenantId = formData.get('tenantId')?.toString();
		const clientId = formData.get('clientId')?.toString();
		let clientSecret = formData.get('clientSecret')?.toString();
		const organizationId = formData.get('organizationId')?.toString();
		const useExistingSecret = formData.get('useExistingSecret') === 'true';

		if (!tenantId || !clientId) {
			return fail(400, {
				error: 'Missing required fields: tenantId, clientId',
			});
		}

		// If no secret provided and useExistingSecret is true, fetch from database
		if (!clientSecret && useExistingSecret && organizationId) {
			const existingConfig = await db.collection<EntraIDConfig>('entraid_configs').findOne({
				organizationId,
			});

			if (!existingConfig?.clientSecret) {
				return fail(400, {
					error: 'No existing client secret found. Please enter the secret.',
				});
			}

			clientSecret = existingConfig.clientSecret;
		}

		if (!clientSecret) {
			return fail(400, {
				error: 'Client secret is required',
			});
		}

		try {
			// Test connection
			const result = await testEntraIDConnection({
				tenantId,
				clientId,
				clientSecret,
			});

			if (!result.success) {
				return fail(400, {
					error: result.error || 'Connection test failed',
				});
			}

			// Update connection status in database
			await db.collection<EntraIDConfig>('entraid_configs').updateOne(
				{ organizationId },
				{
					$set: {
						isConnected: true,
						lastTestedAt: new Date(),
						lastTestStatus: 'success',
						lastTestError: undefined,
					},
				}
			);

			return {
				success: true,
				message: result.message || 'Connection successful!',
			};
		} catch (error: any) {
			console.error('Test connection error:', error);

			// Update failure status
			if (organizationId) {
				await db.collection<EntraIDConfig>('entraid_configs').updateOne(
					{ organizationId },
					{
						$set: {
							isConnected: false,
							lastTestedAt: new Date(),
							lastTestStatus: 'failed',
							lastTestError: error.message,
						},
					}
				);
			}

			return fail(500, {
				error: error.message || 'Failed to test connection',
			});
		}
	},

	saveEntraConfig: async ({ request, locals }) => {
		const formData = await request.formData();
		const db = getDB();

		const tenantId = formData.get('tenantId')?.toString();
		const clientId = formData.get('clientId')?.toString();
		const clientSecret = formData.get('clientSecret')?.toString();
		const organizationId = formData.get('organizationId')?.toString();
		const autoSync = formData.get('autoSync') === 'true';

		if (!tenantId || !clientId || !organizationId) {
			return fail(400, {
				error: 'Missing required fields',
			});
		}

		try {
			// Get existing config to preserve client secret if not provided
			const existingConfig = await db.collection<EntraIDConfig>('entraid_configs').findOne({
				organizationId,
			});

			const finalClientSecret = clientSecret || existingConfig?.clientSecret;

			if (!finalClientSecret) {
				return fail(400, {
					error: 'Client secret is required for new configuration',
				});
			}

			// Test connection first
			const testResult = await testEntraIDConnection({
				tenantId,
				clientId,
				clientSecret: finalClientSecret,
			});

			const configData: Partial<EntraIDConfig> = {
				organizationId,
				tenantId,
				clientId,
				clientSecret: finalClientSecret, // TODO: Encrypt in production!
				isConnected: testResult.success,
				lastTestedAt: new Date(),
				lastTestStatus: testResult.success ? 'success' : 'failed',
				lastTestError: testResult.error,
				syncUsers: true,
				syncGroups: false,
				autoSync,
				updatedAt: new Date(),
				updatedBy: locals.user?.id || 'system',
			};

			if (existingConfig) {
				// Update existing
				await db.collection<EntraIDConfig>('entraid_configs').updateOne(
					{ organizationId },
					{
						$set: configData,
					}
				);
			} else {
				// Create new
				await db.collection<EntraIDConfig>('entraid_configs').insertOne({
					...configData,
					createdAt: new Date(),
					createdBy: locals.user?.id || 'system',
				} as EntraIDConfig);
			}

			return {
				success: true,
				message: testResult.success
					? 'Configuration saved and connection successful!'
					: 'Configuration saved but connection failed. Please check your credentials.',
				connectionStatus: testResult.success ? 'connected' : 'failed',
			};
		} catch (error: any) {
			console.error('Save config error:', error);
			return fail(500, {
				error: error.message || 'Failed to save configuration',
			});
		}
	},

	fetchEntraUsers: async ({ request }) => {
		const formData = await request.formData();
		const db = getDB();
		const organizationId = formData.get('organizationId')?.toString();
		const filterQuery = formData.get('filterQuery')?.toString();
		const exportToCsv = formData.get('exportToCsv') === 'true';

		if (!organizationId) {
			return fail(400, { error: 'Organization ID is required' });
		}

		try {
			// Get config
			const config = await db.collection<EntraIDConfig>('entraid_configs').findOne({
				organizationId,
			});

			if (!config) {
				return fail(400, { error: 'EntraID configuration not found' });
			}

			// Get access token
			const tokenResponse = await getMicrosoftGraphToken(
				config.tenantId,
				config.clientId,
				config.clientSecret
			);

			// Build URL with filter and select additional fields
			let url = exportToCsv
				? 'https://graph.microsoft.com/v1.0/users?$top=999' // Export all users
				: 'https://graph.microsoft.com/v1.0/users?$top=3';   // Preview 3 users

			// Add $select to include additional fields (faxNumber, city, etc.)
			url += '&$select=id,displayName,givenName,surname,userPrincipalName,mail,mobilePhone,businessPhones,jobTitle,department,companyName,officeLocation,streetAddress,city,state,postalCode,country,faxNumber,employeeId,userType,accountEnabled,createdDateTime';

			if (filterQuery) {
				url += `&$filter=${encodeURIComponent(filterQuery)}`;
			}

			// Fetch users with optional filter
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${tokenResponse.access_token}`,
				},
			});

			if (!response.ok) {
				const error = await response.text();
				return fail(400, { error: `Failed to fetch users: ${error}` });
			}

			const data = await response.json();
			const users = data.value || [];

			// If export to CSV requested, generate CSV
			if (exportToCsv) {
				// Get all unique fields from users
				const allFields = new Set<string>();
				users.forEach((user: any) => {
					Object.keys(user).forEach(key => allFields.add(key));
				});
				const fields = Array.from(allFields).sort();

				// Generate CSV header
				const csvLines = [fields.join(',')];

				// Generate CSV rows
				users.forEach((user: any) => {
					const row = fields.map(field => {
						const value = user[field];
						if (value === null || value === undefined) return '';
						// Escape commas and quotes
						const stringValue = String(value);
						if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
							return `"${stringValue.replace(/"/g, '""')}"`;
						}
						return stringValue;
					});
					csvLines.push(row.join(','));
				});

				return {
					success: true,
					csvContent: csvLines.join('\n'),
					userCount: users.length,
				};
			}

			return {
				success: true,
				sampleUsers: users,
			};
		} catch (error: any) {
			console.error('Fetch users error:', error);
			return fail(500, {
				error: error.message || 'Failed to fetch users from EntraID',
			});
		}
	},

	updateFieldMapping: async ({ request }) => {
		const formData = await request.formData();
		const db = getDB();

		const organizationId = formData.get('organizationId')?.toString();
		const fieldMappingJson = formData.get('fieldMapping')?.toString();

		if (!organizationId || !fieldMappingJson) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			const fieldMapping = JSON.parse(fieldMappingJson);

			// Update field mapping
			await db.collection<EntraIDConfig>('entraid_configs').updateOne(
				{ organizationId },
				{
					$set: {
						fieldMapping,
						updatedAt: new Date(),
					},
				}
			);

			return {
				success: true,
				message: 'Field mapping updated successfully!',
			};
		} catch (error: any) {
			console.error('Update field mapping error:', error);
			return fail(500, {
				error: error.message || 'Failed to update field mapping',
			});
		}
	},

	syncEntraUsers: async ({ request, locals }) => {
		const formData = await request.formData();
		const db = getDB();
		const organizationId = formData.get('organizationId')?.toString();

		if (!organizationId) {
			return fail(400, { error: 'Organization ID is required' });
		}

		try {
			// Get config
			const config = await db.collection<EntraIDConfig>('entraid_configs').findOne({
				organizationId,
			});

			if (!config) {
				return fail(400, { error: 'EntraID configuration not found' });
			}

			if (!config.fieldMapping) {
				return fail(400, { error: 'Field mapping not configured. Please configure field mapping first.' });
			}

			// Get access token
			const tokenResponse = await getMicrosoftGraphToken(
				config.tenantId,
				config.clientId,
				config.clientSecret
			);

			// Fetch all users
			const result = await getEntraIDUsers(tokenResponse.access_token);
			const entraUsers = result.users;

			let created = 0;
			let updated = 0;
			const errors: string[] = [];

			// Helper function to apply transformations
			const applyTransformation = async (value: any, transformation: string, fieldName?: string): Promise<any> => {
				if (!transformation || transformation === '') return value;

				switch (transformation) {
					case 'orgCodeToId':
						// Lookup organization by code and return ID
						const org = await db.collection('organizations').findOne({ code: value });
						return org?._id?.toString() || value;

					case 'orgUnitNameToId':
						// Lookup org unit by name and return ID
						const orgUnit = await db.collection('org_units').findOne({ name: value });
						return orgUnit?._id?.toString() || value;

					case 'positionNameToId':
						// Lookup position by title and return ID
						const position = await db.collection('positions').findOne({ title: value });
						return position?._id?.toString() || value;

					case 'lowercase':
						return String(value).toLowerCase();

					case 'uppercase':
						return String(value).toUpperCase();

					case 'trim':
						return String(value).trim();

					case 'toCustomProperty':
						// This will be handled specially - return marker
						return { __customProperty: fieldName, value };

					default:
						return value;
				}
			};

			// Process each user
			for (const entraUser of entraUsers) {
				try {
					// Map fields based on configuration
					const mappedData: Partial<Identity> = {
						identityType: 'employee',
					};
					const customProps: Record<string, any> = {};

					for (const [identityField, mappingConfig] of Object.entries(config.fieldMapping)) {
						if (mappingConfig.enabled && mappingConfig.direction !== 'to_entra') {
							const entraField = mappingConfig.entraField;
							let value = (entraUser as any)[entraField];

							if (value !== undefined && value !== null) {
								// Apply transformation if configured
								if ((mappingConfig as any).transformation) {
									value = await applyTransformation(value, (mappingConfig as any).transformation, entraField);

									// Check if it should go to customProperties
									if (value && typeof value === 'object' && value.__customProperty) {
										customProps[value.__customProperty] = value.value;
										continue; // Skip setting it as regular field
									}
								}
								(mappedData as any)[identityField] = value;
							}
						}
					}

					// Add custom properties if any
					if (Object.keys(customProps).length > 0) {
						mappedData.customProperties = customProps;
					}

					// Ensure required fields
					if (!mappedData.email && entraUser.userPrincipalName) {
						mappedData.email = entraUser.userPrincipalName;
					}
					if (!mappedData.username) {
						mappedData.username = mappedData.email || entraUser.userPrincipalName;
					}
					if (!mappedData.firstName && entraUser.givenName) {
						mappedData.firstName = entraUser.givenName;
					}
					if (!mappedData.lastName && entraUser.surname) {
						mappedData.lastName = entraUser.surname;
					}
					mappedData.fullName = `${mappedData.firstName || ''} ${mappedData.lastName || ''}`.trim();

					if (!mappedData.email) {
						errors.push(`Skipped user: No email found for ${entraUser.displayName}`);
						continue;
					}

					// Check if identity exists
					const existing = await identityRepository.findByEmail(mappedData.email);

					if (existing) {
						// Update existing identity
						await identityRepository.updateById(existing._id, {
							...mappedData,
							updatedAt: new Date(),
						});
						updated++;
					} else {
						// Create new identity
						await identityRepository.create({
							...mappedData,
							organizationId,
							password: 'temp-password-hash', // TODO: Generate proper temp password
							isActive: true,
							emailVerified: false,
							roles: ['user'],
							employmentStatus: 'active',
							secondaryAssignments: [],
							customProperties: {},
							createdAt: new Date(),
							updatedAt: new Date(),
						} as Identity);
						created++;
					}
				} catch (error: any) {
					errors.push(`Failed to sync ${entraUser.displayName}: ${error.message}`);
				}
			}

			// Log sync result
			await db.collection('entraid_sync_logs').insertOne({
				syncId: `sync-${Date.now()}`,
				organizationId,
				type: 'user',
				status: 'completed',
				startedAt: new Date(),
				completedAt: new Date(),
				totalRecords: entraUsers.length,
				successCount: created + updated,
				failureCount: errors.length,
				errors: errors.map(e => ({ recordId: '', error: e })),
				triggeredBy: locals.user?.id || 'manual',
				createdAt: new Date(),
			});

			return {
				success: true,
				message: `Sync completed! Created: ${created}, Updated: ${updated}, Errors: ${errors.length}`,
				stats: { created, updated, errors },
			};
		} catch (error: any) {
			console.error('Sync users error:', error);
			return fail(500, {
				error: error.message || 'Failed to sync users from EntraID',
			});
		}
	}
};
