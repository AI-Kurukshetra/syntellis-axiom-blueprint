import { apiClient } from "@/lib/apiClient";

export interface ScaffoldedFeatureResponse {
  resource: string;
  status: "placeholder" | "implemented";
  message: string;
}

export function createScaffoldedFeatureService(endpoint: string) {
  return {
    getStatus() {
      return apiClient.get<ScaffoldedFeatureResponse>(endpoint);
    },
  };
}
