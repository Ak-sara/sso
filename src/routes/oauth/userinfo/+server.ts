import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthStore } from '$lib/store.js';
import {
	employeeRepository,
	organizationRepository,
	orgUnitRepository,
	positionRepository
} from '$lib/db/repositories';

export const GET: RequestHandler = async ({ request }) => {
	const authorization = request.headers.get('authorization');

	if (!authorization || !authorization.startsWith('Bearer ')) {
		throw error(401, 'Missing or invalid authorization header');
	}

	const accessToken = authorization.substring(7);
	const tokenData = await oauthStore.getAccessToken(accessToken);

	if (!tokenData) {
		throw error(401, 'Invalid access token');
	}

	if (tokenData.expires_at < new Date()) {
		throw error(401, 'Access token has expired');
	}

	const user = await oauthStore.getUserById(tokenData.user_id);
	if (!user) {
		throw error(404, 'User not found');
	}

	// Build basic userinfo response
	const userInfo: any = {
		sub: user.id,
		email: user.email,
		name: user.name,
		email_verified: true
	};

	// Fetch employee data if user has employeeId
	try {
		const employee = await employeeRepository.findByUserId(user.id);

		if (employee) {
			// Add employee basic fields
			userInfo.employeeId = employee.employeeId;
			userInfo.firstName = employee.firstName;
			userInfo.lastName = employee.lastName;
			userInfo.fullName = employee.fullName;
			userInfo.phone = employee.phone;
			userInfo.workLocation = employee.workLocation;
			userInfo.region = employee.region;
			userInfo.employmentType = employee.employmentType;
			userInfo.employmentStatus = employee.employmentStatus;
			userInfo.isRemote = employee.isRemote;

			// Fetch and add Organization data (Entitas)
			if (employee.organizationId) {
				userInfo.organizationId = employee.organizationId;
				const organization = await organizationRepository.findById(employee.organizationId);
				if (organization) {
					userInfo.organizationName = organization.name;
					userInfo.organizationCode = organization.code;
				}
			}

			// Fetch and add OrgUnit data (Unit Kerja)
			if (employee.orgUnitId) {
				userInfo.orgUnitId = employee.orgUnitId;
				const orgUnit = await orgUnitRepository.findById(employee.orgUnitId);
				if (orgUnit) {
					userInfo.orgUnitName = orgUnit.name;
					userInfo.orgUnitCode = orgUnit.code;
					userInfo.orgUnitType = orgUnit.type;
				}
			}

			// Fetch and add Position data
			if (employee.positionId) {
				userInfo.positionId = employee.positionId;
				const position = await positionRepository.findById(employee.positionId);
				if (position) {
					userInfo.positionName = position.name;
					userInfo.positionCode = position.code;
					userInfo.positionLevel = position.level;
					userInfo.positionGrade = position.grade;
				}
			}

			// Add manager information
			if (employee.managerId) {
				userInfo.managerId = employee.managerId;
			}
		}
	} catch (err) {
		console.warn('Failed to fetch employee data for userinfo:', err);
		// Continue without employee data if fetch fails
	}

	return json(userInfo);
};

export const POST = GET; // Support both GET and POST for userinfo endpoint
