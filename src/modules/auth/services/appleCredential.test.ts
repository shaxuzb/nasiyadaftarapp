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

const tokenPayload = Buffer.from(JSON.stringify({
  email: 'relay@example.com',
})).toString('base64url');
const tokenWithEmail = `header.${tokenPayload}.signature`;
const emailRecoveredFromToken = normalizeAppleCredential({
  identityToken: tokenWithEmail,
  email: null,
  fullName: null,
});
assert(
  emailRecoveredFromToken.email === 'relay@example.com',
  'Apple email claim should recover when native credential omits email',
);

let missingTokenRejected = false;
try {
  normalizeAppleCredential({ identityToken: '   ', email: null, fullName: null });
} catch {
  missingTokenRejected = true;
}
assert(missingTokenRejected, 'Missing identity token must be rejected locally');

console.log('Apple credential normalization tests passed');
