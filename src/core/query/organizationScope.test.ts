// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { getOrganizationQueryScope } from "./organizationScope.ts";

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(message + ": " + String(actual) + " !== " + String(expected));
  }
}

let state = getOrganizationQueryScope(7, 42);
equal(state.scope, 42, "organization id is the scope");
equal(state.enabled, true, "active organization enables query");

state = getOrganizationQueryScope(7, null);
equal(state.scope, "no-organization", "missing organization uses sentinel scope");
equal(state.enabled, false, "user alone cannot enable organization query");

state = getOrganizationQueryScope(null, 42);
equal(state.scope, 42, "organization remains the scope when user is unresolved");
equal(state.enabled, false, "signed-out user cannot enable organization query");

state = getOrganizationQueryScope(7, 0);
equal(state.scope, "no-organization", "invalid organization id uses sentinel scope");
equal(state.enabled, false, "invalid organization id cannot enable query");
