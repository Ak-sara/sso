// src/routes/.well-known/jwks.json/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { importSPKI, exportJWK } from 'jose';
import { getActiveSigningKeys } from '$lib/auth/oidc-keys';

export const GET: RequestHandler = async () => {
	const keys = await getActiveSigningKeys();

	const jwks = await Promise.all(keys.map(async ({ kid, publicKeyPem }) => {
		const keyObj = await importSPKI(publicKeyPem, 'RS256');
		const jwk = await exportJWK(keyObj);
		return { ...jwk, kid, use: 'sig', alg: 'RS256' };
	}));

	return json(
		{ keys: jwks },
		{ headers: { 'Cache-Control': 'public, max-age=300' } }
	);
};
