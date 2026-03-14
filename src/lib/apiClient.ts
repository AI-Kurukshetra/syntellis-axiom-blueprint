import type { ApiResponse } from "@/lib/api-response";

export type ApiRequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(input: string, query?: ApiRequestOptions["query"]) {
  const url = new URL(input, "http://localhost");

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return `${url.pathname}${url.search}`;
}

async function request<T>(input: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await fetch(buildUrl(input, options.query), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (!payload.success) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}

export const apiClient = {
  get<T>(input: string, options?: ApiRequestOptions) {
    return request<T>(input, { ...options, method: "GET" });
  },
  post<T>(input: string, body?: unknown, options?: ApiRequestOptions) {
    return request<T>(input, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
};
