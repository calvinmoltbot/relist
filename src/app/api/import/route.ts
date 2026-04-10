import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/db/schema";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// POST /api/import — Import items from an xlsx file
// Accepts multipart form data with a "file" field.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find the header row (look for "Item Title" or similar)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i];
      if (Array.isArray(row) && row.some((cell) => String(cell).toLowerCase().includes("item title") || String(cell).toLowerCase().includes("title"))) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      return NextResponse.json(
        { error: "Could not find header row with 'Item Title'" },
        { status: 400 },
      );
    }

    const headers = (rows[headerIdx] as string[]).map((h) => String(h).toLowerCase().trim());

    // Map column indices
    const colMap = {
      title: headers.findIndex((h) => h.includes("title")),
      brand: headers.findIndex((h) => h.includes("brand")),
      condition: headers.findIndex((h) => h.includes("condition")),
      size: headers.findIndex((h) => h.includes("size")),
      salePrice: headers.findIndex((h) => h.includes("sale price") || h.includes("price")),
      link: headers.findIndex((h) => h.includes("link") || h.includes("url")),
      costPrice: headers.findIndex((h) => h.includes("cost")),
      category: headers.findIndex((h) => h.includes("category")),
    };

    if (colMap.title === -1) {
      return NextResponse.json(
        { error: "Could not find 'Item Title' column" },
        { status: 400 },
      );
    }

    // Parse data rows
    const dataRows = rows.slice(headerIdx + 1);
    let imported = 0;
    let skipped = 0;

    for (const row of dataRows) {
      if (!Array.isArray(row)) continue;

      const name = row[colMap.title];
      if (!name || typeof name !== "string" && typeof name !== "number") {
        skipped++;
        continue;
      }

      const nameStr = String(name).trim();
      if (!nameStr || nameStr.toLowerCase() === "items sold") {
        skipped++;
        continue;
      }

      // Map condition values to our format
      const rawCondition = colMap.condition >= 0 ? String(row[colMap.condition] ?? "").trim() : "";
      const conditionMap: Record<string, string> = {
        "new with tags": "new",
        "very good": "like_new",
        "good": "good",
        "satisfactory": "fair",
        "fair": "fair",
      };
      const condition = conditionMap[rawCondition.toLowerCase()] ?? (rawCondition || null);

      const soldPrice = colMap.salePrice >= 0 ? row[colMap.salePrice] : null;
      const costPrice = colMap.costPrice >= 0 ? row[colMap.costPrice] : null;
      const brand = colMap.brand >= 0 ? String(row[colMap.brand] ?? "").trim() || null : null;
      const size = colMap.size >= 0 ? String(row[colMap.size] ?? "").trim() || null : null;
      const category = colMap.category >= 0 ? String(row[colMap.category] ?? "").trim() || null : null;

      await db.insert(items).values({
        name: nameStr,
        brand,
        category,
        condition,
        size,
        costPrice: costPrice != null && costPrice !== "" ? String(costPrice) : null,
        soldPrice: soldPrice != null && soldPrice !== "" ? String(soldPrice) : null,
        status: soldPrice ? "sold" : "sourced",
        platform: "vinted",
      });

      imported++;
    }

    return NextResponse.json({ imported, skipped, total: dataRows.length });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import file" },
      { status: 500 },
    );
  }
}
