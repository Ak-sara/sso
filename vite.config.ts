import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * FBA optional peer deps that are server-only.
 * Must be externalized so Vite/rollup don't try to bundle them.
 */
const SERVER_ONLY_PKGS = [
	'@node-rs/argon2', '@node-rs/argon2-wasm32-wasi',
	'mongodb', 'bson',
	'postgres', 'drizzle-orm', 'mysql2', 'better-sqlite3',
	'ioredis', 'bullmq',
	'@sendgrid/mail',
	'nodemailer',
];

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		noExternal: [],
		external: SERVER_ONLY_PKGS
	},
	build: {
		rollupOptions: {
			external: (id) => {
				if (id.startsWith('node:') || ['crypto', 'events', 'path', 'fs', 'os', 'util', 'stream', 'buffer', 'net', 'tls', 'http', 'https', 'child_process', 'url', 'querystring', 'zlib'].includes(id)) return true;
				if (SERVER_ONLY_PKGS.some(pkg => id === pkg || id.startsWith(pkg + '/'))) return true;
				return false;
			}
		}
	},
	optimizeDeps: {
		exclude: [...SERVER_ONLY_PKGS, '@ak-sara/sto-diagram', '@ak-sara/fbao']
	},
	server: {
		host: '0.0.0.0',
		port: 5173,
		strictPort: false,
		cors: true
	},
	preview: {
		host: '0.0.0.0',
		port: 4173,
		strictPort: false
	}
});
