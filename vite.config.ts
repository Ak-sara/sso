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
	},
	server: {
		host: '0.0.0.0', // Listen on all network interfaces (allows LAN access)
		port: 5173,
		strictPort: false, // Use alternative port if 5174 is busy
		// Allow CORS for development
		cors: true
	},
	preview: {
		host: '0.0.0.0', // Also expose preview server
		port: 4173,
		strictPort: false
	}
});
