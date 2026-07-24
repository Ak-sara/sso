// Only 'admin' grants full, all-realm access. Everyone else is a restricted user:
// read-only on /organization/*, scoped to their own realm — per-app access is
// granted separately via Realm Roles.
const ELEVATED_ROLES = ['admin'];

// Routes a restricted user may reach (org routes are view-only, enforced separately in hooks.server.ts)
const RESTRICTED_ALLOWED_PREFIXES = ['/profile', '/logout', '/organization'];

// NOTE: this file is imported from +layout.svelte (client bundle) — keep it free of
// server-only imports (db, mongodb, etc.). DB-touching helpers belong in access-control.server.ts.

export function isRestrictedUser(roles: string[] | undefined): boolean {
	return !roles?.some((r) => ELEVATED_ROLES.includes(r));
}

export function isPathAllowedForRestrictedUser(pathname: string): boolean {
	return RESTRICTED_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
