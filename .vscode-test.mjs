import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	coverage: {
		include: ['out/**/*.js'],
		exclude: ['out/test/**', 'out/webview-ui/**'],
	},
});
