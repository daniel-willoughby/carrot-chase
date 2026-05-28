/**
 * Minimal RFC-4180-ish CSV parser. Handles quoted fields, commas inside quotes,
 * escaped quotes ("") and CR/LF line endings. Good enough for the school
 * pupil import use case; replace with Papa Parse if scope grows.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        // Escaped quote ""
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        // Collapse CRLF.
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        // Skip blank rows.
        if (row.length > 1 || row[0]?.trim() !== "") rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  // Trailing field at EOF without newline.
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0]?.trim() !== "") rows.push(row);
  }
  return rows;
}

export type ParsedRow = {
  full_name: string;
  year_group: string | null;
  group_name: string | null;
  errors: string[];
};

/**
 * Take raw CSV text and return rows mapped to the runners shape with per-row
 * validation errors. Expected header (in any order):
 *   full_name, year_group, group_name
 * Only full_name is required.
 */
export function validateCsv(text: string): {
  rows: ParsedRow[];
  header: string[];
  fatal: string | null;
} {
  const grid = parseCsv(text);
  if (grid.length === 0) return { rows: [], header: [], fatal: "File is empty." };

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const fullNameIdx = header.indexOf("full_name");
  const yearGroupIdx = header.indexOf("year_group");
  const groupNameIdx = header.indexOf("group_name");

  if (fullNameIdx === -1) {
    return {
      rows: [],
      header,
      fatal: "Header row must include a column named 'full_name'.",
    };
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    const full_name = (row[fullNameIdx] ?? "").trim();
    const year_group = yearGroupIdx >= 0 ? (row[yearGroupIdx] ?? "").trim() || null : null;
    const group_name = groupNameIdx >= 0 ? (row[groupNameIdx] ?? "").trim() || null : null;
    const errors: string[] = [];

    if (!full_name) errors.push("Name is required");
    if (full_name.length > 120) errors.push("Name is too long");

    rows.push({ full_name, year_group, group_name, errors });
  }

  return { rows, header, fatal: null };
}
