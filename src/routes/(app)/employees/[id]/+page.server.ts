import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDB();

	try {
		// Get employee with populated relations
		const employee = await db.collection('employees').findOne({ _id: new ObjectId(params.id) });

		if (!employee) {
			throw error(404, 'Karyawan tidak ditemukan');
		}

		// Get organization name
		const organization = employee.organizationId
			? await db.collection('organizations').findOne({ _id: new ObjectId(employee.organizationId) })
			: null;

		// Get org unit name
		const orgUnit = employee.orgUnitId
			? await db.collection('org_units').findOne({ _id: new ObjectId(employee.orgUnitId) })
			: null;

		// Get position name
		const position = employee.positionId
			? await db.collection('positions').findOne({ _id: new ObjectId(employee.positionId) })
			: null;

		// Get SSO user if linked
		const ssoUser = employee.userId
			? await db.collection('users').findOne({ _id: new ObjectId(employee.userId) })
			: null;

		// Get assignment history
		const history = await db.collection('employee_history')
			.find({ employeeId: new ObjectId(params.id) })
			.sort({ eventDate: -1 })
			.toArray();

		// Populate history with organization/unit/position names
		const populatedHistory = await Promise.all(history.map(async (event) => {
			const org = event.organizationId ? await db.collection('organizations').findOne({ _id: new ObjectId(event.organizationId) }) : null;
			const unit = event.orgUnitId ? await db.collection('org_units').findOne({ _id: new ObjectId(event.orgUnitId) }) : null;
			const pos = event.positionId ? await db.collection('positions').findOne({ _id: new ObjectId(event.positionId) }) : null;

			return {
				...event,
				_id: event._id.toString(),
				organizationName: org?.name || null,
				orgUnitName: unit?.name || null,
				positionName: pos?.name || null
			};
		}));

		// Get all organizations for mutation dropdown
		const organizations = await db.collection('organizations').find({}).toArray();
		const orgUnits = await db.collection('org_units').find({}).toArray();
		const positions = await db.collection('positions').find({}).toArray();

		return {
			employee: {
				...employee,
				_id: employee._id.toString(),
				organizationName: organization?.name || null,
				orgUnitName: orgUnit?.name || null,
				positionName: position?.name || null,
			},
			ssoUser: ssoUser ? {
				...ssoUser,
				_id: ssoUser._id.toString(),
			} : null,
			history: populatedHistory,
			organizations: organizations.map(o => ({ _id: o._id.toString(), name: o.name })),
			orgUnits: orgUnits.map(u => ({ _id: u._id.toString(), name: u.name, organizationId: u.organizationId?.toString() })),
			positions: positions.map(p => ({ _id: p._id.toString(), name: p.name }))
		};
	} catch (err) {
		console.error('Load error:', err);
		if (err instanceof Response) throw err;
		throw error(500, 'Gagal memuat data karyawan');
	}
};

