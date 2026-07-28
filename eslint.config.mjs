// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/dist/**', '**/.next/**', '**/.turbo/**', '**/node_modules/**', '**/generated/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // NestJS의 생성자 주입은 TypeScript가 내보내는 emitDecoratorMetadata(design:paramtypes)에
      // 의존한다. `import type`으로 바꾸면 import 자체가 지워져 런타임에 토큰을 잃고 DI가 깨지므로
      // 이 규칙은 사용하지 않는다.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
);
