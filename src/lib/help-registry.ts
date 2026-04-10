export interface HelpEntry {
  id: string;
  title: string;
  description: string;
  category: "feature" | "tip";
  /** Group heading on the help page */
  group: string;
  /** Route where this is most relevant */
  context?: string;
}

export const HELP_ENTRIES: HelpEntry[] = [
  // ── Getting Started ──────────────────────────────────────────
  {
    id: "getting-started",
    title: "Welcome to ReList",
    description:
      "ReList helps you track your Vinted inventory, generate listing descriptions with AI, and monitor your profit. Use the sidebar to navigate between sections.",
    category: "feature",
    group: "Getting Started",
  },
  {
    id: "navigation",
    title: "Navigating the App",
    description:
      "Use the sidebar on desktop or the menu icon on mobile. Dashboard is your home page — Inventory, Describe, and Profit are your main tools.",
    category: "tip",
    group: "Getting Started",
  },

  // ── Dashboard ────────────────────────────────────────────────
  {
    id: "dashboard-overview",
    title: "Your Dashboard",
    description:
      "Shows your monthly revenue progress, key stats (profit, revenue, hourly rate, inventory count), and items needing attention — like things to ship or relist.",
    category: "feature",
    group: "Dashboard",
    context: "/",
  },
  {
    id: "dashboard-actions",
    title: "Action Cards",
    description:
      "The coloured cards highlight items that need action: Ship Now (sold items to post), Ready to List (sourced items to photograph and list), and Consider Relisting (items that have been listed a while).",
    category: "feature",
    group: "Dashboard",
    context: "/",
  },
  {
    id: "dashboard-revenue",
    title: "Revenue Target",
    description:
      "The progress bar tracks your monthly revenue against your target. Green means you're on track, amber means you need to pick up the pace.",
    category: "tip",
    group: "Dashboard",
    context: "/",
  },
  {
    id: "dashboard-hourly-rate",
    title: "Hourly Rate",
    description:
      "Calculated from your total profit divided by hours worked. It colour-codes based on whether you're meeting your hourly rate target.",
    category: "tip",
    group: "Dashboard",
    context: "/",
  },

  // ── Inventory ────────────────────────────────────────────────
  {
    id: "inventory-overview",
    title: "Inventory Management",
    description:
      "Track every item from sourcing to shipping. Add items manually, import from Excel/CSV, or paste JSON from the Vinted scraper. Each item tracks cost, listing price, sale price, and status.",
    category: "feature",
    group: "Inventory",
    context: "/inventory",
  },
  {
    id: "inventory-add",
    title: "Adding Items",
    description:
      "Click 'Add Item' to create a new inventory entry. Only the name is required — fill in brand, size, category, condition, prices, and photos as you have them.",
    category: "feature",
    group: "Inventory",
    context: "/inventory",
  },
  {
    id: "inventory-import-xlsx",
    title: "Import from Excel/CSV",
    description:
      "Click the Import button and upload an .xlsx, .xls, or .csv file. The importer maps columns automatically. Great for bulk-adding items from a spreadsheet.",
    category: "feature",
    group: "Inventory",
    context: "/inventory",
  },
  {
    id: "inventory-import-json",
    title: "Import from Vinted Scraper",
    description:
      "Use the JSON Paste tab in the Import dialog. Run the Vinted scraper in your browser console, copy the output, and paste it here to import your sold items history.",
    category: "feature",
    group: "Inventory",
    context: "/inventory",
  },
  {
    id: "inventory-status",
    title: "Item Statuses",
    description:
      "Items move through statuses: Sourced (bought, not yet listed) → Listed (on Vinted) → Sold (payment received) → Shipped (posted to buyer). Use the status tabs to filter your view.",
    category: "tip",
    group: "Inventory",
    context: "/inventory",
  },
  {
    id: "inventory-views",
    title: "Grid & List Views",
    description:
      "Toggle between grid view (photo cards) and list view (compact rows) using the icons next to the search bar. Grid is better for browsing, list is better for quick scanning.",
    category: "tip",
    group: "Inventory",
    context: "/inventory",
  },
  {
    id: "inventory-search",
    title: "Search & Sort",
    description:
      "Use the search bar to filter items by name or brand. Use the sort dropdown to order by date added, price, or brand.",
    category: "tip",
    group: "Inventory",
    context: "/inventory",
  },
  {
    id: "inventory-edit",
    title: "Editing Items",
    description:
      "Click any item in grid or list view to open the edit dialog. Update prices, status, photos, or any other details. Changes save when you click Save.",
    category: "feature",
    group: "Inventory",
    context: "/inventory",
  },
  {
    id: "inventory-photos",
    title: "Item Photos",
    description:
      "Upload up to 5 photos per item. Photos are resized automatically to save space. You can also generate an AI description directly from the add/edit dialog if a photo is attached.",
    category: "tip",
    group: "Inventory",
    context: "/inventory",
  },

  // ── Describe ─────────────────────────────────────────────────
  {
    id: "describe-overview",
    title: "AI Description Generator",
    description:
      "Upload a photo of your item and ReList will generate a Vinted listing description using AI. Add brand, category, condition, and size for better results.",
    category: "feature",
    group: "Describe",
    context: "/describe",
  },
  {
    id: "describe-photos",
    title: "Uploading Photos",
    description:
      "Drag and drop a photo onto the upload area, or click to browse. Click the magnifying glass icon to view the full-size image. Phone photos are automatically resized.",
    category: "feature",
    group: "Describe",
    context: "/describe",
  },
  {
    id: "describe-tips",
    title: "Tips for Better Descriptions",
    description:
      "Fill in as many fields as you can — brand, category, condition, and size all help the AI write more accurate descriptions. A clear, well-lit photo makes a big difference too.",
    category: "tip",
    group: "Describe",
    context: "/describe",
  },
  {
    id: "describe-tone",
    title: "Tone & Length",
    description:
      "Choose a tone: Casual (friendly, conversational), Pro (polished, professional), or Trendy (Gen Z, fashion-forward). Pick a length: Short (quick listing), Medium (standard), or Long (detailed).",
    category: "feature",
    group: "Describe",
    context: "/describe",
  },
  {
    id: "describe-model",
    title: "AI Model Selection",
    description:
      "Pick which AI model generates your description. Different models have different strengths — try a few to see which writes the style you like best. All models are free to use.",
    category: "tip",
    group: "Describe",
    context: "/describe",
  },
  {
    id: "describe-copy",
    title: "Copying & Using Results",
    description:
      "Click 'Copy' to copy the description to your clipboard, then paste it into your Vinted listing. Click individual hashtags to copy them separately. Use 'Redo' to regenerate with the same inputs.",
    category: "tip",
    group: "Describe",
    context: "/describe",
  },

  // ── Profit ───────────────────────────────────────────────────
  {
    id: "profit-overview",
    title: "Profit Dashboard",
    description:
      "See your financial performance at a glance: total profit, revenue, average margin, and items sold. Data comes from your inventory — mark items as Sold with a sale price to see stats here.",
    category: "feature",
    group: "Profit",
    context: "/profit",
  },
  {
    id: "profit-target",
    title: "Revenue Target Progress",
    description:
      "Shows how close you are to your monthly revenue target, how many days are left, and whether your current pace will get you there.",
    category: "feature",
    group: "Profit",
    context: "/profit",
  },
  {
    id: "profit-margin",
    title: "Understanding Margin",
    description:
      "Average margin is colour-coded: green (65%+) means you're hitting target, amber (40-65%) is okay, red (below 40%) means your costs might be too high relative to selling prices.",
    category: "tip",
    group: "Profit",
    context: "/profit",
  },
  {
    id: "profit-charts",
    title: "Charts & Breakdowns",
    description:
      "The monthly chart shows revenue vs costs over time. Category and source breakdowns show which types of items and sourcing channels are most profitable.",
    category: "feature",
    group: "Profit",
    context: "/profit",
  },

  // ── Chrome Extension ─────────────────────────────────────────
  {
    id: "extension-overview",
    title: "Chrome Extension",
    description:
      "The ReList Chrome extension runs quietly while you browse Vinted, collecting price data on items you view. This builds your personal price database for the Deal Finder and Price Estimator.",
    category: "feature",
    group: "Chrome Extension",
  },
  {
    id: "extension-install",
    title: "Installing the Extension",
    description:
      "Load the extension from the 'extension/' folder in developer mode: Chrome → Extensions → Enable Developer Mode → Load Unpacked → select the extension folder.",
    category: "tip",
    group: "Chrome Extension",
  },
  {
    id: "extension-passive",
    title: "How It Works",
    description:
      "The extension passively watches pages you visit on Vinted. It doesn't scrape or automate anything — it just saves price and item data from pages you naturally browse. No risk to your Vinted account.",
    category: "tip",
    group: "Chrome Extension",
  },

  // ── Vinted Scraper ───────────────────────────────────────────
  {
    id: "scraper-overview",
    title: "Vinted Sold Items Scraper",
    description:
      "A browser console script that extracts your sold items history from Vinted. Run it in your browser's developer console while on Vinted, then import the output into ReList.",
    category: "feature",
    group: "Vinted Scraper",
  },
  {
    id: "scraper-howto",
    title: "Running the Scraper",
    description:
      "Open Vinted in Chrome → press F12 → go to Console tab → paste the scraper script → press Enter. Copy the JSON output, then use Import → JSON Paste in ReList's Inventory page.",
    category: "tip",
    group: "Vinted Scraper",
  },
];

export function getEntriesByGroup(): Record<string, HelpEntry[]> {
  return HELP_ENTRIES.reduce(
    (acc, entry) => {
      (acc[entry.group] ??= []).push(entry);
      return acc;
    },
    {} as Record<string, HelpEntry[]>
  );
}

export function getEntriesForContext(context: string): HelpEntry[] {
  return HELP_ENTRIES.filter((e) => !e.context || e.context === context);
}

export function searchEntries(query: string): HelpEntry[] {
  const q = query.toLowerCase();
  return HELP_ENTRIES.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.group.toLowerCase().includes(q)
  );
}
