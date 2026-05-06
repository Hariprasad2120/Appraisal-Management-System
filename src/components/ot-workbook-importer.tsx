"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

type WorkbookRow = unknown[];
type ParsedRow = Record<string, unknown>;

export type ImportFieldConfig = {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
  helpText?: string;
};

type ImporterProps = {
  title: string;
  description: string;
  endpoint: string;
  fields: ImportFieldConfig[];
  additionalPayload?: Record<string, unknown>;
  onImported?: () => void;
  validateMappings?: (mappings: Record<string, string>) => string | null;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function uniqueHeaders(values: string[]) {
  const counts = new Map<string, number>();
  return values.map((value, index) => {
    const base = value.trim() || `Column ${index + 1}`;
    const current = counts.get(base) ?? 0;
    counts.set(base, current + 1);
    return current === 0 ? base : `${base} (${current + 1})`;
  });
}

function buildParsedRows(sheetRows: WorkbookRow[], headerRowIndex: number): ParsedRow[] {
  if (sheetRows.length === 0) return [];
  const headerRow = sheetRows[headerRowIndex] ?? [];
  const headers = uniqueHeaders(headerRow.map((cell) => String(cell ?? "").trim()));
  const rows = sheetRows.slice(headerRowIndex + 1);

  return rows
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) =>
      headers.reduce<ParsedRow>((acc, header, index) => {
        acc[header] = row[index] ?? "";
        return acc;
      }, {}),
    );
}

function guessHeaderRow(sheetRows: WorkbookRow[], fields: ImportFieldConfig[]) {
  let bestIndex = 0;
  let bestScore = -1;

  for (let index = 0; index < Math.min(sheetRows.length, 40); index++) {
    const row = sheetRows[index] ?? [];
    const normalizedCells = row.map((cell) => normalize(String(cell ?? ""))).filter(Boolean);
    const nonEmptyCount = normalizedCells.length;
    if (nonEmptyCount === 0) continue;

    const aliasScore = fields.reduce((score, field) => {
      const aliases = [field.label, ...(field.aliases ?? [])].map(normalize);
      return score + (aliases.some((alias) => normalizedCells.includes(alias)) ? 4 : 0);
    }, 0);
    const score = aliasScore + nonEmptyCount;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function OtWorkbookImporter({
  title,
  description,
  endpoint,
  fields,
  additionalPayload,
  onImported,
  validateMappings,
}: ImporterProps) {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [workbookRows, setWorkbookRows] = useState<Record<string, WorkbookRow[]>>({});
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const selectedSheetRows = useMemo(() => workbookRows[selectedSheet] ?? [], [workbookRows, selectedSheet]);
  const parsedRows = useMemo(
    () => buildParsedRows(selectedSheetRows, headerRowIndex),
    [selectedSheetRows, headerRowIndex],
  );
  const headerOptions = useMemo(() => {
    const row = selectedSheetRows[headerRowIndex] ?? [];
    return uniqueHeaders(row.map((cell) => String(cell ?? "").trim()));
  }, [selectedSheetRows, headerRowIndex]);

  function applySuggestedMappings(headers: string[]) {
    const nextMappings: Record<string, string> = {};

    for (const field of fields) {
      const aliases = [field.label, ...(field.aliases ?? [])].map(normalize);
      const match = headers.find((header) => aliases.includes(normalize(header)));
      if (match) nextMappings[field.key] = match;
    }

    setMappings(nextMappings);
  }

  async function handleFile(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
    const sheets = Object.fromEntries(
      workbook.SheetNames.map((sheetName) => [
        sheetName,
        XLSX.utils.sheet_to_json<WorkbookRow>(workbook.Sheets[sheetName], {
          header: 1,
          defval: "",
          raw: false,
        }),
      ]),
    );

    const firstSheet = workbook.SheetNames[0] ?? "";
    const guessedHeader = guessHeaderRow(sheets[firstSheet] ?? [], fields);
    setSheetNames(workbook.SheetNames);
    setWorkbookRows(sheets);
    setSelectedSheet(firstSheet);
    setHeaderRowIndex(guessedHeader);
    setFileName(file.name);
    applySuggestedMappings(uniqueHeaders((sheets[firstSheet]?.[guessedHeader] ?? []).map((cell) => String(cell ?? "").trim())));
  }

  function updateSheet(sheetName: string) {
    const guessedHeader = guessHeaderRow(workbookRows[sheetName] ?? [], fields);
    setSelectedSheet(sheetName);
    setHeaderRowIndex(guessedHeader);
    applySuggestedMappings(uniqueHeaders((workbookRows[sheetName]?.[guessedHeader] ?? []).map((cell) => String(cell ?? "").trim())));
  }

  function updateHeaderRow(nextIndex: number) {
    if (selectedSheetRows.length === 0) return;
    setHeaderRowIndex(nextIndex);
    applySuggestedMappings(uniqueHeaders((selectedSheetRows[nextIndex] ?? []).map((cell) => String(cell ?? "").trim())));
  }

  async function handleImport() {
    const missingRequired = fields
      .filter((field) => field.required && !mappings[field.key])
      .map((field) => field.label);
    if (missingRequired.length > 0) {
      toast.error(`Map the required fields: ${missingRequired.join(", ")}`);
      return;
    }

    const mappingError = validateMappings?.(mappings);
    if (mappingError) {
      toast.error(mappingError);
      return;
    }

    setImporting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: parsedRows,
          mappings,
          ...additionalPayload,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Import failed");
      }

      toast.success(
        `Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}`,
      );
      if (Array.isArray(result.errors) && result.errors.length > 0) {
        toast.info(`Some rows were skipped. First issue: ${result.errors[0]}`);
      }
      onImported?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="size-4" /> {title}
        </span>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="p-5 space-y-4">
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center transition-colors hover:border-primary/60 hover:bg-primary/5">
          <Upload className="size-5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {fileName ? fileName : "Choose Excel workbook"}
          </span>
          <span className="text-xs text-muted-foreground">Supports `.xlsx`, `.xls`, and exported sheets with title rows above the headers.</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
        </label>

        {sheetNames.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ds-label">Sheet</label>
                <select
                  value={selectedSheet}
                  onChange={(event) => updateSheet(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {sheetNames.map((sheetName) => (
                    <option key={sheetName} value={sheetName}>
                      {sheetName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">Header Row</label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(selectedSheetRows.length, 1)}
                  value={headerRowIndex + 1}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) return;
                    updateHeaderRow(Math.max(0, Math.min(Math.max(selectedSheetRows.length - 1, 0), value - 1)));
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-xs font-medium text-foreground">Header preview</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Row {headerRowIndex + 1}: {(selectedSheetRows[headerRowIndex] ?? []).map((cell) => String(cell ?? "").trim() || "blank").join(" | ")}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="ds-label">
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>
                  <select
                    value={mappings[field.key] ?? ""}
                    onChange={(event) =>
                      setMappings((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Not mapped</option>
                    {headerOptions.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Preview</span>
                <span className="text-xs text-muted-foreground">{parsedRows.length} row(s) detected</span>
              </div>
              {parsedRows.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                  No rows found below the selected header row.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="text-left border-b border-border">
                        {headerOptions.slice(0, 6).map((header) => (
                          <th key={header} className="py-2.5 px-4 ds-label">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedRows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-muted/40 transition-colors">
                          {headerOptions.slice(0, 6).map((header) => (
                            <td key={header} className="px-4 py-3 text-xs text-muted-foreground">
                              {String(row[header] ?? "") || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing || parsedRows.length === 0}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Import Sheet
            </button>
          </>
        )}
      </div>
    </div>
  );
}
