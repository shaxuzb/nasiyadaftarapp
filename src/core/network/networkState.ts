export type NetworkStatus = 'unknown' | 'online' | 'offline';

export const OFFLINE_MUTATION_ERROR_CODE = 'OFFLINE_MUTATION';

export function normalizeNetworkStatus(
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
): NetworkStatus {
  if (isConnected === false || isInternetReachable === false) return 'offline';
  if (isConnected === true && isInternetReachable !== false) return 'online';
  return 'unknown';
}

export function assertOnlineForMutation(status: NetworkStatus): void {
  if (status === 'offline') {
    const error = new Error('Internet aloqasi kerak');
    error.name = OFFLINE_MUTATION_ERROR_CODE;
    throw error;
  }
}
