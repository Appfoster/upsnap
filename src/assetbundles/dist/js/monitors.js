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
      this.populateSavedMonitorDropdown(dropdown, savedValue, {
        disable: true,
        labelSuffix: "",
      });
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

      let savedInList = false; // flag to check if the savedValue is in the fetched monitors list

      if (monitors.length === 0) {
        dropdown.innerHTML = `<option value="">No monitors available</option>`;
        this.populateSavedMonitorDropdown(dropdown, savedValue, {
          disable: true,
          labelSuffix: "(Default)",
        });

        this.disableTab('a[href="#healthchecks-tab"]');
        this.disableTab('a[href="#notification-channels-tab"]');

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
          if (url === savedValue) {
            opt.selected = true; // select if matches injected value
            savedInList = true;
          }

          dropdown.appendChild(opt);
        }
      });

      //  If savedValue not in fetched list, still show it as an option
      if (savedValue && !savedInList) {
        const customOpt = document.createElement("option");
        customOpt.value = savedValue;
        customOpt.textContent = `${savedValue} (Default)`;
        customOpt.selected = true;
        dropdown.appendChild(customOpt);
        this.disableTab('a[href="#healthchecks-tab"]'); // disable healthchecks tab
        this.disableTab('a[href="#notification-channels-tab"]');

      } else {
        this.enableTab('a[href="#healthchecks-tab"]');
        this.enableTab('a[href="#notification-channels-tab"]');
        dropdown.classList.remove("disabled-field");
      }


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
        if (optToSelect) {
          optToSelect.selected = true;
          enableTab('a[href="#healthchecks-tab"]');
        }
      }

    } catch (error) {
      // Keep existing saved value logic
      this.populateSavedMonitorDropdown(dropdown, savedValue, {
        disable: true,
        labelSuffix: "(Default)",
      });

      this.disableTab('a[href="#healthchecks-tab"]');
      this.disableTab('a[href="#notification-channels-tab"]');



      Craft.Upsnap.Monitor.notify(error.message, "error");
    }
  },

  /**
   * Populate a dropdown with the saved monitor value, and disable it if desired.
   *
   * @param {HTMLElement} dropdown - The dropdown element to populate.
   * @param {string} savedValue - The saved monitor value to populate the dropdown with.
   * @param {Object} [options] - Optional configuration options.
   * @param {boolean} [options.disable=true] - Whether to disable the dropdown.
   * @param {string} [options.labelSuffix="(Default)"] - The suffix to append to the saved value in the dropdown.
   */
  populateSavedMonitorDropdown(dropdown, savedValue, options = {}) {
    const { disable = true, labelSuffix = "(Default)" } = options;

    dropdown.innerHTML = "";

    if (savedValue) {
      const opt = document.createElement("option");
      opt.value = savedValue;
      opt.textContent = `${savedValue} ${labelSuffix}`;
      opt.selected = true;
      dropdown.appendChild(opt);
    } else {
      dropdown.innerHTML = `<option value="">No monitors available</option>`;
    }

    if (disable) {
      dropdown.classList.add("disabled-field");
    }
  },

  /**
   * Disable a tab link by adding a disabled visual style and blocking click navigation.
   *
   * @param {string} tabSelector - The CSS selector for the tab link to disable.
   */
  disableTab(tabSelector) {
    const tabLink = document.querySelector(tabSelector);
    if (!tabLink) return;

    // Add disabled visual style
    tabLink.classList.add("disabled-tab");

    // Block click navigation
    tabLink.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    // Optional: visually indicate disabled state
    tabLink.style.pointerEvents = "none";
    tabLink.style.opacity = "0.5";
    tabLink.style.cursor = "not-allowed";

    const parentTabList = tabLink.closest('[role="tablist"]');
    if (parentTabList) {
      parentTabList.style.cursor = "not-allowed";
    }
  },

  /**
   * Enable a tab link by removing the disabled visual style and unblocking click navigation.
   *
   * @param {string} tabSelector - The CSS selector for the tab link to enable.
   */
  enableTab(tabSelector) {
    const tabLink = document.querySelector(tabSelector);
    if (!tabLink) return;

    tabLink.classList.remove("disabled-tab");
    tabLink.style.pointerEvents = "";
    tabLink.style.opacity = "";
    tabLink.style.cursor = "";

    const parentTabList = tabLink.closest('[role="tablist"]');
    if (parentTabList) {
      parentTabList.style.cursor = "pointer";
    }
  },

  registerAddMonitor() {
    const modal = document.getElementById("add-monitor-modal");
    const openBtn = document.getElementById("add-monitor-btn");
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector(".upsnap-modal__close");
    const cancelBtn = document.getElementById("cancel-monitor-btn");
    const saveBtn = document.getElementById("save-monitor-btn");
    const nameField = document.getElementById("monitorName");
    const urlField = document.getElementById("monitorUrl");
    const resetForm = () => {
      if (nameField) nameField.value = "";
      if (urlField) urlField.value = "";
    };

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

      // Disable Save button to prevent multiple clicks
      saveBtn.disabled = true;
      saveBtn.classList.add('disabled')
      saveBtn.textContent = "Saving...";


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

        resetForm(); // reset the form
        this.loadMonitorsDropdown();
        hideModal();

      } catch (error) {
        const rawMessage = error?.message || "Something went wrong.";
        const message = rawMessage.charAt(0).toUpperCase() + rawMessage.slice(1);
        Craft.Upsnap.Monitor.notify(message, "error");
      } finally {
        // Re-enable button after API completes
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
        saveBtn.classList.remove('disabled')
      }
    });
  },

  // ----------------------------
  // URL Validation Helpers
  // ----------------------------

  /**
   * Checks if a given URL is valid.
   *
   * @param {string} url - The URL to check.
   * @returns {boolean} - True if the URL is valid, false otherwise.
   *
   * A valid URL is expected to have the following format:
   * - Optional protocol (http or https)
   * - Optional "www" prefix
   * - At least one alphanumeric character as the domain
   * - At least two alphanumeric characters as the top-level domain
   * - Optional path and query string
   */
  isValidUrl(url) {
    if (!url) return false;
    const pattern =
      /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})([^\s]*)?$/i;
    return pattern.test(url.trim());
  },

  /**
   * Normalizes a given URL by appending "https://" if it does not already have a protocol.
   * If the URL starts with "www", it will append "https://" without adding "www".
   * If the URL is already a full URL, it will be returned as is.
   *
   * @param {string} url - The URL to normalize.
   * @returns {string} - The normalized URL.
   */
  normalizeUrl(url) {
    if (!url) return "";
    url = url.trim();

    if (/^https?:\/\//i.test(url)) {
      // already full URL
      return url;
    } else if (/^www\./i.test(url)) {
      // add protocol without appending "www"
      return `https://${url}`;
    } else {
      // assume bare domain without "www"
      return `https://${url}`;
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
