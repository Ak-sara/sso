import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { authorizeSchema } from '$lib/validation.js';
import { oauthStore } from '$lib/store.js';
import { generateAuthorizationCode } from '$lib/crypto.js';
import { verify } from '@node-rs/argon2';
import { getBrandingForClient } from '$lib/branding.js';

export const load: PageServerLoad = async ({ url, cookies }) => {
    const params = Object.fromEntries(url.searchParams.entries());

    try {
        const validatedParams = authorizeSchema.parse(params);

        // Check if client exists
        const client = await oauthStore.getClient(validatedParams.client_id);
        if (!client) {
            throw error(400, 'Invalid client_id');
        }

        // Check if redirect_uri is allowed
        if (!client.redirect_uris.includes(validatedParams.redirect_uri)) {
            throw error(400, 'Invalid redirect_uri');
        }

        // Get branding for this client
        const branding = await getBrandingForClient(validatedParams.client_id);

        // Check if user is logged in
        const userId = cookies.get('user_id');
        if (userId) {
            const user = await oauthStore.getUserById(userId);
            if (user) {
                return {
                    params: validatedParams,
                    client,
                    user,
                    branding,
                    isLoggedIn: true
                };
            }
        }

        return {
            params: validatedParams,
            client,
            branding,
            isLoggedIn: false
        };
    } catch (err) {
        console.error('❌ OAuth authorize error:', err);
        if (err instanceof Error) {
            throw error(400, `Invalid request: ${err.message}`);
        }
        throw error(400, 'Invalid request parameters');
    }
};

export const actions: Actions = {
    default: async ({ request, cookies, url }) => {
        const formData = await request.formData();
        const actionType = formData.get('action');

        // Login action
        if (actionType === 'login') {
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;

            if (!email || !password) {
                return { error: 'Email and password are required' };
            }

            const user = await oauthStore.getUserByEmail(email);
            if (!user || !(await verify(user.password, password))) {
                return { error: 'Invalid credentials' };
            }

            cookies.set('user_id', user.id, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                httpOnly: true,
                secure: false // Set to true in production with HTTPS
            });

            // Redirect back to authorize with current params
            throw redirect(302, `/oauth/authorize?${url.searchParams.toString()}`);
        }

        // Authorize action (default when no action type specified)
        try {
            const params = Object.fromEntries(url.searchParams.entries());
            const validatedParams = authorizeSchema.parse(params);

            const userId = cookies.get('user_id');
            console.log('🔐 Authorize action - User ID from cookie:', userId);

            if (!userId) {
                return { error: 'Not logged in' };
            }

            const user = await oauthStore.getUserById(userId);
            console.log('🔐 Authorize action - User found:', user ? user.email : 'null');

            if (!user) {
                return { error: 'User not found' };
            }

            // Generate authorization code
            const code = generateAuthorizationCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            console.log('🔐 Authorize action - Saving auth code:', {
                code,
                client_id: validatedParams.client_id,
                user_id: user.id,
                redirect_uri: validatedParams.redirect_uri,
                scope: validatedParams.scope
            });

            await oauthStore.saveAuthCode({
                code,
                client_id: validatedParams.client_id,
                user_id: user.id,
                redirect_uri: validatedParams.redirect_uri,
                scope: validatedParams.scope,
                expires_at: expiresAt,
                code_challenge: validatedParams.code_challenge,
                code_challenge_method: validatedParams.code_challenge_method
            });

            console.log('🔐 Authorize action - Auth code saved successfully');

            // Build redirect URL
            const redirectUrl = new URL(validatedParams.redirect_uri);
            redirectUrl.searchParams.set('code', code);
            if (validatedParams.state) {
                redirectUrl.searchParams.set('state', validatedParams.state);
            }

            console.log('🔐 Authorize action - Redirecting to:', redirectUrl.toString());

            throw redirect(302, redirectUrl.toString());
        } catch (err) {
            console.error('❌ Authorize action error:', err);
            throw err;
        }
    }
};