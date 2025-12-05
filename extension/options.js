document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("settings-form");
  const apiUrlInput = document.getElementById("api-url");
  const apiKeyInput = document.getElementById("api-key");
  const emailInput = document.getElementById("default-email");
  const status = document.getElementById("status");

  // Load existing settings
  const settings = await chrome.storage.sync.get(["apiUrl", "apiKey", "email"]);

  if (settings.apiUrl) {
    apiUrlInput.value = settings.apiUrl;
  }
  if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey;
  }
  if (settings.email) {
    emailInput.value = settings.email;
  }

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const apiUrl = apiUrlInput.value.trim().replace(/\/$/, ""); // Remove trailing slash
    const apiKey = apiKeyInput.value.trim();
    const email = emailInput.value.trim();

    if (!apiUrl || !apiKey) {
      showStatus("Please fill in API URL and API Key", "error");
      return;
    }

    try {
      // Test the connection
      const testResponse = await fetch(`${apiUrl}/api/extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ url: "", email: "" }),
      });

      // We expect a 400 error (missing URL), not 401 (unauthorized)
      if (testResponse.status === 401) {
        showStatus("Invalid API key", "error");
        return;
      }

      // Save settings
      await chrome.storage.sync.set({
        apiUrl,
        apiKey,
        email,
      });

      showStatus("Settings saved successfully!", "success");
    } catch (error) {
      showStatus(`Connection failed: ${error.message}`, "error");
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove("hidden");

    if (type === "success") {
      setTimeout(() => {
        status.classList.add("hidden");
      }, 3000);
    }
  }
});
