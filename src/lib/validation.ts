import { z } from 'zod';

export const authorizeSchema = z.object({
    response_type: z.literal('code'),
    client_id: z.string().min(1),
    redirect_uri: z.string().url(),
    scope: z.string().optional().default('openid'),
    state: z.string().optional(),
    code_challenge: z.string().optional(),
    code_challenge_method: z.enum(['S256', 'plain']).optional()
});

export const tokenSchema = z.object({
    grant_type: z.enum(['authorization_code', 'refresh_token']),
    code: z.string().optional(),
    redirect_uri: z.string().url().optional(),
    client_id: z.string().min(1),
    client_secret: z.string().min(1),
    code_verifier: z.string().optional(),
    refresh_token: z.string().optional()
});

export const userInfoSchema = z.object({
    authorization: z.string().startsWith('Bearer ')
});
