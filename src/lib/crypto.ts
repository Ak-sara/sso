import {
	generateSecureToken,
	generateUUID,
	hashToken,
	generateCodeChallenge,
	verifyCodeChallenge,
	generateOTP,
	createJwtService
} from '@ak-sara/fbao/foundation';

const jwt = createJwtService({
	secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
	issuer: process.env.JWT_ISSUER || 'http://localhost:5173'
});

// OAuth aliases
export const generateAuthorizationCode = () => generateSecureToken();
export const generateAccessToken = () => generateSecureToken();
export const generateRefreshToken = () => generateSecureToken();
export const generateClientId = () => generateUUID();
export const generateClientSecret = () => generateSecureToken();
export const createJWT = jwt.sign;
export const verifyJWT = jwt.verify;

export {
	generateCodeChallenge,
	verifyCodeChallenge,
	generateSecureToken as generateVerificationToken,
	hashToken,
	generateOTP
};
