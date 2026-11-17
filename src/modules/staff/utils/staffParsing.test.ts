import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { parseStaffAddResult, parseStaffList } from "./staffParsing.ts";
import {
  countOwnOrganizations,
  getCurrentOrganizationRole,
  normalizeOrganizationRole,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "../../organization/utils/organizationRole.ts";

/* The staff list, as documented. */

const list = parseStaffList({
  organizationId: 55,
  limit: 3,
  planAllowsStaff: true,
  canAdd: true,
  members: [{ userId: 66, fullName: "Vali", phoneNumber: "+998900000066", addedDate: "2026-11-16T10:00:00" }, { fullName: "no id" }],
  invites: [{ id: 4, phoneNumber: "+998901112233", createdDate: "2026-11-16" }],
});
assert.equal(list.members.length, 1, "A member without an id is dropped");
assert.equal(list.invites[0].id, 4);
assert.equal(list.canAdd, true);

const full = parseStaffList({
  limit: 2,
  planAllowsStaff: true,
  canAdd: true,
  members: [{ userId: 1 }],
  invites: [{ id: 2, phoneNumber: "+998" }],
});
assert.equal(full.canAdd, false, "Invites count against the limit too");

const free = parseStaffList({ limit: 0, planAllowsStaff: false, canAdd: false, members: [], invites: [] });
assert.equal(free.planAllowsStaff, false);
assert.equal(free.canAdd, false);

assert.equal(parseStaffAddResult({ status: "added", staff: { limit: 3, members: [], invites: [] } }).status, "added");
assert.equal(parseStaffAddResult({ status: "invited", staff: {} }).status, "invited");

/* Roles: an older server sends none, and that is the owner. */

assert.equal(normalizeOrganizationRole("Staff"), "staff");
assert.equal(normalizeOrganizationRole("Administrator"), undefined);
assert.equal(getCurrentOrganizationRole({}, { id: 1 }), "owner");
assert.equal(getCurrentOrganizationRole({ organizationId: 1, currentOrganizationRole: "staff" }, { id: 1 }), "staff");
assert.equal(
  getCurrentOrganizationRole({ organizationId: 2, currentOrganizationRole: "staff" }, { id: 1, role: "owner" }),
  "owner",
  "The select answer speaks for the shop it selected only",
);
assert.equal(getCurrentOrganizationRole({ organizationId: 1 }, { id: 1, role: "staff" }), "staff");
assert.equal(getCurrentOrganizationRole({ currentOrganizationRole: "staff" }, null), "staff");
assert.equal(
  countOwnOrganizations([{ id: 1, role: "owner" }, { id: 2, role: "staff" }, { id: 3 }]),
  2,
  "Shops worked in as staff never count against the user's own plan",
);

console.log("Staff list and organization role tests passed");
