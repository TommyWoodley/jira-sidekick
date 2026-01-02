import { defineConfig } from '@vscode/test-cli';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	tests: [
		{
			files: 'out/test/**/*.test.js',
			srcDir: resolve(__dirname, 'src'),
		}
	],
	coverage: {
		exclude: ['**/test/**', '**/webview-ui/**'],
		includeAll: true,
		output: 'coverage/extension',
	},
});
