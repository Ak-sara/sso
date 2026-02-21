import type { PageServerLoad } from './$types';
import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDB();

	try {
		// Get audit log
		const auditLog = await db.collection('audit_logs').findOne({ _id: new ObjectId(params.id) });

		if (!auditLog) {
			throw error(404, 'Log audit tidak ditemukan');
		}

		// Get identity info if exists
		let identityInfo = null;
		if (auditLog.identityId && auditLog.identityId !== 'system' && ObjectId.isValid(auditLog.identityId)) {
			const identity = await db.collection('identities').findOne({ _id: new ObjectId(auditLog.identityId) });
			if (identity) {
				identityInfo = {
					_id: identity._id.toString(),
					fullName: identity.fullName,
					email: identity.email,
					username: identity.username,
					employeeId: identity.employeeId,
					identityType: identity.identityType
				};
			}
		} else if (auditLog.identityId === 'system') {
			identityInfo = {
				_id: 'system',
				fullName: 'System',
				email: null,
				username: 'system',
				employeeId: null,
				identityType: 'system'
			};
		}

		// Get organization info if exists
		let organizationInfo = null;
		if (auditLog.organizationId && ObjectId.isValid(auditLog.organizationId)) {
			const organization = await db.collection('organizations').findOne({ _id: new ObjectId(auditLog.organizationId) });
			if (organization) {
				organizationInfo = {
					_id: organization._id.toString(),
					name: organization.name,
					code: organization.code
				};
			}
		}

		return {
			auditLog: {
				...auditLog,
				_id: auditLog._id.toString(),
				timestamp: auditLog.timestamp.toISOString()
			},
			identityInfo,
			organizationInfo
		};
	} catch (err) {
		console.error('Load audit log error:', err);
		if (err instanceof Response) throw err;
		throw error(500, 'Gagal memuat data log audit');
	}
};
