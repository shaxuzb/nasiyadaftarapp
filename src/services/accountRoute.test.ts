// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { isPublicAccountRoute } from './accountRoute.ts';

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

for (const path of [
  '/account/login',
  '/account/register',
  '/account/google',
  '/account/apple',
  '/account/refresh',
  '/account/logout',
  '/api/account/apple',
  'https://example.com/api/account/apple?x=1',
]) {
  assert(isPublicAccountRoute(path), `${path} must be a public account route`);
}

for (const path of [
  '/account/google-change/request',
  '/account/apple-extra',
  '/foo/account/apple',
  '/account/profile',
  '',
]) {
  assert(!isPublicAccountRoute(path), `${path} must not be a public account route`);
}

console.log('Public account route matcher tests passed');
