export type NetworkStatus = 'unknown' | 'online' | 'offline';

export const OFFLINE_MUTATION_ERROR_CODE = 'OFFLINE_MUTATION';

let currentNetworkStatus: NetworkStatus = 'unknown';
let offlineMutationMessage = 'Internet aloqasi kerak';

export function normalizeNetworkStatus(
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
): NetworkStatus {
  if (isConnected === false || isInternetReachable === false) return 'offline';
  if (isConnected === true && isInternetReachable !== false) return 'online';
  return 'unknown';
}

export function setCurrentNetworkStatus(status: NetworkStatus): void {
  currentNetworkStatus = status;
}

export function getCurrentNetworkStatus(): NetworkStatus {
  return currentNetworkStatus;
}

export function setOfflineMutationMessage(message: string): void {
  const normalized = message.trim();
  if (normalized) offlineMutationMessage = normalized;
}

export function isServerMutationMethod(method?: string): boolean {
  if (!method) return false;
  return ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase());
}

export function assertOnlineForMutation(
  status: NetworkStatus = currentNetworkStatus,
): void {
  if (status === 'offline') {
    const error = new Error(offlineMutationMessage);
    error.name = OFFLINE_MUTATION_ERROR_CODE;
    throw error;
  }
}
