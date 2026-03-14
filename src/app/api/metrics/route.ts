import { createPlaceholderRoute } from "@/lib/route-helpers";

const handlers = createPlaceholderRoute("metrics");

export const GET = handlers.GET;
export const POST = handlers.POST;
