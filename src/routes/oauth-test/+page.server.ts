import type { PageServerLoad, Actions } from './$types';
import { oauthStore } from '$lib/store.js';
import { generateClientId, generateClientSecret } from '$lib/crypto.js';
import { v4 as uuidv4 } from 'uuid';
import { hash } from '@node-rs/argon2';

export const load: PageServerLoad = async () => {
    // In production, add proper admin authentication
    return {};
};

export const actions: Actions = {
    createUser: async ({ request }) => {
        const formData = await request.formData();
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const name = formData.get('name') as string;

        if (!email || !password || !name) {
            return { error: 'All fields are required' };
        }

        const existingUser = await oauthStore.getUserByEmail(email);
        if (existingUser) {
            return { error: 'User already exists' };
        }

        const hashedPassword = await hash(password);
        const user = {
            id: uuidv4(),
            email,
            password: hashedPassword,
            name,
            createdAt: new Date()
        };

        await oauthStore.createUser(user);
        return { success: 'User created successfully' };
    },

    createClient: async ({ request }) => {
        const formData = await request.formData();
        const name = formData.get('name') as string;
        const redirectUris = formData.get('redirect_uris') as string;
        const allowedScopes = formData.get('allowed_scopes') as string;

        if (!name || !redirectUris) {
            return { error: 'Name and redirect URIs are required' };
        }

        const client = {
            client_id: generateClientId(),
            client_secret: generateClientSecret(),
            name,
            redirect_uris: redirectUris.split('\n').map(uri => uri.trim()).filter(Boolean),
            allowed_scopes: allowedScopes ? allowedScopes.split(' ').filter(Boolean) : ['openid'],
            created_at: new Date()
        };

        await oauthStore.createClient(client);
        return { 
            success: 'Client created successfully',
            client: {
                client_id: client.client_id,
                client_secret: client.client_secret
            }
        };
    }
};