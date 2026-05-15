// Reconciles V1 workbook to 08B/V6 lot register (src/data/seafields/lots.ts).
// Outputs docs/Seafields_Lot_Allocation_Master_V2_DA-reconciled.xlsx.
//
// V6 owns: Lot #, Area (m²), Stage, Zone / Block, Category, Heritage status.
// Workbook owns: Status, Allocated To, Dwelling Type, Land Only, pricing
//                overrides, display flags, notes.
//
// Strategy:
//   - V6 is the source of truth for membership and geometry. V1 lot rows are
//     rebuilt from V6 with uniform Public/Available/Land-Only defaults
//     (matching V1's content across all 142 rows) so Uwe sees a familiar shape.
//   - Heritage lots are special-cased (Status=Withheld, Allocated To=Heritage
//     Retained, Land Only=N, Display Price=N).
//   - V1 lots not in V6 are dropped; logged in DA_Reconciliation_Log sheet.
//   - V6 lots not in V1 (newly added) are inserted with the same defaults; also
//     logged.
//   - V1 lots whose stage/zone differ from V6 are kept but corrected; also
//     logged.
//   - All other V1 sheets (Stage_Pricing_Ladder, Dwelling_Types,
//     Offtaker_Summary, README, Audit_Log) pass through unchanged.

import { readFile, writeFile } from "node:fs/promises";
import * as XLSX from "xlsx";

const INPUT = "docs/Seafields_Lot_Allocation_Master_V1.xlsx";
const OUTPUT = "docs/Seafields_Lot_Allocation_Master_V2_DA-reconciled.xlsx";
const LOTS_TS = "src/data/seafields/lots.ts";

// ---------------------------------------------------------------------------
// Parse lots.ts → V6 LOTS array (regex; format is uniform)
// ---------------------------------------------------------------------------

const ZONE_CONSTANTS = {
  SUTCLIFFE: "Sutcliffe Road",
  NE_INNER: "Sutcliffe Road / NE Inner",
  PEPPER: "Pepper Gate",
  CENTRAL: "Central",
  SW_BLOCK: "Pepper Gate West / SW Block",
  COLLINS: "Collins Road",
};

function categoryFromArea(area, isHeritage) {
  if (isHeritage) return "heritage";
  if (area < 500) return "compact";
  if (area < 600) return "standard";
  if (area < 700) return "large";
  return "premium";
}

async function parseLotsTs() {
  const src = await readFile(LOTS_TS, "utf8");
  const lotCallRe = /lot\(\s*(\d+),\s*(\d+),\s*([A-Z_]+),\s*"(\d+)"(?:,\s*(\{[^}]+\}))?\s*\)/g;
  const lots = [];
  let m;
  while ((m = lotCallRe.exec(src)) !== null) {
    const n = Number(m[1]);
    const area = Number(m[2]);
    const zoneConst = m[3];
    const stage = m[4];
    const optsRaw = m[5] ?? "";
    const isHeritage = /isHeritage:\s*true/.test(optsRaw);
    const pendingRenumber = /pendingRenumber:\s*true/.test(optsRaw);
    const isAmended = /isAmended:\s*true/.test(optsRaw);
    const idSuffixMatch = optsRaw.match(/idSuffix:\s*"([^"]+)"/);
    const idSuffix = idSuffixMatch ? idSuffixMatch[1] : "";
    const zone = ZONE_CONSTANTS[zoneConst];
    if (!zone) {
      throw new Error(`Unknown zone constant "${zoneConst}" for lot ${n}`);
    }
    lots.push({
      lotNumber: n,
      idSuffix,
      area,
      zone,
      stage,
      category: categoryFromArea(area, isHeritage),
      isHeritage,
      pendingRenumber,
      isAmended,
    });
  }
  return lots;
}

// ---------------------------------------------------------------------------
// Read V1 workbook into memory and capture per-lot V1 content for log
// ---------------------------------------------------------------------------

function sheetRows(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
}

function findHeader(rows, required) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = rows[i] ?? [];
    const map = {};
    for (let j = 0; j < cells.length; j++) {
      const v = cells[j];
      if (typeof v === "string" && v.trim()) map[v.trim()] = j;
    }
    if (required.every((h) => h in map)) return { rowIndex: i, header: map, headerCells: cells };
  }
  return null;
}

