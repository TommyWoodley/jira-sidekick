import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
  files: 'src/webview-ui/**/*.test.ts',
  nodeResolve: true,
  plugins: [
    esbuildPlugin({ 
      ts: true,
      tsconfig: 'src/webview-ui/tsconfig.json',
    }),
  ],
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: 5000,
    },
  },
  coverageConfig: {
    include: ['src/webview-ui/**/*.ts'],
    exclude: ['src/webview-ui/**/*.test.ts'],
    report: true,
    reportDir: 'coverage/webview',
  },
};

