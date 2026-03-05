
import jwt from 'jsonwebtoken';
import type {SignOptions} from 'jsonwebtoken';
import type { StringValue } from "ms";
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_ISSUER = process.env.JWT_ISSUER || 'http://localhost:5173';

export function generateAuthorizationCode(): string {
    return crypto.randomBytes(32).toString('base64url');
}

export function generateAccessToken(): string {
    return crypto.randomBytes(32).toString('base64url');
}

export function generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('base64url');
}

export function generateClientId(): string {
    return uuidv4();
}

export function generateClientSecret(): string {
    return crypto.randomBytes(32).toString('base64url');
}

export function createJWT(payload: string | object | Buffer, expiresIn:(number | StringValue | undefined) = '1h'): string {
    let opt:SignOptions={
        issuer: JWT_ISSUER,
        expiresIn,
        algorithm: 'HS256'
    };
    return jwt.sign(payload, JWT_SECRET, opt);
}

export function verifyJWT(token: string): jwt.JwtPayload | string | null {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

export function generateCodeChallenge(codeVerifier: string): string {
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

export function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const computedChallenge = generateCodeChallenge(codeVerifier);
    return computedChallenge === codeChallenge;
}

/**
 * Generate a secure verification token for email verification, password reset, etc.
 * @param length - Length of the token in bytes (default: 32)
 * @returns URL-safe base64 encoded token
 */
export function generateVerificationToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate a numeric OTP code
 * @param digits - Number of digits (default: 6)
 * @returns Numeric OTP string
 */
export function generateOTP(digits: number = 6): string {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const otp = Math.floor(min + crypto.randomInt(max - min + 1));
    return otp.toString().padStart(digits, '0');
}

/**
 * Hash a verification token for storage
 * @param token - Plain token to hash
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

