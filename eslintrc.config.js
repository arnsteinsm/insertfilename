// eslintrc.config.js

export default [
	{
		files: ["**/*.ts"], // Applies the configuration to TypeScript files
		languageOptions: {
			ecmaVersion: 6,
			sourceType: "module",
		},
		ignores: ["out", "dist", "**/*.d.ts"],
		plugins: {
			"@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
		},
		rules: {
			// TypeScript-specific rules
			"@typescript-eslint/naming-convention": [
				"warn",
				{
					selector: "import",
					format: ["camelCase", "PascalCase"],
				},
			],
			"@typescript-eslint/semi": "warn",

			// General JavaScript/TypeScript rules
			curly: "warn",
			eqeqeq: "warn",
			"no-throw-literal": "warn",

			// Turn off the base rule, as @typescript-eslint/semi replaces it
			semi: "off",
		},
	},
];