// @ts-expect-error Direct .ts imports in Node's strip-types test runner.
import { parseSmsProvider } from "./providerParsing.ts";
const assert = (condition: boolean, description: string) => {
  if (!condition) throw new Error(description);
};
const own = parseSmsProvider({ provider: "own_device", usesQuota: false, ownDeviceAllowed: true });
assert(own.provider === "own_device" && !own.usesQuota && own.ownDeviceAllowed, "Own phone provider");
const system = parseSmsProvider({ provider: "system", usesQuota: true, ownDeviceAllowed: false });
assert(system.provider === "system" && system.usesQuota && !system.ownDeviceAllowed, "System provider");
let invalid = false;
try { parseSmsProvider({ provider: "test", usesQuota: true }); } catch { invalid = true; }
assert(invalid, "Reject incomplete provider state");
console.log("SMS provider contract tests passed");
