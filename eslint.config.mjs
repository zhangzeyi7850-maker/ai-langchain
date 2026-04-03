import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    rules: {
      // ❌ 关闭缩进规则（核心解决冲突）
      indent: 'off',
      '@typescript-eslint/indent': 'off',

      // ✅ 推荐规则
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',

      // Nest 常见优化
      'no-console': 'warn',
    },
  },

  // ✅ 让 prettier 接管格式
  prettier,
];