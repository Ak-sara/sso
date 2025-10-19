#!/usr/bin/env bun
/**
 * Script to create service account identities for existing OAuth clients
 * and link them together
 */

import { connectDB, disconnectDB, getDB } from '../src/lib/db/connection';
import { identityRepository } from '../src/lib/db/identity-repository';
import type { OAuthClient } from '../src/lib/db/schemas';
import { hash } from '@node-rs/argon2';

async function linkOAuthServiceAccounts() {
	try {
		await connectDB();
		const db = getDB();

		console.log('🔗 Linking OAuth Clients to Service Account Identities...\n');

		// Get all OAuth clients
		const oauthClients = await db.collection<OAuthClient>('oauth_clients').find({}).toArray();

		console.log(`Found ${oauthClients.length} OAuth clients`);

		for (const client of oauthClients) {
			// Check if service account already exists
			if (client.serviceAccountId) {
				const existing = await identityRepository.findById(client.serviceAccountId);
				if (existing) {
					console.log(`✓ ${client.clientName} already linked to service account`);
					continue;
				}
			}

			// Create service account identity
			const serviceAccountUsername = `${client.clientId}-sa`;

			// Check if service account already exists by username
			const existingByUsername = await identityRepository.findByUsername(serviceAccountUsername);

			let serviceAccountId: string;

			if (existingByUsername) {
				console.log(`  Found existing service account: ${serviceAccountUsername}`);
				serviceAccountId = existingByUsername._id!.toString();
			} else {
				// Create new service account
				const hashedPassword = await hash(client.clientSecret, {
					memoryCost: 19456,
					timeCost: 2,
					outputLen: 32,
					parallelism: 1
				});

				const serviceAccount = await identityRepository.create({
					identityType: 'service_account',
					username: serviceAccountUsername,
					email: `${client.clientId}@service.ias.co.id`,
					password: hashedPassword,
					isActive: client.isActive,
					emailVerified: true,
					roles: ['service_account'],
					firstName: client.clientName,
					lastName: 'Service Account',
					fullName: `${client.clientName} Service Account`,
					organizationId: client.organizationId || '',
					customProperties: {
						clientId: client.clientId,
						allowedScopes: client.allowedScopes,
						grantTypes: client.grantTypes
					},
					createdAt: new Date(),
					updatedAt: new Date()
				});

				serviceAccountId = serviceAccount._id!.toString();
				console.log(`  ✓ Created service account: ${serviceAccountUsername}`);
			}

			// Link OAuth client to service account
			await db.collection('oauth_clients').updateOne(
				{ _id: client._id },
				{
					$set: {
						serviceAccountId,
						updatedAt: new Date()
					}
				}
			);

			console.log(`  ✓ Linked ${client.clientName} → ${serviceAccountUsername}\n`);
		}

		// Summary
		const serviceAccounts = await identityRepository.findServiceAccounts();
		console.log('\n✨ Linking complete!');
		console.log(`📊 Total service accounts: ${serviceAccounts.length}`);
		console.log('\nService Accounts:');
		serviceAccounts.forEach(sa => {
			console.log(`  - ${sa.username} (${sa.fullName})`);
		});

	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	} finally {
		await disconnectDB();
	}
}

// Run if executed directly
if (import.meta.main) {
	linkOAuthServiceAccounts();
}
