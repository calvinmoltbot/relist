// ---------------------------------------------------------------------------
// ReList Popup — shows stats and toggle
// ---------------------------------------------------------------------------

const API_BASE = "https://relist.warmwetcircles.com";

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle");
  const todayCountEl = document.getElementById("today-count");
  const statusText = document.getElementById("status-text");
  const statusLine = document.getElementById("status-line");
  const dashboardLink = document.getElementById("dashboard-link");

  // Load state
  chrome.storage.local.get(["enabled", "apiBase"], (result) => {
    const enabled = result.enabled !== false;
    const base = result.apiBase || API_BASE;

    toggle.classList.toggle("active", enabled);
    statusText.textContent = enabled ? "Active" : "Paused";
    statusLine.textContent = enabled
      ? "Collecting data from Vinted"
      : "Data collection paused";
    statusLine.classList.toggle("active", enabled);

    dashboardLink.href = base;
  });

  // Get today's count
  chrome.runtime.sendMessage({ type: "GET_COUNT" }, (response) => {
    if (response?.count != null) {
      todayCountEl.textContent = response.count;
    }
  });

  // Toggle
  toggle.addEventListener("click", () => {
    const isActive = toggle.classList.toggle("active");
    chrome.storage.local.set({ enabled: isActive });

    statusText.textContent = isActive ? "Active" : "Paused";
    statusLine.textContent = isActive
      ? "Collecting data from Vinted"
      : "Data collection paused";
    statusLine.classList.toggle("active", isActive);
  });
});
