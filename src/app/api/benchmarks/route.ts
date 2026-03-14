import { createPlaceholderRoute } from "@/lib/route-helpers";

const handlers = createPlaceholderRoute("benchmarks");

export const GET = handlers.GET;
export const POST = handlers.POST;
