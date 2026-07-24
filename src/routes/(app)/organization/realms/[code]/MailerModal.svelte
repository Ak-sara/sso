<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import FormModal from '$lib/components/FormModal.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { formEnhance } from '$lib/utils/form-enhance';

	interface Props { form?: any; }
	let { form = $bindable() }: Props = $props();

	// From Name/Email are set once in the realm's Email Configuration (branding) and
	// take precedence over these when present — see getEmailConfig() in settings-service.ts.
	// Only providers with no account-tied address need fromEmail here as a baseline.
	const EMPTY_CONFIG = {
		gmail:           { user: '', appPassword: '' },
		microsoft365:    { user: '', appPassword: '' },
		sendgrid:        { apiKey: '', fromEmail: '' },
		nodemailer:      { host: '', port: 587, secure: false, user: '', password: '', fromEmail: '' },
		resend:          { apiKey: '', fromEmail: '' },
		microsoft_graph: { tenantId: '', clientId: '', clientSecret: '', fromEmail: '' }
	};

	let provider = $state<string>(form?.emailTransport?.provider ?? 'nodemailer');
	let configs  = $state({ ...EMPTY_CONFIG, ...(form?.emailTransport ?? {}) });
	let testEmail = $state('');

	// current provider's config shorthand
	const cfg = $derived(configs[provider as keyof typeof configs] as any);
</script>

<FormModal title="Mailer — {form?.name}" subtitle={form?.code} onClose={() => { form = null; }}>
	<div class="p-4 space-y-5 overflow-y-auto max-h-[80vh]">

		<p class="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-2">
			From Name/Email are set once in this realm's <strong>Email Configuration</strong> and are used for all real sends.
			The From Email below is only a baseline for providers that require one, and is what the "Send Test" button uses.
		</p>

		<!-- Provider picker -->
		<div>
			<p class="text-xs font-medium text-gray-700 mb-2">Transport Provider</p>
			<div class="grid grid-cols-2 gap-2">
				{#each [
					['nodemailer',      'Custom SMTP',       'Self-hosted / other SMTP'],
					['gmail',           'Gmail SMTP',        'Free 500 emails/day'],
					['microsoft365',    'Microsoft 365',     'SMTP (app password)'],
					['sendgrid',        'SendGrid',          '100 emails/day free'],
					['resend',          'Resend',            '3 000 emails/mo free'],
					['microsoft_graph', 'Microsoft Graph',   'Entra ID — no SMTP']
				] as [val, label, hint]}
					<label class="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all
						{provider === val ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}">
						<input type="radio" bind:group={provider} value={val} class="w-4 h-4 text-indigo-600" />
						<div>
							<div class="text-sm font-medium">{label}</div>
							<div class="text-xs text-gray-500">{hint}</div>
						</div>
					</label>
				{/each}
			</div>
		</div>

		<!-- Dynamic config fields -->
		<div class="border border-gray-200 rounded-lg p-4 space-y-3">
			{#if provider === 'gmail'}
				<div><label class="block text-xs font-medium text-gray-700 mb-1">Gmail Address</label>
					<input type="email" bind:value={cfg.user} placeholder="you@gmail.com" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">App Password</label>
					<input type="password" bind:value={cfg.appPassword} placeholder="16-char app password" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>

			{:else if provider === 'microsoft365'}
				<div><label class="block text-xs font-medium text-gray-700 mb-1">M365 Email</label>
					<input type="email" bind:value={cfg.user} placeholder="you@domain.com" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">App Password</label>
					<input type="password" bind:value={cfg.appPassword} class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>

			{:else if provider === 'sendgrid'}
				<div><label class="block text-xs font-medium text-gray-700 mb-1">API Key</label>
					<input type="password" bind:value={cfg.apiKey} placeholder="SG.xxxxx" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">From Email</label>
					<input type="email" bind:value={cfg.fromEmail} placeholder="noreply@yourdomain.com" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>

			{:else if provider === 'nodemailer'}
				<div class="grid grid-cols-2 gap-3">
					<div><label class="block text-xs font-medium text-gray-700 mb-1">SMTP Host</label>
						<input type="text" bind:value={cfg.host} placeholder="smtp.example.com" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>
					<div><label class="block text-xs font-medium text-gray-700 mb-1">Port</label>
						<input type="number" bind:value={cfg.port} placeholder="587" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>
				</div>
				<label class="flex items-center gap-2 text-sm text-gray-700">
					<input type="checkbox" bind:checked={cfg.secure} class="rounded border-gray-300 text-indigo-600"/>
					Use SSL/TLS (port 465)
				</label>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">Username</label>
					<input type="text" bind:value={cfg.user} class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">Password</label>
					<input type="password" bind:value={cfg.password} class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">From Email</label>
					<input type="email" bind:value={cfg.fromEmail} placeholder="noreply@yourdomain.com" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>

			{:else if provider === 'resend'}
				<div><label class="block text-xs font-medium text-gray-700 mb-1">API Key</label>
					<input type="password" bind:value={cfg.apiKey} placeholder="re_xxxxxxxxxxxx" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/>
					<p class="text-xs text-gray-400 mt-0.5">From resend.com dashboard — domain must be verified</p></div>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">From Email</label>
					<input type="email" bind:value={cfg.fromEmail} placeholder="noreply@yourdomain.com" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>

			{:else if provider === 'microsoft_graph'}
				<p class="text-xs text-gray-500">Entra ID app registration with <code>Mail.Send</code> permission.</p>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">Tenant ID</label>
					<input type="text" bind:value={cfg.tenantId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm font-mono"/></div>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
					<input type="text" bind:value={cfg.clientId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm font-mono"/></div>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
					<input type="password" bind:value={cfg.clientSecret} class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>
				<div><label class="block text-xs font-medium text-gray-700 mb-1">From Email <span class="text-gray-400">(licensed M365 mailbox)</span></label>
					<input type="email" bind:value={cfg.fromEmail} placeholder="noreply@yourdomain.com" class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"/></div>
			{/if}
		</div>

		<!-- Test send -->
		<form method="POST" action="?/testEmail"
			use:formEnhance={{ onSuccess: (data) => {
				if (data?.testSuccess) showNotif('success', data.testSuccess);
			} }}
			class="flex gap-2 p-3 bg-gray-50 rounded-lg">
			<input type="hidden" name="provider" value={provider} />
			<input type="hidden" name="config" value={JSON.stringify(cfg)} />
			<input type="email" name="testEmail" bind:value={testEmail} placeholder="test@example.com"
				class="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
			<button type="submit" class="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
				Send Test
			</button>
		</form>

		<!-- Save form -->
		<form method="POST" action="?/updateRealmMailer"
			use:formEnhance={{ success: 'Mailer configuration saved', onSuccess: async () => {
				await invalidateAll();
				form = null;
			} }}
			class="flex justify-end gap-3 pt-2 border-t border-gray-200">
			<input type="hidden" name="code" value={form?.code} />
			<input type="hidden" name="provider" value={provider} />
			<input type="hidden" name="config" value={JSON.stringify(cfg)} />
			<button type="button" onclick={() => { form = null; }}
				class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
				Cancel
			</button>
			<button type="submit"
				class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
				Save Mailer
			</button>
		</form>
	</div>
</FormModal>
