/**
 * Email Templates
 * HTML email templates for various system notifications
 */

const BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';

interface EmailTemplate {
	subject: string;
	html: string;
	text: string;
}

/**
 * Email verification template
 */
export function getVerificationEmail(token: string, firstName: string): EmailTemplate {
	const verifyUrl = `${BASE_URL}/auth/verify-email?token=${token}`;

	return {
		subject: 'Verify Your Email - Aksara SSO',
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
		.content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
		.button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
		.button:hover { background: #5568d3; }
		.footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
		.code { background: #f3f4f6; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 16px; text-align: center; margin: 20px 0; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1 style="margin: 0; font-size: 28px;">🔐 Aksara SSO</h1>
		</div>
		<div class="content">
			<h2 style="color: #1f2937; margin-top: 0;">Welcome, ${firstName}!</h2>
			<p>Thank you for registering with Aksara SSO. Please verify your email address to activate your account.</p>

			<div style="text-align: center;">
				<a href="${verifyUrl}" class="button">Verify Email Address</a>
			</div>

			<p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
				Or copy and paste this link in your browser:<br>
				<span style="word-break: break-all;">${verifyUrl}</span>
			</p>

			<p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
				<strong>Security Note:</strong> This link will expire in 24 hours. If you didn't register for an account, you can safely ignore this email.
			</p>
		</div>
		<div class="footer">
			<p>Aksara SSO - Secure Single Sign-On</p>
			<p>This is an automated message, please do not reply.</p>
		</div>
	</div>
</body>
</html>
		`,
		text: `
Welcome, ${firstName}!

Thank you for registering with Aksara SSO. Please verify your email address to activate your account.

Verify your email by clicking this link:
${verifyUrl}

This link will expire in 24 hours. If you didn't register for an account, you can safely ignore this email.

---
Aksara SSO - Secure Single Sign-On
This is an automated message, please do not reply.
		`
	};
}

/**
 * OTP email template
 */
export function getOTPEmail(otp: string, firstName: string, purpose: string = 'authentication'): EmailTemplate {
	return {
		subject: `Your OTP Code - Aksara SSO`,
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
		.content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
		.otp-box { background: #f9fafb; border: 2px dashed #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; }
		.otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: monospace; }
		.footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
		.warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1 style="margin: 0; font-size: 28px;">🔐 Aksara SSO</h1>
		</div>
		<div class="content">
			<h2 style="color: #1f2937; margin-top: 0;">Hello, ${firstName}!</h2>
			<p>You requested a one-time password (OTP) for ${purpose}. Please use the code below:</p>

			<div class="otp-box">
				<div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">Your OTP Code</div>
				<div class="otp-code">${otp}</div>
				<div style="color: #6b7280; font-size: 12px; margin-top: 10px;">Valid for 10 minutes</div>
			</div>

			<div class="warning">
				<strong>⚠️ Security Warning:</strong> Never share this code with anyone. Aksara SSO staff will never ask for your OTP code.
			</div>

			<p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
				If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.
			</p>
		</div>
		<div class="footer">
			<p>Aksara SSO - Secure Single Sign-On</p>
			<p>This is an automated message, please do not reply.</p>
		</div>
	</div>
</body>
</html>
		`,
		text: `
Hello, ${firstName}!

You requested a one-time password (OTP) for ${purpose}. Please use the code below:

OTP CODE: ${otp}
Valid for 10 minutes

⚠️ Security Warning: Never share this code with anyone. Aksara SSO staff will never ask for your OTP code.

If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.

---
Aksara SSO - Secure Single Sign-On
This is an automated message, please do not reply.
		`
	};
}

/**
 * Password reset email template
 */
export function getPasswordResetEmail(token: string, firstName: string): EmailTemplate {
	const resetUrl = `${BASE_URL}/auth/reset-password?token=${token}`;

	return {
		subject: 'Reset Your Password - Aksara SSO',
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
		.content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
		.button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
		.button:hover { background: #5568d3; }
		.footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
		.warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1 style="margin: 0; font-size: 28px;">🔐 Aksara SSO</h1>
		</div>
		<div class="content">
			<h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
			<p>Hello, ${firstName}!</p>
			<p>We received a request to reset your password. Click the button below to create a new password:</p>

			<div style="text-align: center;">
				<a href="${resetUrl}" class="button">Reset Password</a>
			</div>

			<p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
				Or copy and paste this link in your browser:<br>
				<span style="word-break: break-all;">${resetUrl}</span>
			</p>

			<div class="warning">
				<strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email - your password will remain unchanged.
			</div>
		</div>
		<div class="footer">
			<p>Aksara SSO - Secure Single Sign-On</p>
			<p>This is an automated message, please do not reply.</p>
		</div>
	</div>
</body>
</html>
		`,
		text: `
Password Reset Request

Hello, ${firstName}!

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

⚠️ Security Notice: This link will expire in 1 hour. If you didn't request a password reset, please ignore this email - your password will remain unchanged.

---
Aksara SSO - Secure Single Sign-On
This is an automated message, please do not reply.
		`
	};
}

/**
 * Welcome email (after successful verification)
 */
export function getWelcomeEmail(firstName: string, organizationName: string): EmailTemplate {
	const loginUrl = `${BASE_URL}/login`;

	return {
		subject: 'Welcome to Aksara SSO! 🎉',
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
		.content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
		.button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
		.feature { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #667eea; }
		.footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1 style="margin: 0; font-size: 32px;">🎉 Welcome!</h1>
		</div>
		<div class="content">
			<h2 style="color: #1f2937; margin-top: 0;">Your account is now active, ${firstName}!</h2>
			<p>Thank you for verifying your email. Your Aksara SSO account for <strong>${organizationName}</strong> is ready to use.</p>

			<div style="text-align: center;">
				<a href="${loginUrl}" class="button">Sign In Now</a>
			</div>

			<h3 style="color: #1f2937; margin-top: 30px;">What's Next?</h3>
			<div class="feature">
				<strong>✓ Single Sign-On</strong><br>
				Access all your organization's applications with one account
			</div>
			<div class="feature">
				<strong>✓ Secure Access</strong><br>
				Your data is protected with enterprise-grade security
			</div>
			<div class="feature">
				<strong>✓ Profile Management</strong><br>
				Update your profile and security settings anytime
			</div>

			<p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
				Need help? Contact your organization's administrator or visit our help center.
			</p>
		</div>
		<div class="footer">
			<p>Aksara SSO - Secure Single Sign-On</p>
			<p>This is an automated message, please do not reply.</p>
		</div>
	</div>
</body>
</html>
		`,
		text: `
🎉 Welcome!

Your account is now active, ${firstName}!

Thank you for verifying your email. Your Aksara SSO account for ${organizationName} is ready to use.

Sign in now: ${loginUrl}

What's Next?
✓ Single Sign-On - Access all your organization's applications with one account
✓ Secure Access - Your data is protected with enterprise-grade security
✓ Profile Management - Update your profile and security settings anytime

Need help? Contact your organization's administrator or visit our help center.

---
Aksara SSO - Secure Single Sign-On
This is an automated message, please do not reply.
		`
	};
}
