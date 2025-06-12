import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const baseUrl = `${url.protocol}//${url.host}`;
	
	return json({
		issuer: baseUrl,
		authorization_endpoint: `${baseUrl}/oauth/authorize`,
		token_endpoint: `${baseUrl}/oauth/token`,
		userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
		jwks_uri: `${baseUrl}/.well-known/jwks.json`,
		response_types_supported: ['code'],
		subject_types_supported: ['public'],
		id_token_signing_alg_values_supported: ['HS256'],
		scopes_supported: ['openid', 'email', 'profile'],
		token_endpoint_auth_methods_supported: ['client_secret_post'],
		claims_supported: ['sub', 'email', 'name', 'email_verified'],
		code_challenge_methods_supported: ['S256']
	});
};