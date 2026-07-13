<script lang="ts">
	import FormModal from '$lib/components/FormModal.svelte';
	import AuditDetail from './AuditDetail.svelte';
	import { showNotif } from '$lib/stores/notif.svelte';
	import { useLogger } from '$lib/logger';

	const log = useLogger({ module: 'app:audit' });

	interface Props { auditLogId?: string | null; }
	let { auditLogId = $bindable() }: Props = $props();

	let data: { auditLog: any; identityInfo?: any; organizationInfo?: any } | null = $state(null);
	let loading = $state(false);

	async function load() {
		if (!auditLogId) return;
		loading = true;
		data = null;
		try {
			const res = await fetch(`/api/audit-log/${auditLogId}`);
			if (res.ok) {
				data = await res.json();
			} else {
				showNotif('error', 'Failed to load audit log');
				auditLogId = null;
			}
		} catch (err) {
			log.error('Error loading audit log detail', { error: err });
			showNotif('error', 'Failed to load audit log');
			auditLogId = null;
		} finally {
			loading = false;
		}
	}
	$effect(() => { load(); });
</script>

<FormModal
	onClose={() => (auditLogId = null)}
	title="Detail Log Audit"
	subtitle={auditLogId ? `ID: ${auditLogId}` : ''}>

	<div class="p-4">
		{#if loading}
			<p class="text-sm text-gray-500 py-8 text-center">Loading...</p>
		{:else if data}
			<AuditDetail auditLog={data.auditLog} identityInfo={data.identityInfo} organizationInfo={data.organizationInfo} />
		{/if}
	</div>

</FormModal>
