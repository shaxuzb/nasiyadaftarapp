export interface QueryLoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
}

export function getQueryLoadingState(
  isPending: boolean,
  isFetching: boolean,
): QueryLoadingState {
  return {
    isLoading: isPending,
    isRefreshing: isFetching && !isPending,
  };
}
