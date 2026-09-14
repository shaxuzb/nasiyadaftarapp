// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { normalizeOrganizationProfile } from './organizationProfile.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

let result = normalizeOrganizationProfile({ name: '  Softex  ', address: '  Toshkent  ' });
assert(result.ok, 'Valid organization profile must pass');
if (result.ok) {
  assert(result.value.name === 'Softex', 'Name must be trimmed');
  assert(result.value.address === 'Toshkent', 'Address must be trimmed');
  assert(!('note' in result.value), 'Update payload must never add note');
}

result = normalizeOrganizationProfile({ name: '   ', address: 'Toshkent' });
assert(!result.ok, 'Blank organization name must fail validation');

result = normalizeOrganizationProfile({ name: 'Softex', address: '   ' });
assert(result.ok, 'Blank address is allowed');
if (result.ok) {
  assert(result.value.address === '', 'Blank address must normalize to an empty string');
}

console.log('Organization profile normalization tests passed');
