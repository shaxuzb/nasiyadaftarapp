// @ts-expect-error Standalone TypeScript test loaded by Node.
import { parseSmsDevice, parseSmsDevices } from "./deviceParsing.ts";
const assert = (ok: boolean, why: string) => { if (!ok) throw new Error(why); };
assert(parseSmsDevices([]).length === 0, "Empty devices");
const device = parseSmsDevice({deviceCode:"K7Q2-M9XD",name:"Do'kon telefoni",online:true,battery:85,lastSeenAt:"2026-10-21T10:00:00Z",sims:[{id:1,deviceCode:"K7Q2-M9XD",slot:0,name:"SIM",organizationId:56,organizationName:"Azia Market",dailyLimit:59,usedToday:10,remainingToday:49,isActive:true}]});
assert(device.online === true && device.sims[0].remainingToday === 49, "Confirmed device example");
assert(device.canSend === null && device.unavailableReason === null, "Old API result keeps device capability unknown");
const offline = parseSmsDevice({deviceCode:"T1",name:"",online:false,canSend:false,unavailableReason:"Offline",sims:[]});
assert(offline.canSend === false && offline.unavailableReason === "Offline", "API status and reason retained");
const unknown = parseSmsDevice({deviceCode:"X",name:"",online:null,battery:null,lastSeenAt:null,sims:[]});
assert(unknown.online === null && unknown.battery === null, "Nullable status");
console.log("SMS device parsing tests passed");
