import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { authorizeSchema } from '$lib/validation.js';
import { oauthStore } from '$lib/store.js';
import { generateAuthorizationCode } from '$lib/crypto.js';
import argon2 from 'argon2';

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

        // Check if user is logged in
        const userId = cookies.get('user_id');
        if (userId) {
            const user = await oauthStore.getUserById(userId);
            if (user) {
                return {
                    params: validatedParams,
                    client,
                    user,
                    isLoggedIn: true
                };
            }
        }

        return {
            params: validatedParams,
            client,
            isLoggedIn: false
        };
    } catch (err) {
        throw error(400, 'Invalid request parameters');
    }
};

export const actions: Actions = {
    login: async ({ request, cookies, url }) => {
        const formData = await request.formData();
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        if (!email || !password) {
            return { error: 'Email and password are required' };
        }

        const user = await oauthStore.getUserByEmail(email);
        if (!user || !(await argon2.verify(user.password, password))) {
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
    },

    authorize: async ({ request, cookies, url }) => {
        const formData = await request.formData();
        const params = Object.fromEntries(url.searchParams.entries());
        const validatedParams = authorizeSchema.parse(params);

        const userId = cookies.get('user_id');
        if (!userId) {
            return { error: 'Not logged in' };
        }

        const user = await oauthStore.getUserById(userId);
        if (!user) {
            return { error: 'User not found' };
        }

        // Generate authorization code
        const code = generateAuthorizationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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

        // Build redirect URL
        const redirectUrl = new URL(validatedParams.redirect_uri);
        redirectUrl.searchParams.set('code', code);
        if (validatedParams.state) {
            redirectUrl.searchParams.set('state', validatedParams.state);
        }

        throw redirect(302, redirectUrl.toString());
    }
};