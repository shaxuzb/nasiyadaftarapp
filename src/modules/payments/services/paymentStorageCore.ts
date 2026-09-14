import type {
  PaymentCheckoutAttempt,
  PaymentProductType,
  PendingPaymentReference,
} from "../types";

export interface PaymentStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

interface PaymentStorageCoreDependencies {
  storage: PaymentStorageAdapter;
  randomUUID: () => string;
  nowIso?: () => string;
}

const attemptsKey = (userId: number) =>
  `payment:checkout-attempts:v1:${userId}`;
const pendingKey = (userId: number) => `payment:pending:v1:${userId}`;
const productKey = (productType: PaymentProductType, productId: number) =>
  `${productType}:${productId}`;

function assertPositiveId(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Invalid payment lifecycle identifier");
  }
}

function isProductType(value: unknown): value is PaymentProductType {
  return value === "subscription" || value === "sms_package";
}

function isAttempt(
  value: unknown,
  expectedUserId: number,
): value is PaymentCheckoutAttempt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    item.version === 1 &&
    item.userId === expectedUserId &&
    isProductType(item.productType) &&
    typeof item.productId === "number" &&
    Number.isSafeInteger(item.productId) &&
    item.productId > 0 &&
    typeof item.idempotencyKey === "string" &&
    Boolean(item.idempotencyKey.trim()) &&
    typeof item.createdAt === "string" &&
    Boolean(item.createdAt.trim())
  );
}

function isPendingReference(
  value: unknown,
  expectedUserId: number,
): value is PendingPaymentReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    item.version === 1 &&
    item.userId === expectedUserId &&
    typeof item.orderId === "number" &&
    Number.isSafeInteger(item.orderId) &&
    item.orderId > 0 &&
    isProductType(item.productType) &&
    typeof item.productId === "number" &&
    Number.isSafeInteger(item.productId) &&
    item.productId > 0 &&
    typeof item.openedExternally === "boolean" &&
    typeof item.updatedAt === "string" &&
    Boolean(item.updatedAt.trim())
  );
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid payment lifecycle storage");
  }
}

export function createPaymentStorageCore({
  storage,
  randomUUID,
  nowIso = () => new Date().toISOString(),
}: PaymentStorageCoreDependencies) {
  async function readAttempts(
    userId: number,
  ): Promise<Record<string, PaymentCheckoutAttempt>> {
    assertPositiveId(userId);
    const raw = await storage.getItem(attemptsKey(userId));
    if (!raw) return {};
    const parsed = parseJson(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid payment lifecycle storage");
    }

    const attempts: Record<string, PaymentCheckoutAttempt> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!isAttempt(value, userId)) {
        throw new Error("Invalid payment lifecycle storage");
      }
      attempts[key] = value;
    }
    return attempts;
  }

  async function writeAttempts(
    userId: number,
    attempts: Record<string, PaymentCheckoutAttempt>,
  ): Promise<void> {
    if (Object.keys(attempts).length === 0) {
      await storage.removeItem(attemptsKey(userId));
      return;
    }
    await storage.setItem(attemptsKey(userId), JSON.stringify(attempts));
  }

  async function getOrCreateCheckoutAttempt(
    userId: number,
    productType: PaymentProductType,
    productId: number,
  ): Promise<PaymentCheckoutAttempt> {
    assertPositiveId(userId);
    assertPositiveId(productId);
    const attempts = await readAttempts(userId);
    const key = productKey(productType, productId);
    const existing = attempts[key];
    if (existing) return existing;

    const idempotencyKey = randomUUID().trim();
    if (!idempotencyKey) {
      throw new Error("Failed to create payment idempotency key");
    }

    const attempt: PaymentCheckoutAttempt = {
      version: 1,
      userId,
      productType,
      productId,
      idempotencyKey,
      createdAt: nowIso(),
    };
    attempts[key] = attempt;
    await writeAttempts(userId, attempts);
    return attempt;
  }

  async function clearCheckoutAttempt(
    userId: number,
    productType: PaymentProductType,
    productId: number,
  ): Promise<void> {
    const attempts = await readAttempts(userId);
    const key = productKey(productType, productId);
    if (!attempts[key]) return;
    delete attempts[key];
    await writeAttempts(userId, attempts);
  }

  async function savePendingPayment(
    reference: PendingPaymentReference,
  ): Promise<void> {
    assertPositiveId(reference.userId);
    assertPositiveId(reference.orderId);
    assertPositiveId(reference.productId);
    await storage.setItem(
      pendingKey(reference.userId),
      JSON.stringify(reference),
    );
  }

  async function getPendingPayment(
    userId: number,
  ): Promise<PendingPaymentReference | null> {
    assertPositiveId(userId);
    const raw = await storage.getItem(pendingKey(userId));
    if (!raw) return null;
    const parsed = parseJson(raw);
    if (!isPendingReference(parsed, userId)) {
      throw new Error("Invalid payment lifecycle storage");
    }
    return parsed;
  }

  async function clearPendingPayment(
    userId: number,
    orderId?: number,
  ): Promise<void> {
    if (orderId !== undefined) {
      assertPositiveId(orderId);
      const current = await getPendingPayment(userId);
      if (!current || current.orderId !== orderId) return;
    } else {
      assertPositiveId(userId);
    }
    await storage.removeItem(pendingKey(userId));
  }

  async function clearPaymentLifecycleForUser(userId: number): Promise<void> {
    assertPositiveId(userId);
    await Promise.all([
      storage.removeItem(attemptsKey(userId)),
      storage.removeItem(pendingKey(userId)),
    ]);
  }

  return {
    getOrCreateCheckoutAttempt,
    clearCheckoutAttempt,
    savePendingPayment,
    getPendingPayment,
    clearPendingPayment,
    clearPaymentLifecycleForUser,
  };
}
