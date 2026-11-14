import { getCurrentNetworkStatus, OFFLINE_MUTATION_ERROR_CODE } from "../../../core/network/networkState";
import type { Customer } from "../../clients/types";
import { enqueueOperation } from "../db/outboxRepository";
import { isServerDown } from "../state/serverStatus";
import { isServerUnreachable } from "../utils/savedData";
import { customerFromOperation } from "./pendingOverlay";
import type { ClientCreateData, TransactionCreateData } from "./syncTypes";

/**
 * Writing while the server cannot be reached. A write first goes to the
 * server as always, with a uuid the phone made; only when the server does
 * not answer is it queued, with that same uuid. If the request did reach the
 * server and only its answer was lost, the queued copy comes back as a
 * duplicate and is never recorded twice.
 */

/**
 * No answer from the server while the phone is online: a write to queue.
 * Offline mode is for the server being down, never for the phone's internet
 * being off; then nothing is written and the user is asked to connect.
 */
export function isUnreachableWrite(error: unknown): boolean {
  if (getCurrentNetworkStatus() === "offline") return false;
  if (error instanceof Error && error.name === OFFLINE_MUTATION_ERROR_CODE) return false;
  return isServerUnreachable(error);
}

/**
 * The server is known to be down and the phone is online: the write goes
 * straight to the queue, instead of waiting for a request to time out.
 */
export function shouldQueueRightAway(): boolean {
  return isServerDown() && getCurrentNetworkStatus() !== "offline";
}

/** A stand-in id for a customer added offline: negative, never a server id. */
function newTempId(): number {
  return -Date.now();
}

/** A customer, queued; returned as the screens show it until the server has it. */
export async function queueClientCreate(input: {
  userId: number;
  organizationId: number;
  data: ClientCreateData;
}): Promise<Customer> {
  const operation = await enqueueOperation({
    userId: input.userId,
    organizationId: input.organizationId,
    type: "client.create",
    data: input.data,
    meta: { tempId: newTempId() },
  });
  return customerFromOperation(operation);
}

/** A debt or payment, queued, for a customer the server has or one added offline. */
export async function queueTransactionCreate(input: {
  userId: number;
  organizationId: number;
  customer: Pick<Customer, "id" | "uuid" | "fullName" | "phone">;
  data: Omit<TransactionCreateData, "clientUuid" | "clientId">;
}): Promise<void> {
  const { customer } = input;
  await enqueueOperation({
    userId: input.userId,
    organizationId: input.organizationId,
    type: "transaction.create",
    data: {
      ...input.data,
      // By uuid when known (always, for one added offline); otherwise the server's id.
      ...(customer.uuid ? { clientUuid: customer.uuid } : { clientId: customer.id }),
    },
    meta: {
      clientName: customer.fullName || customer.phone,
      ...(customer.id < 0 ? { clientTempId: customer.id } : {}),
    },
  });
}
