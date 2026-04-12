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
  // Item Detail Page — "Send to ReList" floating button
  // ---------------------------------------------------------------------------
  const ITEM_URL_PATTERN = /\/items\/(\d+)-/;
  let sendButtonInjected = false;

  function isItemDetailPage() {
    return ITEM_URL_PATTERN.test(window.location.pathname);
  }

  function extractItemDetailData() {
    const data = {};

    // Vinted ID from URL
    const idMatch = window.location.pathname.match(/\/items\/(\d+)/);
    data.vintedId = idMatch ? idMatch[1] : null;
    data.vintedUrl = window.location.href;

    // Title — h1 is reliable on Vinted item pages
    const titleEl = document.querySelector("h1");
    data.title = titleEl?.textContent?.trim() ?? null;

    // Price — data-testid="item-price" contains the price text (e.g. "£7.00")
    const priceEl = document.querySelector('[data-testid="item-price"]');
    if (priceEl) {
      const priceText = priceEl.textContent.trim();
      const priceMatch = priceText.match(/[\d,.]+/);
      data.price = priceMatch
        ? parseFloat(priceMatch[0].replace(",", ""))
        : null;
    }

    // Brand — the summary area has brand links; pick the one in the
    // attributes section (contains just the brand name, not "Brand menu" text).
    // The summary plugin has "Size·Condition·Brand" with brand as a link.
    const summaryPlugin = document.querySelector('[data-testid="item-page-summary-plugin"]');
    const brandLink = summaryPlugin?.querySelector('a[href*="/brand"]');
    if (brandLink) {
      data.brand = brandLink.textContent.trim();
    } else {
      // Fallback: find brand in attributes section, strip "Brand menu" suffix
      const brandMenuBtn = document.querySelector('[data-testid="item-attributes-brand-menu-button"]');
      if (brandMenuBtn) {
        const parentText = brandMenuBtn.closest('div')?.parentElement?.textContent?.trim() || '';
        data.brand = parentText.replace(/Brand\s*menu/i, '').replace(/^Brand/i, '').trim() || null;
      } else {
        data.brand = null;
      }
    }

    // Size — data-testid="item-attributes-size" contains "SizeS / UK 8-10"
    const sizeEl = document.querySelector('[data-testid="item-attributes-size"]');
    if (sizeEl) {
      data.size = sizeEl.textContent.trim().replace(/^Size/i, '').trim();
    } else {
      data.size = null;
    }

    // Condition — data-testid="item-attributes-status" contains "ConditionGood"
    const conditionEl = document.querySelector('[data-testid="item-attributes-status"]');
    let rawCondition = conditionEl?.textContent?.trim().replace(/^Condition/i, '').trim() ?? null;
    data.condition = mapCondition(rawCondition);

    // Category — Vinted's first brand link contains "Brand Category" (e.g. "Per Una Off-the-shoulder tops").
    // Extract category by removing the brand name from this combined text.
    const allBrandLinks = document.querySelectorAll('a[href*="/brand"]');
    if (allBrandLinks.length > 0 && data.brand) {
      const firstBrandText = allBrandLinks[0].textContent.trim();
      const category = firstBrandText.replace(data.brand, '').trim();
      data.category = category || null;
    } else {
      data.category = null;
    }

    // Description — itemprop="description" is reliable
    const descEl = document.querySelector('[itemprop="description"]');
    data.description = descEl?.textContent?.trim() ?? null;

    // Photos — Vinted uses data-testid="item-photo-N--img" pattern
    const photoUrls = new Set();
    for (let i = 1; i <= 20; i++) {
      const img = document.querySelector(`[data-testid="item-photo-${i}--img"]`);
      if (!img) break;
      const src = img.src || img.getAttribute("src");
      if (src && src.startsWith("http")) {
        // Keep the full URL (includes size params for CDN)
        photoUrls.add(src);
      }
    }
    // Fallback: any img inside elements with item-photo test IDs
    if (photoUrls.size === 0) {
      document.querySelectorAll('[data-testid^="item-photo"] img').forEach(img => {
        const src = img.src || img.getAttribute("src");
        if (src && src.startsWith("http") && !src.includes("favicon")) {
          photoUrls.add(src);
        }
      });
    }
    data.photoUrls = [...photoUrls];

    return data;
  }

  // Search detail rows (key-value pairs) for a specific label
  function findDetailValue(labels) {
    // Look for detail list items (Vinted uses various patterns)
    const detailContainers = document.querySelectorAll(
      '.details-list__item, [class*="ItemDetail"], [data-testid*="item-details"]',
    );
    for (const container of detailContainers) {
      const text = container.textContent || "";
      for (const label of labels) {
        if (text.toLowerCase().includes(label.toLowerCase())) {
          // The value is usually in a sibling or child element
          const valueEl = container.querySelector(
            ".details-list__item-value, [class*='value'], a, span:last-child",
          );
          if (valueEl) return valueEl.textContent.trim();
          // Fallback: remove the label from the text
          return text.replace(new RegExp(label + ":?\\s*", "i"), "").trim();
        }
      }
    }
    return null;
  }

  // Map Vinted condition strings to ReList enum values
  function mapCondition(raw) {
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (lower.includes("new with tag") || lower.includes("new with label"))
      return "new";
    if (lower.includes("new without") || lower.includes("new")) return "new";
    if (lower.includes("very good") || lower.includes("like new"))
      return "like_new";
    if (lower.includes("good")) return "good";
    if (lower.includes("satisfactory") || lower.includes("fair")) return "fair";
    return "good"; // Default fallback
  }

  // ---------------------------------------------------------------------------
  // Context-aware floating button — adapts based on inventory/watch status
  // ---------------------------------------------------------------------------
  const ICON_SEND = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
  const ICON_UPDATE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
  const ICON_WATCH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const ICON_SPIN = `<svg class="relist-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>`;
  const ICON_ERROR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  const ICON_CHEVRON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

  let currentMode = null; // "add" | "update" | "watching"
  let currentCheckResult = null;
  let dropdownOpen = false;

  function injectSendButton() {
    if (sendButtonInjected) return;
    if (!isItemDetailPage()) return;
    sendButtonInjected = true;

    // Create container
    const container = document.createElement("div");
    container.id = "relist-btn-container";

    // Main button
    const btn = document.createElement("button");
    btn.id = "relist-send-btn";
    btn.className = "relist-btn-checking";
    btn.innerHTML = `${ICON_SPIN} <span>Checking...</span>`;

    // Dropdown toggle
    const toggle = document.createElement("button");
    toggle.id = "relist-dropdown-toggle";
    toggle.className = "relist-btn-checking";
    toggle.innerHTML = ICON_CHEVRON;
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    // Dropdown menu
    const dropdown = document.createElement("div");
    dropdown.id = "relist-dropdown";
    dropdown.className = "relist-dropdown-hidden";

    container.appendChild(btn);
    container.appendChild(toggle);
    container.appendChild(dropdown);
    document.body.appendChild(container);

    // Close dropdown on outside click
    document.addEventListener("click", () => {
      if (dropdownOpen) toggleDropdown();
    });

    // Check inventory status
    chrome.runtime.sendMessage(
      { type: "CHECK_INVENTORY", vintedUrl: window.location.href },
      (result) => {
        if (chrome.runtime.lastError || !result) {
          setButtonMode("add");
          return;
        }
        currentCheckResult = result;
        if (result.inInventory) {
          setButtonMode("update");
        } else if (result.watched) {
          setButtonMode("watching");
        } else {
          setButtonMode("add");
        }
      },
    );
  }

  function setButtonMode(mode) {
    currentMode = mode;
    const btn = document.getElementById("relist-send-btn");
    const toggle = document.getElementById("relist-dropdown-toggle");
    const dropdown = document.getElementById("relist-dropdown");
    if (!btn || !toggle || !dropdown) return;

    // Reset classes
    btn.className = "";
    toggle.className = "";
    btn.disabled = false;

    if (mode === "add") {
      btn.className = "relist-btn-add";
      toggle.className = "relist-btn-add";
      btn.innerHTML = `${ICON_SEND} <span>Add to ReList</span>`;
      btn.onclick = handleAddToInventory;
      toggle.style.display = "";
      dropdown.innerHTML = `
        <button class="relist-dropdown-item" data-action="watch">
          ${ICON_WATCH} <span>Watch for Flip</span>
        </button>`;
      dropdown.querySelectorAll("[data-action]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleDropdown();
          if (el.dataset.action === "watch") handleWatchItem();
        });
      });
    } else if (mode === "update") {
      btn.className = "relist-btn-update";
      toggle.className = "relist-btn-update";
      btn.innerHTML = `${ICON_UPDATE} <span>Update in ReList</span>`;
      btn.onclick = handleAddToInventory; // Same endpoint, dedup handles update
      toggle.style.display = "none";
      dropdown.innerHTML = "";
    } else if (mode === "watching") {
      btn.className = "relist-btn-watching";
      toggle.className = "relist-btn-watching";
      btn.innerHTML = `${ICON_WATCH} <span>Watching</span>`;
      btn.onclick = null; // Main button is informational
      toggle.style.display = "";
      dropdown.innerHTML = `
        <button class="relist-dropdown-item" data-action="convert">
          ${ICON_SEND} <span>Mark as Bought</span>
        </button>
        <button class="relist-dropdown-item" data-action="pass">
          ${ICON_ERROR} <span>Pass</span>
        </button>`;
      dropdown.querySelectorAll("[data-action]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleDropdown();
          if (el.dataset.action === "convert") handleConvertWatchItem();
          if (el.dataset.action === "pass") handlePassWatchItem();
        });
      });
    }
  }

  function toggleDropdown() {
    const dropdown = document.getElementById("relist-dropdown");
    if (!dropdown) return;
    dropdownOpen = !dropdownOpen;
    dropdown.className = dropdownOpen ? "relist-dropdown-visible" : "relist-dropdown-hidden";
  }

  function removeSendButton() {
    const existing = document.getElementById("relist-btn-container");
    if (existing) {
      existing.remove();
      sendButtonInjected = false;
      currentMode = null;
      currentCheckResult = null;
      dropdownOpen = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------
  async function handleAddToInventory() {
    const btn = document.getElementById("relist-send-btn");
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    const prevClass = btn.className;
    btn.className = "relist-send-loading";
    btn.innerHTML = `${ICON_SPIN} <span>Sending...</span>`;

    try {
      const data = extractItemDetailData();
      if (!data.title) throw new Error("Could not extract item title");

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "SEND_TO_RELIST", data }, (resp) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (resp?.error) reject(new Error(resp.error));
          else resolve(resp);
        });
      });

      // Success
      btn.className = "relist-send-success";
      btn.innerHTML = `${ICON_CHECK} <span>${response?.updated ? "Updated!" : "Added!"}</span>`;

      // Store in recent items
      chrome.storage.local.get(["recentSentItems"], (result) => {
        const recent = result.recentSentItems || [];
        recent.unshift({ title: data.title, vintedUrl: data.vintedUrl, timestamp: Date.now() });
        chrome.storage.local.set({ recentSentItems: recent.slice(0, 5) });
      });

      // Switch to update mode after 2s
      setTimeout(() => setButtonMode("update"), 2000);
    } catch {
      btn.className = "relist-send-error";
      btn.innerHTML = `${ICON_ERROR} <span>Failed — Retry</span>`;
      btn.disabled = false;
      btn.onclick = handleAddToInventory;
      setTimeout(() => { if (currentMode !== "update") setButtonMode(prevClass.includes("update") ? "update" : "add"); }, 4000);
    }
  }

  async function handleWatchItem() {
    const btn = document.getElementById("relist-send-btn");
    if (!btn) return;
    btn.disabled = true;
    btn.className = "relist-send-loading";
    btn.innerHTML = `${ICON_SPIN} <span>Saving...</span>`;

    try {
      const data = extractItemDetailData();
      if (!data.title) throw new Error("Could not extract item title");

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "WATCH_ITEM", data }, (resp) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (resp?.error) reject(new Error(resp.error));
          else resolve(resp);
        });
      });

      currentCheckResult = { watched: true, watchItemId: response?.watchItem?.id };

      btn.className = "relist-send-success";
      btn.innerHTML = `${ICON_CHECK} <span>Watching!</span>`;
      setTimeout(() => setButtonMode("watching"), 2000);
    } catch {
      btn.className = "relist-send-error";
      btn.innerHTML = `${ICON_ERROR} <span>Failed</span>`;
      setTimeout(() => setButtonMode("add"), 3000);
    }
  }

  async function handleConvertWatchItem() {
    const watchItemId = currentCheckResult?.watchItemId;
    if (!watchItemId) return;

    const buyPrice = prompt("What did you pay for this item? (£)");
    if (buyPrice === null) return; // Cancelled

    const btn = document.getElementById("relist-send-btn");
    if (!btn) return;
    btn.disabled = true;
    btn.className = "relist-send-loading";
    btn.innerHTML = `${ICON_SPIN} <span>Converting...</span>`;

    try {
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "CONVERT_WATCH_ITEM", watchItemId, buyPrice: parseFloat(buyPrice) || 0 },
          (resp) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (resp?.error) reject(new Error(resp.error));
            else resolve(resp);
          },
        );
      });

      btn.className = "relist-send-success";
      btn.innerHTML = `${ICON_CHECK} <span>Added to inventory!</span>`;
      setTimeout(() => setButtonMode("update"), 2000);
    } catch {
      btn.className = "relist-send-error";
      btn.innerHTML = `${ICON_ERROR} <span>Failed</span>`;
      setTimeout(() => setButtonMode("watching"), 3000);
    }
  }

  async function handlePassWatchItem() {
    const watchItemId = currentCheckResult?.watchItemId;
    if (!watchItemId) return;

    const btn = document.getElementById("relist-send-btn");
    if (!btn) return;
    btn.disabled = true;

    try {
      const { apiBase } = await new Promise((resolve) =>
        chrome.storage.sync.get(["apiBase"], resolve),
      );
      const base = apiBase || "https://relist.warmwetcircles.com";

      await fetch(`${base}/api/watch-items/${watchItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "passed" }),
      });

      btn.className = "relist-send-success";
      btn.innerHTML = `${ICON_CHECK} <span>Passed</span>`;
      setTimeout(() => setButtonMode("add"), 2000);
    } catch {
      setButtonMode("watching");
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  // Initial scrape
  extractListings();
  loadStats();

  // Check if we're on an item detail page and inject button
  if (isItemDetailPage()) {
    injectSendButton();
  }

  // Re-scrape periodically (handles infinite scroll)
  setInterval(extractListings, SCRAPE_INTERVAL);

  // Flush batch periodically
  setInterval(flushBatch, BATCH_INTERVAL);

  // Also flush on page unload
  window.addEventListener("beforeunload", flushBatch);

  // Track URL changes for SPA navigation — use both polling and MutationObserver
  // because Vinted is an SPA and neither method alone is reliable
  let lastUrl = window.location.href;

  function checkNavigation() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (isItemDetailPage()) {
        injectSendButton();
      } else {
        removeSendButton();
      }
    }
  }

  // Poll for URL changes every 500ms — catches SPA navigations that
  // don't trigger DOM mutations (e.g. History API pushState)
  setInterval(checkNavigation, 500);

  // Also watch DOM mutations as a faster fallback
  const observer = new MutationObserver(() => {
    extractListings();
    checkNavigation();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
