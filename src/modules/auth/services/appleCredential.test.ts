// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { normalizeAppleCredential } from './appleCredential.ts';

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

const firstLogin = normalizeAppleCredential({
  identityToken: '  identity-token  ',
  email: '  user@example.com  ',
  fullName: '  Ali Valiyev  ',
});
assert(firstLogin.identityToken === 'identity-token', 'Identity token must be trimmed');
assert(firstLogin.email === 'user@example.com', 'Email must be trimmed');
assert(firstLogin.fullName === 'Ali Valiyev', 'Full name must be trimmed');

const repeatLogin = normalizeAppleCredential({
  identityToken: 'identity-token',
  email: null,
  fullName: null,
});
assert(repeatLogin.email === null, 'Repeat login may omit email');
assert(repeatLogin.fullName === null, 'Repeat login may omit full name');

let missingTokenRejected = false;
try {
  normalizeAppleCredential({ identityToken: '   ', email: null, fullName: null });
} catch {
  missingTokenRejected = true;
}
assert(missingTokenRejected, 'Missing identity token must be rejected locally');

console.log('Apple credential normalization tests passed');
