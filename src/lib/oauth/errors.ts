/**
 * RFC 6749 §5.2 compliant error responses for the token endpoint.
 * Generic `error()` throws (SvelteKit's `{message}` shape) don't carry the
 * `error`/`error_description` fields OAuth2/OIDC clients (Cloudflare Access,
 * Okta, ...) parse — without them RPs show a blank/"undefined" reason.
 */
import { json } from '@sveltejs/kit';

export type OAuthErrorCode =
	| 'invalid_request'
	| 'invalid_client'
	| 'invalid_grant'
	| 'unauthorized_client'
	| 'unsupported_grant_type'
	| 'invalid_scope';

export function oauthError(status: number, error: OAuthErrorCode, description: string) {
	return json({ error, error_description: description }, { status });
}
