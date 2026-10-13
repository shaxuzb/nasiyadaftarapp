/**
 * The public offer, as the backend describes it.
 *
 *   GET /offer          what the offer is
 *   GET /offer/status   the same, plus where this user stands with it
 *
 * `enabled: false` switches the whole feature off: nothing is shown and
 * nothing is asked.
 *
 * Two fields of these answers are deliberately not read:
 *   `url`                      the link to the offer is fixed in the app
 *                              (config/legalLinks);
 *   `requiredForOrganization`  agreeing is never optional in the app: where
 *                              the checkbox is shown, it must be ticked.
 */
export type OfferVersion = string | number;

export interface OfferInfo {
  enabled: boolean;
  version: OfferVersion | null;
  title: string | null;
}

export interface OfferStatus {
  enabled: boolean;
  version: OfferVersion | null;
  title: string | null;
  accepted: boolean;
  acceptedAt: string | null;
  /** The user has to accept before going on. Never true while disabled. */
  mustAccept: boolean;
}

function asRecord(payload: unknown, what: string): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`${what} response is not an object`);
  }
  return payload as Record<string, unknown>;
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readVersion(value: unknown): OfferVersion | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return readText(value);
}

export function parseOfferInfo(payload: unknown): OfferInfo {
  const item = asRecord(payload, "Offer");
  const enabled = item.enabled === true;
  return {
    enabled,
    version: readVersion(item.version),
    title: readText(item.title),
  };
}

export function parseOfferStatus(payload: unknown): OfferStatus {
  const item = asRecord(payload, "Offer status");
  const enabled = item.enabled === true;
  return {
    enabled,
    version: readVersion(item.version),
    title: readText(item.title),
    accepted: item.accepted === true,
    acceptedAt: readText(item.acceptedAt),
    mustAccept: enabled && item.mustAccept === true,
  };
}

/**
 * What the "new organization" form does about the offer, for a user who
 * already has organizations. (The first organization does not come through
 * here: there the agreement is always asked for and always required.)
 *
 *   visible   show the "I agree" checkbox with the link; the form cannot be
 *             sent until it is ticked
 *   implied   the user accepted this offer earlier, so the request carries
 *             the agreement without asking for it again
 */
export interface OrganizationOfferConsent {
  visible: boolean;
  implied: boolean;
}

const NO_CONSENT: OrganizationOfferConsent = { visible: false, implied: false };

/**
 * No answer about the offer (the request failed, or an older server) is the
 * same as no offer: the form stays as it was, and if the server does require
 * the agreement, its own message says so.
 */
export function getOrganizationOfferConsent(
  info: OfferInfo | null | undefined,
  status?: OfferStatus | null,
): OrganizationOfferConsent {
  if (!info?.enabled) return NO_CONSENT;

  const alreadyAccepted =
    status?.enabled === true && status.accepted && !status.mustAccept;
  if (alreadyAccepted) return { visible: false, implied: true };

  return { visible: true, implied: false };
}

/** Whether the request to create the organization says "offer accepted". */
export function isOfferAcceptedForOrganization(
  consent: OrganizationOfferConsent,
  ticked: boolean,
): boolean {
  return consent.implied || (consent.visible && ticked);
}
