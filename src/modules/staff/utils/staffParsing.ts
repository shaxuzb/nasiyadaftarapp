/**
 * A shop's staff (GET /api/organizations/current/staff): who works there,
 * which numbers are invited and waiting, and whether more can be added.
 * Pure: no React Native, so it is tested on its own.
 */

export interface StaffMember {
  userId: number;
  fullName: string;
  phoneNumber: string;
  addedDate: string | null;
}

export interface StaffInvite {
  id: number;
  phoneNumber: string;
  createdDate: string | null;
}

export interface StaffList {
  /** Members and invites together may not pass this. */
  limit: number;
  /** False on the free plan: no staff at all. */
  planAllowsStaff: boolean;
  canAdd: boolean;
  members: StaffMember[];
  invites: StaffInvite[];
}

/** POST answer: "added" (had an account), "invited" (joins on first sign-in). */
export type StaffAddStatus = "added" | "invited";

type Item = Record<string, unknown>;

function record(value: unknown): Item {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Item) : {};
}

function id(value: unknown): number | null {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof number === "number" && Number.isSafeInteger(number) && number > 0 ? number : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseStaffList(input: unknown): StaffList {
  const body = record(input);
  const limit = typeof body.limit === "number" && body.limit >= 0 ? Math.trunc(body.limit) : 0;
  const members = (Array.isArray(body.members) ? body.members : []).flatMap((value) => {
    const item = record(value);
    const userId = id(item.userId);
    return userId
      ? [{
          userId,
          fullName: text(item.fullName),
          phoneNumber: text(item.phoneNumber),
          addedDate: text(item.addedDate) || null,
        }]
      : [];
  });
  const invites = (Array.isArray(body.invites) ? body.invites : []).flatMap((value) => {
    const item = record(value);
    const inviteId = id(item.id);
    return inviteId
      ? [{ id: inviteId, phoneNumber: text(item.phoneNumber), createdDate: text(item.createdDate) || null }]
      : [];
  });
  const planAllowsStaff = body.planAllowsStaff !== false;
  return {
    limit,
    planAllowsStaff,
    canAdd: planAllowsStaff && body.canAdd !== false && members.length + invites.length < limit,
    members,
    invites,
  };
}

export function parseStaffAddResult(input: unknown): { status: StaffAddStatus; staff: StaffList } {
  const body = record(input);
  return {
    status: text(body.status).toLowerCase() === "added" ? "added" : "invited",
    staff: parseStaffList(body.staff ?? body),
  };
}
