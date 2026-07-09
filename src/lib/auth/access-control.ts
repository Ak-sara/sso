// Roles above the plain 'user' role that grant access beyond /profile
const ELEVATED_ROLES = ['admin', 'superadmin', 'viewer'];

// Routes a restricted 'user' role may reach (org routes are view-only, enforced separately in hooks.server.ts)
const RESTRICTED_ALLOWED_PREFIXES = ['/profile', '/logout', '/organization'];

export function isRestrictedUser(roles: string[] | undefined): boolean {
	return !roles?.some((r) => ELEVATED_ROLES.includes(r));
}

export function isPathAllowedForRestrictedUser(pathname: string): boolean {
	return RESTRICTED_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
