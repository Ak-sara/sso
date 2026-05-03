<script lang="ts">
	import type { PageData } from './$types';
	import OrgUnitModal from './../../../org-units/OrgUnitModal.svelte';
	import FormModal from '$lib/components/FormModal.svelte';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { StoChart } from '@ak-sara/sto-diagram';
	import { useLogger } from '$lib/logger';
	import { showNotif } from '$lib/stores/notif.svelte';
    import type { OrgUnit } from '$lib/db/schemas';

	const log = useLogger({ module: 'app:org-sto' });

	let { data }: { data: PageData } = $props();
	
	// ── Build structural nodes ────────────────────────────────────────────────
	const strcdata = data.orgUnitsEnriched.map((u: any) => ({
		id: u.code,
		label: u.name,
		type: u.diagram,
		...(u.parentCode ? { parentId: u.parentCode } : {}),
		...(u.groupCode  ? { groupId:  u.groupCode  } : {}),
		...(u.picCode    ? { picId:    u.picCode    } : {}),
		...(u.code==="DIAS" ?{head:'DU'}:{})
	}));
	// console.log(strcdata)
	// ── Build manager cards ───────────────────────────────────────────────────
	const userList = data.orgUnitsEnriched
		.filter((u: any) => u.managerName)
		.map((u: any) => ({
			stoid: u.code,
			name: u.managerName,
			title: u.managerPosition || u.name,
			level: `Level ${u.level ?? '-'}`,
			image: ''
		}));

	const userCard = `<div style="padding:6px 8px;overflow:hidden;height:100%;box-sizing:border-box">
		<div style="font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{name}</div>
		<div style="color:#6b7280;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{title}</div>
		<div style="color:#4f46e5;font-size:10px;margin-top:2px">{level}</div>
	</div>`;

	// ── UI state ──────────────────────────────────────────────────────────────
	let selectedNode: any = $state(null);

	log.debug('STO chart data loaded', { units: data.orgUnitsEnriched.length });

	onMount(async () => {
		const chart = new StoChart('#sto-chart');
		await chart.load(strcdata)
			.assign(userList, userCard, { width: 220, height: 72 })
			.render();

		document.querySelector('#sto-chart')?.addEventListener('click', (e) => {
			const target = (e.target as Element).closest('[data-id]');
			if (target) {
				const code = target.getAttribute('data-id');
				if (code) openNodeEditor(code);
			}
		});
	});

	// ── Node editor ───────────────────────────────────────────────────────────
	function unitToFormData(unit: any): FormData {
		const f = new FormData();
		const skip = new Set(['parentName', 'groupName', 'picName', 'managerName']);
		for (const [key, val] of Object.entries(unit))
			if (!skip.has(key) && val !== null && val !== undefined)
				f.append(key, String(val));
		return f;
	}

	async function openNodeEditor(nodeCode: string) {
		try {
			const response = await fetch(`/api/org-units/${nodeCode}`);
			if (!response.ok) { showNotif('error', 'Unit not found'); return; }
			selectedNode = await response.json();
		} catch (err) {
			log.error('Error loading node', { error: err });
			showNotif('error', 'Failed to load unit');
		}
	}

	async function saveNodeChanges() {
		if (!selectedNode) return;
		try {
			const response = await fetch('?/update', { method: 'POST', body: unitToFormData(selectedNode) });
			const result = await response.json();
			if (result.type === 'failure') { showNotif('error', result.data?.error ?? 'Failed to save'); return; }
			showNotif('success', 'Changes saved');
			selectedNode = null;
			await invalidateAll();
		} catch (err) {
			log.error('Error saving node', { error: err });
			showNotif('error', 'Failed to save changes');
		}
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<div class="bg-white shadow-sm border-b sticky top-0 z-10">
		<div class="px-6 py-4 flex items-center justify-between">
			<div>
				<div class="flex items-center space-x-3">
					<a href="/org-structure/{data.version._id}" class="text-gray-500 hover:text-gray-700">← Kembali</a>
					<h2 class="text-xl font-bold">STO — {data.organization.name}</h2>
					{#if data.version.status === 'active'}
						<span class="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">✓ AKTIF</span>
					{/if}
				</div>
				<p class="text-xs text-gray-500 mt-1">
					Version {data.version.versionNumber}: {data.version.versionName}
					• Efektif {new Date(data.version.effectiveDate).toLocaleDateString('id-ID')}
					• {data.orgUnitsEnriched.length} unit
				</p>
			</div>
		</div>
	</div>

	<div class="flex-1 overflow-auto bg-white">
		<div id="sto-chart" style="width:100%;height:calc(100vh - 80px)"></div>
	</div>
</div>

{#if selectedNode}

	<OrgUnitModal
		bind:unit={selectedNode}
		organizationOptions={data.organizationOptions}
		// onSave={saveNodeChanges}
	/>
	
{/if}
