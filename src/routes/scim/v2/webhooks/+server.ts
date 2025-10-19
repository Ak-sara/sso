/**
 * SCIM Webhook Management API
 * Allows SCIM clients to register webhooks for real-time notifications
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireScimAuthEnhanced } from '$lib/scim/auth-enhanced';
import {
	registerWebhook,
	getWebhookStats,
	deactivateWebhook,
	deleteWebhook,
	type WebhookEvent
} from '$lib/scim/webhooks';
import { getDB } from '$lib/db/connection';
import type { WebhookSubscription } from '$lib/scim/webhooks';

/**
 * GET /scim/v2/webhooks
 * List all webhooks for the authenticated client
 */
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		const auth = await requireScimAuthEnhanced(
			{ request, url, getClientAddress: () => '0.0.0.0' } as any
		);

		const db = getDB();
		const subscriptions = await db
			.collection<WebhookSubscription>('scim_webhooks')
			.find({ clientId: auth.clientId })
			.toArray();

		return json({
			success: true,
			data: subscriptions.map(sub => ({
				...sub,
				_id: sub._id?.toString(),
				secret: '***' // Never expose secret
			}))
		});
	} catch (err: any) {
		console.error('Get webhooks error:', err);
		throw err;
	}
};

/**
 * POST /scim/v2/webhooks
 * Register a new webhook subscription
 */
export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const auth = await requireScimAuthEnhanced(
			{ request, url, getClientAddress: () => '0.0.0.0' } as any
		);

		const data = await request.json();

		// Validate webhook URL
		if (!data.webhookUrl || !data.webhookUrl.startsWith('http')) {
			throw error(400, 'Invalid webhook URL');
		}

		// Validate events
		const validEvents: WebhookEvent[] = [
			'user.created',
			'user.updated',
			'user.deleted',
			'group.created',
			'group.updated',
			'group.deleted'
		];

		if (!data.events || !Array.isArray(data.events) || data.events.length === 0) {
			throw error(400, 'At least one event is required');
		}

		for (const event of data.events) {
			if (!validEvents.includes(event)) {
				throw error(400, `Invalid event: ${event}`);
			}
		}

		// Generate webhook secret
		const secret = data.secret || generateWebhookSecret();

		// Register webhook
		const subscription = await registerWebhook({
			clientId: auth.clientId,
			webhookUrl: data.webhookUrl,
			events: data.events,
			secret,
			isActive: data.isActive !== false,
			retryPolicy: {
				maxRetries: data.maxRetries || 3,
				retryDelayMs: data.retryDelayMs || 1000
			}
		});

		return json({
			success: true,
			data: {
				...subscription,
				_id: subscription._id?.toString(),
				secret: data.secret ? '***' : secret // Show secret only if not provided
			}
		});
	} catch (err: any) {
		console.error('Register webhook error:', err);
		if (err.status) throw err;
		throw error(500, 'Failed to register webhook');
	}
};

/**
 * DELETE /scim/v2/webhooks/{id}
 * Delete a webhook subscription
 */
export const DELETE: RequestHandler = async ({ params, request, url }) => {
	try {
		const auth = await requireScimAuthEnhanced(
			{ request, url, getClientAddress: () => '0.0.0.0' } as any
		);

		const webhookId = (params as any).id;

		if (!webhookId) {
			throw error(400, 'Webhook ID is required');
		}

		// Verify ownership
		const db = getDB();
		const webhook = await db
			.collection<WebhookSubscription>('scim_webhooks')
			.findOne({ _id: new (await import('mongodb')).ObjectId(webhookId) });

		if (!webhook) {
			throw error(404, 'Webhook not found');
		}

		if (webhook.clientId !== auth.clientId) {
			throw error(403, 'Unauthorized');
		}

		await deleteWebhook(webhookId);

		return json({ success: true, message: 'Webhook deleted' });
	} catch (err: any) {
		console.error('Delete webhook error:', err);
		if (err.status) throw err;
		throw error(500, 'Failed to delete webhook');
	}
};

/**
 * Generate random webhook secret
 */
function generateWebhookSecret(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
