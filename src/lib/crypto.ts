import jwt from 'jsonwebtoken';
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

export function createJWT(payload: string | object | Buffer, expiresIn: string = '1h'): string {
    return jwt.sign(payload, JWT_SECRET, {
        issuer: JWT_ISSUER,
        expiresIn,
        algorithm: 'HS256'
    });
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

