/**
 * Global toast notification — rendered once in (app)/+layout.svelte.
 * Call showNotif() from any page or component.
 */

export type NotifType = 'success' | 'error' | 'warning' | 'info';

export interface Notif {
	type: NotifType;
	message: string;
}

class NotifStore {
	value: Notif | null = $state(null);
	private timer: ReturnType<typeof setTimeout> | null = null;

	show(type: NotifType, message: string, durationMs?: number): void {
		if (this.timer) clearTimeout(this.timer);
		this.value = { type, message };
		const ms = durationMs ?? (type === 'error' ? 0 : 3500);
		if (ms > 0) this.timer = setTimeout(() => { this.value = null; }, ms);
	}

	dismiss(): void {
		if (this.timer) clearTimeout(this.timer);
		this.value = null;
	}
}

export const notif = new NotifStore();

/** Convenience shorthand — same as notif.show(). Errors are persistent until dismissed. */
export function showNotif(type: NotifType, message: string, durationMs?: number): void {
	notif.show(type, message, durationMs);
}