function v1ContentByLot(wb) {
  const rows = sheetRows(wb, "Lot_Allocation_Master");
  const found = findHeader(rows, ["Lot #", "Stage", "Allocated To"]);
  if (!found) throw new Error("V1 Lot_Allocation_Master header not found");
  const { rowIndex, header } = found;
  const titleRow = rows[0] ?? null;
  const headerCells = found.headerCells;
  const byLot = new Map();
  for (let i = rowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const ln = row[header["Lot #"]];
    if (typeof ln === "number" && Number.isInteger(ln)) {
      byLot.set(ln, row);
    }
  }
  return { byLot, header, headerCells, titleRow, rowCount: rows.length };
}

// ---------------------------------------------------------------------------
// Build V2 Lot_Allocation_Master rows
// ---------------------------------------------------------------------------

const V2_HEADERS = [
  "Lot #",
  "Area (m²)",
  "Category",
  "Zone / Block",
  "Stage",
  "Status",
  "Allocated To",
  "Dwelling Type",
  "Land Only? (Y/N)",
  "Land $/m² Override",
  "Calc Land $",
  "House $ (if H&L)",
  "Total H&L $",
  "Display Price?",
  "Public Label",
  "Notes / Uwe Comments",
  "DA Reconciliation Notes",
];

const CATEGORY_TO_LABEL = {
  compact: "Compact",
  standard: "Standard",
  large: "Large",
  premium: "Premium",
  heritage: "Heritage",
};

function buildV2Rows(v6Lots, v1ByLot) {
  // Lot key includes idSuffix to disambiguate duplicate polygons (e.g. 348a/b).
  // For workbook display, we keep them on separate rows with the same Lot #;
  // the suffix is captured in DA Reconciliation Notes.
  const v6Keys = new Set(v6Lots.map((l) => `${l.lotNumber}${l.idSuffix}`));
  const v6LotNumbers = new Set(v6Lots.map((l) => l.lotNumber));

  const out = [];
  const log = [];

  for (const lot of v6Lots) {
    const v1Row = v1ByLot.get(lot.lotNumber);
    const notes = [];

    if (!v1Row) {
      notes.push("Inserted per V6 (not in V1)");
    } else {
      // Compare V1 vs V6 for the fields V6 owns
      const v1Stage = v1Row[4]; // "Stage" column index in V1 header order
      const v1Area = v1Row[1]; // "Area (m²)"
      const v1Zone = v1Row[3]; // "Zone / Block"
      const v1Cat = v1Row[2]; // "Category"
      const v6StageLabel = `Stage ${lot.stage}`;
      if (v1Stage !== v6StageLabel) {
        notes.push(`Stage corrected ${v1Stage} → ${v6StageLabel}`);
      }
      if (typeof v1Area === "number" && v1Area !== lot.area) {
        notes.push(`Area corrected ${v1Area} → ${lot.area} m² (V6 polygon)`);
      }
      if (v1Zone !== lot.zone) {
        notes.push(`Zone corrected "${v1Zone}" → "${lot.zone}"`);
      }
      if (lot.isHeritage && v1Cat !== "Heritage") {
        notes.push(`Heritage reclassification per V6`);
      }
    }
    if (lot.pendingRenumber) {
      notes.push(`Duplicate polygon (idSuffix=${lot.idSuffix}); pending CLE renumber`);
    }
    if (lot.isAmended) {
      notes.push("Geometry amended in 08B WAPC202888 overlay");
    }

    // Workbook-owned defaults — heritage gets special handling
    const isHeritage = lot.isHeritage;
    out.push([
      lot.lotNumber,                                           // Lot #
      lot.area,                                                // Area (m²)
      CATEGORY_TO_LABEL[lot.category],                         // Category
      isHeritage ? `${lot.zone} — Heritage Lot` : lot.zone,    // Zone / Block
      `Stage ${lot.stage}`,                                    // Stage
      isHeritage ? "Withheld" : "Available",                   // Status
      isHeritage ? "Heritage Retained" : "Public",             // Allocated To
      null,                                                    // Dwelling Type — Uwe to fill
      isHeritage ? "N" : "Y",                                  // Land Only? (Y/N)
      null,                                                    // Land $/m² Override
      null,                                                    // Calc Land $ — recomputed at import
      null,                                                    // House $ (if H&L)
      null,                                                    // Total H&L $
      isHeritage ? "N" : "Y",                                  // Display Price?
      null,                                                    // Public Label
      null,                                                    // Notes / Uwe Comments
      notes.length ? notes.join("; ") : "Unchanged from V1",  // DA Reconciliation Notes
    ]);

    log.push({
      lot_number: lot.lotNumber,
      action: v1Row ? "kept" : "inserted",
      stage: lot.stage,
      area: lot.area,
      zone: lot.zone,
      notes: notes.join("; ") || "no changes",
    });
  }

  // Lots in V1 not in V6 → dropped
  for (const [v1LotNumber] of v1ByLot) {
    if (!v6LotNumbers.has(v1LotNumber)) {
      log.push({
        lot_number: v1LotNumber,
        action: "dropped",
        stage: "—",
        area: "—",
        zone: "—",
        notes: "V1-only; not in V6 08B register",
      });
    }
  }

  return { rows: out, log };
}

