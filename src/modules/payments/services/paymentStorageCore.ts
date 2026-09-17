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
const pendingMutations = new Map<number, Promise<unknown>>();

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

function sortPendingPayments(
  payments: PendingPaymentReference[],
): PendingPaymentReference[] {
  return [...payments].sort((a, b) => {
    const byUpdatedAt = b.updatedAt.localeCompare(a.updatedAt);
    return byUpdatedAt !== 0 ? byUpdatedAt : b.orderId - a.orderId;
  });
}

function enqueuePendingMutation<T>(
  userId: number,
  mutation: () => Promise<T>,
): Promise<T> {
  const previous = pendingMutations.get(userId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(mutation);
  pendingMutations.set(userId, next);
  void next
    .finally(() => {
      if (pendingMutations.get(userId) === next) {
        pendingMutations.delete(userId);
      }
    })
    .catch(() => undefined);
  return next;
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

  async function readPendingPayments(
    userId: number,
  ): Promise<PendingPaymentReference[]> {
    assertPositiveId(userId);
    const raw = await storage.getItem(pendingKey(userId));
    if (!raw) return [];

    const parsed = parseJson(raw);
    // Migrate the original single-reference shape without making users lose
    // an unfinished checkout after upgrading the app.
    if (isPendingReference(parsed, userId)) {
      const migrated = [parsed];
      await storage.setItem(pendingKey(userId), JSON.stringify(migrated));
      return migrated;
    }
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid payment lifecycle storage");
    }

    const unique = new Map<number, PendingPaymentReference>();
    for (const value of parsed) {
      if (!isPendingReference(value, userId)) {
        throw new Error("Invalid payment lifecycle storage");
      }
      unique.set(value.orderId, value);
    }
    return sortPendingPayments([...unique.values()]);
  }

  async function writePendingPayments(
    userId: number,
    payments: PendingPaymentReference[],
  ): Promise<void> {
    const sorted = sortPendingPayments(payments);
    if (sorted.length === 0) {
      await storage.removeItem(pendingKey(userId));
      return;
    }
    await storage.setItem(pendingKey(userId), JSON.stringify(sorted));
  }

  async function savePendingPayment(
    reference: PendingPaymentReference,
  ): Promise<void> {
    assertPositiveId(reference.userId);
    assertPositiveId(reference.orderId);
    assertPositiveId(reference.productId);
    await enqueuePendingMutation(reference.userId, async () => {
      const current = await readPendingPayments(reference.userId);
      await writePendingPayments(reference.userId, [
        ...current.filter((item) => item.orderId !== reference.orderId),
        reference,
      ]);
    });
  }

  async function getPendingPayments(
    userId: number,
  ): Promise<PendingPaymentReference[]> {
    assertPositiveId(userId);
    const currentMutation = pendingMutations.get(userId);
    if (currentMutation) await currentMutation.catch(() => undefined);
    return readPendingPayments(userId);
  }

  async function getPendingPayment(
    userId: number,
    orderId?: number,
  ): Promise<PendingPaymentReference | null> {
    if (orderId !== undefined) assertPositiveId(orderId);
    const payments = await getPendingPayments(userId);
    return (
      (orderId === undefined
        ? payments[0]
        : payments.find((item) => item.orderId === orderId)) ?? null
    );
  }

  async function clearPendingPayment(
    userId: number,
    orderId?: number,
  ): Promise<void> {
    if (orderId !== undefined) {
      assertPositiveId(orderId);
    }
    assertPositiveId(userId);
    await enqueuePendingMutation(userId, async () => {
      const current = await readPendingPayments(userId);
      if (orderId === undefined) {
        await writePendingPayments(userId, []);
        return;
      }
      if (!current.some((item) => item.orderId === orderId)) return;
      await writePendingPayments(
        userId,
        current.filter((item) => item.orderId !== orderId),
      );
    });
  }

  async function clearPaymentLifecycleForUser(userId: number): Promise<void> {
    assertPositiveId(userId);
    await Promise.all([
      storage.removeItem(attemptsKey(userId)),
      enqueuePendingMutation(userId, () => storage.removeItem(pendingKey(userId))),
    ]);
  }

  return {
    getOrCreateCheckoutAttempt,
    clearCheckoutAttempt,
    savePendingPayment,
    getPendingPayments,
    getPendingPayment,
    clearPendingPayment,
    clearPaymentLifecycleForUser,
  };
}
