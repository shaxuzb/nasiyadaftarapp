// @ts-expect-error Standalone Node test imports TypeScript directly.
import { resolveApiBaseUrl } from './apiBaseUrl.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(
  resolveApiBaseUrl(
    ' https://api.example.com/api/ ',
    'https://fallback.example.com/api/',
  ) === 'https://api.example.com/api',
  'valid configured URL must win and trailing slash must be removed',
);

assert(
  resolveApiBaseUrl(
    'ftp://invalid.example.com',
    'https://fallback.example.com/api/',
  ) === 'https://fallback.example.com/api',
  'invalid protocol must use fallback',
);

assert(
  resolveApiBaseUrl('   ', 'https://fallback.example.com/api/') ===
    'https://fallback.example.com/api',
  'blank configured URL must use fallback',
);

assert(
  resolveApiBaseUrl(undefined, 'http://localhost:3000/api/') ===
    'http://localhost:3000/api',
  'HTTP fallback is allowed for development and normalized',
);

console.log('API base URL resolution tests passed');
