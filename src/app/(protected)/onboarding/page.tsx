import { PageHeader } from "@/components/ui/page-header";
import { bootstrapOrganizationAction } from "@/features/organizations/organization.actions";
import { requireBootstrapOnboardingAccess } from "@/lib/auth/authorization";

const timezoneOptions = [
  { value: "America/New_York", label: "Eastern Time (America/New_York)" },
  { value: "America/Chicago", label: "Central Time (America/Chicago)" },
  { value: "America/Denver", label: "Mountain Time (America/Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (America/Los_Angeles)" },
  { value: "UTC", label: "UTC" },
];

const bootstrapSteps = [
  {
    title: "Create the tenant",
    description: "Establish the organization record that will anchor hierarchy, users, and analytics scope.",
    value: "01",
  },
  {
    title: "Bind your profile",
    description: "Attach the current authenticated user to the new tenant context and preserve the work email metadata.",
    value: "02",
  },
  {
    title: "Grant administrator access",
    description: "Assign the initial system administrator role so the workspace can expose the admin control plane.",
    value: "03",
  },
];

type OnboardingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const currentUser = await requireBootstrapOnboardingAccess();
  const params = await searchParams;
  const error = getFirstParam(params.error);
  const workEmail = currentUser.profile?.work_email ?? currentUser.authUser.email ?? "";

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Bootstrap"
        title="Initialize organization"
        description="Create the first tenant, bind your profile to it, and activate the administrator control plane."
      />

      {error ? <p className="form-message form-message--danger">{error}</p> : null}

      <div className="split-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Current operator</span>
              <h2 className="section-title">Bootstrap mode is active for this account.</h2>
            </div>
          </div>

          <div className="resource-grid">
            <article className="resource-card">
              <span className="resource-meta">Operator</span>
              <h3>{currentUser.profile?.full_name ?? currentUser.authUser.email}</h3>
              <p>{currentUser.authUser.email}</p>
            </article>
            <article className="resource-card">
              <span className="resource-meta">Work email</span>
              <h3>{workEmail || "Not captured"}</h3>
              <p>The work email is reused as the first organization contact unless you override it below.</p>
            </article>
            <article className="resource-card">
              <span className="resource-meta">Access state</span>
              <h3>Bootstrap administrator</h3>
              <p>Workspace modules stay restricted until the organization record and first role assignment exist.</p>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">What this flow does</span>
              <h2 className="section-title">The setup sequence is short and deterministic.</h2>
            </div>
          </div>

          <div className="signal-list">
            {bootstrapSteps.map((step) => (
              <div key={step.title} className="signal-row">
                <div className="signal-row__label">
                  <strong>{step.title}</strong>
                  <span>{step.description}</span>
                </div>
                <span className="signal-row__value">{step.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Organization details</span>
            <h2 className="section-title">Create the tenant record</h2>
          </div>
          <p className="section-copy">Start with the organization identity and default timezone. Facilities and departments can be added later from the admin workspace.</p>
        </div>

        <form action={bootstrapOrganizationAction} className="form-stack">
          <div className="form-grid">
            <label className="field" htmlFor="name">
              <span className="field-label">Organization name</span>
              <input id="name" name="name" type="text" placeholder="Northwind Health System" required />
            </label>

            <label className="field" htmlFor="slug">
              <span className="field-label">Organization slug</span>
              <input id="slug" name="slug" type="text" placeholder="northwind-health" />
            </label>

            <label className="field" htmlFor="legalName">
              <span className="field-label">Legal name</span>
              <input id="legalName" name="legalName" type="text" placeholder="Northwind Health System, Inc." />
            </label>

            <label className="field" htmlFor="contactEmail">
              <span className="field-label">Contact email</span>
              <input id="contactEmail" name="contactEmail" type="email" defaultValue={workEmail} placeholder="ops@northwindhealth.com" />
            </label>

            <label className="field" htmlFor="timezone">
              <span className="field-label">Timezone</span>
              <select id="timezone" name="timezone" defaultValue="America/New_York">
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="surface-note">
            <strong>Submission effect</strong>
            The platform creates the organization, links your current profile to it, and assigns the initial system administrator role in a single server action.
          </div>

          <div className="form-actions">
            <button className="button button-primary" type="submit">
              Initialize organization
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
