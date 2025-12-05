// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize-video",
    title: "Summarize with YT Summarizer",
    contexts: ["page", "link"],
    documentUrlPatterns: [
      "https://www.youtube.com/watch*",
      "https://youtu.be/*",
    ],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "summarize-video") {
    const url = info.linkUrl || info.pageUrl;

    if (!url) {
      return;
    }

    // Get settings
    const settings = await chrome.storage.sync.get(["apiUrl", "apiKey", "email"]);

    if (!settings.apiUrl || !settings.apiKey) {
      // Open options page if not configured
      chrome.runtime.openOptionsPage();
      return;
    }

    if (!settings.email) {
      // Open popup to get email
      chrome.action.openPopup();
      return;
    }

    // Show notification that we're processing
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "YT Summarizer",
      message: "Processing video...",
    });

    try {
      const response = await fetch(`${settings.apiUrl}/api/extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": settings.apiKey,
        },
        body: JSON.stringify({
          url,
          email: settings.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to summarize");
      }

      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "YT Summarizer",
        message: `Summary sent for "${data.title}"!`,
      });
    } catch (error) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "YT Summarizer Error",
        message: error.message || "Failed to summarize video",
      });
    }
  }
});
