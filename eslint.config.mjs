import tsEslintPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
	{
		languageOptions: {
			parser: tsParser, // Use the imported parser object
			ecmaVersion: 6,
			sourceType: "module",
		},
		plugins: {
			"@typescript-eslint": tsEslintPlugin,
		},
		rules: {
			"@typescript-eslint/naming-convention": [
				"warn",
				{
					selector: "import",
					format: ["camelCase", "PascalCase"],
				},
			],
			semi: ["warn", "always"], // Use the default ESLint 'semi' rule instead
			curly: "warn",
			eqeqeq: "warn",
			"no-throw-literal": "warn",
		},
		ignores: ["out", "dist", "**/*.d.ts"], // Paths to ignore
		files: ["src/**/*.ts"], // Specify files to lint
	},
];