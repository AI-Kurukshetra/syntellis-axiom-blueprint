import { redirect } from "next/navigation";

import { getDefaultWorkspaceHref } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";

type WorkspacePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const currentUser = await requireCurrentUserContext();
  const params = await searchParams;
  const message = getFirstParam(params.message);
  const target = getDefaultWorkspaceHref(currentUser);

  if (message) {
    const url = new URL(target, "http://localhost");
    url.searchParams.set("message", message);
    redirect(`${url.pathname}${url.search}`);
  }

  redirect(target);
}
