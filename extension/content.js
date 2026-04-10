// ---------------------------------------------------------------------------
// ReList Content Script — runs on vinted.co.uk pages
// Extracts listing data from search/catalog pages and sends to background worker.
// Injects price intelligence badges when stats are available.
// ---------------------------------------------------------------------------

(function () {
  "use strict";

  const BATCH_INTERVAL = 30000; // Send batch every 30 seconds
  const SCRAPE_INTERVAL = 3000; // Re-scrape DOM every 3 seconds (for infinite scroll)
  let pendingListings = [];
  let seenIds = new Set();
  let enabled = true;
  let stats = {}; // Cached price stats: { "brand|category": { median, p25, p75 } }

  // ---------------------------------------------------------------------------
  // Check if extension is enabled
  // ---------------------------------------------------------------------------
  chrome.storage.local.get(["enabled"], (result) => {
    enabled = result.enabled !== false; // Default to enabled
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      enabled = changes.enabled.newValue;
    }
  });

  // ---------------------------------------------------------------------------
  // Extract listing data from DOM
  // ---------------------------------------------------------------------------
  function extractListings() {
    if (!enabled) return;

    // Vinted uses item cards in search results — look for common selectors
    const cards = document.querySelectorAll('[data-testid="overlay-link"], .feed-grid__item, .ItemBox_overlay__jDtyQ');

    for (const card of cards) {
      try {
        const listing = extractFromCard(card);
        if (listing && !seenIds.has(listing.vintedId)) {
          seenIds.add(listing.vintedId);
          pendingListings.push(listing);
          injectBadge(card, listing);
        }
      } catch {
        // Skip malformed cards
      }
    }
  }

  function extractFromCard(card) {
    // Try to extract item URL which contains the Vinted ID
    const link = card.closest("a") || card.querySelector("a");
    if (!link) return null;

    const href = link.href || link.getAttribute("href") || "";
    const idMatch = href.match(/\/items\/(\d+)/);
    if (!idMatch) return null;

    const vintedId = idMatch[1];

    // Extract price — look for price elements
    const priceEl =
      card.querySelector('[data-testid*="price"]') ||
      card.querySelector(".ItemBox_price__WJo30") ||
      findTextElement(card, /^[£€]\s*[\d,.]+/);

    let price = null;
    if (priceEl) {
      const priceText = priceEl.textContent.trim();
      const priceMatch = priceText.match(/[\d,.]+/);
      if (priceMatch) {
        price = parseFloat(priceMatch[0].replace(",", ""));
      }
    }

    // Extract title
    const titleEl =
      card.querySelector('[data-testid*="title"]') ||
      card.querySelector(".ItemBox_title__dTiO6") ||
      card.querySelector("h3, h4");
    const title = titleEl?.textContent?.trim() ?? null;

    // Extract brand — often in a separate element
    const brandEl =
      card.querySelector('[data-testid*="brand"]') ||
      card.querySelector(".ItemBox_brand__Kz8fq");
    const brand = brandEl?.textContent?.trim() ?? null;

    // Extract size
    const sizeEl = card.querySelector('[data-testid*="size"]');
    const size = sizeEl?.textContent?.trim() ?? null;

    // Photo URL
    const img = card.querySelector("img");
    const photoUrl = img?.src ?? null;

    return {
      vintedId,
      title,
      brand,
      category: guessCategoryFromUrl(),
      size,
      condition: null, // Not visible on search cards
      price,
      currency: "GBP",
      url: `https://www.vinted.co.uk/items/${vintedId}`,
      photoUrl,
    };
  }

  // Helper: find an element containing text matching a pattern
  function findTextElement(root, pattern) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (pattern.test(walker.currentNode.textContent)) {
        return walker.currentNode.parentElement;
      }
    }
    return null;
  }

  // Guess category from URL path
  function guessCategoryFromUrl() {
    const path = window.location.pathname;
    const categoryMap = {
      "/women/shoes": "shoes",
      "/women/bags": "bags",
      "/women/jeans": "jeans",
      "/women/tops": "tops",
      "/women/dresses": "dresses",
      "/women/jackets": "jackets",
      "/women/accessories": "accessories",
      "/men/shoes": "shoes",
      "/men/tops": "tops",
      "/men/jeans": "jeans",
      "/men/jackets": "jackets",
    };

    for (const [prefix, category] of Object.entries(categoryMap)) {
      if (path.includes(prefix)) return category;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Price badge injection
  // ---------------------------------------------------------------------------
  function injectBadge(card, listing) {
    if (!listing.brand || !listing.price) return;

    const key = `${listing.brand.toLowerCase()}|${listing.category || ""}`;
    const stat = stats[key];
    if (!stat || !stat.median) return;

    const ratio = listing.price / stat.median;
    let badge = null;

    if (ratio <= 0.7) {
      badge = createBadge("Good deal", "#10b981", "#065f46");
    } else if (ratio <= 0.9) {
      badge = createBadge("Fair", "#3b82f6", "#1e3a5f");
    } else if (ratio >= 1.3) {
      badge = createBadge("Overpriced", "#ef4444", "#7f1d1d");
    }

    if (badge) {
      const container = card.closest("a") || card;
      container.style.position = "relative";
      container.appendChild(badge);
    }
  }

  function createBadge(text, color, bgColor) {
    const el = document.createElement("div");
    el.className = "relist-badge";
    el.textContent = text;
    el.style.cssText = `
      position: absolute;
      bottom: 4px;
      left: 4px;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      color: ${color};
      background: ${bgColor};
      z-index: 10;
      pointer-events: none;
    `;
    return el;
  }

  // ---------------------------------------------------------------------------
  // Send data to background worker
  // ---------------------------------------------------------------------------
  function flushBatch() {
    if (pendingListings.length === 0) return;

    const batch = [...pendingListings];
    pendingListings = [];

    chrome.runtime.sendMessage({
      type: "INGEST_BATCH",
      listings: batch,
    });
  }

  // ---------------------------------------------------------------------------
  // Load cached stats from background
  // ---------------------------------------------------------------------------
  function loadStats() {
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
      if (response?.stats) {
        stats = response.stats;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  // Initial scrape
  extractListings();
  loadStats();

  // Re-scrape periodically (handles infinite scroll)
  setInterval(extractListings, SCRAPE_INTERVAL);

  // Flush batch periodically
  setInterval(flushBatch, BATCH_INTERVAL);

  // Also flush on page unload
  window.addEventListener("beforeunload", flushBatch);

  // Watch for DOM mutations (Vinted is SPA-like)
  const observer = new MutationObserver(() => {
    extractListings();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