function buildLogSheet(log) {
  const header = [
    "Lot #",
    "Action",
    "V6 Stage",
    "V6 Area",
    "V6 Zone",
    "Reconciliation Notes",
  ];
  const rows = [
    [
      "DA RECONCILIATION LOG — V1 → V2 against CLE Plan 3027-08B-01 (WAPC 202888) V6",
      null, null, null, null, null,
    ],
    [
      `Generated ${new Date().toISOString().slice(0, 10)} from src/data/seafields/lots.ts.`,
      null, null, null, null, null,
    ],
    [null, null, null, null, null, null],
    header,
    ...log.map((l) => [l.lot_number, l.action, l.stage, l.area, l.zone, l.notes]),
  ];
  return XLSX.utils.aoa_to_sheet(rows);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const v6Lots = await parseLotsTs();
  console.log(`Parsed ${v6Lots.length} lots from ${LOTS_TS}`);

  const buf = await readFile(INPUT);
  const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellDates: false });
  console.log(`Loaded V1 workbook with sheets: ${wb.SheetNames.join(", ")}`);

  const { byLot: v1ByLot } = v1ContentByLot(wb);
  console.log(`V1 has ${v1ByLot.size} lot rows`);

  const { rows: v2Rows, log } = buildV2Rows(v6Lots, v1ByLot);

  // Build new Lot_Allocation_Master sheet
  const titleRow = [
    "LOT ALLOCATION MASTER — V2 reconciled to 08B/V6. Yellow = Uwe input. Pink = priority. Grey = derived. DA Reconciliation Notes column documents per-row changes.",
    null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
  ];
  const lamSheet = XLSX.utils.aoa_to_sheet([titleRow, V2_HEADERS, ...v2Rows]);

  // Replace the sheet
  wb.Sheets["Lot_Allocation_Master"] = lamSheet;

  // Add reconciliation log sheet
  wb.Sheets["DA_Reconciliation_Log"] = buildLogSheet(log);
  if (!wb.SheetNames.includes("DA_Reconciliation_Log")) {
    wb.SheetNames.push("DA_Reconciliation_Log");
  }

  // Summary stats
  const inserted = log.filter((l) => l.action === "inserted").length;
  const dropped = log.filter((l) => l.action === "dropped").length;
  const kept = log.filter((l) => l.action === "kept").length;
  const corrected = log.filter((l) => l.action === "kept" && l.notes !== "no changes").length;
  console.log(`V2 Lot_Allocation_Master: ${v2Rows.length} rows`);
  console.log(`  Inserted (V6 only): ${inserted}`);
  console.log(`  Kept from V1:       ${kept} (${corrected} corrected)`);
  console.log(`  Dropped (V1 only):  ${dropped}`);

  // Write output
  XLSX.writeFile(wb, OUTPUT);
  console.log(`\nWrote ${OUTPUT}`);
}

await main();
