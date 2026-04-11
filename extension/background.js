// ---------------------------------------------------------------------------
// ReList Background Service Worker
// Batches listing data from content script and sends to ReList API.
// Caches price stats for content script overlay.
// ---------------------------------------------------------------------------

const API_BASE = "https://relist.warmwetcircles.com";
let cachedStats = {};
let todayCount = 0;
let lastStatsRefresh = 0;
const STATS_REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh stats every 5 minutes

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "INGEST_BATCH") {
    ingestBatch(message.listings);
    return false; // No async response needed
  }

  if (message.type === "GET_STATS") {
    maybeRefreshStats().then(() => {
      sendResponse({ stats: cachedStats });
    });
    return true; // Will respond async
  }

  if (message.type === "GET_COUNT") {
    sendResponse({ count: todayCount });
    return false;
  }

  if (message.type === "SEND_TO_RELIST") {
    sendToReList(message.data)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Will respond async
  }

  if (message.type === "GET_RECENT_SENT") {
    chrome.storage.local.get(["recentSentItems"], (result) => {
      sendResponse({ items: result.recentSentItems || [] });
    });
    return true;
  }
});

// ---------------------------------------------------------------------------
// Send item to ReList inventory
// ---------------------------------------------------------------------------
async function sendToReList(data) {
  const { apiBase } = await chrome.storage.sync.get(["apiBase"]);
  const base = apiBase || API_BASE;

  const payload = {
    name: data.title,
    brand: data.brand || null,
    category: data.category || null,
    condition: data.condition || null,
    size: data.size || null,
    costPrice: data.price ? String(data.price) : null,
    description: data.description || null,
    sourceType: "online",
    sourceLocation: "Vinted",
    vintedUrl: data.vintedUrl || null,
    externalPhotoUrls: data.photoUrls || [],
  };

  const response = await fetch(`${base}/api/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  return { success: true, item: result.item };
}

// ---------------------------------------------------------------------------
// Ingest batch to API
// ---------------------------------------------------------------------------
async function ingestBatch(listings) {
  if (!listings || listings.length === 0) return;

  todayCount += listings.length;

  // Persist count
  chrome.storage.local.set({ todayCount, lastCountDate: new Date().toDateString() });

  // Get API base from storage (configurable)
  const { apiBase } = await chrome.storage.local.get(["apiBase"]);
  const base = apiBase || API_BASE;

  try {
    const response = await fetch(`${base}/api/price-data/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings }),
    });

    if (!response.ok) {
      console.error("[ReList] Ingest failed:", response.status);
    }
  } catch (error) {
    console.error("[ReList] Ingest error:", error);
    // TODO: Queue for retry
  }
}

// ---------------------------------------------------------------------------
// Stats cache
// ---------------------------------------------------------------------------
async function maybeRefreshStats() {
  const now = Date.now();
  if (now - lastStatsRefresh < STATS_REFRESH_INTERVAL) return;

  const { apiBase } = await chrome.storage.local.get(["apiBase"]);
  const base = apiBase || API_BASE;

  try {
    // Fetch stats for common brand+category combos Lily browses
    // For now, we cache whatever stats the API returns
    // The content script requests specific brand+category combos
    lastStatsRefresh = now;
  } catch {
    // Use stale cache
  }
}

// ---------------------------------------------------------------------------
// Reset daily count
// ---------------------------------------------------------------------------
chrome.storage.local.get(["todayCount", "lastCountDate"], (result) => {
  if (result.lastCountDate === new Date().toDateString()) {
    todayCount = result.todayCount || 0;
  } else {
    todayCount = 0;
    chrome.storage.local.set({ todayCount: 0, lastCountDate: new Date().toDateString() });
  }
});
