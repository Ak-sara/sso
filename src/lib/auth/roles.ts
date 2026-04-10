import { defineRole, definePermission } from '@ak-sara/fbao/foundation';

// Define permissions (action, resource) → returns 'resource:action'
definePermission('read', 'users');
definePermission('write', 'users');
definePermission('delete', 'users');

definePermission('read', 'orgs');
definePermission('write', 'orgs');
definePermission('delete', 'orgs');

definePermission('read', 'clients');
definePermission('write', 'clients');
definePermission('delete', 'clients');

definePermission('read', 'audit');

// Define roles
defineRole('superadmin', ['*']);
defineRole('admin', [
	'users:read', 'users:write',
	'orgs:read', 'orgs:write',
	'clients:read',
	'audit:read',
]);
defineRole('viewer', [
	'users:read',
	'orgs:read',
	'clients:read',
	'audit:read',
]);
