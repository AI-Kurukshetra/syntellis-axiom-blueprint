import { createPlaceholderRoute } from "@/lib/route-helpers";

const handlers = createPlaceholderRoute("predictions");

export const GET = handlers.GET;
export const POST = handlers.POST;
