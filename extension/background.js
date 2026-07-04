// ---------------------------------------------------------------------------
// ReList Background Service Worker
// Batches listing data from content script and sends to ReList API.
// All API calls go through apiFetch, which attaches the X-ReList-Key header.
// ---------------------------------------------------------------------------

const API_BASE = "https://relist.warmwetcircles.com";
const MAX_QUEUED_BATCHES = 20; // Failed ingest batches kept for retry
let cachedStats = {};
let todayCount = 0;

// ---------------------------------------------------------------------------
// Config + authenticated fetch
// ---------------------------------------------------------------------------
async function getConfig() {
  const { apiBase, apiKey } = await chrome.storage.sync.get(["apiBase", "apiKey"]);
  return { base: apiBase || API_BASE, key: apiKey || "" };
}

async function apiFetch(path, options = {}) {
  const { base, key } = await getConfig();
  const headers = { ...(options.headers || {}) };
  if (key) headers["X-ReList-Key"] = key;
  return fetch(`${base}${path}`, { ...options, headers });
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "INGEST_BATCH") {
    ingestBatch(message.listings);
    return false; // No async response needed
  }

  if (message.type === "GET_STATS") {
    sendResponse({ stats: cachedStats });
    return false;
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

  if (message.type === "CHECK_INVENTORY") {
    checkInventory(message.vintedUrl)
      .then((result) => sendResponse(result))
      .catch(() => sendResponse({ inInventory: false, watched: false }));
    return true;
  }

  if (message.type === "WATCH_ITEM") {
    watchItem(message.data)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === "CONVERT_WATCH_ITEM") {
    convertWatchItem(message.watchItemId, message.buyPrice)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === "PASS_WATCH_ITEM") {
    passWatchItem(message.watchItemId)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});

// ---------------------------------------------------------------------------
// Send item to ReList inventory
// ---------------------------------------------------------------------------
async function sendToReList(data) {
  const payload = {
    name: data.title,
    brand: data.brand || null,
    category: data.category || null,
    condition: data.condition || null,
    size: data.size || null,
    listedPrice: data.price ? String(data.price) : null,
    status: "listed",
    description: data.description || null,
    sourceType: "online",
    sourceLocation: "Vinted",
    vintedUrl: data.vintedUrl || null,
    externalPhotoUrls: data.photoUrls || [],
  };

  const response = await apiFetch("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  return { success: true, item: result.item, updated: result.updated === true };
}

// ---------------------------------------------------------------------------
// Ingest batch to API — failed batches are queued and retried on the next
// ingest so a flaky connection doesn't lose scraped listings.
// ---------------------------------------------------------------------------
async function postListings(listings) {
  const response = await apiFetch("/api/price-data/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listings }),
  });
  if (!response.ok) throw new Error(`Ingest failed: ${response.status}`);
}

async function ingestBatch(listings) {
  if (!listings || listings.length === 0) return;

  todayCount += listings.length;
  chrome.storage.local.set({ todayCount, lastCountDate: new Date().toDateString() });

  // Prepend any batches that failed earlier
  const { queuedBatches } = await chrome.storage.local.get(["queuedBatches"]);
  const batches = [...(queuedBatches || []), listings];
  const failed = [];

  for (const batch of batches) {
    try {
      await postListings(batch);
    } catch (error) {
      console.error("[ReList] Ingest error, queuing batch for retry:", error);
      failed.push(batch);
    }
  }

  // Keep the newest batches if the queue overflows
  chrome.storage.local.set({ queuedBatches: failed.slice(-MAX_QUEUED_BATCHES) });
}

// ---------------------------------------------------------------------------
// Check if item exists in inventory or watch list
// ---------------------------------------------------------------------------
async function checkInventory(vintedUrl) {
  if (!vintedUrl) return { inInventory: false, watched: false };

  const response = await apiFetch(
    `/api/inventory/check?vintedUrl=${encodeURIComponent(vintedUrl)}`,
  );

  if (!response.ok) {
    throw new Error(`Check failed: ${response.status}`);
  }

  return await response.json();
}

// ---------------------------------------------------------------------------
// Add item to watch list
// ---------------------------------------------------------------------------
async function watchItem(data) {
  const response = await apiFetch("/api/watch-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vintedUrl: data.vintedUrl,
      vintedId: data.vintedId,
      title: data.title,
      brand: data.brand || null,
      category: data.category || null,
      size: data.size || null,
      condition: data.condition || null,
      price: data.price || null,
      photoUrl: data.photoUrls?.[0] || null,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Watch failed: ${response.status}: ${errorBody}`);
  }

  return await response.json();
}

// ---------------------------------------------------------------------------
// Convert watched item to inventory (Mark as Bought)
// ---------------------------------------------------------------------------
async function convertWatchItem(watchItemId, buyPrice) {
  const response = await apiFetch(`/api/watch-items/${watchItemId}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buyPrice }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Convert failed: ${response.status}: ${errorBody}`);
  }

  return await response.json();
}

// ---------------------------------------------------------------------------
// Mark a watched item as passed
// ---------------------------------------------------------------------------
async function passWatchItem(watchItemId) {
  const response = await apiFetch(`/api/watch-items/${watchItemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "passed" }),
  });

  if (!response.ok) {
    throw new Error(`Pass failed: ${response.status}`);
  }

  return await response.json();
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
