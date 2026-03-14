import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();

function parseEnvFile(content) {
  return content.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return acc;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return acc;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    acc[key] = value;
    return acc;
  }, {});
}

async function loadEnv() {
  const fileNames = [".env.local", ".env"];

  for (const fileName of fileNames) {
    try {
      const content = await readFile(path.join(rootDir, fileName), "utf8");
      const env = parseEnvFile(content);

      for (const [key, value] of Object.entries(env)) {
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
    } catch {
      // Ignore missing env files.
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildMonthSeries(monthCount) {
  const items = [];
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const start = new Date(Date.UTC(utcYear, utcMonth - offset, 1));
    const end = new Date(Date.UTC(utcYear, utcMonth - offset + 1, 0));
    items.push({
      key: start.toISOString().slice(0, 7),
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      asOf: end.toISOString().slice(0, 10),
    });
  }

  return items;
}

function computeVariance(value, target, benchmark) {
  if (typeof value !== "number") {
    return null;
  }

  if (typeof target === "number") {
    return Number((value - target).toFixed(4));
  }

  if (typeof benchmark === "number") {
    return Number((value - benchmark).toFixed(4));
  }

  return null;
}

async function insertRows(client, table, rows) {
  const { data, error } = await client.from(table).insert(rows).select("*");

  if (error) {
    throw new Error(`Failed to insert into ${table}: ${error.message}`);
  }

  return data ?? [];
}

async function findOrganizationBySlug(client, slug) {
  const { data, error } = await client
    .from("organizations")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up organization: ${error.message}`);
  }

  return data;
}

async function deleteOrganization(client, organizationId) {
  const { error } = await client.from("organizations").delete().eq("id", organizationId);

  if (error) {
    throw new Error(`Failed to remove existing mock organization: ${error.message}`);
  }
}

async function main() {
  await loadEnv();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const mockTenant = {
    name: "Northstar Regional Health",
    slug: "northstar-regional-health",
    legal_name: "Northstar Regional Health System",
    status: "active",
    timezone: "America/Chicago",
    contact_email: "operations@northstarhealth.example",
    metadata: {
      seed_source: "scripts/seed-mock-data.mjs",
      seeded_at: new Date().toISOString(),
    },
    effective_from: "2025-01-01",
    effective_to: null,
  };

  const existingOrganization = await findOrganizationBySlug(client, mockTenant.slug);

  if (existingOrganization) {
    await deleteOrganization(client, existingOrganization.id);
  }

  const [organization] = await insertRows(client, "organizations", [mockTenant]);

  const [financeLine, qualityLine, operationsLine] = await insertRows(client, "service_lines", [
    {
      organization_id: organization.id,
      facility_id: null,
      code: "FIN",
      name: "Financial Performance",
      description: "Enterprise finance and margin reporting.",
      status: "active",
      metadata: { category: "enterprise" },
      effective_from: "2025-01-01",
      effective_to: null,
    },
    {
      organization_id: organization.id,
      facility_id: null,
      code: "CLIN",
      name: "Clinical Quality",
      description: "Quality and patient outcome analytics.",
      status: "active",
      metadata: { category: "enterprise" },
      effective_from: "2025-01-01",
      effective_to: null,
    },
    {
      organization_id: organization.id,
      facility_id: null,
      code: "OPS",
      name: "Operational Efficiency",
      description: "Capacity, throughput, and utilization signals.",
      status: "active",
      metadata: { category: "enterprise" },
      effective_from: "2025-01-01",
      effective_to: null,
    },
  ]);

  const [centralHospital, riversideMedicalCenter, northClinic] = await insertRows(client, "facilities", [
    {
      organization_id: organization.id,
      service_line_id: operationsLine.id,
      code: "NS-CENTRAL",
      name: "Northstar Central Hospital",
      facility_type: "Hospital",
      status: "active",
      timezone: organization.timezone,
      address_line_1: "100 Health Plaza",
      address_line_2: null,
      city: "Chicago",
      state_region: "Illinois",
      postal_code: "60601",
      country_code: "US",
      metadata: { bed_count: 420 },
      effective_from: "2025-01-01",
      effective_to: null,
    },
    {
      organization_id: organization.id,
      service_line_id: qualityLine.id,
      code: "NS-RIVERSIDE",
      name: "Riverside Medical Center",
      facility_type: "Medical Center",
      status: "active",
      timezone: organization.timezone,
      address_line_1: "250 Riverside Drive",
      address_line_2: null,
      city: "Naperville",
      state_region: "Illinois",
      postal_code: "60540",
      country_code: "US",
      metadata: { bed_count: 230 },
      effective_from: "2025-01-01",
      effective_to: null,
    },
    {
      organization_id: organization.id,
      service_line_id: operationsLine.id,
      code: "NS-NORTH",
      name: "Northstar North Clinic",
      facility_type: "Outpatient Clinic",
      status: "active",
      timezone: organization.timezone,
      address_line_1: "55 Lakeview Avenue",
      address_line_2: null,
      city: "Evanston",
      state_region: "Illinois",
      postal_code: "60201",
      country_code: "US",
      metadata: { exam_rooms: 48 },
      effective_from: "2025-01-01",
      effective_to: null,
    },
  ]);

  const [cardiologyLine, emergencyLine, ambulatoryLine] = await insertRows(client, "service_lines", [
    {
      organization_id: organization.id,
      facility_id: centralHospital.id,
      code: "CARD",
      name: "Cardiology",
      description: "Heart and vascular service line.",
      status: "active",
      metadata: { facility_code: centralHospital.code },
      effective_from: "2025-01-01",
      effective_to: null,
    },
    {
      organization_id: organization.id,
      facility_id: riversideMedicalCenter.id,
      code: "EMER",
      name: "Emergency Medicine",
      description: "Emergency and acute care operations.",
      status: "active",
      metadata: { facility_code: riversideMedicalCenter.code },
      effective_from: "2025-01-01",
      effective_to: null,
    },
    {
      organization_id: organization.id,
      facility_id: northClinic.id,
      code: "AMB",
      name: "Ambulatory Care",
      description: "Same-day and ambulatory operations.",
      status: "active",
      metadata: { facility_code: northClinic.code },
      effective_from: "2025-01-01",
      effective_to: null,
    },
  ]);

  const departments = await insertRows(client, "departments", [
    {
      organization_id: organization.id,
      facility_id: centralHospital.id,
      service_line_id: cardiologyLine.id,
      parent_department_id: null,
      code: "CARD-OPS",
      name: "Cardiology Operations",
      description: "Cardiology operations and staffing oversight.",
      status: "active",
      metadata: { floor: "Tower A" },
      effective_from: "2025-01-01",
      effective_to: null,
    },
    {
      organization_id: organization.id,
      facility_id: centralHospital.id,
      service_line_id: financeLine.id,
      parent_department_id: null,
      code: "FIN-REV",
      name: "Revenue Integrity",
      description: "Revenue cycle management and denials follow-up.",
      status: "active",
      metadata: { business_unit: "finance" },
      effective_from: "2025-01-01",
      effective_to: null,
    },
    {
      organization_id: organization.id,
      facility_id: riversideMedicalCenter.id,
      service_line_id: emergencyLine.id,
      parent_department_id: null,
      code: "ER-OPS",
      name: "Emergency Operations",
      description: "ED throughput and quality management.",
      status: "active",
      metadata: { floor: "Ground" },
      effective_from: "2025-01-01",
      effective_to: null,
    },
    {
      organization_id: organization.id,
      facility_id: northClinic.id,
      service_line_id: ambulatoryLine.id,
      parent_department_id: null,
      code: "AMB-ACC",
      name: "Ambulatory Access",
      description: "Clinic access, scheduling, and utilization.",
      status: "active",
      metadata: { service_mode: "outpatient" },
      effective_from: "2025-01-01",
      effective_to: null,
    },
  ]);

  const departmentByCode = new Map(departments.map((department) => [department.code, department]));

  const kpiDefinitions = await insertRows(client, "kpi_definitions", [
    {
      organization_id: organization.id,
      code: "NET_MARGIN",
      name: "Net Margin",
      domain: "Financial",
      description: "Net income as a percentage of total revenue.",
      formula_expression: "(net_income / total_revenue) * 100",
      numerator_label: "Net Income",
      denominator_label: "Total Revenue",
      unit_of_measure: "percent",
      aggregation_grain: "monthly",
      benchmark_definition: { benchmark_type: "peer_median" },
      target_definition: { target_type: "monthly_threshold" },
      version: 1,
      effective_from: "2025-01-01",
      effective_to: null,
      is_active: true,
      created_by: null,
    },
    {
      organization_id: organization.id,
      code: "LOS_INDEX",
      name: "Length of Stay Index",
      domain: "Operational",
      description: "Observed-to-expected length of stay ratio.",
      formula_expression: "observed_los / expected_los",
      numerator_label: "Observed LOS",
      denominator_label: "Expected LOS",
      unit_of_measure: "ratio",
      aggregation_grain: "monthly",
      benchmark_definition: { benchmark_type: "best_practice" },
      target_definition: { target_type: "lower_is_better" },
      version: 1,
      effective_from: "2025-01-01",
      effective_to: null,
      is_active: true,
      created_by: null,
    },
    {
      organization_id: organization.id,
      code: "ED_LEFT_WITHOUT_BEING_SEEN",
      name: "ED Left Without Being Seen",
      domain: "Clinical Quality",
      description: "Percent of emergency visits leaving prior to provider evaluation.",
      formula_expression: "(lwbs_visits / total_ed_visits) * 100",
      numerator_label: "LWBS Visits",
      denominator_label: "Total ED Visits",
      unit_of_measure: "percent",
      aggregation_grain: "monthly",
      benchmark_definition: { benchmark_type: "regulatory_reference" },
      target_definition: { target_type: "lower_is_better" },
      version: 1,
      effective_from: "2025-01-01",
      effective_to: null,
      is_active: true,
      created_by: null,
    },
    {
      organization_id: organization.id,
      code: "AMB_UTILIZATION",
      name: "Ambulatory Slot Utilization",
      domain: "Operational",
      description: "Percent of ambulatory slots utilized.",
      formula_expression: "(booked_slots / available_slots) * 100",
      numerator_label: "Booked Slots",
      denominator_label: "Available Slots",
      unit_of_measure: "percent",
      aggregation_grain: "monthly",
      benchmark_definition: { benchmark_type: "internal_top_quartile" },
      target_definition: { target_type: "higher_is_better" },
      version: 1,
      effective_from: "2025-01-01",
      effective_to: null,
      is_active: true,
      created_by: null,
    },
  ]);

  const kpiByCode = new Map(kpiDefinitions.map((definition) => [definition.code, definition]));

  const metrics = await insertRows(client, "metrics", [
    {
      organization_id: organization.id,
      kpi_definition_id: kpiByCode.get("NET_MARGIN").id,
      code: "NET_MARGIN_PCT",
      name: "Net Margin Percent",
      domain: "Financial",
      description: "Monthly published net margin at organization and facility scope.",
      metric_type: "percentage",
      value_data_type: "numeric",
      dimensions_schema: { dimensions: ["facility_id", "as_of_date"] },
      is_active: true,
    },
    {
      organization_id: organization.id,
      kpi_definition_id: kpiByCode.get("LOS_INDEX").id,
      code: "LOS_INDEX_RATIO",
      name: "Length of Stay Index Ratio",
      domain: "Operational",
      description: "Monthly LOS index at inpatient facility scope.",
      metric_type: "ratio",
      value_data_type: "numeric",
      dimensions_schema: { dimensions: ["facility_id", "department_id", "as_of_date"] },
      is_active: true,
    },
    {
      organization_id: organization.id,
      kpi_definition_id: kpiByCode.get("ED_LEFT_WITHOUT_BEING_SEEN").id,
      code: "ED_LWBS_PCT",
      name: "ED LWBS Percent",
      domain: "Clinical Quality",
      description: "Emergency department left-without-being-seen rate.",
      metric_type: "percentage",
      value_data_type: "numeric",
      dimensions_schema: { dimensions: ["facility_id", "department_id", "as_of_date"] },
      is_active: true,
    },
    {
      organization_id: organization.id,
      kpi_definition_id: kpiByCode.get("AMB_UTILIZATION").id,
      code: "AMB_SLOT_UTIL_PCT",
      name: "Ambulatory Slot Utilization Percent",
      domain: "Operational",
      description: "Monthly ambulatory slot utilization.",
      metric_type: "percentage",
      value_data_type: "numeric",
      dimensions_schema: { dimensions: ["facility_id", "department_id", "service_line_id", "as_of_date"] },
      is_active: true,
    },
  ]);

  const metricByCode = new Map(metrics.map((metric) => [metric.code, metric]));

  const benchmarks = await insertRows(client, "benchmarks", [
    {
      organization_id: organization.id,
      metric_id: metricByCode.get("NET_MARGIN_PCT").id,
      kpi_definition_id: kpiByCode.get("NET_MARGIN").id,
      name: "Midwest Peer Median Net Margin",
      source_type: "licensed",
      domain: "Financial",
      comparison_method: "median",
      value_numeric: 5.8,
      value_json: null,
      source_reference: "FY2026 Midwest hospital peer set",
      benchmark_start: "2026-01-01",
      benchmark_end: "2026-12-31",
      version: 1,
    },
    {
      organization_id: organization.id,
      metric_id: metricByCode.get("LOS_INDEX_RATIO").id,
      kpi_definition_id: kpiByCode.get("LOS_INDEX").id,
      name: "Best Practice LOS Index",
      source_type: "external",
      domain: "Operational",
      comparison_method: "best_practice",
      value_numeric: 0.92,
      value_json: null,
      source_reference: "Care operations advisory benchmark",
      benchmark_start: "2026-01-01",
      benchmark_end: "2026-12-31",
      version: 1,
    },
    {
      organization_id: organization.id,
      metric_id: metricByCode.get("ED_LWBS_PCT").id,
      kpi_definition_id: kpiByCode.get("ED_LEFT_WITHOUT_BEING_SEEN").id,
      name: "ED LWBS Quality Reference",
      source_type: "customer_provided",
      domain: "Clinical Quality",
      comparison_method: "threshold",
      value_numeric: 1.5,
      value_json: null,
      source_reference: "Internal quality committee FY2026 target benchmark",
      benchmark_start: "2026-01-01",
      benchmark_end: "2026-12-31",
      version: 1,
    },
    {
      organization_id: organization.id,
      metric_id: metricByCode.get("AMB_SLOT_UTIL_PCT").id,
      kpi_definition_id: kpiByCode.get("AMB_UTILIZATION").id,
      name: "Top Quartile Ambulatory Utilization",
      source_type: "internal",
      domain: "Operational",
      comparison_method: "top_quartile",
      value_numeric: 88.0,
      value_json: null,
      source_reference: "Internal network utilization benchmark",
      benchmark_start: "2026-01-01",
      benchmark_end: "2026-12-31",
      version: 1,
    },
  ]);

  const benchmarkByMetricId = new Map(benchmarks.map((benchmark) => [benchmark.metric_id, benchmark]));

  const targets = await insertRows(client, "targets", [
    {
      organization_id: organization.id,
      metric_id: metricByCode.get("NET_MARGIN_PCT").id,
      kpi_definition_id: kpiByCode.get("NET_MARGIN").id,
      scope_level: "organization",
      facility_id: null,
      department_id: null,
      service_line_id: null,
      owner_user_id: null,
      period_start: "2026-01-01",
      period_end: "2026-12-31",
      target_value: 6.2,
      tolerance_percent: 3.0,
      notes: "Enterprise margin target for FY2026.",
    },
    {
      organization_id: organization.id,
      metric_id: metricByCode.get("LOS_INDEX_RATIO").id,
      kpi_definition_id: kpiByCode.get("LOS_INDEX").id,
      scope_level: "facility",
      facility_id: centralHospital.id,
      department_id: null,
      service_line_id: null,
      owner_user_id: null,
      period_start: "2026-01-01",
      period_end: "2026-12-31",
      target_value: 0.95,
      tolerance_percent: 2.0,
      notes: "Inpatient throughput target for central hospital.",
    },
    {
      organization_id: organization.id,
      metric_id: metricByCode.get("ED_LWBS_PCT").id,
      kpi_definition_id: kpiByCode.get("ED_LEFT_WITHOUT_BEING_SEEN").id,
      scope_level: "department",
      facility_id: riversideMedicalCenter.id,
      department_id: departmentByCode.get("ER-OPS").id,
      service_line_id: emergencyLine.id,
      owner_user_id: null,
      period_start: "2026-01-01",
      period_end: "2026-12-31",
      target_value: 1.2,
      tolerance_percent: 5.0,
      notes: "ED quality threshold.",
    },
    {
      organization_id: organization.id,
      metric_id: metricByCode.get("AMB_SLOT_UTIL_PCT").id,
      kpi_definition_id: kpiByCode.get("AMB_UTILIZATION").id,
      scope_level: "service_line",
      facility_id: northClinic.id,
      department_id: departmentByCode.get("AMB-ACC").id,
      service_line_id: ambulatoryLine.id,
      owner_user_id: null,
      period_start: "2026-01-01",
      period_end: "2026-12-31",
      target_value: 84.0,
      tolerance_percent: 4.0,
      notes: "Ambulatory access utilization target.",
    },
  ]);

  const targetByMetricId = new Map(targets.map((target) => [target.metric_id, target]));
  const monthSeries = buildMonthSeries(6);

  const metricValues = monthSeries.flatMap((month, index) => {
    const netMarginValue = 5.4 + index * 0.25;
    const losIndexValue = 1.01 - index * 0.01;
    const edLwbsValue = 2.1 - index * 0.12;
    const ambulatoryUtilValue = 79.0 + index * 1.8;

    return [
      {
        organization_id: organization.id,
        metric_id: metricByCode.get("NET_MARGIN_PCT").id,
        kpi_definition_id: kpiByCode.get("NET_MARGIN").id,
        facility_id: null,
        department_id: null,
        service_line_id: null,
        ingestion_job_id: null,
        period_start: month.start,
        period_end: month.end,
        as_of_date: month.asOf,
        value_numeric: Number(netMarginValue.toFixed(4)),
        value_text: null,
        value_json: null,
        target_value: targetByMetricId.get(metricByCode.get("NET_MARGIN_PCT").id).target_value,
        benchmark_value: benchmarkByMetricId.get(metricByCode.get("NET_MARGIN_PCT").id).value_numeric,
        variance_value: computeVariance(
          Number(netMarginValue.toFixed(4)),
          targetByMetricId.get(metricByCode.get("NET_MARGIN_PCT").id).target_value,
          benchmarkByMetricId.get(metricByCode.get("NET_MARGIN_PCT").id).value_numeric
        ),
        status: "published",
        lineage: {
          source: "mock_seed",
          granularity: "monthly",
          scenario: "baseline",
          period_key: month.key,
        },
      },
      {
        organization_id: organization.id,
        metric_id: metricByCode.get("LOS_INDEX_RATIO").id,
        kpi_definition_id: kpiByCode.get("LOS_INDEX").id,
        facility_id: centralHospital.id,
        department_id: departmentByCode.get("CARD-OPS").id,
        service_line_id: cardiologyLine.id,
        ingestion_job_id: null,
        period_start: month.start,
        period_end: month.end,
        as_of_date: month.asOf,
        value_numeric: Number(losIndexValue.toFixed(4)),
        value_text: null,
        value_json: null,
        target_value: targetByMetricId.get(metricByCode.get("LOS_INDEX_RATIO").id).target_value,
        benchmark_value: benchmarkByMetricId.get(metricByCode.get("LOS_INDEX_RATIO").id).value_numeric,
        variance_value: computeVariance(
          Number(losIndexValue.toFixed(4)),
          targetByMetricId.get(metricByCode.get("LOS_INDEX_RATIO").id).target_value,
          benchmarkByMetricId.get(metricByCode.get("LOS_INDEX_RATIO").id).value_numeric
        ),
        status: "published",
        lineage: {
          source: "mock_seed",
          granularity: "monthly",
          department_code: "CARD-OPS",
          period_key: month.key,
        },
      },
      {
        organization_id: organization.id,
        metric_id: metricByCode.get("ED_LWBS_PCT").id,
        kpi_definition_id: kpiByCode.get("ED_LEFT_WITHOUT_BEING_SEEN").id,
        facility_id: riversideMedicalCenter.id,
        department_id: departmentByCode.get("ER-OPS").id,
        service_line_id: emergencyLine.id,
        ingestion_job_id: null,
        period_start: month.start,
        period_end: month.end,
        as_of_date: month.asOf,
        value_numeric: Number(edLwbsValue.toFixed(4)),
        value_text: null,
        value_json: null,
        target_value: targetByMetricId.get(metricByCode.get("ED_LWBS_PCT").id).target_value,
        benchmark_value: benchmarkByMetricId.get(metricByCode.get("ED_LWBS_PCT").id).value_numeric,
        variance_value: computeVariance(
          Number(edLwbsValue.toFixed(4)),
          targetByMetricId.get(metricByCode.get("ED_LWBS_PCT").id).target_value,
          benchmarkByMetricId.get(metricByCode.get("ED_LWBS_PCT").id).value_numeric
        ),
        status: "published",
        lineage: {
          source: "mock_seed",
          granularity: "monthly",
          department_code: "ER-OPS",
          period_key: month.key,
        },
      },
      {
        organization_id: organization.id,
        metric_id: metricByCode.get("AMB_SLOT_UTIL_PCT").id,
        kpi_definition_id: kpiByCode.get("AMB_UTILIZATION").id,
        facility_id: northClinic.id,
        department_id: departmentByCode.get("AMB-ACC").id,
        service_line_id: ambulatoryLine.id,
        ingestion_job_id: null,
        period_start: month.start,
        period_end: month.end,
        as_of_date: month.asOf,
        value_numeric: Number(ambulatoryUtilValue.toFixed(4)),
        value_text: null,
        value_json: null,
        target_value: targetByMetricId.get(metricByCode.get("AMB_SLOT_UTIL_PCT").id).target_value,
        benchmark_value: benchmarkByMetricId.get(metricByCode.get("AMB_SLOT_UTIL_PCT").id).value_numeric,
        variance_value: computeVariance(
          Number(ambulatoryUtilValue.toFixed(4)),
          targetByMetricId.get(metricByCode.get("AMB_SLOT_UTIL_PCT").id).target_value,
          benchmarkByMetricId.get(metricByCode.get("AMB_SLOT_UTIL_PCT").id).value_numeric
        ),
        status: "published",
        lineage: {
          source: "mock_seed",
          granularity: "monthly",
          department_code: "AMB-ACC",
          period_key: month.key,
        },
      },
    ];
  });

  await insertRows(client, "metric_values", metricValues);

  console.log("Mock data seeded successfully.");
  console.log(
    JSON.stringify(
      {
        organization: organization.name,
        facilities: 3,
        departments: departments.length,
        serviceLines: 6,
        kpiDefinitions: kpiDefinitions.length,
        metrics: metrics.length,
        benchmarks: benchmarks.length,
        targets: targets.length,
        metricValues: metricValues.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
