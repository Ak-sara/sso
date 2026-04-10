import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/db';
import { findIdentityByEmail } from '$lib/db/schemas';
import { generateClientId, generateClientSecret } from '$lib/crypto.js';
import { hash } from '@node-rs/argon2';

export const load: PageServerLoad = async () => {
    return {};
};

export const actions: Actions = {
    createUser: async ({ locals }) => {
        const formData = locals.body
        const email = formData?.email as string;
        const password = formData?.password as string;
        const name = formData?.name as string;

        if (!email || !password || !name) {
            return { error: 'All fields are required' };
        }

        const existingUser = await findIdentityByEmail(email);
        if (existingUser) {
            return { error: 'User already exists' };
        }

        const hashedPassword = await hash(password);
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ');

        await db.identities.insertOne({
            identityType: 'external',
            username: email.split('@')[0],
            email,
            password: hashedPassword,
            firstName: firstName || name,
            lastName: lastName || '',
            fullName: name,
            organizationId: 'default-org-id',
            isActive: true,
            emailVerified: false,
            roles: ['user'],
        } as any);

        return { success: 'User created successfully' };
    },

    createClient: async ({ locals }) => {
        const formData = locals.body
        const name = formData?.name as string;
        const redirectUris = formData?.redirect_uris as string;
        const allowedScopes = formData?.allowed_scopes as string;

        if (!name || !redirectUris) {
            return { error: 'Name and redirect URIs are required' };
        }

        const clientId = generateClientId();
        const clientSecret = generateClientSecret();

        await db.oauthClients.insertOne({
            clientId,
            clientSecret,
            clientName: name,
            redirectUris: redirectUris.split('\n').map(uri => uri.trim()).filter(Boolean),
            allowedScopes: allowedScopes ? allowedScopes.split(' ').filter(Boolean) : ['openid'],
            grantTypes: ['authorization_code', 'refresh_token'],
            isActive: true,
        } as any);

        return {
            success: 'Client created successfully',
            client: {
                client_id: clientId,
                client_secret: clientSecret
            }
        };
    }
};
