import { PageHeader } from "@/components/ui/page-header";
import { publishMetricValueAction } from "@/features/kpis/metric-value.actions";
import { listAnalyticsScopeCatalog, listMetricValueCatalog } from "@/features/kpis/metric-value.service";
import { createMetricAction, deleteMetricAction, updateMetricAction } from "@/features/kpis/metric.actions";
import { listMetricCatalog } from "@/features/kpis/metric.service";
import {
  createBenchmarkAction,
  createTargetAction,
  deleteBenchmarkAction,
  deleteTargetAction,
} from "@/features/kpis/reference.actions";
import { listBenchmarkCatalog, listTargetCatalog } from "@/features/kpis/reference.service";
import {
  createKpiVersionAction,
  createKpiDefinitionAction,
  deleteKpiDefinitionAction,
  updateKpiDefinitionAction,
} from "@/features/kpis/kpi.actions";
import { listKpiCatalog } from "@/features/kpis/kpi.service";
import { requireModuleAccess } from "@/lib/auth/authorization";

const domainOptions = ["Financial", "Operational", "Clinical Quality", "Revenue Cycle", "Benchmark"];
const grainOptions = ["daily", "weekly", "monthly", "quarterly", "annual"];
const metricTypeOptions = ["ratio", "count", "sum", "average", "rate", "percentage"];
const valueDataTypeOptions = ["numeric", "text", "json", "boolean"];
const benchmarkSourceOptions = ["internal", "external", "licensed", "customer_provided"] as const;
const scopeLevelOptions = ["organization", "facility", "department", "service_line"] as const;

type AnalyticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await requireModuleAccess("analytics");
  const catalog = await listKpiCatalog(50);
  const metricCatalog = await listMetricCatalog(50);
  const benchmarkCatalog = await listBenchmarkCatalog(50);
  const targetCatalog = await listTargetCatalog(50);
  const metricValueCatalog = await listMetricValueCatalog({ limit: 50, status: "all" });
  const scopeCatalog = await listAnalyticsScopeCatalog(50);
  const params = await searchParams;
  const message = getFirstParam(params.message);
  const error = getFirstParam(params.error);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Phase 4A"
        title="KPI Catalog"
        description="Manage KPI definitions, formulas, versions, and lifecycle settings before metric publishing is connected to ingestion."
        action={<span className={catalog.canManage ? "pill primary" : "pill"}>{catalog.definitions.length} definitions</span>}
      />

      {message ? <p className="form-message form-message--success">{message}</p> : null}
      {error ? <p className="form-message form-message--danger">{error}</p> : null}

      {catalog.canManage ? (
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Definition setup</span>
              <h2 className="section-title">Create KPI definitions for executive scorecards and analytics views.</h2>
            </div>
            <p className="section-copy">
              This slice is configuration-first. Definitions are stored now; metric publishing and lineage come later.
            </p>
          </div>

          <form action={createKpiDefinitionAction} className="form-stack">
            <div className="form-grid">
              <label className="field" htmlFor="kpiCode">
                <span className="field-label">KPI code</span>
                <input id="kpiCode" name="code" type="text" placeholder="NET_MARGIN" required />
              </label>
              <label className="field" htmlFor="kpiName">
                <span className="field-label">KPI name</span>
                <input id="kpiName" name="name" type="text" placeholder="Net Margin" required />
              </label>
              <label className="field" htmlFor="kpiDomain">
                <span className="field-label">Domain</span>
                <select id="kpiDomain" name="domain" defaultValue={domainOptions[0]}>
                  {domainOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="kpiVersion">
                <span className="field-label">Version</span>
                <input id="kpiVersion" name="version" type="number" min="1" defaultValue="1" required />
              </label>
              <label className="field" htmlFor="kpiUnit">
                <span className="field-label">Unit of measure</span>
                <input id="kpiUnit" name="unitOfMeasure" type="text" placeholder="percent" />
              </label>
              <label className="field" htmlFor="kpiGrain">
                <span className="field-label">Aggregation grain</span>
                <select id="kpiGrain" name="aggregationGrain" defaultValue={grainOptions[2]}>
                  {grainOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="kpiNumerator">
                <span className="field-label">Numerator label</span>
                <input id="kpiNumerator" name="numeratorLabel" type="text" placeholder="Net income" />
              </label>
              <label className="field" htmlFor="kpiDenominator">
                <span className="field-label">Denominator label</span>
                <input id="kpiDenominator" name="denominatorLabel" type="text" placeholder="Total revenue" />
              </label>
              <label className="field" htmlFor="kpiEffectiveFrom">
                <span className="field-label">Effective from</span>
                <input id="kpiEffectiveFrom" name="effectiveFrom" type="date" />
              </label>
              <label className="field" htmlFor="kpiEffectiveTo">
                <span className="field-label">Effective to</span>
                <input id="kpiEffectiveTo" name="effectiveTo" type="date" />
              </label>
              <label className="field" htmlFor="kpiActive">
                <span className="field-label">Status</span>
                <select id="kpiActive" name="isActive" defaultValue="true">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <label className="field field--full" htmlFor="kpiDescription">
                <span className="field-label">Description</span>
                <textarea id="kpiDescription" name="description" rows={3} placeholder="Executive KPI definition and business context." />
              </label>
              <label className="field field--full" htmlFor="kpiFormula">
                <span className="field-label">Formula expression</span>
                <textarea id="kpiFormula" name="formulaExpression" rows={4} placeholder="(net_income / total_revenue) * 100" required />
              </label>
              <label className="field" htmlFor="kpiBenchmarkDefinition">
                <span className="field-label">Benchmark definition JSON</span>
                <textarea id="kpiBenchmarkDefinition" name="benchmarkDefinition" rows={4} defaultValue="{}" />
              </label>
              <label className="field" htmlFor="kpiTargetDefinition">
                <span className="field-label">Target definition JSON</span>
                <textarea id="kpiTargetDefinition" name="targetDefinition" rows={4} defaultValue="{}" />
              </label>
            </div>

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create KPI definition
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Catalog</span>
            <h2 className="section-title">Stored KPI definitions</h2>
          </div>
          <p className="section-copy">
            Definitions are available now even before Phase 3 ingestion and Phase 4 metric publishing are complete.
          </p>
        </div>

        {catalog.definitions.length > 0 ? (
          <div className="resource-grid">
            {catalog.definitions.map((definition) => (
              <article key={definition.id} className="resource-card">
                <div className="panel-header">
                  <div>
                    <span className="resource-meta">{definition.code}</span>
                    <h3>{definition.name}</h3>
                  </div>
                  <span className={definition.is_active ? "pill primary" : "pill"}>
                    v{definition.version} {definition.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="meta-stack">
                  <div className="meta-row">
                    <span className="meta-row__label">Domain</span>
                    <span className="meta-row__value">{definition.domain}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row__label">Unit</span>
                    <span className="meta-row__value">{definition.unit_of_measure ?? "Not set"}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row__label">Aggregation</span>
                    <span className="meta-row__value">{definition.aggregation_grain ?? "Not set"}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row__label">Window</span>
                    <span className="meta-row__value">
                      {definition.effective_from ?? "Now"} - {definition.effective_to ?? "Open"}
                    </span>
                  </div>
                </div>

                <div className="surface-note">
                  <strong>Formula</strong>
                  {definition.formula_expression}
                </div>

                {catalog.canManage ? (
                  <div className="panel-stack">
                    <form action={updateKpiDefinitionAction} className="form-stack">
                      <input type="hidden" name="kpiId" value={definition.id} />
                      <div className="form-grid">
                        <label className="field" htmlFor={`name-${definition.id}`}>
                          <span className="field-label">Name</span>
                          <input id={`name-${definition.id}`} name="name" type="text" defaultValue={definition.name} required />
                        </label>
                        <label className="field" htmlFor={`code-${definition.id}`}>
                          <span className="field-label">Code</span>
                          <input id={`code-${definition.id}`} name="code" type="text" defaultValue={definition.code} required />
                        </label>
                        <label className="field" htmlFor={`domain-${definition.id}`}>
                          <span className="field-label">Domain</span>
                          <input id={`domain-${definition.id}`} name="domain" type="text" defaultValue={definition.domain} required />
                        </label>
                        <label className="field" htmlFor={`version-${definition.id}`}>
                          <span className="field-label">Version</span>
                          <input id={`version-${definition.id}`} name="version" type="number" min="1" defaultValue={definition.version} required />
                        </label>
                        <label className="field" htmlFor={`unit-${definition.id}`}>
                          <span className="field-label">Unit</span>
                          <input id={`unit-${definition.id}`} name="unitOfMeasure" type="text" defaultValue={definition.unit_of_measure ?? ""} />
                        </label>
                        <label className="field" htmlFor={`grain-${definition.id}`}>
                          <span className="field-label">Aggregation grain</span>
                          <input id={`grain-${definition.id}`} name="aggregationGrain" type="text" defaultValue={definition.aggregation_grain ?? ""} />
                        </label>
                        <label className="field" htmlFor={`numerator-${definition.id}`}>
                          <span className="field-label">Numerator label</span>
                          <input id={`numerator-${definition.id}`} name="numeratorLabel" type="text" defaultValue={definition.numerator_label ?? ""} />
                        </label>
                        <label className="field" htmlFor={`denominator-${definition.id}`}>
                          <span className="field-label">Denominator label</span>
                          <input id={`denominator-${definition.id}`} name="denominatorLabel" type="text" defaultValue={definition.denominator_label ?? ""} />
                        </label>
                        <label className="field" htmlFor={`from-${definition.id}`}>
                          <span className="field-label">Effective from</span>
                          <input id={`from-${definition.id}`} name="effectiveFrom" type="date" defaultValue={definition.effective_from ?? ""} />
                        </label>
                        <label className="field" htmlFor={`to-${definition.id}`}>
                          <span className="field-label">Effective to</span>
                          <input id={`to-${definition.id}`} name="effectiveTo" type="date" defaultValue={definition.effective_to ?? ""} />
                        </label>
                        <label className="field" htmlFor={`active-${definition.id}`}>
                          <span className="field-label">Status</span>
                          <select id={`active-${definition.id}`} name="isActive" defaultValue={String(definition.is_active)}>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </label>
                        <label className="field field--full" htmlFor={`description-${definition.id}`}>
                          <span className="field-label">Description</span>
                          <textarea id={`description-${definition.id}`} name="description" rows={3} defaultValue={definition.description ?? ""} />
                        </label>
                        <label className="field field--full" htmlFor={`formula-${definition.id}`}>
                          <span className="field-label">Formula expression</span>
                          <textarea id={`formula-${definition.id}`} name="formulaExpression" rows={4} defaultValue={definition.formula_expression} required />
                        </label>
                        <label className="field" htmlFor={`benchmark-${definition.id}`}>
                          <span className="field-label">Benchmark definition JSON</span>
                          <textarea id={`benchmark-${definition.id}`} name="benchmarkDefinition" rows={4} defaultValue={JSON.stringify(definition.benchmark_definition ?? {}, null, 2)} />
                        </label>
                        <label className="field" htmlFor={`target-${definition.id}`}>
                          <span className="field-label">Target definition JSON</span>
                          <textarea id={`target-${definition.id}`} name="targetDefinition" rows={4} defaultValue={JSON.stringify(definition.target_definition ?? {}, null, 2)} />
                        </label>
                      </div>

                      <div className="form-actions">
                        <button className="button button-primary" type="submit">
                          Save KPI definition
                        </button>
                      </div>
                    </form>

                    <form action={deleteKpiDefinitionAction}>
                      <input type="hidden" name="kpiId" value={definition.id} />
                      <div className="form-actions">
                        <button className="button button-secondary" type="submit">
                          Delete KPI definition
                        </button>
                      </div>
                    </form>

                    <form action={createKpiVersionAction}>
                      <input type="hidden" name="kpiId" value={definition.id} />
                      <div className="form-actions">
                        <button className="button button-secondary" type="submit">
                          Create next version
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="collection-empty">No KPI definitions are configured yet.</p>
        )}
      </section>

      {metricCatalog.canManage ? (
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Metric setup</span>
              <h2 className="section-title">Create metrics that map to KPI definitions and downstream value publication.</h2>
            </div>
            <p className="section-copy">
              Metrics define the publishable analytical units that later feed metric values, dashboards, alerts, and reports.
            </p>
          </div>

          <form action={createMetricAction} className="form-stack">
            <div className="form-grid">
              <label className="field" htmlFor="metricKpiDefinitionId">
                <span className="field-label">Linked KPI definition</span>
                <select id="metricKpiDefinitionId" name="kpiDefinitionId" defaultValue="">
                  <option value="">None</option>
                  {catalog.definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.code} - v{definition.version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="metricCode">
                <span className="field-label">Metric code</span>
                <input id="metricCode" name="code" type="text" placeholder="NET_MARGIN_PCT" required />
              </label>
              <label className="field" htmlFor="metricName">
                <span className="field-label">Metric name</span>
                <input id="metricName" name="name" type="text" placeholder="Net Margin Percent" required />
              </label>
              <label className="field" htmlFor="metricDomain">
                <span className="field-label">Domain</span>
                <select id="metricDomain" name="domain" defaultValue={domainOptions[0]}>
                  {domainOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="metricType">
                <span className="field-label">Metric type</span>
                <select id="metricType" name="metricType" defaultValue={metricTypeOptions[0]}>
                  {metricTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="metricValueDataType">
                <span className="field-label">Value data type</span>
                <select id="metricValueDataType" name="valueDataType" defaultValue={valueDataTypeOptions[0]}>
                  {valueDataTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="metricStatus">
                <span className="field-label">Status</span>
                <select id="metricStatus" name="isActive" defaultValue="true">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <label className="field field--full" htmlFor="metricDescription">
                <span className="field-label">Description</span>
                <textarea id="metricDescription" name="description" rows={3} placeholder="Metric definition and intended downstream usage." />
              </label>
              <label className="field field--full" htmlFor="metricDimensionsSchema">
                <span className="field-label">Dimensions schema JSON</span>
                <textarea
                  id="metricDimensionsSchema"
                  name="dimensionsSchema"
                  rows={4}
                  defaultValue={'{"dimensions":["facility_id","department_id","as_of_date"]}'}
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create metric
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Metric catalog</span>
            <h2 className="section-title">Stored metrics</h2>
          </div>
          <p className="section-copy">
            These metrics are the publishable analytical outputs that will later receive values from ingestion and calculations.
          </p>
        </div>

        {metricCatalog.metrics.length > 0 ? (
          <div className="resource-grid">
            {metricCatalog.metrics.map((metric) => (
              <article key={metric.id} className="resource-card">
                <div className="panel-header">
                  <div>
                    <span className="resource-meta">{metric.code}</span>
                    <h3>{metric.name}</h3>
                  </div>
                  <span className={metric.is_active ? "pill primary" : "pill"}>
                    {metric.metric_type} - {metric.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="meta-stack">
                  <div className="meta-row">
                    <span className="meta-row__label">Domain</span>
                    <span className="meta-row__value">{metric.domain}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row__label">Value type</span>
                    <span className="meta-row__value">{metric.value_data_type}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row__label">KPI link</span>
                    <span className="meta-row__value">
                      {metric.kpi_definition_id
                        ? catalog.definitions.find((definition) => definition.id === metric.kpi_definition_id)?.code ?? metric.kpi_definition_id
                        : "None"}
                    </span>
                  </div>
                </div>

                <div className="surface-note">
                  <strong>Dimensions schema</strong>
                  {JSON.stringify(metric.dimensions_schema ?? {}, null, 2)}
                </div>

                {metricCatalog.canManage ? (
                  <div className="panel-stack">
                    <form action={updateMetricAction} className="form-stack">
                      <input type="hidden" name="metricId" value={metric.id} />
                      <div className="form-grid">
                        <label className="field" htmlFor={`metric-kpi-${metric.id}`}>
                          <span className="field-label">Linked KPI definition</span>
                          <select id={`metric-kpi-${metric.id}`} name="kpiDefinitionId" defaultValue={metric.kpi_definition_id ?? ""}>
                            <option value="">None</option>
                            {catalog.definitions.map((definition) => (
                              <option key={definition.id} value={definition.id}>
                                {definition.code} - v{definition.version}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field" htmlFor={`metric-code-${metric.id}`}>
                          <span className="field-label">Code</span>
                          <input id={`metric-code-${metric.id}`} name="code" type="text" defaultValue={metric.code} required />
                        </label>
                        <label className="field" htmlFor={`metric-name-${metric.id}`}>
                          <span className="field-label">Name</span>
                          <input id={`metric-name-${metric.id}`} name="name" type="text" defaultValue={metric.name} required />
                        </label>
                        <label className="field" htmlFor={`metric-domain-${metric.id}`}>
                          <span className="field-label">Domain</span>
                          <input id={`metric-domain-${metric.id}`} name="domain" type="text" defaultValue={metric.domain} required />
                        </label>
                        <label className="field" htmlFor={`metric-type-${metric.id}`}>
                          <span className="field-label">Metric type</span>
                          <input id={`metric-type-${metric.id}`} name="metricType" type="text" defaultValue={metric.metric_type} required />
                        </label>
                        <label className="field" htmlFor={`metric-value-type-${metric.id}`}>
                          <span className="field-label">Value data type</span>
                          <input id={`metric-value-type-${metric.id}`} name="valueDataType" type="text" defaultValue={metric.value_data_type} required />
                        </label>
                        <label className="field" htmlFor={`metric-active-${metric.id}`}>
                          <span className="field-label">Status</span>
                          <select id={`metric-active-${metric.id}`} name="isActive" defaultValue={String(metric.is_active)}>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </label>
                        <label className="field field--full" htmlFor={`metric-description-${metric.id}`}>
                          <span className="field-label">Description</span>
                          <textarea id={`metric-description-${metric.id}`} name="description" rows={3} defaultValue={metric.description ?? ""} />
                        </label>
                        <label className="field field--full" htmlFor={`metric-dimensions-${metric.id}`}>
                          <span className="field-label">Dimensions schema JSON</span>
                          <textarea
                            id={`metric-dimensions-${metric.id}`}
                            name="dimensionsSchema"
                            rows={4}
                            defaultValue={JSON.stringify(metric.dimensions_schema ?? {}, null, 2)}
                          />
                        </label>
                      </div>

                      <div className="form-actions">
                        <button className="button button-primary" type="submit">
                          Save metric
                        </button>
                      </div>
                    </form>

                    <form action={deleteMetricAction}>
                      <input type="hidden" name="metricId" value={metric.id} />
                      <button className="button button-secondary" type="submit">
                        Delete metric
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="collection-empty">No metrics are configured yet.</p>
        )}
      </section>

      {metricValueCatalog.canManage ? (
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Metric publishing</span>
              <h2 className="section-title">Publish metric values with lineage and scope.</h2>
            </div>
            <p className="section-copy">
              Target and benchmark joins are resolved during publication, and duplicate published records for the same identity are superseded.
            </p>
          </div>

          <form action={publishMetricValueAction} className="form-stack">
            <div className="form-grid">
              <label className="field" htmlFor="publishMetricId">
                <span className="field-label">Metric</span>
                <select id="publishMetricId" name="metricId" defaultValue={metricCatalog.metrics[0]?.id}>
                  {metricCatalog.metrics.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.code} - {metric.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="publishFacilityId">
                <span className="field-label">Facility</span>
                <select id="publishFacilityId" name="facilityId" defaultValue="">
                  <option value="">None</option>
                  {scopeCatalog.facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} - {facility.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="publishDepartmentId">
                <span className="field-label">Department</span>
                <select id="publishDepartmentId" name="departmentId" defaultValue="">
                  <option value="">None</option>
                  {scopeCatalog.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} - {department.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="publishServiceLineId">
                <span className="field-label">Service line</span>
                <select id="publishServiceLineId" name="serviceLineId" defaultValue="">
                  <option value="">None</option>
                  {scopeCatalog.serviceLines.map((serviceLine) => (
                    <option key={serviceLine.id} value={serviceLine.id}>
                      {serviceLine.name} - {serviceLine.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="publishAsOfDate">
                <span className="field-label">As-of date</span>
                <input id="publishAsOfDate" name="asOfDate" type="date" required />
              </label>
              <label className="field" htmlFor="publishStatus">
                <span className="field-label">Status</span>
                <select id="publishStatus" name="status" defaultValue="published">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="superseded">Superseded</option>
                </select>
              </label>
              <label className="field" htmlFor="publishPeriodStart">
                <span className="field-label">Period start</span>
                <input id="publishPeriodStart" name="periodStart" type="date" />
              </label>
              <label className="field" htmlFor="publishPeriodEnd">
                <span className="field-label">Period end</span>
                <input id="publishPeriodEnd" name="periodEnd" type="date" />
              </label>
              <label className="field" htmlFor="publishValueNumeric">
                <span className="field-label">Numeric value</span>
                <input id="publishValueNumeric" name="valueNumeric" type="number" step="0.0001" />
              </label>
              <label className="field" htmlFor="publishValueText">
                <span className="field-label">Text value</span>
                <input id="publishValueText" name="valueText" type="text" />
              </label>
              <label className="field" htmlFor="publishIngestionJobId">
                <span className="field-label">Ingestion job id</span>
                <input id="publishIngestionJobId" name="ingestionJobId" type="text" placeholder="Optional UUID" />
              </label>
              <label className="field field--full" htmlFor="publishValueJson">
                <span className="field-label">JSON value</span>
                <textarea id="publishValueJson" name="valueJson" rows={3} defaultValue="{}" />
              </label>
              <label className="field field--full" htmlFor="publishLineage">
                <span className="field-label">Lineage JSON</span>
                <textarea id="publishLineage" name="lineage" rows={4} defaultValue={'{"source":"manual","publisher":"analytics-admin"}'} />
              </label>
            </div>

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Publish metric value
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Published values</span>
            <h2 className="section-title">Metric values with target, benchmark, and freshness context.</h2>
          </div>
        </div>

        {metricValueCatalog.values.length > 0 ? (
          <div className="resource-grid">
            {metricValueCatalog.values.map((entry) => (
              <article key={entry.metricValue.id} className="resource-card">
                <div className="panel-header">
                  <div>
                    <span className="resource-meta">{entry.metric?.code ?? entry.metricValue.metric_id}</span>
                    <h3>{entry.metric?.name ?? "Metric value"}</h3>
                  </div>
                  <span className={entry.freshness === "fresh" ? "pill primary" : "pill"}>
                    {entry.metricValue.status} - {entry.freshness}
                  </span>
                </div>

                <div className="meta-stack">
                  <div className="meta-row">
                    <span className="meta-row__label">As-of date</span>
                    <span className="meta-row__value">{entry.metricValue.as_of_date}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row__label">Value</span>
                    <span className="meta-row__value">{entry.metricValue.value_numeric ?? entry.metricValue.value_text ?? "JSON"}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row__label">Target</span>
                    <span className="meta-row__value">{entry.metricValue.target_value ?? "n/a"}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row__label">Benchmark</span>
                    <span className="meta-row__value">{entry.metricValue.benchmark_value ?? "n/a"}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-row__label">Variance</span>
                    <span className="meta-row__value">{entry.metricValue.variance_value ?? "n/a"}</span>
                  </div>
                </div>

                <div className="surface-note">
                  <strong>Lineage</strong>
                  {JSON.stringify(entry.metricValue.lineage ?? {}, null, 2)}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="collection-empty">No metric values are published yet.</p>
        )}
      </section>

      {benchmarkCatalog.canManage ? (
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Benchmark references</span>
              <h2 className="section-title">Manage benchmark definitions used by the metric retrieval layer.</h2>
            </div>
          </div>

          <form action={createBenchmarkAction} className="form-stack">
            <div className="form-grid">
              <label className="field" htmlFor="benchmarkMetricId">
                <span className="field-label">Metric</span>
                <select id="benchmarkMetricId" name="metricId" defaultValue="">
                  <option value="">None</option>
                  {metricCatalog.metrics.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.code} - {metric.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="benchmarkKpiDefinitionId">
                <span className="field-label">KPI definition</span>
                <select id="benchmarkKpiDefinitionId" name="kpiDefinitionId" defaultValue="">
                  <option value="">None</option>
                  {catalog.definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.code} - v{definition.version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="benchmarkName">
                <span className="field-label">Name</span>
                <input id="benchmarkName" name="name" type="text" placeholder="Industry median" required />
              </label>
              <label className="field" htmlFor="benchmarkSourceType">
                <span className="field-label">Source type</span>
                <select id="benchmarkSourceType" name="sourceType" defaultValue={benchmarkSourceOptions[0]}>
                  {benchmarkSourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="benchmarkDomain">
                <span className="field-label">Domain</span>
                <select id="benchmarkDomain" name="domain" defaultValue={domainOptions[0]}>
                  {domainOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="benchmarkValueNumeric">
                <span className="field-label">Numeric value</span>
                <input id="benchmarkValueNumeric" name="valueNumeric" type="number" step="0.0001" />
              </label>
              <label className="field" htmlFor="benchmarkVersion">
                <span className="field-label">Version</span>
                <input id="benchmarkVersion" name="version" type="number" min="1" defaultValue="1" required />
              </label>
              <label className="field" htmlFor="benchmarkStart">
                <span className="field-label">Benchmark start</span>
                <input id="benchmarkStart" name="benchmarkStart" type="date" />
              </label>
              <label className="field" htmlFor="benchmarkEnd">
                <span className="field-label">Benchmark end</span>
                <input id="benchmarkEnd" name="benchmarkEnd" type="date" />
              </label>
              <label className="field field--full" htmlFor="benchmarkSourceReference">
                <span className="field-label">Source reference</span>
                <input id="benchmarkSourceReference" name="sourceReference" type="text" placeholder="CMS FY2026 peer median" />
              </label>
              <label className="field field--full" htmlFor="benchmarkValueJson">
                <span className="field-label">JSON payload</span>
                <textarea id="benchmarkValueJson" name="valueJson" rows={3} defaultValue="{}" />
              </label>
            </div>

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create benchmark
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {targetCatalog.canManage ? (
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Targets</span>
              <h2 className="section-title">Manage scoped target values for variance analysis.</h2>
            </div>
          </div>

          <form action={createTargetAction} className="form-stack">
            <div className="form-grid">
              <label className="field" htmlFor="targetMetricId">
                <span className="field-label">Metric</span>
                <select id="targetMetricId" name="metricId" defaultValue="">
                  <option value="">None</option>
                  {metricCatalog.metrics.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.code} - {metric.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetKpiDefinitionId">
                <span className="field-label">KPI definition</span>
                <select id="targetKpiDefinitionId" name="kpiDefinitionId" defaultValue="">
                  <option value="">None</option>
                  {catalog.definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.code} - v{definition.version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetScopeLevel">
                <span className="field-label">Scope level</span>
                <select id="targetScopeLevel" name="scopeLevel" defaultValue={scopeLevelOptions[0]}>
                  {scopeLevelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetFacilityId">
                <span className="field-label">Facility</span>
                <select id="targetFacilityId" name="facilityId" defaultValue="">
                  <option value="">None</option>
                  {scopeCatalog.facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} - {facility.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetDepartmentId">
                <span className="field-label">Department</span>
                <select id="targetDepartmentId" name="departmentId" defaultValue="">
                  <option value="">None</option>
                  {scopeCatalog.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} - {department.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetServiceLineId">
                <span className="field-label">Service line</span>
                <select id="targetServiceLineId" name="serviceLineId" defaultValue="">
                  <option value="">None</option>
                  {scopeCatalog.serviceLines.map((serviceLine) => (
                    <option key={serviceLine.id} value={serviceLine.id}>
                      {serviceLine.name} - {serviceLine.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="targetPeriodStart">
                <span className="field-label">Period start</span>
                <input id="targetPeriodStart" name="periodStart" type="date" required />
              </label>
              <label className="field" htmlFor="targetPeriodEnd">
                <span className="field-label">Period end</span>
                <input id="targetPeriodEnd" name="periodEnd" type="date" required />
              </label>
              <label className="field" htmlFor="targetTargetValue">
                <span className="field-label">Target value</span>
                <input id="targetTargetValue" name="targetValue" type="number" step="0.0001" required />
              </label>
              <label className="field" htmlFor="targetTolerancePercent">
                <span className="field-label">Tolerance percent</span>
                <input id="targetTolerancePercent" name="tolerancePercent" type="number" step="0.01" />
              </label>
              <label className="field field--full" htmlFor="targetNotes">
                <span className="field-label">Notes</span>
                <textarea id="targetNotes" name="notes" rows={3} placeholder="Optional planning notes." />
              </label>
            </div>

            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Create target
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="split-grid">
        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Benchmarks</span>
              <h2 className="section-title">Current benchmark references</h2>
            </div>
          </div>

          {benchmarkCatalog.benchmarks.length > 0 ? (
            <div className="signal-list">
              {benchmarkCatalog.benchmarks.map((benchmark) => (
                <div key={benchmark.id} className="signal-row">
                  <div className="signal-row__label">
                    <strong>{benchmark.name}</strong>
                    <span>
                      {benchmark.domain} - {benchmark.source_type} - v{benchmark.version}
                    </span>
                  </div>
                  {benchmarkCatalog.canManage ? (
                    <form action={deleteBenchmarkAction}>
                      <input type="hidden" name="benchmarkId" value={benchmark.id} />
                      <button className="button button-secondary" type="submit">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="collection-empty">No benchmarks are configured yet.</p>
          )}
        </section>

        <section className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Targets</span>
              <h2 className="section-title">Current targets</h2>
            </div>
          </div>

          {targetCatalog.targets.length > 0 ? (
            <div className="signal-list">
              {targetCatalog.targets.map((target) => (
                <div key={target.id} className="signal-row">
                  <div className="signal-row__label">
                    <strong>{metricCatalog.metrics.find((metric) => metric.id === target.metric_id)?.code ?? "Target"}</strong>
                    <span>
                      {target.scope_level} - {target.period_start} to {target.period_end} - {target.target_value}
                    </span>
                  </div>
                  {targetCatalog.canManage ? (
                    <form action={deleteTargetAction}>
                      <input type="hidden" name="targetId" value={target.id} />
                      <button className="button button-secondary" type="submit">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="collection-empty">No targets are configured yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
