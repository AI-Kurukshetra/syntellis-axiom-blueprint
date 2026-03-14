import { createPlaceholderRoute } from "@/lib/route-helpers";

const handlers = createPlaceholderRoute("notifications");

export const GET = handlers.GET;
export const POST = handlers.POST;
