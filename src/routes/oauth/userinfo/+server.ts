import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthStore } from '$lib/store.js';

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

	return json({
		sub: user.id,
		email: user.email,
		name: user.name,
		email_verified: true
	});
};

export const POST = GET; // Support both GET and POST for userinfo endpoint
