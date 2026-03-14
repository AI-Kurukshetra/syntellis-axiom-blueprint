import { handleApiError, notImplemented, ok } from "@/lib/api-response";

export function createPlaceholderRoute(resource: string) {
  return {
    GET: async () =>
      ok({
        resource,
        status: "placeholder",
        message: `${resource} endpoint scaffolded. Business logic is not implemented yet.`,
      }),
    POST: async () =>
      notImplemented(`${resource} create action is not implemented yet.`),
  };
}

export function withRouteHandler<TArgs extends unknown[]>(handler: (...args: TArgs) => Promise<Response> | Response) {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
