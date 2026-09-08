import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import globals from "globals";

export default defineConfig([
	globalIgnores([
		"dist/**",
		".astro/**",
		"**/.astro/**",
		".wrangler/**",
		"node_modules/**",
		"worker-configuration.d.ts",
		// Código generado por el CLI de shadcn-svelte: no lo editamos a mano.
		"src/components/ui/**",
	]),
	js.configs.recommended,
	tseslint.configs.recommended,
	astro.configs["flat/recommended"],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
		},
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "warn",
		},
	},
	{
		// env.d.ts y worker-configuration.d.ts se referencian con triple slash:
		// es el idioma que esperan Astro y wrangler, no un estilo a corregir.
		files: ["**/*.d.ts"],
		rules: { "@typescript-eslint/triple-slash-reference": "off" },
	},
]);
