// Monitor-related JavaScript functionality

window.Craft = window.Craft || {};
Craft.Upsnap = Craft.Upsnap || {};

Craft.Upsnap.Monitor = {
  init() {
    this.registerAddMonitor();
    this.loadMonitorsDropdown();
  },

  // =============================
  // Fetch monitors for dropdown
  // =============================
  async loadMonitorsDropdown() {
    const dropdown = document.getElementById("monitorDropdown");
    const hiddenIdField = document.getElementById("monitorId");
    if (!dropdown) return;

    const savedValue = window?.Upsnap?.settings?.monitoringUrl || '';
    const apiKey = window?.Upsnap?.settings?.apiKey || '';

    // 🔒 If API key is missing → disable dropdown and show saved URL only
    if (!apiKey) {
      const addMonitorButton = document.getElementById("add-monitor-btn");
      if (addMonitorButton) {
        addMonitorButton.classList.add('disabled');
        addMonitorButton.disabled = true;
      }
      dropdown.innerHTML = '';

      if (savedValue) {
        const opt = document.createElement("option");
        opt.value = savedValue;
        opt.textContent = savedValue;
        dropdown.appendChild(opt);
      } else {
        dropdown.innerHTML = `<option value="">No API key — monitors unavailable</option>`;
      }

      dropdown.classList.add('disabled-field');
      return;
    }

    try {
      const response = await fetch("/actions/upsnap/monitors/list", {
        headers: { "X-CSRF-Token": Craft.csrfTokenValue },
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.data || !Array.isArray(data.data.monitors)) {
        throw new Error(data?.message || data?.error || "Failed to load monitors.");
      }

      const monitors = data.data.monitors;
      dropdown.innerHTML = "";

      if (monitors.length === 0) {
        dropdown.innerHTML = `<option value="">No monitors available</option>`;
        return;
      }

      monitors.forEach((monitor) => {
        const id = monitor?.id || "";
        const url = monitor?.config?.meta?.url || "";
        const name = monitor?.name || url || "Unnamed Monitor";

        if (url) {
          const opt = document.createElement("option");
          opt.dataset.id = id;
          opt.value = url;
          opt.textContent = `${name} (${url})`;
          if (url === savedValue) opt.selected = true; // select if matches injected value
          dropdown.appendChild(opt);
        }
      });

      // Update hidden field based on initially selected option
      const selectedOption = dropdown.selectedOptions[0];
      if (selectedOption && hiddenIdField) {
        hiddenIdField.value = selectedOption.dataset.id || "";
      }

      // When user changes dropdown, update hidden field
      dropdown.addEventListener("change", (e) => {
        const selected = e.target.selectedOptions[0];
        hiddenIdField.value = selected?.dataset?.id || "";
      });

      // optional: if nothing selected and savedValue exists but wasn't matched (maybe URL normalized),
      // try a loose match (strip trailing slash)
      if (!dropdown.value && savedValue) {
        const normalize = s => (s || "").replace(/\/$/, '');
        const optToSelect = Array.from(dropdown.options).find(o => normalize(o.value) === normalize(savedValue));
        if (optToSelect) optToSelect.selected = true;
      }

    } catch (error) {
      console.error("Monitor list fetch failed:", error);
      dropdown.innerHTML = `<option value="">Failed to load monitors</option>`;
      Craft.Upsnap.Monitor.notify(error.message, "error");
    }
  },

  registerAddMonitor() {
    const modal = document.getElementById("add-monitor-modal");
    const openBtn = document.getElementById("add-monitor-btn");
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector(".modal__close");
    const cancelBtn = document.getElementById("cancel-monitor-btn");
    const saveBtn = document.getElementById("save-monitor-btn");

    const showModal = () => modal.classList.remove("hidden");
    const hideModal = () => modal.classList.add("hidden");

    openBtn.addEventListener("click", showModal);
    closeBtn?.addEventListener("click", hideModal);
    cancelBtn?.addEventListener("click", hideModal);

    saveBtn?.addEventListener("click", async () => {
      const nameField = document.getElementById("monitorName");
      const urlField = document.getElementById("monitorUrl");
      const name = nameField?.value.trim();
      let url = urlField?.value.trim();

      if (!name || !url) {
        Craft.Upsnap.Monitor.notify("Please fill out all fields.", "error");
        return;
      }

      // 🔍 Validate & normalize URL before sending
      const valid = Craft.Upsnap.Monitor.isValidUrl(url);
      if (!valid) {
        Craft.Upsnap.Monitor.notify(
          "Please enter a valid domain or URL (e.g. https://example.com or example.com).",
          "error"
        );
        return;
      }

      // Normalize the URL before sending
      url = Craft.Upsnap.Monitor.normalizeUrl(url);
      urlField.value = url;

      try {
        const response = await fetch("/actions/upsnap/monitors/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": Craft.csrfTokenValue,
          },
          body: JSON.stringify({ name, url }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const message =
            data?.message || data?.error || "Failed to add monitor.";
          throw new Error(message);
        }

        Craft.Upsnap.Monitor.notify(
          data?.message || "Monitor added successfully.",
          "success"
        );
        this.loadMonitorsDropdown();
        hideModal();

      } catch (error) {
        console.error("Monitor create error:", error);
        Craft.Upsnap.Monitor.notify(error.message, "error");
      }
    });
  },

  // ----------------------------
  // URL Validation Helpers
  // ----------------------------

  isValidUrl(url) {
    if (!url) return false;
    const pattern =
      /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})([^\s]*)?$/i;
    return pattern.test(url.trim());
  },

  normalizeUrl(url) {
    if (!url) return "";
    url = url.trim();

    if (/^https?:\/\//i.test(url)) {
      // already full URL
      return url;
    } else if (/^www\./i.test(url)) {
      // add protocol
      return `https://${url}`;
    } else {
      // assume bare domain
      return `https://www.${url}`;
    }
  },

  // ----------------------------
  // Utility: Notifications
  // ----------------------------

  notify(message, type = "success") {
    if (Craft?.cp && Craft.cp.displayNotice) {
      if (type === "error") Craft.cp.displayError(message);
      else Craft.cp.displayNotice(message);
    } else {
      alert(message);
    }
  },
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  Craft.Upsnap.Monitor.init();
});
