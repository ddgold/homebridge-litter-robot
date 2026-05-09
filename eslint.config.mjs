import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config({ ignores: ["dist/**"] }, ...tseslint.configs.recommendedTypeChecked, prettier, {
	files: ["src/**/*.ts"],
	languageOptions: {
		parserOptions: {
			project: true,
			tsconfigRootDir: import.meta.dirname,
		},
	},
	rules: {
		"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
		"@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "no-public" }],
	},
});
