import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "supabase", "migrations");
const outputPath = path.join(rootDir, "src", "types", "database.ts");
const checkOnly = process.argv.includes("--check");

const jsonAlias = `export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n`;

const ignoredColumnStarters = new Set(["constraint", "primary", "foreign", "check", "unique"]);

function mapSqlTypeToTs(typeToken) {
  const isArray = typeToken.endsWith("[]");
  const baseType = isArray ? typeToken.slice(0, -2) : typeToken;

  let tsType;

  if (baseType === "uuid" || baseType === "text" || baseType === "citext" || baseType === "date" || baseType === "timestamptz" || baseType === "inet") {
    tsType = "string";
  } else if (baseType === "integer" || baseType === "bigint") {
    tsType = "number";
  } else if (baseType.startsWith("numeric(")) {
    tsType = "number";
  } else if (baseType === "boolean") {
    tsType = "boolean";
  } else if (baseType === "jsonb") {
    tsType = "Json";
  } else if (baseType.startsWith("public.")) {
    tsType = `Database["public"]["Enums"]["${baseType.replace("public.", "")}"]`;
  } else {
    throw new Error(`Unsupported SQL type token: ${typeToken}`);
  }

  return isArray ? `${tsType}[]` : tsType;
}

function buildFieldType(tsType, nullable) {
  return nullable ? `${tsType} | null` : tsType;
}

function parseTableColumns(tableBody) {
  const lines = tableBody
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const columns = [];

  for (const line of lines) {
    const normalizedLine = line.endsWith(",") ? line.slice(0, -1) : line;
    const [columnName, ...restParts] = normalizedLine.split(/\s+/);

    if (!columnName || ignoredColumnStarters.has(columnName)) {
      continue;
    }

    const rest = restParts.join(" ");
    const typeToken = restParts[0];

    if (!typeToken) {
      continue;
    }

    const generatedIdentity = /\bgenerated always as identity\b/i.test(rest);
    const nullable = !/\bnot null\b/i.test(rest) && !/\bprimary key\b/i.test(rest);
    const insertOptional = nullable || /\bdefault\b/i.test(rest) || generatedIdentity;
    const tsType = mapSqlTypeToTs(typeToken);

    columns.push({
      name: columnName,
      tsType,
      nullable,
      insertOptional,
      generatedIdentity,
    });
  }

  return columns;
}

function extractEnums(sql) {
  const enums = [];
  const enumRegex = /create type public\.(\w+) as enum \(([\s\S]*?)\);/gi;
  let match;

  while ((match = enumRegex.exec(sql)) !== null) {
    const [, enumName, enumValuesBlock] = match;
    const values = [...enumValuesBlock.matchAll(/'([^']+)'/g)].map((valueMatch) => valueMatch[1]);
    enums.push({ name: enumName, values });
  }

  return enums;
}

function extractTables(sql) {
  const tables = [];
  const tableRegex = /create table public\.(\w+) \(([\s\S]*?)\n\);/gi;
  let match;

  while ((match = tableRegex.exec(sql)) !== null) {
    const [, tableName, tableBody] = match;
    tables.push({
      name: tableName,
      columns: parseTableColumns(tableBody),
    });
  }

  return tables;
}

function renderDatabaseTypes(enums, tables) {
  const enumBlocks = enums
    .map((entry) => `      ${entry.name}: ${entry.values.map((value) => JSON.stringify(value)).join(" | ")};`)
    .join("\n");

  const tableBlocks = tables
    .map((table) => {
      const rowFields = table.columns
        .map((column) => `          ${column.name}: ${buildFieldType(column.tsType, column.nullable)};`)
        .join("\n");

      const insertFields = table.columns
        .map((column) => {
          if (column.generatedIdentity) {
            return `          ${column.name}?: ${column.tsType};`;
          }

          const optionalToken = column.insertOptional ? "?" : "";
          return `          ${column.name}${optionalToken}: ${buildFieldType(column.tsType, column.nullable)};`;
        })
        .join("\n");

      const updateFields = table.columns
        .map((column) => {
          if (column.generatedIdentity) {
            return `          ${column.name}?: ${column.tsType};`;
          }

          return `          ${column.name}?: ${buildFieldType(column.tsType, column.nullable)};`;
        })
        .join("\n");

      return `      ${table.name}: {\n        Row: {\n${rowFields}\n        };\n        Insert: {\n${insertFields}\n        };\n        Update: {\n${updateFields}\n        };\n        Relationships: [];\n      };`;
    })
    .join("\n");

  return `// This file is generated from the SQL migrations in supabase/migrations.\n// Do not edit it by hand. Run \`npm run db:types\` after changing the schema.\n\n${jsonAlias}\nexport interface Database {\n  public: {\n    Tables: {\n${tableBlocks}\n    };\n    Views: Record<string, never>;\n    Functions: Record<string, never>;\n    Enums: {\n${enumBlocks}\n    };\n    CompositeTypes: Record<string, never>;\n  };\n}\n`;
}

async function main() {
  const migrationFiles = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  if (migrationFiles.length === 0) {
    throw new Error("No migration files were found in supabase/migrations.");
  }

  const sql = (
    await Promise.all(migrationFiles.map((fileName) => readFile(path.join(migrationsDir, fileName), "utf8")))
  ).join("\n\n");

  const enums = extractEnums(sql);
  const tables = extractTables(sql);
  const output = renderDatabaseTypes(enums, tables);

  if (checkOnly) {
    const current = await readFile(outputPath, "utf8");

    if (current !== output) {
      throw new Error("Generated database types are out of date. Run `npm run db:types`.");
    }

    return;
  }

  await writeFile(outputPath, output, "utf8");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
