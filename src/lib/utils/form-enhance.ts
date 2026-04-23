import { enhance } from '$app/forms';
import { showNotif } from '$lib/stores/notif.svelte';
import type { SubmitFunction } from '@sveltejs/kit';

type Opts = {
	success?: string;
	onSubmit?: () => void;
	onSuccess?: (data?: any) => void | Promise<void>;
	onDone?: () => void;
};

/**
 * Svelte action — use directly as use:formEnhance or use:formEnhance={opts}.
 * Errors are shown automatically; only describe the success case.
 *
 * No args:  use:formEnhance
 * Simple:   use:formEnhance={'Berhasil disimpan'}
 * Options:  use:formEnhance={{ success: '...', onSuccess: () => invalidate('app:pagination') }}
 * Loading:  use:formEnhance={{ onSubmit: () => loading=true, onDone: () => loading=false, success: '...' }}
 */
export function formEnhance(node: HTMLFormElement, opts: Opts | string = {}) {
	const o: Opts = typeof opts === 'string' ? { success: opts } : opts;
	const submitFn: SubmitFunction = () => {
		o.onSubmit?.();
		return async ({ result, update }) => {
			if (result.type === 'success' || result.type === 'redirect') {
				if (o.success) showNotif('success', o.success);
				await o.onSuccess?.(result.type === 'success' ? result.data : undefined);
				await update({ reset: false });
			} else if (result.type === 'failure') {
				showNotif('error', (result.data as any)?.error ?? 'Operasi gagal');
				await update({ reset: false });
			} else if (result.type === 'error') {
				showNotif('error', (result as any).error?.message ?? 'Server error');
			} else {
				await update({ reset: false });
			}
			o.onDone?.();
		};
	};
	return enhance(node, submitFn);
}
