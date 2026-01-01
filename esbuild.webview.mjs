import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: {
    'config-app': 'src/webview-ui/config/config-app.ts',
    'issue-app': 'src/webview-ui/issue/issue-app.ts',
  },
  bundle: true,
  outdir: 'out/webview-ui',
  format: 'iife',
  minify: !isWatch,
  sourcemap: isWatch,
  alias: {
    '@shared': path.resolve(__dirname, 'src/shared'),
  },
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete');
}

