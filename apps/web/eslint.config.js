// @ts-check
import js from '@eslint/js';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
	{
		ignores: ['dist', 'node_modules', 'eslint.config.js'],
	},
	js.configs.recommended,
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaFeatures: { jsx: true },
				sourceType: 'module',
				ecmaVersion: 'latest',
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021,
			},
		},
		plugins: {
			'@typescript-eslint': tseslintPlugin,
			react,
			'react-hooks': reactHooks,
		},
		settings: {
			react: { version: 'detect' },
		},
		rules: {
			...tseslintPlugin.configs.recommended.rules,
			...react.configs.recommended.rules,
			...react.configs['jsx-runtime'].rules,
			...reactHooks.configs.recommended.rules,
			// O TypeScript já cobre variáveis não definidas (ex.: tipos globais do React)
			'no-undef': 'off',
			'no-else-return': 'error',
			'react/prop-types': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
	{
		files: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}'],
		languageOptions: {
			globals: { ...globals.node, ...globals.jest },
		},
	},
	eslintPluginPrettierRecommended,
];
