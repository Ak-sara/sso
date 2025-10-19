/**
 * SCIM Webhook System
 * Sends real-time notifications to consumer apps when employee/org data changes
 */

import { getDB } from '$lib/db/connection';
import { ObjectId } from 'mongodb';
import type { Identity, OrgUnit } from '$lib/db/schemas';

export interface WebhookSubscription {
	_id?: ObjectId;
	clientId: string;
	webhookUrl: string;
	events: WebhookEvent[];
	secret: string; // For HMAC signature verification
	isActive: boolean;
	retryPolicy: {
		maxRetries: number;
		retryDelayMs: number;
	};
	createdAt: Date;
	updatedAt: Date;
	lastTriggeredAt?: Date;
	totalDeliveries?: number;
	failedDeliveries?: number;
}

export type WebhookEvent =
	| 'user.created'
	| 'user.updated'
	| 'user.deleted'
	| 'group.created'
	| 'group.updated'
	| 'group.deleted';

export interface WebhookPayload {
	event: WebhookEvent;
	timestamp: string;
	resourceType: 'User' | 'Group';
	resourceId: string;
	action: 'create' | 'update' | 'delete';
	data?: any; // The SCIM resource (for create/update)
	previousData?: any; // Previous state (for update)
}

/**
 * Register a webhook subscription for a SCIM client
 */
export async function registerWebhook(subscription: Omit<WebhookSubscription, '_id' | 'createdAt' | 'updatedAt' | 'totalDeliveries' | 'failedDeliveries'>): Promise<WebhookSubscription> {
	const db = getDB();

	const newSubscription: Omit<WebhookSubscription, '_id'> = {
		...subscription,
		totalDeliveries: 0,
		failedDeliveries: 0,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	const result = await db.collection<WebhookSubscription>('scim_webhooks').insertOne(newSubscription as any);

	return { ...newSubscription, _id: result.insertedId } as WebhookSubscription;
}

/**
 * Trigger webhook for employee events
 */
export async function triggerUserWebhook(
	event: Extract<WebhookEvent, 'user.created' | 'user.updated' | 'user.deleted'>,
	employee: Employee,
	previousEmployee?: Employee
) {
	const db = getDB();

	// Find active webhooks subscribed to this event
	const subscriptions = await db
		.collection<WebhookSubscription>('scim_webhooks')
		.find({
			isActive: true,
			events: event
		})
		.toArray();

	if (subscriptions.length === 0) return;

	const payload: WebhookPayload = {
		event,
		timestamp: new Date().toISOString(),
		resourceType: 'User',
		resourceId: employee._id?.toString() || '',
		action: event.split('.')[1] as any,
		data: event === 'user.deleted' ? undefined : employee,
		previousData: previousEmployee
	};

	// Send to all subscribed webhooks
	await Promise.all(subscriptions.map(sub => deliverWebhook(sub, payload)));
}

/**
 * Trigger webhook for org unit events
 */
export async function triggerGroupWebhook(
	event: Extract<WebhookEvent, 'group.created' | 'group.updated' | 'group.deleted'>,
	orgUnit: OrgUnit,
	previousOrgUnit?: OrgUnit
) {
	const db = getDB();

	const subscriptions = await db
		.collection<WebhookSubscription>('scim_webhooks')
		.find({
			isActive: true,
			events: event
		})
		.toArray();

	if (subscriptions.length === 0) return;

	const payload: WebhookPayload = {
		event,
		timestamp: new Date().toISOString(),
		resourceType: 'Group',
		resourceId: orgUnit._id?.toString() || '',
		action: event.split('.')[1] as any,
		data: event === 'group.deleted' ? undefined : orgUnit,
		previousData: previousOrgUnit
	};

	await Promise.all(subscriptions.map(sub => deliverWebhook(sub, payload)));
}

/**
 * Deliver webhook to subscriber with retry logic
 */
async function deliverWebhook(
	subscription: WebhookSubscription,
	payload: WebhookPayload,
	attempt: number = 1
): Promise<void> {
	const db = getDB();

	try {
		// Generate HMAC signature for security
		const signature = await generateHmacSignature(JSON.stringify(payload), subscription.secret);

		// Send HTTP POST to webhook URL
		const response = await fetch(subscription.webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-SCIM-Signature': signature,
				'X-SCIM-Event': payload.event,
				'X-SCIM-Delivery': new Date().toISOString()
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		// Log successful delivery
		await db.collection<WebhookSubscription>('scim_webhooks').updateOne(
			{ _id: subscription._id },
			{
				$set: { lastTriggeredAt: new Date() },
				$inc: { totalDeliveries: 1 }
			}
		);

		console.log(`✅ Webhook delivered: ${payload.event} to ${subscription.webhookUrl}`);
	} catch (error: any) {
		console.error(`❌ Webhook delivery failed (attempt ${attempt}):`, error.message);

		// Retry with exponential backoff
		if (attempt < subscription.retryPolicy.maxRetries) {
			const delay = subscription.retryPolicy.retryDelayMs * Math.pow(2, attempt - 1);

			setTimeout(() => {
				deliverWebhook(subscription, payload, attempt + 1);
			}, delay);
		} else {
			// Max retries exceeded
			await db.collection<WebhookSubscription>('scim_webhooks').updateOne(
				{ _id: subscription._id },
				{
					$inc: { failedDeliveries: 1 }
				}
			);

			console.error(`❌ Webhook delivery failed after ${attempt} attempts: ${subscription.webhookUrl}`);
		}
	}
}

/**
 * Generate HMAC signature for webhook payload
 */
async function generateHmacSignature(payload: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

	return Array.from(new Uint8Array(signature))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Verify webhook signature (for consumers)
 */
export async function verifyWebhookSignature(
	payload: string,
	signature: string,
	secret: string
): Promise<boolean> {
	const expectedSignature = await generateHmacSignature(payload, secret);
	return signature === expectedSignature;
}

/**
 * Get webhook statistics for a client
 */
export async function getWebhookStats(clientId: string) {
	const db = getDB();

	const subscriptions = await db
		.collection<WebhookSubscription>('scim_webhooks')
		.find({ clientId })
		.toArray();

	return subscriptions.map(sub => ({
		webhookUrl: sub.webhookUrl,
		events: sub.events,
		isActive: sub.isActive,
		totalDeliveries: sub.totalDeliveries || 0,
		failedDeliveries: sub.failedDeliveries || 0,
		successRate: sub.totalDeliveries
			? ((sub.totalDeliveries - (sub.failedDeliveries || 0)) / sub.totalDeliveries) * 100
			: 0,
		lastTriggeredAt: sub.lastTriggeredAt
	}));
}

/**
 * Deactivate webhook subscription
 */
export async function deactivateWebhook(webhookId: string): Promise<void> {
	const db = getDB();

	await db.collection<WebhookSubscription>('scim_webhooks').updateOne(
		{ _id: new ObjectId(webhookId) },
		{
			$set: {
				isActive: false,
				updatedAt: new Date()
			}
		}
	);
}

/**
 * Delete webhook subscription
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
	const db = getDB();

	await db.collection<WebhookSubscription>('scim_webhooks').deleteOne({
		_id: new ObjectId(webhookId)
	});
}
