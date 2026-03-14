import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import {
  createReportAction,
  createReportScheduleAction,
  deleteReportAction,
  deleteReportScheduleAction,
  runReportAction,
  updateReportAction,
} from "@/features/reports/report.actions";
import { listReportWorkspace } from "@/features/reports/report.service";
import { safeLogAuditEvent } from "@/lib/audit";
import { requireModuleAccess } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const reportColumns = [
  ["metricName", "Metric name"],
  ["metricCode", "Metric code"],
  ["domain", "Domain"],
  ["asOfDate", "As of"],
  ["value", "Value"],
  ["targetValue", "Target"],
  ["benchmarkValue", "Benchmark"],
  ["varianceValue", "Variance"],
  ["status", "Status"],
  ["facilityName", "Facility"],
  ["departmentName", "Department"],
  ["serviceLineName", "Service line"],
  ["freshness", "Freshness"],
] as const;

const reportFrequencies = ["once", "hourly", "daily", "weekly", "monthly", "quarterly"] as const;

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getUserDisplayName(user: { full_name: string | null; work_email: string | null; id: string } | null | undefined) {
  return user?.full_name ?? user?.work_email ?? user?.id ?? "Unassigned";
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireModuleAccess("reports");
  const currentUser = await requireCurrentUserContext();
  const params = await searchParams;
  const workspace = await listReportWorkspace({ reportSlug: getFirstParam(params.reportSlug) });
  const message = getFirstParam(params.message);
  const error = getFirstParam(params.error);
  const activeDatasetConfig =
    workspace.activeReport?.dataset_config && typeof workspace.activeReport.dataset_config === "object" && !Array.isArray(workspace.activeReport.dataset_config)
      ? (workspace.activeReport.dataset_config as Record<string, unknown>)
      : {};
  const activeDefinition =
    workspace.activeReport?.definition && typeof workspace.activeReport.definition === "object" && !Array.isArray(workspace.activeReport.definition)
      ? (workspace.activeReport.definition as Record<string, unknown>)
      : {};
  const requestedDomain = getFirstParam(params.domain) || String(activeDatasetConfig.domain ?? "Financial");
  const activeReport = workspace.activeReport;
  const userDirectory = new Map(workspace.availableUsers.map((user) => [user.id, user] as const));
  const activeOwner = activeReport?.owner_user_id ? userDirectory.get(activeReport.owner_user_id) ?? null : null;

  if (activeReport) {
    await safeLogAuditEvent({
      organizationId: workspace.organization?.id ?? currentUser.profile?.organization_id ?? null,
      actorUserId: currentUser.authUser.id,
      action: "report.viewed",
      entityType: "report",
      entityId: activeReport.id,
      scopeLevel: "organization",
      metadata: {
        report_slug: activeReport.slug,
        visibility: activeReport.visibility,
      },
    });
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Phase 7"
        title="Reports"
        description="Saved report definitions, manual runs, schedule management, in-app delivery history, and CSV export are now available from one workspace."
        action={
          activeReport ? (
            <a className="button button-primary" href={`/api/reports/export?reportId=${activeReport.id}`}>
              Export CSV
            </a>
          ) : undefined
        }
      />

      {message ? <p className="form-message form-message--success">{message}</p> : null}
      {error ? <p className="form-message form-message--danger">{error}</p> : null}

      <div className="reports-top-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Report builder</span>
              <h2 className="section-title">Create a saved report</h2>
            </div>
            <p className="section-copy">Report definitions store dataset filters, selected metrics, visibility, and the column layout for downstream runs.</p>
          </div>

          <form action={createReportAction} className="form-stack">
            <div className="form-grid">
              <label className="field" htmlFor="reportName">
                <span className="field-label">Report name</span>
                <input id="reportName" name="name" type="text" placeholder="Monthly operations review" required />
              </label>
              <label className="field" htmlFor="reportSlug">
                <span className="field-label">Slug</span>
                <input id="reportSlug" name="slug" type="text" placeholder="monthly-operations-review" />
              </label>
              <label className="field" htmlFor="reportVisibility">
                <span className="field-label">Visibility</span>
                <select id="reportVisibility" name="visibility" defaultValue="shared">
                  <option value="shared">Shared</option>
                  <option value="private">Private</option>
                  <option value="role_based">Role based</option>
                </select>
              </label>
              <label className="field" htmlFor="reportDomain">
                <span className="field-label">Domain</span>
                <input id="reportDomain" name="domain" type="text" defaultValue={requestedDomain} required />
              </label>
              <label className="field" htmlFor="reportDateFrom">
                <span className="field-label">Date from</span>
                <input id="reportDateFrom" name="dateFrom" type="date" />
              </label>
              <label className="field" htmlFor="reportDateTo">
                <span className="field-label">Date to</span>
                <input id="reportDateTo" name="dateTo" type="date" />
              </label>
              <label className="field" htmlFor="reportFacilityId">
                <span className="field-label">Facility</span>
                <select id="reportFacilityId" name="facilityId" defaultValue="">
                  <option value="">All facilities</option>
                  {workspace.facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="reportDepartmentId">
                <span className="field-label">Department</span>
                <select id="reportDepartmentId" name="departmentId" defaultValue="">
                  <option value="">All departments</option>
                  {workspace.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="reportServiceLineId">
                <span className="field-label">Service line</span>
                <select id="reportServiceLineId" name="serviceLineId" defaultValue="">
                  <option value="">All service lines</option>
                  {workspace.serviceLines.map((serviceLine) => (
                    <option key={serviceLine.id} value={serviceLine.id}>
                      {serviceLine.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="reportStatus">
                <span className="field-label">Publication status</span>
                <select id="reportStatus" name="status" defaultValue="published">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="superseded">Superseded</option>
                  <option value="all">All</option>
                </select>
              </label>
              <label className="field field--full" htmlFor="reportDescription">
                <span className="field-label">Description</span>
                <textarea id="reportDescription" name="description" rows={3} placeholder="Monthly operating review distributed to business leaders." />
              </label>
              <label className="field field--full" htmlFor="reportMetricIds">
                <span className="field-label">Metrics</span>
                <select
                  id="reportMetricIds"
                  name="metricIds"
                  multiple
                  size={Math.min(8, Math.max(4, workspace.availableMetrics.length))}
                  defaultValue={workspace.availableMetrics.slice(0, 4).map((metric) => metric.id)}
                >
                  {workspace.availableMetrics.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.code} - {metric.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field--full" htmlFor="reportColumns">
                <span className="field-label">Columns</span>
                <select id="reportColumns" name="columns" multiple size={Math.min(10, reportColumns.length)} defaultValue={reportColumns.slice(0, 8).map(([value]) => value)}>
                  {reportColumns.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="surface-note">
              <strong>Dataset behavior</strong>
              The report builder currently runs against published metric values. CSV export is fully live. PDF and XLSX generation remain deferred.
            </div>
            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create report
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Library</span>
              <h2 className="section-title">Saved reports</h2>
            </div>
            <p className="section-copy">Select a report to edit filters, preview the dataset, configure delivery, or run an export.</p>
          </div>

          {workspace.reports.length > 0 ? (
            <div className="signal-list">
              {workspace.reports.map((report) => (
                <div key={report.id} className="signal-row">
                  <div className="signal-row__label">
                    <strong>{report.name}</strong>
                    <span>
                      {report.slug} - {report.visibility} - owner {getUserDisplayName(report.owner_user_id ? userDirectory.get(report.owner_user_id) : null)}
                    </span>
                  </div>
                  <Link className="button button-secondary" href={`/reports?reportSlug=${report.slug}`}>
                    Open
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="collection-empty">No reports are available yet.</p>
          )}
        </section>
      </div>

      {activeReport ? (
        <>
          <div className="reports-detail-grid">
            <section className="panel">
              <div className="section-header">
                <div>
                  <span className="eyebrow">Definition editor</span>
                  <h2 className="section-title">{activeReport.name}</h2>
                </div>
                <div className="pill-row">
                  <span className="pill">{getUserDisplayName(activeOwner)}</span>
                  <span className="pill">{activeReport.visibility}</span>
                  <span className="pill primary">{workspace.datasetRows.length} rows</span>
                </div>
              </div>

              <form action={updateReportAction} className="form-stack">
                <input type="hidden" name="reportId" value={activeReport.id} />
                <input type="hidden" name="reportSlug" value={activeReport.slug} />
                <div className="form-grid">
                  <label className="field" htmlFor="activeReportName">
                    <span className="field-label">Report name</span>
                    <input id="activeReportName" name="name" type="text" defaultValue={activeReport.name} required />
                  </label>
                  <label className="field" htmlFor="activeReportSlug">
                    <span className="field-label">Slug</span>
                    <input id="activeReportSlug" name="slug" type="text" defaultValue={activeReport.slug} />
                  </label>
                  <label className="field" htmlFor="activeReportVisibility">
                    <span className="field-label">Visibility</span>
                    <select id="activeReportVisibility" name="visibility" defaultValue={activeReport.visibility}>
                      <option value="shared">Shared</option>
                      <option value="private">Private</option>
                      <option value="role_based">Role based</option>
                    </select>
                  </label>
                  <label className="field" htmlFor="activeReportDomain">
                    <span className="field-label">Domain</span>
                    <input id="activeReportDomain" name="domain" type="text" defaultValue={String(activeDatasetConfig.domain ?? requestedDomain)} required />
                  </label>
                  <label className="field" htmlFor="activeReportDateFrom">
                    <span className="field-label">Date from</span>
                    <input id="activeReportDateFrom" name="dateFrom" type="date" defaultValue={String(activeDatasetConfig.dateFrom ?? "")} />
                  </label>
                  <label className="field" htmlFor="activeReportDateTo">
                    <span className="field-label">Date to</span>
                    <input id="activeReportDateTo" name="dateTo" type="date" defaultValue={String(activeDatasetConfig.dateTo ?? "")} />
                  </label>
                  <label className="field" htmlFor="activeReportFacilityId">
                    <span className="field-label">Facility</span>
                    <select id="activeReportFacilityId" name="facilityId" defaultValue={String(activeDatasetConfig.facilityId ?? "")}>
                      <option value="">All facilities</option>
                      {workspace.facilities.map((facility) => (
                        <option key={facility.id} value={facility.id}>
                          {facility.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field" htmlFor="activeReportDepartmentId">
                    <span className="field-label">Department</span>
                    <select id="activeReportDepartmentId" name="departmentId" defaultValue={String(activeDatasetConfig.departmentId ?? "")}>
                      <option value="">All departments</option>
                      {workspace.departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field" htmlFor="activeReportServiceLineId">
                    <span className="field-label">Service line</span>
                    <select id="activeReportServiceLineId" name="serviceLineId" defaultValue={String(activeDatasetConfig.serviceLineId ?? "")}>
                      <option value="">All service lines</option>
                      {workspace.serviceLines.map((serviceLine) => (
                        <option key={serviceLine.id} value={serviceLine.id}>
                          {serviceLine.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field" htmlFor="activeReportStatus">
                    <span className="field-label">Publication status</span>
                    <select id="activeReportStatus" name="status" defaultValue={String(activeDatasetConfig.status ?? "published")}>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="superseded">Superseded</option>
                      <option value="all">All</option>
                    </select>
                  </label>
                  <label className="field field--full" htmlFor="activeReportDescription">
                    <span className="field-label">Description</span>
                    <textarea id="activeReportDescription" name="description" rows={3} defaultValue={activeReport.description ?? ""} />
                  </label>
                  <label className="field field--full" htmlFor="activeReportMetricIds">
                    <span className="field-label">Metrics</span>
                    <select
                      id="activeReportMetricIds"
                      name="metricIds"
                      multiple
                      size={Math.min(8, Math.max(4, workspace.availableMetrics.length))}
                      defaultValue={Array.isArray(activeDatasetConfig.metricIds) ? (activeDatasetConfig.metricIds as string[]) : []}
                    >
                      {workspace.availableMetrics.map((metric) => (
                        <option key={metric.id} value={metric.id}>
                          {metric.code} - {metric.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field field--full" htmlFor="activeReportColumns">
                    <span className="field-label">Columns</span>
                    <select
                      id="activeReportColumns"
                      name="columns"
                      multiple
                      size={Math.min(10, reportColumns.length)}
                      defaultValue={Array.isArray(activeDefinition.columns) ? (activeDefinition.columns as string[]) : reportColumns.slice(0, 8).map(([value]) => value)}
                    >
                      {reportColumns.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-actions">
                  <button className="button button-primary" type="submit">
                    Save report definition
                  </button>
                </div>
              </form>

              <div className="form-actions">
                <form action={deleteReportAction}>
                  <input type="hidden" name="reportId" value={activeReport.id} />
                  <input type="hidden" name="reportSlug" value={activeReport.slug} />
                  <button className="button button-secondary" type="submit">
                    Delete report
                  </button>
                </form>
              </div>
            </section>

            <section className="panel">
              <div className="section-header">
                <div>
                  <span className="eyebrow">Execution</span>
                  <h2 className="section-title">Run and deliver</h2>
                </div>
                <p className="section-copy">Manual runs create tracked report-run records. CSV export is immediately available after a successful run.</p>
              </div>

              <div className="panel-stack">
                <form action={runReportAction} className="form-stack">
                  <input type="hidden" name="reportId" value={activeReport.id} />
                  <input type="hidden" name="reportSlug" value={activeReport.slug} />
                  <input type="hidden" name="format" value="csv" />
                  <div className="form-actions">
                    <button className="button button-primary" type="submit">
                      Run CSV export
                    </button>
                    <a className="button button-secondary" href={`/api/reports/export?reportId=${activeReport.id}`}>
                      Download CSV now
                    </a>
                  </div>
                </form>

                <form action={createReportScheduleAction} className="form-stack">
                  <input type="hidden" name="reportId" value={activeReport.id} />
                  <input type="hidden" name="reportSlug" value={activeReport.slug} />
                  <input type="hidden" name="format" value="csv" />
                  <input type="hidden" name="deliveryChannels" value="email" />
                  <div className="form-grid">
                    <label className="field" htmlFor="reportFrequency">
                      <span className="field-label">Frequency</span>
                      <select id="reportFrequency" name="frequency" defaultValue="weekly">
                        {reportFrequencies.map((frequency) => (
                          <option key={frequency} value={frequency}>
                            {frequency}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field" htmlFor="reportCronExpression">
                      <span className="field-label">Cron expression</span>
                      <input id="reportCronExpression" name="cronExpression" type="text" placeholder="Optional custom cron" />
                    </label>
                    <label className="field field--full" htmlFor="recipientUserIds">
                      <span className="field-label">Recipients</span>
                      <select id="recipientUserIds" name="recipientUserIds" multiple size={Math.min(8, Math.max(4, workspace.availableUsers.length))} defaultValue={workspace.availableUsers.slice(0, 1).map((user) => user.id)}>
                        {workspace.availableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name ?? user.work_email ?? user.id}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="surface-note">
                    <strong>Recipient validation</strong>
                    Scheduled deliveries can only target users who belong to the current organization. Background sending is deferred, but schedules and access validation are live.
                  </div>
                  <div className="form-actions">
                    <button className="button button-primary" type="submit">
                      Save delivery schedule
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>

          <div className="split-grid">
            <section className="panel">
              <div className="section-header">
                <div>
                  <span className="eyebrow">Scheduled delivery</span>
                  <h2 className="section-title">Schedules</h2>
                </div>
              </div>
              {workspace.schedules.length > 0 ? (
                <div className="signal-list">
                  {workspace.schedules.map((entry) => (
                    <div key={entry.schedule.id} className="signal-row">
                      <div className="signal-row__label">
                        <strong>{entry.schedule.frequency} - {entry.schedule.format}</strong>
                        <span>{entry.recipients.map((recipient) => recipient.full_name ?? recipient.work_email ?? recipient.id).join(", ") || "No recipients"}</span>
                      </div>
                      <form action={deleteReportScheduleAction}>
                        <input type="hidden" name="scheduleId" value={entry.schedule.id} />
                        <input type="hidden" name="reportSlug" value={activeReport.slug} />
                        <button className="button button-secondary" type="submit">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="collection-empty">No schedules are configured for this report.</p>
              )}
            </section>

            <section className="panel">
              <div className="section-header">
                <div>
                  <span className="eyebrow">Run history</span>
                  <h2 className="section-title">Generated outputs</h2>
                </div>
              </div>
              {workspace.runs.length > 0 ? (
                <div className="signal-list">
                  {workspace.runs.map((entry) => (
                    <div key={entry.run.id} className="signal-row">
                      <div className="signal-row__label">
                        <strong>{entry.run.status} - {entry.run.format}</strong>
                        <span>{formatDateTime(entry.run.created_at)} - {entry.triggeredBy?.full_name ?? entry.triggeredBy?.work_email ?? "System"}</span>
                      </div>
                      {entry.run.output_path ? (
                        <a className="button button-secondary" href={entry.run.output_path}>
                          Open output
                        </a>
                      ) : (
                        <span className="pill">No output path</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="collection-empty">No runs have been recorded yet.</p>
              )}
            </section>
          </div>

          <section className="panel">
            <div className="section-header">
              <div>
                <span className="eyebrow">Dataset preview</span>
                <h2 className="section-title">Tabular report rendering</h2>
              </div>
              <p className="section-copy">This preview uses the saved report definition and the current metric publication layer.</p>
            </div>
            {workspace.datasetRows.length > 0 ? (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>As of</th>
                      <th>Facility</th>
                      <th>Department</th>
                      <th>Value</th>
                      <th>Target</th>
                      <th>Benchmark</th>
                      <th>Variance</th>
                      <th>Status</th>
                      <th>Freshness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.datasetRows.map((row, index) => (
                      <tr key={`${row.metricCode}-${row.asOfDate}-${index}`}>
                        <td>
                          <strong>{row.metricName}</strong>
                          <div className="resource-meta">{row.metricCode}</div>
                        </td>
                        <td>{row.asOfDate}</td>
                        <td>{row.facilityName ?? "n/a"}</td>
                        <td>{row.departmentName ?? "n/a"}</td>
                        <td>{row.value}</td>
                        <td>{row.targetValue || "n/a"}</td>
                        <td>{row.benchmarkValue || "n/a"}</td>
                        <td>{row.varianceValue || "n/a"}</td>
                        <td>{row.status}</td>
                        <td>{row.freshness}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="collection-empty">The current report definition does not return any rows yet.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
