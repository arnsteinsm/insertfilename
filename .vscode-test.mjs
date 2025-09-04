import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	// glob pattern to find test files
	files: 'out/test/**/*.test.js',
	// you can add other options here, like a workspace to open
	// for your tests, or a specific version of VS Code to run.
});