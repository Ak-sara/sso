/**
 * RS256 signing key for OIDC ID tokens.
 *
 * Generated once and persisted in its own collection (never exposed via the
 * generic /api/settings listing) so the same key survives restarts and is
 * consistent with what /.well-known/jwks.json publishes.
 */
import { generateKeyPairSync, createHash } from 'crypto';
import { db } from '$lib/db/db';

export interface SigningKey {
	kid: string;
	privateKeyPem: string;
	publicKeyPem: string;
}

let cached: SigningKey | null = null;

export async function getSigningKey(): Promise<SigningKey> {
	if (cached) return cached;

	let doc = await db.oidcSigningKeys.findOne({ isActive: true } as any);
	if (!doc) {
		const { publicKey, privateKey } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			publicKeyEncoding: { type: 'spki', format: 'pem' },
			privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
		});
		const kid = createHash('sha256').update(publicKey).digest('hex').slice(0, 16);
		await db.oidcSigningKeys.insertOne({
			kid, algorithm: 'RS256',
			publicKeyPem: publicKey, privateKeyPem: privateKey,
			isActive: true, createdAt: new Date()
		} as any);
		doc = { kid, publicKeyPem: publicKey, privateKeyPem: privateKey } as any;
	}

	cached = { kid: doc!.kid, privateKeyPem: doc!.privateKeyPem, publicKeyPem: doc!.publicKeyPem };
	return cached;
}

/** All active keys — published in JWKS so tokens signed under an older kid still verify. */
export async function getActiveSigningKeys(): Promise<SigningKey[]> {
	await getSigningKey(); // ensures at least one exists
	const docs = await db.oidcSigningKeys.find({ isActive: true } as any);
	return docs.map((d: any) => ({ kid: d.kid, privateKeyPem: d.privateKeyPem, publicKeyPem: d.publicKeyPem }));
}
