import { SignInForm } from "@/app/(auth)/sign-in/sign-in-form";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function normalizeRedirectTarget(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/workspace";
  }

  return value;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectTo = normalizeRedirectTarget(getFirstParam(params.redirectTo));
  const urlError = getFirstParam(params.error);
  const urlMessage = getFirstParam(params.message);
  const confirmed = getFirstParam(params.confirmed) === "1";

  return <SignInForm redirectTo={redirectTo} urlError={urlError} urlMessage={urlMessage} confirmed={confirmed} />;
}
