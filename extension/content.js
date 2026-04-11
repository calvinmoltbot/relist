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

  // Inject floating "Send to ReList" button on item detail pages
  function injectSendButton() {
    if (sendButtonInjected) return;
    if (!isItemDetailPage()) return;

    sendButtonInjected = true;

    const btn = document.createElement("button");
    btn.id = "relist-send-btn";
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
      <span>Send to ReList</span>
    `;
    btn.addEventListener("click", handleSendToReList);
    document.body.appendChild(btn);
  }

  // Remove the button when navigating away from item detail pages
  function removeSendButton() {
    const existing = document.getElementById("relist-send-btn");
    if (existing) {
      existing.remove();
      sendButtonInjected = false;
    }
  }

  // Handle the send action
  async function handleSendToReList() {
    const btn = document.getElementById("relist-send-btn");
    if (!btn) return;

    // Loading state
    btn.classList.add("relist-send-loading");
    btn.innerHTML = `
      <svg class="relist-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle>
      </svg>
      <span>Sending...</span>
    `;
    btn.disabled = true;

    try {
      const data = extractItemDetailData();

      if (!data.title) {
        throw new Error("Could not extract item title from page");
      }

      // Send to background script which will forward to the API
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "SEND_TO_RELIST", data },
          (resp) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (resp?.error) {
              reject(new Error(resp.error));
            } else {
              resolve(resp);
            }
          },
        );
      });

      // Success state
      btn.classList.remove("relist-send-loading");
      btn.classList.add("relist-send-success");
      const wasUpdated = response?.updated === true;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>${wasUpdated ? "Updated!" : "Sent!"}</span>
      `;

      // Store in recent items
      chrome.storage.local.get(["recentSentItems"], (result) => {
        const recent = result.recentSentItems || [];
        recent.unshift({
          title: data.title,
          vintedUrl: data.vintedUrl,
          timestamp: Date.now(),
        });
        // Keep only last 5
        chrome.storage.local.set({
          recentSentItems: recent.slice(0, 5),
        });
      });

      // Reset after 3 seconds
      setTimeout(() => {
        if (btn) {
          btn.classList.remove("relist-send-success");
          btn.disabled = false;
          btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span>Send to ReList</span>
          `;
        }
      }, 3000);
    } catch (error) {
      // Error state
      btn.classList.remove("relist-send-loading");
      btn.classList.add("relist-send-error");
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <span>Failed — Retry</span>
      `;
      btn.disabled = false;

      // Reset error state after 5 seconds
      setTimeout(() => {
        if (btn && btn.classList.contains("relist-send-error")) {
          btn.classList.remove("relist-send-error");
          btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span>Send to ReList</span>
          `;
        }
      }, 5000);
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
