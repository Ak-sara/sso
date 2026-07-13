import {
	generateSecureToken,
	generateUUID,
	hashToken,
	generateCodeChallenge,
	verifyCodeChallenge,
	generateOTP
} from '@ak-sara/fbao/foundation';

// OAuth aliases
export const generateAuthorizationCode = () => generateSecureToken();
export const generateAccessToken = () => generateSecureToken();
export const generateRefreshToken = () => generateSecureToken();
export const generateClientId = () => generateUUID();
export const generateClientSecret = () => generateSecureToken();

// OIDC ID tokens are signed with RS256 — see $lib/auth/id-token.ts

export {
	generateCodeChallenge,
	verifyCodeChallenge,
	generateSecureToken as generateVerificationToken,
	hashToken,
	generateOTP
};
