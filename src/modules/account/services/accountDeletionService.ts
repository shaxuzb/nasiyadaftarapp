import { apiClient } from "../../../services/axiosService";

export async function deleteMyAccount(): Promise<void> {
  await apiClient.delete("/account/my-account");
}
