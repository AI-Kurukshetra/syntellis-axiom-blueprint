import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { listAuditLogCatalog } from "@/features/compliance/compliance.service";
import { requireModuleAccess } from "@/lib/auth/authorization";

type CompliancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function CompliancePage({ searchParams }: CompliancePageProps) {
  await requireModuleAccess("compliance");
  const params = await searchParams;
  const catalog = await listAuditLogCatalog({
    limit: Number(getFirstParam(params.limit) || 50),
    page: Number(getFirstParam(params.page) || 1),
    actorUserId: getFirstParam(params.actorUserId),
    action: getFirstParam(params.action),
    entityType: getFirstParam(params.entityType),
    facilityId: getFirstParam(params.facilityId),
    dateFrom: getFirstParam(params.dateFrom),
    dateTo: getFirstParam(params.dateTo),
  });
  const accessLogs = catalog.logs.filter((log) => ["dashboard.viewed", "report.viewed"].includes(log.action));
  const exportLogs = catalog.logs.filter((log) => ["report.exported", "analytics.exported"].includes(log.action));
  const prevPage = Math.max(1, catalog.filters.page - 1);
  const nextPage = Math.min(catalog.totalPages, catalog.filters.page + 1);

  function buildComplianceHref(filters: Partial<typeof catalog.filters>) {
    const query = new URLSearchParams();

    if (filters.limit) query.set("limit", String(filters.limit));
    if (filters.page) query.set("page", String(filters.page));
    if (filters.actorUserId) query.set("actorUserId", filters.actorUserId);
    if (filters.action) query.set("action", filters.action);
    if (filters.entityType) query.set("entityType", filters.entityType);
    if (filters.facilityId) query.set("facilityId", filters.facilityId);
    if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) query.set("dateTo", filters.dateTo);

    const queryString = query.toString();
    return queryString ? `/compliance?${queryString}` : "/compliance";
  }

  const exportHref = (() => {
    const query = new URLSearchParams();
    query.set("limit", String(catalog.filters.limit));
    query.set("page", String(catalog.filters.page));
    if (catalog.filters.actorUserId) query.set("actorUserId", catalog.filters.actorUserId);
    if (catalog.filters.action) query.set("action", catalog.filters.action);
    if (catalog.filters.entityType) query.set("entityType", catalog.filters.entityType);
    if (catalog.filters.facilityId) query.set("facilityId", catalog.filters.facilityId);
    if (catalog.filters.dateFrom) query.set("dateFrom", catalog.filters.dateFrom);
    if (catalog.filters.dateTo) query.set("dateTo", catalog.filters.dateTo);
    query.set("format", "csv");
    return `/api/audit?${query.toString()}`;
  })();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Audit"
        title="Compliance & Audit"
        description="Search operational audit activity across admin changes, analytics publication, dashboard configuration, and authentication events."
        action={
          <div className="pill-stack">
            <span className="pill primary">{catalog.logs.length} events</span>
            <span className="pill">{catalog.actions.length} actions</span>
            <span className="pill">{accessLogs.length} access events</span>
            <span className="pill">{exportLogs.length} export events</span>
          </div>
        }
      />

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Templates</span>
            <h2 className="section-title">Predefined compliance views</h2>
          </div>
          <p className="section-copy">Use these shortcuts to jump into common audit review workflows.</p>
        </div>

        <div className="resource-grid">
          {catalog.templates.map((template) => (
            <article key={template.key} className="resource-card">
              <div className="panel-header">
                <div>
                  <span className="resource-meta">Template</span>
                  <h3>{template.label}</h3>
                </div>
                <Link
                  className="button button-secondary"
                  href={buildComplianceHref({
                    ...catalog.filters,
                    ...template.filters,
                    page: 1,
                  })}
                >
                  Open
                </Link>
              </div>
              <p>{template.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Audit search</span>
            <h2 className="section-title">Filter audit activity</h2>
          </div>
          <p className="section-copy">This view covers tenant-scoped admin mutations and auth session events already recorded by the platform.</p>
        </div>

        <form className="form-stack" method="get">
          <div className="form-grid">
            <label className="field" htmlFor="page">
              <span className="field-label">Page</span>
              <input id="page" name="page" type="number" min="1" max={catalog.totalPages} defaultValue={catalog.filters.page} />
            </label>
            <label className="field" htmlFor="actorUserId">
              <span className="field-label">Actor</span>
              <select id="actorUserId" name="actorUserId" defaultValue={catalog.filters.actorUserId}>
                <option value="">All users</option>
                {catalog.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name ?? user.work_email ?? user.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="action">
              <span className="field-label">Action</span>
              <select id="action" name="action" defaultValue={catalog.filters.action}>
                <option value="">All actions</option>
                {catalog.actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="entityType">
              <span className="field-label">Entity type</span>
              <select id="entityType" name="entityType" defaultValue={catalog.filters.entityType}>
                <option value="">All entities</option>
                {catalog.entityTypes.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {entityType}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="facilityId">
              <span className="field-label">Facility</span>
              <select id="facilityId" name="facilityId" defaultValue={catalog.filters.facilityId}>
                <option value="">All facilities</option>
                {catalog.facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="dateFrom">
              <span className="field-label">Date from</span>
              <input id="dateFrom" name="dateFrom" type="date" defaultValue={catalog.filters.dateFrom} />
            </label>
            <label className="field" htmlFor="dateTo">
              <span className="field-label">Date to</span>
              <input id="dateTo" name="dateTo" type="date" defaultValue={catalog.filters.dateTo} />
            </label>
            <label className="field" htmlFor="limit">
              <span className="field-label">Limit</span>
              <input id="limit" name="limit" type="number" min="1" max="200" defaultValue={catalog.filters.limit} />
            </label>
          </div>
          <div className="form-actions">
            <Link className="button button-secondary" href="/compliance">
              Reset filters
            </Link>
            <a className="button button-secondary" href={exportHref}>
              Export CSV
            </a>
            <button className="button button-primary" type="submit">
              Search audit logs
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Sensitive access</span>
            <h2 className="section-title">Report and dashboard access views</h2>
          </div>
          <p className="section-copy">These events highlight direct access to reporting and dashboard assets under the current filter set.</p>
        </div>

        {accessLogs.length > 0 ? (
          <div className="signal-list">
            {accessLogs.slice(0, 8).map((log) => {
              const actor = catalog.users.find((user) => user.id === log.actor_user_id);
              return (
                <div key={log.id} className="signal-row">
                  <div className="signal-row__label">
                    <strong>{log.action}</strong>
                    <span>{actor?.full_name ?? actor?.work_email ?? log.actor_user_id ?? "System"} - {formatDate(log.created_at)}</span>
                  </div>
                  <span className="pill">{log.entity_type}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="collection-empty">No dashboard or report access events match the current filter set.</p>
        )}
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Export evidence</span>
            <h2 className="section-title">Report and analytics exports</h2>
          </div>
          <p className="section-copy">Export activity is captured for audit review with actor, scope, and metadata context.</p>
        </div>

        {exportLogs.length > 0 ? (
          <div className="signal-list">
            {exportLogs.slice(0, 8).map((log) => {
              const actor = catalog.users.find((user) => user.id === log.actor_user_id);
              return (
                <div key={log.id} className="signal-row">
                  <div className="signal-row__label">
                    <strong>{log.action}</strong>
                    <span>{actor?.full_name ?? actor?.work_email ?? log.actor_user_id ?? "System"} - {formatDate(log.created_at)}</span>
                  </div>
                  <span className="pill">{log.entity_type}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="collection-empty">No export events match the current filter set.</p>
        )}
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Audit trail</span>
            <h2 className="section-title">Recent activity</h2>
          </div>
          <p className="section-copy">Results are ordered newest first and include scope and metadata context when available. Page {catalog.filters.page} of {catalog.totalPages}.</p>
        </div>

        {catalog.logs.length > 0 ? (
          <div className="audit-log-list">
            {catalog.logs.map((log) => {
              const actor = catalog.users.find((user) => user.id === log.actor_user_id);
              const facility = catalog.facilities.find((item) => item.id === log.facility_id);

              return (
                <article key={log.id} className="audit-log-card">
                  <div className="audit-log-card__header">
                    <div>
                      <span className="resource-meta">{log.entity_type}</span>
                      <h3>{log.action}</h3>
                    </div>
                    <span className="pill">{formatDate(log.created_at)}</span>
                  </div>
                  <div className="audit-log-card__grid">
                    <div>
                      <span className="meta-row__label">Actor</span>
                      <strong>{actor?.full_name ?? actor?.work_email ?? log.actor_user_id ?? "System"}</strong>
                    </div>
                    <div>
                      <span className="meta-row__label">Scope</span>
                      <strong>{log.scope_level}</strong>
                    </div>
                    <div>
                      <span className="meta-row__label">Facility</span>
                      <strong>{facility?.name ?? "n/a"}</strong>
                    </div>
                    <div>
                      <span className="meta-row__label">Entity id</span>
                      <strong>{log.entity_id ?? "n/a"}</strong>
                    </div>
                  </div>
                  <div className="surface-note">
                    <strong>Metadata</strong>
                    <pre className="code-inline-block">{JSON.stringify(log.metadata ?? {}, null, 2)}</pre>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="state-panel">
            <div className="state-panel__icon" aria-hidden>
              --
            </div>
            <h2 className="state-panel__title">No audit events for this filter set</h2>
            <p className="state-panel__description">Broaden the filter window or generate activity from admin, analytics, or dashboard workflows.</p>
          </div>
        )}

        <div className="form-actions">
          <Link
            className="button button-secondary"
            href={buildComplianceHref({
              ...catalog.filters,
              page: prevPage,
            })}
          >
            Previous page
          </Link>
          <Link
            className="button button-secondary"
            href={buildComplianceHref({
              ...catalog.filters,
              page: nextPage,
            })}
          >
            Next page
          </Link>
          <span className="pill primary">{catalog.totalCount} total events</span>
        </div>
      </section>
    </div>
  );
}
