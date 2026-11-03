import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { getOwnDeviceStatus } from "./ownDeviceStatus.ts";

const sim = (overrides: Record<string, unknown> = {}) => ({
  id: 1, deviceCode: "D1", slot: 0, name: "", organizationId: 1, organizationName: "",
  dailyLimit: 50, usedToday: 5, remainingToday: 45, isActive: true, ...overrides,
});
const device = (overrides: Record<string, unknown> = {}) => ({
  deviceCode: "D1", name: "Redmi", online: true, canSend: true, unavailableReason: null,
  battery: 80, lastSeenAt: null, sims: [sim()], ...overrides,
});

assert.deepEqual(getOwnDeviceStatus(undefined), { kind: "notConnected" });
assert.deepEqual(getOwnDeviceStatus([]), { kind: "notConnected" });

/* How many more numbers today: the active SIMs together. */

assert.deepEqual(getOwnDeviceStatus([device()]), { kind: "ready", remainingToday: 45, online: true });
assert.deepEqual(
  getOwnDeviceStatus([device({ sims: [sim(), sim({ id: 2, slot: 1, remainingToday: 30 }), sim({ id: 3, remainingToday: 99, isActive: false })] })]),
  { kind: "ready", remainingToday: 75, online: true },
  "Both SIMs count; a switched-off one does not",
);
assert.deepEqual(
  getOwnDeviceStatus([device({ sims: [sim({ remainingToday: 0 }), sim({ id: 2, remainingToday: -3 })] })]),
  { kind: "limitReached", online: true },
);
assert.deepEqual(
  getOwnDeviceStatus([device({ sims: [], online: null })]),
  { kind: "ready", remainingToday: null, online: null },
  "No SIM reported: the count is unknown, not zero",
);

/* What stops the phone comes first. */

assert.deepEqual(
  getOwnDeviceStatus([device({ canSend: false, unavailableReason: "SMS ruxsati yo‘q", online: true })]),
  { kind: "blocked", reason: "SMS ruxsati yo‘q", online: true },
);
assert.deepEqual(getOwnDeviceStatus([device({ online: false })]), { kind: "offline" });
assert.deepEqual(
  getOwnDeviceStatus([device(), device({ deviceCode: "D2", online: false })]),
  { kind: "ready", remainingToday: 45, online: true },
  "The first phone, as on the settings screen",
);

console.log("Own device SMS status tests passed");
