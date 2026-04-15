/**
 * URL navigation helper — updates search params without full page reload.
 * Uses 'app:pagination' dependency key so dependent loads re-run.
 */

import { goto, invalidate } from '$app/navigation';
import { get } from 'svelte/store';
import { page } from '$app/stores';

export async function navigateWithParams(params: Record<string, string | null>): Promise<void> {
	const url = new URL(get(page).url);
	for (const [key, val] of Object.entries(params))
		val === null ? url.searchParams.delete(key) : url.searchParams.set(key, val);
	await goto(url.toString(), { keepFocus: true, noScroll: true });
	await invalidate('app:pagination');
}
