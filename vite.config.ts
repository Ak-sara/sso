import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		noExternal: [],
		external: ['@node-rs/argon2', 'mongodb']
	},
	build: {
		rollupOptions: {
			external: []
		}
	},
	optimizeDeps: {
		exclude: ['@node-rs/argon2', 'mongodb']
	}
});
