/**
 * OIDC ID token — signed with RS256 so any standards-compliant Relying
 * Party (Cloudflare Access, Okta, Azure AD, ...) can verify it via
 * /.well-known/jwks.json instead of trusting a shared client_secret.
 */
import { SignJWT } from 'jose';
import { createPrivateKey } from 'crypto';
import { getSigningKey } from './oidc-keys';

export interface IdTokenClaims {
	sub: string;
	aud: string;
	email?: string;
	name?: string;
	email_verified?: boolean;
	[claim: string]: unknown;
}

export async function createIdToken(claims: IdTokenClaims, issuer: string, expiresIn = '1h'): Promise<string> {
	const { kid, privateKeyPem } = await getSigningKey();
	const privateKey = createPrivateKey(privateKeyPem);
	const { sub, aud, ...rest } = claims;

	return new SignJWT(rest)
		.setProtectedHeader({ alg: 'RS256', kid })
		.setSubject(sub)
		.setAudience(aud)
		.setIssuer(issuer)
		.setIssuedAt()
		.setExpirationTime(expiresIn)
		.sign(privateKey);
}
