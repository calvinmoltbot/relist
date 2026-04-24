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
      "Use the sidebar on desktop or the menu icon on mobile. Dashboard is your home page — Inventory, Describe, and Financials are your main tools.",
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
    title: "Your Day — Daily Planner",
    description:
      "The Kanban board at the top of your Dashboard shows today's priorities in three columns: Ship (sold items to post), Update (items missing details like cost or category), and Review (stale listings that might need relisting). Complete tasks to fill the progress bar.",
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
    id: "dashboard-markup-calc",
    title: "Markup Calculator",
    description:
      "A quick calculator under Today's Flow on the Dashboard. Type in what you paid for an item, drag the markup slider (or tap a preset like 200%), and it shows what to list it at and how much profit you'd make. Handy for pricing on the fly — no save, just a scratchpad.",
    category: "feature",
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
      "Track every item from sourcing to shipping. Add items manually, import from Excel/CSV, or send items in from the ReList Chrome extension while browsing Vinted. Each item tracks cost, listing price, sale price, and status.",
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
    title: "Grid, List & Table Views",
    description:
      "Toggle between three views using the icons next to the search bar: Grid (photo cards for browsing), List (compact rows for quick scanning), and Table (spreadsheet-style with inline editing and bulk selection).",
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
      "Click any item in grid or list view to open the edit dialog. Update prices, status, photos, or any other details. For sold/shipped items, you can also edit shipping costs and platform fees — profit is recalculated automatically. Changes save when you click Save.",
    category: "feature",
    group: "Inventory",
    context: "/inventory",
  },
  {
    id: "inventory-bulk-actions",
    title: "Bulk Actions",
    description:
      "Select multiple items using the checkboxes in Table view, then use the bulk action bar to change status (including reverting sold/shipped items back to sourced or listed), update dates, set prices, set shipping costs and platform fees, or delete items in one go.",
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

  // ── Financials ────────────────────────────────────────────────
  {
    id: "profit-overview",
    title: "Profit Dashboard",
    description:
      "See your financial performance at a glance: total profit, revenue, average margin, and items sold. Data comes from your inventory — mark items as Sold with a sale price to see stats here.",
    category: "feature",
    group: "Financials",
    context: "/profit",
  },
  {
    id: "profit-target",
    title: "Revenue Target Progress",
    description:
      "Shows how close you are to your monthly revenue target, how many days are left, and whether your current pace will get you there.",
    category: "feature",
    group: "Financials",
    context: "/profit",
  },
  {
    id: "profit-margin",
    title: "Understanding Margin",
    description:
      "Average margin is colour-coded: green (65%+) means you're hitting target, amber (40-65%) is okay, red (below 40%) means your costs might be too high relative to selling prices.",
    category: "tip",
    group: "Financials",
    context: "/profit",
  },
  {
    id: "profit-charts",
    title: "Charts & Breakdowns",
    description:
      "The monthly chart shows revenue vs costs over time. Category and source breakdowns show which types of items and sourcing channels are most profitable.",
    category: "feature",
    group: "Financials",
    context: "/profit",
  },

  // ── Health ───────────────────────────────────────────────────
  {
    id: "health-overview",
    title: "Inventory Health",
    description:
      "The Health page tells you how fresh, complete and well-priced your listings are — the signals Vinted's algorithm uses to decide whose items get seen. It shows freshness (how old your listings are), dead-stock value, listing completeness, and a 'Needs refresh' queue; price checks, portfolio mix and weekly cadence are coming next.",
    category: "feature",
    group: "Health",
    context: "/health",
  },
  {
    id: "health-freshness",
    title: "Freshness Aging Buckets",
    description:
      "The stacked bar shows how your unsold stock splits across age bands: just listed (0–3 days), this week (4–7), 2 weeks (8–14), over 2 weeks (15–21), and really stale (22+). Aim to keep everything in the first two bands — once something slides into the 2-weeks band, refresh it (edit title/photo/description) or drop the price.",
    category: "tip",
    group: "Health",
    context: "/health",
  },
  {
    id: "health-needs-refresh",
    title: "Needs Refresh queue",
    description:
      "Vinted rewards recently-edited listings with more search traffic. This card ranks your listed items by days since the last edit × how incomplete they are × £ at risk, so the highest-value stale items surface first. Tap one to see the refresh checklist (title / description / photo / price) and mark it as refreshed once you've made a real change in Vinted — a naïve repost without any changes can get flagged as a duplicate.",
    category: "feature",
    group: "Health",
    context: "/health",
  },
  {
    id: "health-thresholds",
    title: "Stale and Refresh Thresholds",
    description:
      "The Dashboard's Review column and the Health page's dead-stock list both use settings you control. 'Stale listing' defaults to 2 days (Lily asked for aggressive refreshing); 'Refresh suggested' defaults to 7 days. Tune both on the Settings page.",
    category: "tip",
    group: "Health",
    context: "/settings",
  },

  // ── Best Sellers ─────────────────────────────────────────────
  {
    id: "bestsellers-overview",
    title: "Best Sellers",
    description:
      "Spots what's flying out the door. Ranks your products by how quickly they sell after being listed, grouped by category, brand, source, condition or size. Only groups with 2+ sales appear so one lucky sale doesn't skew things.",
    category: "feature",
    group: "Best Sellers",
    context: "/bestsellers",
  },
  {
    id: "bestsellers-days-to-sell",
    title: "Days to Sell",
    description:
      "Counts the days between when you listed an item and when it sold. Lower is better — tells you which product types turn over fastest. Items without a listed date are skipped.",
    category: "tip",
    group: "Best Sellers",
    context: "/bestsellers",
  },
  {
    id: "bestsellers-sorting",
    title: "Fastest · Profit · Margin",
    description:
      "Toggle how the breakdown is ranked. 'Fastest' surfaces what sells quickest; 'Profit' shows where you make the most cash per sale; 'Margin' highlights the best return on investment.",
    category: "tip",
    group: "Best Sellers",
    context: "/bestsellers",
  },
  {
    id: "bestsellers-hall-of-fame",
    title: "Hall of Fame",
    description:
      "Two lists under the breakdown: your ten fastest-selling items ever (great for spotting winners to source again), and your ten highest-profit sales (your personal records).",
    category: "feature",
    group: "Best Sellers",
    context: "/bestsellers",
  },

  {
    id: "expenses-overview",
    title: "Tracking Expenses",
    description:
      "Log business costs like shipping supplies, packaging, and Vinted promotions on the Expenses tab. These reduce your net profit and are included in your tax summary as allowable deductions.",
    category: "feature",
    group: "Financials",
    context: "/profit",
  },
  {
    id: "tax-overview",
    title: "Tax & Export",
    description:
      "The Tax & Export tab shows your UK tax position: whether you're within the £1,000 trading allowance, whether Vinted will auto-report to HMRC (above £1,700), and your net taxable profit after all expenses. Export a CSV summary for Self Assessment.",
    category: "feature",
    group: "Financials",
    context: "/profit",
  },
  {
    id: "tax-trading-allowance",
    title: "£1,000 Trading Allowance",
    description:
      "If your total revenue is under £1,000 in a tax year, you don't need to file Self Assessment for this income. Once you exceed it, you'll need to declare it but can deduct allowable expenses.",
    category: "tip",
    group: "Financials",
    context: "/profit",
  },

  // ── Settings ──────────────────────────────────────────────────
  {
    id: "settings-overview",
    title: "Your Settings",
    description:
      "Configure your revenue target, weekly hours, hourly rate target, and margin target. These numbers drive the colour-coding and progress bars across the Dashboard and Financials pages.",
    category: "feature",
    group: "Settings",
    context: "/settings",
  },
  {
    id: "settings-targets",
    title: "How Targets Work",
    description:
      "Your monthly revenue target sets the goal shown on the Dashboard progress bar. Weekly hours and hourly rate target are used to calculate whether your time is paying off. Margin target colours your average margin green, amber, or red.",
    category: "tip",
    group: "Settings",
    context: "/settings",
  },
  {
    id: "settings-backup",
    title: "Backup Your Data",
    description:
      "On the Settings page, tap 'Download backup' to save everything — your items, sales, expenses, watch list, and settings — as one JSON file. Keep it somewhere safe like Google Drive or your email. If anything ever goes wrong or you delete something by accident, the backup can be used to restore your data. The Dashboard nudges you with an amber banner if it's been more than 2 weeks since your last backup.",
    category: "tip",
    group: "Settings",
    context: "/settings",
  },
  {
    id: "settings-restore",
    title: "Restore From Backup",
    description:
      "On the Settings page, tap 'Choose backup file' under Restore From Backup to replace everything in the app with the contents of a previously downloaded backup JSON. You'll see a summary of how many items, sales, and expenses are in the file vs what's currently in the app, and you have to type RESTORE to confirm. Just before the restore runs, a fresh copy of your current data is saved to your Downloads folder — so if you picked the wrong file, you can always restore that one back.",
    category: "tip",
    group: "Settings",
    context: "/settings",
  },

  // ── Deal Finder ──────────────────────────────────────────────
  {
    id: "deals-overview",
    title: "Deal Finder",
    description:
      "Track items you're watching for a good flip. When you spot something on Vinted that could be worth reselling, use the extension's 'Watch for Flip' button to save it here.",
    category: "feature",
    group: "Deal Finder",
    context: "/deals",
  },
  {
    id: "deals-watch",
    title: "Watching Items",
    description:
      "Items you're watching show their current Vinted price alongside an estimated resale value (based on what similar items sell for). The margin badge tells you the potential profit percentage.",
    category: "feature",
    group: "Deal Finder",
    context: "/deals",
  },
  {
    id: "deals-convert",
    title: "Bought It — Converting to Inventory",
    description:
      "When you buy a watched item, click 'Bought it' and enter what you paid. The item moves to your Inventory as a sourced item, ready to list. You'll find it on the Inventory page.",
    category: "tip",
    group: "Deal Finder",
    context: "/deals",
  },

  // ── Chrome Extension ─────────────────────────────────────────
  {
    id: "extension-overview",
    title: "Chrome Extension",
    description:
      "The ReList Chrome extension runs quietly while you browse Vinted. It collects price data, shows a smart button on item pages to add to inventory or watch for flips, and builds your price database automatically.",
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
  {
    id: "extension-smart-button",
    title: "Smart Button on Item Pages",
    description:
      "When you view an item on Vinted, a floating button appears. It changes based on context: green 'Add to ReList' for new items, blue 'Update' for items already in your inventory, and amber 'Watching' for items on your flip watch list. Click the dropdown arrow for more options like 'Watch for Flip'.",
    category: "feature",
    group: "Chrome Extension",
  },
];

export const GROUP_ORDER = [
  "Getting Started",
  "Dashboard",
  "Inventory",
  "Describe",
  "Financials",
  "Settings",
  "Deal Finder",
  "Chrome Extension",
];

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function groupFromSlug(slug: string): string | undefined {
  return GROUP_ORDER.find((g) => slugify(g) === slug);
}

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
