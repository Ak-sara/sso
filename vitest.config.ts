import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'happy-dom',
		globals: true,
		setupFiles: ['./src/tests/setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
	},
});
