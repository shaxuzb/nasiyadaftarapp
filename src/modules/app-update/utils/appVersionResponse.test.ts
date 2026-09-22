// @ts-expect-error Standalone Node test imports TypeScript directly.
import { parseAppVersionCheckResponse } from './appVersionResponse.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const valid = {
  platform: 'android',
  currentVersion: '1.0.10',
  latestVersion: '1.0.9',
  minimumVersion: '1.0.0',
  updateAvailable: false,
  updateRequired: false,
  forceUpdate: false,
  title: 'Yangi versiya mavjud',
  message: 'Ilovaning yangi versiyasi chiqdi.',
  storeUrl:
    'https://play.google.com/store/apps/details?id=com.rbsx.nasiyadaftariapp',
};

assert(
  parseAppVersionCheckResponse(valid, 'android')?.latestVersion === '1.0.9',
  'valid payload parses',
);
assert(
  parseAppVersionCheckResponse({ ...valid, platform: 'ios' }, 'android') === null,
  'wrong platform is rejected',
);
assert(
  parseAppVersionCheckResponse({ ...valid, latestVersion: '1.0' }, 'android') === null,
  'invalid semantic version is rejected',
);
assert(
  parseAppVersionCheckResponse(
    { ...valid, updateAvailable: 'false' },
    'android',
  ) === null,
  'non-boolean update flags are rejected',
);
assert(
  parseAppVersionCheckResponse({ ...valid, title: '   ' }, 'android') === null,
  'blank title is rejected',
);
assert(
  parseAppVersionCheckResponse(
    { ...valid, storeUrl: 'http://example.com/app' },
    'android',
  ) === null,
  'non-HTTPS store URL is rejected',
);
assert(
  parseAppVersionCheckResponse(
    { ...valid, latestVersion: '1.0.0', minimumVersion: '1.0.1' },
    'android',
  ) === null,
  'latest version below minimum version is rejected',
);
assert(
  parseAppVersionCheckResponse(
    { ...valid, storeUrl: 'https://evil.example.com/store' },
    'android',
  ) === null,
  'store URL outside the official stores is rejected',
);
assert(
  parseAppVersionCheckResponse(
    { ...valid, storeUrl: 'https://play.google.com.evil.example/app' },
    'android',
  ) === null,
  'store host suffix spoofing is rejected',
);
assert(
  parseAppVersionCheckResponse(
    { ...valid, storeUrl: 'https://apps.apple.com/app/id123' },
    'android',
  ) === null,
  'iOS store URL is rejected for the Android platform',
);
assert(
  parseAppVersionCheckResponse(
    { ...valid, platform: 'ios', storeUrl: 'https://apps.apple.com/app/id123' },
    'ios',
  )?.storeUrl === 'https://apps.apple.com/app/id123',
  'official App Store URL is accepted on iOS',
);

const forced = parseAppVersionCheckResponse(
  { ...valid, updateAvailable: false, updateRequired: true },
  'android',
);
assert(
  forced?.updateRequired === true,
  'required flag remains authoritative independently of updateAvailable',
);

console.log('Backend app version response tests passed');
