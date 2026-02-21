import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendEmail } from '$lib/email/email-service';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { provider, config, testEmail } = await request.json();

		if (!testEmail || !provider || !config) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(testEmail)) {
			return json({ error: 'Invalid email address' }, { status: 400 });
		}

		// Send test email using the provided configuration
		await sendEmail({
			provider,
			config,
			to: testEmail,
			subject: '🧪 Aksara SSO - Email Configuration Test',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
					<h2 style="color: #4f46e5;">✅ Email Configuration Successful!</h2>
					<p>This is a test email from your Aksara SSO instance.</p>
					<p><strong>Email Provider:</strong> ${provider}</p>
					<p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
					<hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
					<p style="color: #6b7280; font-size: 14px;">
						If you received this email, your email service is configured correctly!
					</p>
				</div>
			`,
			text: `Email Configuration Test\n\nThis is a test email from your Aksara SSO instance.\nProvider: ${provider}\nTime: ${new Date().toLocaleString()}\n\nIf you received this email, your email service is configured correctly!`
		});

		return json({
			success: true,
			message: `Test email sent successfully to ${testEmail}`
		});
	} catch (error: any) {
		console.error('Test email failed:', error);
		return json(
			{
				error: error.message || 'Failed to send test email. Please check your configuration.'
			},
			{ status: 500 }
		);
	}
};