export const actions = {
	update: async ({ request, params }) => {
		const db = getDB();
		const formData = await request.formData();

		const updateData = {
			firstName: formData.get('firstName') as string,
			lastName: formData.get('lastName') as string,
			fullName: `${formData.get('firstName')} ${formData.get('lastName')}`,
			email: formData.get('email') as string,
			phone: formData.get('phone') as string,
			gender: formData.get('gender') as string,
			dateOfBirth: formData.get('dateOfBirth') ? new Date(formData.get('dateOfBirth') as string) : null,
			employmentType: formData.get('employmentType') as string,
			employmentStatus: formData.get('employmentStatus') as string,
			joinDate: new Date(formData.get('joinDate') as string),
			probationEndDate: formData.get('probationEndDate') ? new Date(formData.get('probationEndDate') as string) : null,
			updatedAt: new Date(),
			updatedBy: 'system' // TODO: Get from session
		};

		// Validation
		if (!updateData.firstName || !updateData.lastName || !updateData.email || !updateData.joinDate) {
			return fail(400, { error: 'Required fields missing' });
		}

		try {
			// Update employee
			await db.collection('employees').updateOne(
				{ _id: new ObjectId(params.id) },
				{ $set: updateData }
			);

			// Create audit log
			await db.collection('audit_log').insertOne({
				timestamp: new Date(),
				action: 'employee.update',
				resourceType: 'employee',
				resourceId: params.id,
				userId: 'system',
				details: updateData,
				ipAddress: null,
				userAgent: null
			});

			return { success: true };
		} catch (err) {
			console.error('Update employee error:', err);
			return fail(500, { error: 'Failed to update employee' });
		}
	},

	mutation: async ({ request, params }) => {
		const db = getDB();
		const formData = await request.formData();

		const mutationData = {
			organizationId: formData.get('organizationId') as string,
			orgUnitId: formData.get('orgUnitId') as string,
			positionId: formData.get('positionId') as string,
			workLocation: formData.get('workLocation') as string,
			region: formData.get('region') as string,
			effectiveDate: formData.get('effectiveDate') as string,
			mutationType: formData.get('mutationType') as string,
			notes: formData.get('notes') as string
		};

		if (!mutationData.effectiveDate) {
			return fail(400, { error: 'Tanggal efektif harus diisi' });
		}

		try {
			const employee = await db.collection('employees').findOne({ _id: new ObjectId(params.id) });
			if (!employee) {
				return fail(404, { error: 'Karyawan tidak ditemukan' });
			}

			// Update employee record
			await db.collection('employees').updateOne(
				{ _id: new ObjectId(params.id) },
				{
					$set: {
						organizationId: mutationData.organizationId ? new ObjectId(mutationData.organizationId) : null,
						orgUnitId: mutationData.orgUnitId ? new ObjectId(mutationData.orgUnitId) : null,
						positionId: mutationData.positionId ? new ObjectId(mutationData.positionId) : null,
						workLocation: mutationData.workLocation || null,
						region: mutationData.region || null,
						updatedAt: new Date(),
						updatedBy: 'system' // TODO: Get from session
					}
				}
			);

			// Create history entry
			await db.collection('employee_history').insertOne({
				employeeId: new ObjectId(params.id),
				eventType: mutationData.mutationType || 'mutation',
				eventDate: new Date(mutationData.effectiveDate),
				organizationId: mutationData.organizationId ? new ObjectId(mutationData.organizationId) : null,
				orgUnitId: mutationData.orgUnitId ? new ObjectId(mutationData.orgUnitId) : null,
				positionId: mutationData.positionId ? new ObjectId(mutationData.positionId) : null,
				details: {
					workLocation: mutationData.workLocation,
					region: mutationData.region,
					notes: mutationData.notes,
					previousOrganizationId: employee.organizationId?.toString(),
					previousOrgUnitId: employee.orgUnitId?.toString(),
					previousPositionId: employee.positionId?.toString()
				},
				createdAt: new Date(),
				createdBy: 'system'
			});

			// Audit log
			await db.collection('audit_log').insertOne({
				timestamp: new Date(),
				action: 'employee.mutation',
				resourceType: 'employee',
				resourceId: params.id,
				userId: 'system',
				details: mutationData,
				ipAddress: null,
				userAgent: null
			});

			return { success: true };
		} catch (err) {
			console.error('Mutation error:', err);
			return fail(500, { error: 'Gagal memproses mutasi karyawan' });
		}
	},

	offboard: async ({ request, params }) => {
		const db = getDB();
		const formData = await request.formData();

		const offboardData = {
			terminationDate: formData.get('terminationDate') as string,
			terminationReason: formData.get('terminationReason') as string,
			lastWorkingDay: formData.get('lastWorkingDay') as string,
			notes: formData.get('notes') as string,
			revokeSSOAccess: formData.get('revokeSSOAccess') === 'true'
		};

		if (!offboardData.terminationDate) {
			return fail(400, { error: 'Tanggal terminasi harus diisi' });
		}

		try {
			const employee = await db.collection('employees').findOne({ _id: new ObjectId(params.id) });
			if (!employee) {
				return fail(404, { error: 'Karyawan tidak ditemukan' });
			}

			// Update employee status
			await db.collection('employees').updateOne(
				{ _id: new ObjectId(params.id) },
				{
					$set: {
						employmentStatus: 'terminated',
						terminationDate: new Date(offboardData.terminationDate),
						terminationReason: offboardData.terminationReason,
						updatedAt: new Date(),
						updatedBy: 'system'
					}
				}
			);

			// Revoke SSO access if requested
			if (offboardData.revokeSSOAccess && employee.userId) {
				await db.collection('users').updateOne(
					{ _id: new ObjectId(employee.userId) },
					{
						$set: {
							enabled: false,
							updatedAt: new Date()
						}
					}
				);
			}

			// Create history entry
			await db.collection('employee_history').insertOne({
				employeeId: new ObjectId(params.id),
				eventType: 'offboarding',
				eventDate: new Date(offboardData.terminationDate),
				organizationId: employee.organizationId,
				orgUnitId: employee.orgUnitId,
				positionId: employee.positionId,
				details: {
					terminationReason: offboardData.terminationReason,
					lastWorkingDay: offboardData.lastWorkingDay,
					notes: offboardData.notes,
					ssoAccessRevoked: offboardData.revokeSSOAccess
				},
				createdAt: new Date(),
				createdBy: 'system'
			});

			// Audit log
			await db.collection('audit_log').insertOne({
				timestamp: new Date(),
				action: 'employee.offboarding',
				resourceType: 'employee',
				resourceId: params.id,
				userId: 'system',
				details: offboardData,
				ipAddress: null,
				userAgent: null
			});

			return { success: true };
		} catch (err) {
			console.error('Offboarding error:', err);
			return fail(500, { error: 'Gagal memproses offboarding karyawan' });
		}
	}
} satisfies Actions;
