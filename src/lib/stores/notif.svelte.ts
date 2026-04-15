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

	show(type: NotifType, message: string, durationMs = 3500): void {
		if (this.timer) clearTimeout(this.timer);
		this.value = { type, message };
		this.timer = setTimeout(() => { this.value = null; }, durationMs);
	}

	dismiss(): void {
		if (this.timer) clearTimeout(this.timer);
		this.value = null;
	}
}

export const notif = new NotifStore();

/** Convenience shorthand — same as notif.show() */
export function showNotif(type: NotifType, message: string, durationMs = 3500): void {
	notif.show(type, message, durationMs);
}
