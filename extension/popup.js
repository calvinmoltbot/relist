// ---------------------------------------------------------------------------
// ReList Popup — shows stats, toggle, send button, recent items, settings
// ---------------------------------------------------------------------------

const API_BASE = "https://relist.warmwetcircles.com";

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle");
  const todayCountEl = document.getElementById("today-count");
  const statusText = document.getElementById("status-text");
  const statusLine = document.getElementById("status-line");
  const dashboardLink = document.getElementById("dashboard-link");
  const sendBtn = document.getElementById("send-btn");
  const recentTitle = document.getElementById("recent-title");
  const recentList = document.getElementById("recent-list");
  const apiUrlInput = document.getElementById("api-url");
  const saveUrlBtn = document.getElementById("save-url");

  // ---------------------------------------------------------------------------
  // Load state
  // ---------------------------------------------------------------------------
  chrome.storage.local.get(["enabled"], (result) => {
    const enabled = result.enabled !== false;
    toggle.classList.toggle("active", enabled);
    statusText.textContent = enabled ? "Active" : "Paused";
    statusLine.textContent = enabled
      ? "Collecting data from Vinted"
      : "Data collection paused";
    statusLine.classList.toggle("active", enabled);
  });

  // Load API URL from sync storage
  chrome.storage.sync.get(["apiBase"], (result) => {
    const base = result.apiBase || API_BASE;
    apiUrlInput.value = base;
    dashboardLink.href = base;
  });

  // Get today's count
  chrome.runtime.sendMessage({ type: "GET_COUNT" }, (response) => {
    if (response?.count != null) {
      todayCountEl.textContent = response.count;
    }
  });

  // ---------------------------------------------------------------------------
  // Check if current tab is a Vinted item page — show Send button if so
  // ---------------------------------------------------------------------------
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url) {
      const url = tabs[0].url;
      const isItemPage = /vinted\.co\.uk\/items\/\d+-/.test(url);
      if (isItemPage) {
        sendBtn.classList.add("visible");
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Send to ReList from popup
  // ---------------------------------------------------------------------------
  sendBtn.addEventListener("click", () => {
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        showSendError("No active tab");
        return;
      }

      // Execute content script extraction in the active tab
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: () => {
            // Extract item data using validated Vinted DOM selectors
            function mapCondition(raw) {
              if (!raw) return null;
              const lower = raw.toLowerCase();
              if (lower.includes("new with tag") || lower.includes("new with label")) return "new";
              if (lower.includes("new without") || lower.includes("new")) return "new";
              if (lower.includes("very good") || lower.includes("like new")) return "like_new";
              if (lower.includes("good")) return "good";
              if (lower.includes("satisfactory") || lower.includes("fair")) return "fair";
              return "good";
            }

            const data = {};
            const idMatch = window.location.pathname.match(/\/items\/(\d+)/);
            data.vintedId = idMatch ? idMatch[1] : null;
            data.vintedUrl = window.location.href;

            // Title
            data.title = document.querySelector("h1")?.textContent?.trim() ?? null;

            // Price
            const priceEl = document.querySelector('[data-testid="item-price"]');
            if (priceEl) {
              const priceMatch = priceEl.textContent.trim().match(/[\d,.]+/);
              data.price = priceMatch ? parseFloat(priceMatch[0].replace(",", "")) : null;
            }

            // Brand — from summary plugin link
            const summaryPlugin = document.querySelector('[data-testid="item-page-summary-plugin"]');
            const brandLink = summaryPlugin?.querySelector('a[href*="/brand"]');
            data.brand = brandLink ? brandLink.textContent.trim() : null;

            // Size — strip "Size" prefix
            const sizeEl = document.querySelector('[data-testid="item-attributes-size"]');
            data.size = sizeEl ? sizeEl.textContent.trim().replace(/^Size/i, '').trim() : null;

            // Condition — strip "Condition" prefix
            const condEl = document.querySelector('[data-testid="item-attributes-status"]');
            const rawCond = condEl?.textContent?.trim().replace(/^Condition/i, '').trim() ?? null;
            data.condition = mapCondition(rawCond);

            // Category — from first brand link text minus brand name
            const allBrandLinks = document.querySelectorAll('a[href*="/brand"]');
            if (allBrandLinks.length > 0 && data.brand) {
              const category = allBrandLinks[0].textContent.trim().replace(data.brand, '').trim();
              data.category = category || null;
            } else {
              data.category = null;
            }

            // Description
            data.description = document.querySelector('[itemprop="description"]')?.textContent?.trim() ?? null;

            // Photos — item-photo-N--img pattern (only actual product photos)
            const photoUrls = [];
            for (let i = 1; i <= 20; i++) {
              const img = document.querySelector(`[data-testid="item-photo-${i}--img"]`);
              if (!img) break;
              const src = img.src || img.getAttribute("src");
              if (src && src.startsWith("http")) {
                photoUrls.push(src);
              }
            }
            data.photoUrls = photoUrls;

            return data;
          },
        },
        (results) => {
          if (chrome.runtime.lastError) {
            showSendError(chrome.runtime.lastError.message);
            return;
          }

          const data = results?.[0]?.result;
          if (!data || !data.title) {
            showSendError("Could not extract item data");
            return;
          }

          // Send via background worker
          chrome.runtime.sendMessage(
            { type: "SEND_TO_RELIST", data },
            (response) => {
              if (chrome.runtime.lastError) {
                showSendError(chrome.runtime.lastError.message);
                return;
              }
              if (response?.error) {
                showSendError(response.error);
                return;
              }

              // Success
              sendBtn.classList.add("success");
              sendBtn.textContent = "Sent!";

              // Store recent item
              chrome.storage.local.get(["recentSentItems"], (result) => {
                const recent = result.recentSentItems || [];
                recent.unshift({
                  title: data.title,
                  vintedUrl: data.vintedUrl,
                  timestamp: Date.now(),
                });
                chrome.storage.local.set({
                  recentSentItems: recent.slice(0, 5),
                });
                renderRecentItems(recent.slice(0, 5));
              });

              setTimeout(() => {
                sendBtn.classList.remove("success");
                sendBtn.disabled = false;
                sendBtn.innerHTML = `
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Send to ReList
                `;
              }, 3000);
            },
          );
        },
      );
    });
  });

  function showSendError(msg) {
    sendBtn.classList.add("error");
    sendBtn.textContent = "Failed";
    sendBtn.disabled = false;
    setTimeout(() => {
      sendBtn.classList.remove("error");
      sendBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        Send to ReList
      `;
    }, 3000);
  }

  // ---------------------------------------------------------------------------
  // Recent sent items
  // ---------------------------------------------------------------------------
  chrome.storage.local.get(["recentSentItems"], (result) => {
    const recent = result.recentSentItems || [];
    if (recent.length > 0) {
      renderRecentItems(recent);
    }
  });

  function renderRecentItems(items) {
    if (!items || items.length === 0) return;

    recentTitle.style.display = "block";
    recentList.classList.add("visible");
    recentList.innerHTML = "";

    for (const item of items) {
      const el = document.createElement("a");
      el.className = "recent-item";
      el.href = item.vintedUrl || "#";
      el.target = "_blank";

      const titleSpan = document.createElement("span");
      titleSpan.className = "recent-item-title";
      titleSpan.textContent = item.title || "Untitled";

      const timeSpan = document.createElement("span");
      timeSpan.className = "recent-item-time";
      timeSpan.textContent = formatRelativeTime(item.timestamp);

      el.appendChild(titleSpan);
      el.appendChild(timeSpan);
      recentList.appendChild(el);
    }
  }

  function formatRelativeTime(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // ---------------------------------------------------------------------------
  // Toggle
  // ---------------------------------------------------------------------------
  toggle.addEventListener("click", () => {
    const isActive = toggle.classList.toggle("active");
    chrome.storage.local.set({ enabled: isActive });

    statusText.textContent = isActive ? "Active" : "Paused";
    statusLine.textContent = isActive
      ? "Collecting data from Vinted"
      : "Data collection paused";
    statusLine.classList.toggle("active", isActive);
  });

  // ---------------------------------------------------------------------------
  // Settings — API URL
  // ---------------------------------------------------------------------------
  saveUrlBtn.addEventListener("click", () => {
    const url = apiUrlInput.value.trim().replace(/\/+$/, "");
    if (!url) return;

    chrome.storage.sync.set({ apiBase: url }, () => {
      // Also update local storage for background worker compatibility
      chrome.storage.local.set({ apiBase: url });
      dashboardLink.href = url;

      saveUrlBtn.classList.add("saved");
      saveUrlBtn.textContent = "Saved";
      setTimeout(() => {
        saveUrlBtn.classList.remove("saved");
        saveUrlBtn.textContent = "Save";
      }, 2000);
    });
  });
});
