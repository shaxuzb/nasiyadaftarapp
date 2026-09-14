// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { getAppUpdateDecision } from './appUpdateDecision.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const base = {
  platform: 'android' as const,
  currentVersion: '1.0.10',
  latestVersion: '1.0.11',
  minimumVersion: '1.0.0',
  updateAvailable: false,
  updateRequired: false,
  forceUpdate: false,
  title: 'Yangi versiya mavjud',
  message: 'Ilovaning yangi versiyasi chiqdi.',
  storeUrl: 'https://play.google.com/store/apps/details?id=com.rbsx.nasiyadaftariapp',
};

let decision = getAppUpdateDecision(base, null);
assert(!decision.shouldShow, 'No backend update flags must keep the sheet hidden');
assert(!decision.isForced, 'No required flag must not force update');

decision = getAppUpdateDecision({ ...base, updateAvailable: true }, null);
assert(decision.shouldShow, 'updateAvailable must show an optional update');
assert(!decision.isForced, 'Optional update must stay dismissible');

decision = getAppUpdateDecision({ ...base, updateAvailable: true }, base.latestVersion);
assert(!decision.shouldShow, 'Dismissed optional latest version must stay hidden');

decision = getAppUpdateDecision({ ...base, updateRequired: true }, base.latestVersion);
assert(decision.shouldShow, 'Required update must ignore optional dismissal state');
assert(decision.isForced, 'updateRequired must be the only forced-update source');

decision = getAppUpdateDecision({ ...base, updateRequired: true, forceUpdate: false }, null);
assert(decision.isForced, 'Required update must remain forced regardless of forceUpdate field');

console.log('Backend app update decision tests passed');
