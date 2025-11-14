/**
 * Email Service - Supports multiple providers
 * Providers: Gmail SMTP, Microsoft 365, SendGrid, Nodemailer (generic SMTP)
 */

import { getDB } from '$lib/db/connection';

interface EmailOptions {
	provider: string;
	config: any;
	to: string;
	subject: string;
	html: string;
	text?: string;
}

/**
 * Send email using configured provider
 * This function dynamically imports nodemailer/sendgrid only when needed
 */
export async function sendEmail({ provider, config, to, subject, html, text }: EmailOptions) {
	switch (provider) {
		case 'gmail':
			return sendViaGmail(config, to, subject, html, text);

		case 'microsoft365':
			return sendViaMicrosoft365(config, to, subject, html, text);

		case 'sendgrid':
			return sendViaSendGrid(config, to, subject, html, text);

		case 'nodemailer':
			return sendViaNodemailer(config, to, subject, html, text);

		default:
			throw new Error(`Unknown email provider: ${provider}`);
	}
}

/**
 * Send email using Gmail SMTP
 */
async function sendViaGmail(
	config: { user: string; appPassword: string; fromName: string },
	to: string,
	subject: string,
	html: string,
	text?: string
) {
	// Lazy import nodemailer
	const nodemailer = await import('nodemailer');

	const transporter = nodemailer.default.createTransport({
		host: 'smtp.gmail.com',
		port: 587,
		secure: false, // Use STARTTLS
		auth: {
			user: config.user,
			pass: config.appPassword
		}
	});

	await transporter.sendMail({
		from: `"${config.fromName || 'Aksara SSO'}" <${config.user}>`,
		to,
		subject,
		html,
		text: text || ''
	});
}

/**
 * Send email using Microsoft 365 SMTP
 */
async function sendViaMicrosoft365(
	config: { user: string; appPassword: string; fromName: string },
	to: string,
	subject: string,
	html: string,
	text?: string
) {
	const nodemailer = await import('nodemailer');

	const transporter = nodemailer.default.createTransport({
		host: 'smtp.office365.com',
		port: 587,
		secure: false, // Use STARTTLS
		auth: {
			user: config.user,
			pass: config.appPassword
		}
	});

	await transporter.sendMail({
		from: `"${config.fromName || 'Aksara SSO'}" <${config.user}>`,
		to,
		subject,
		html,
		text: text || ''
	});
}

/**
 * Send email using SendGrid API
 */
async function sendViaSendGrid(
	config: { apiKey: string; fromEmail: string; fromName: string },
	to: string,
	subject: string,
	html: string,
	text?: string
) {
	const sgMail = await import('@sendgrid/mail');
	sgMail.default.setApiKey(config.apiKey);

	await sgMail.default.send({
		from: {
			email: config.fromEmail,
			name: config.fromName || 'Aksara SSO'
		},
		to,
		subject,
		html,
		text: text || ''
	});
}

/**
 * Send email using generic SMTP (like PHPMailer)
 */
async function sendViaNodemailer(
	config: {
		host: string;
		port: number;
		secure: boolean;
		user: string;
		password: string;
		fromEmail: string;
		fromName: string;
	},
	to: string,
	subject: string,
	html: string,
	text?: string
) {
	const nodemailer = await import('nodemailer');

	const transporter = nodemailer.default.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure, // true for port 465, false for 587
		auth: {
			user: config.user,
			pass: config.password
		}
	});

	await transporter.sendMail({
		from: `"${config.fromName || 'Aksara SSO'}" <${config.fromEmail}>`,
		to,
		subject,
		html,
		text: text || ''
	});
}

/**
 * Load email configuration from database
 * Used by other parts of the application (registration, password reset, etc.)
 */
export async function getEmailConfig() {
	const db = getDB();

	const providerSetting = await db
		.collection('system_settings')
		.findOne({ key: 'email_service_provider' });

	const configSetting = await db
		.collection('system_settings')
		.findOne({ key: 'email_service_config' });

	if (!providerSetting || !configSetting) {
		throw new Error('Email service not configured');
	}

	return {
		provider: providerSetting.value as string,
		config: configSetting.value[providerSetting.value as keyof typeof configSetting.value]
	};
}

/**
 * Send email using stored database configuration
 * Convenience wrapper for common use case
 */
export async function sendEmailWithSystemConfig(
	to: string,
	subject: string,
	html: string,
	text?: string
) {
	const { provider, config } = await getEmailConfig();

	return sendEmail({
		provider,
		config,
		to,
		subject,
		html,
		text
	});
}
