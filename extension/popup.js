document.addEventListener("DOMContentLoaded", async () => {
  const setupRequired = document.getElementById("setup-required");
  const mainContent = document.getElementById("main-content");
  const notYoutube = document.getElementById("not-youtube");
  const urlInput = document.getElementById("url");
  const emailInput = document.getElementById("email");
  const summarizeBtn = document.getElementById("summarize");
  const btnText = document.getElementById("btn-text");
  const btnLoading = document.getElementById("btn-loading");
  const status = document.getElementById("status");
  const openOptions = document.getElementById("open-options");
  const settingsLink = document.getElementById("settings-link");

  // Load settings
  const settings = await chrome.storage.sync.get(["apiUrl", "apiKey", "email"]);

  // Check if settings are configured
  if (!settings.apiUrl || !settings.apiKey) {
    setupRequired.classList.remove("hidden");
    return;
  }

  // Set saved email
  if (settings.email) {
    emailInput.value = settings.email;
  }

  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab?.url || "";

  // Check if it's a YouTube URL
  const isYouTube =
    currentUrl.includes("youtube.com/watch") || currentUrl.includes("youtu.be/");

  if (!isYouTube) {
    notYoutube.classList.remove("hidden");
    return;
  }

  // Show main content and set URL
  mainContent.classList.remove("hidden");
  urlInput.value = currentUrl;

  // Handle summarize button click
  summarizeBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();

    if (!email) {
      showStatus("Please enter an email address", "error");
      return;
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showStatus("Please enter a valid email address", "error");
      return;
    }

    // Save email for next time
    await chrome.storage.sync.set({ email });

    // Disable button and show loading
    summarizeBtn.disabled = true;
    btnText.classList.add("hidden");
    btnLoading.classList.remove("hidden");
    status.classList.add("hidden");

    try {
      const response = await fetch(`${settings.apiUrl}/api/extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": settings.apiKey,
        },
        body: JSON.stringify({
          url: currentUrl,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to summarize video");
      }

      showStatus(`Summary sent for "${data.title}"!`, "success");
    } catch (error) {
      showStatus(error.message || "An error occurred", "error");
    } finally {
      summarizeBtn.disabled = false;
      btnText.classList.remove("hidden");
      btnLoading.classList.add("hidden");
    }
  });

  // Open options page
  openOptions.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  settingsLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove("hidden");
  }
});
