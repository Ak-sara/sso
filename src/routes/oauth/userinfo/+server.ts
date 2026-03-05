import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthStore } from '$lib/store.js';
import {
	identityRepository,
	organizationRepository,
	orgUnitRepository,
	positionRepository
} from '$lib/db/repositories';

// Debug: Check if identityRepository is loaded
console.log('🔍 userinfo +server.ts loaded');
console.log('   identityRepository:', identityRepository ? 'LOADED' : 'UNDEFINED');

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

	const user = await oauthStore.getUserById(tokenData.identity_id);
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

	// Fetch full identity data for additional fields
	try {
		const identity = await identityRepository.findById(user.id);

		if (identity) {
			// Add identity basic fields
			userInfo.identityType = identity.identityType;
			userInfo.username = identity.username;
			userInfo.firstName = identity.firstName;
			userInfo.lastName = identity.lastName;
			userInfo.fullName = identity.fullName;
			userInfo.phone = identity.phone;

			// Add employee-specific fields if identity is an employee
			if (identity.identityType === 'employee') {
				userInfo.employeeId = identity.employeeId;
				userInfo.workLocation = identity.workLocation;
				userInfo.region = identity.region;
				userInfo.employmentType = identity.employmentType;
				userInfo.employmentStatus = identity.employmentStatus;
				userInfo.isRemote = identity.isRemote;

				// Fetch and add Organization data (Entitas)
				if (identity.organizationId) {
					userInfo.organizationId = identity.organizationId;
					const organization = await organizationRepository.findById(identity.organizationId);
					if (organization) {
						userInfo.organizationName = organization.name;
						userInfo.organizationCode = organization.code;
					}
				}

				// Fetch and add OrgUnit data (Unit Kerja)
				if (identity.orgUnitId) {
					userInfo.orgUnitId = identity.orgUnitId;
					const orgUnit = await orgUnitRepository.findById(identity.orgUnitId);
					if (orgUnit) {
						userInfo.orgUnitName = orgUnit.name;
						userInfo.orgUnitCode = orgUnit.code;
						userInfo.orgUnitType = orgUnit.type;
					}
				}

				// Fetch and add Position data
				if (identity.positionId) {
					userInfo.positionId = identity.positionId;
					const position = await positionRepository.findById(identity.positionId);
					if (position) {
						userInfo.positionName = position.name;
						userInfo.positionCode = position.code;
						userInfo.positionLevel = position.level;
						userInfo.positionGrade = position.grade;
					}
				}

				// Add manager information
				if (identity.managerId) {
					userInfo.managerId = identity.managerId;
				}
			}

			// Add partner-specific fields if identity is a partner
			if (identity.identityType === 'partner') {
				userInfo.partnerType = identity.partnerType;
				userInfo.companyName = identity.companyName;
				userInfo.contractNumber = identity.contractNumber;
				userInfo.contractStartDate = identity.contractStartDate;
				userInfo.contractEndDate = identity.contractEndDate;
			}
		}
	} catch (err) {
		console.warn('Failed to fetch identity data for userinfo:', err);
		// Continue without identity data if fetch fails
	}

	return json(userInfo);
};

export const POST = GET; // Support both GET and POST for userinfo endpoint
