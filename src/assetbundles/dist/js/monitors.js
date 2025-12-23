// Monitor-related JavaScript functionality

window.Craft = window.Craft || {};
Craft.Upsnap = Craft.Upsnap || {};

Craft.Upsnap.capitalizeFirst = function (str) {
	if (!str || typeof str !== "string") return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
};

// Override Craft's notification methods to auto-capitalize messages
if (Craft && Craft.cp) {
	const originalDisplayNotice = Craft.cp.displayNotice;
	const originalDisplayError = Craft.cp.displayError;

	Craft.cp.displayNotice = function (message, ...args) {
		return originalDisplayNotice.call(
			this,
			Craft.Upsnap.capitalizeFirst(message),
			...args
		);
	};

	Craft.cp.displayError = function (message, ...args) {
		return originalDisplayError.call(
			this,
			Craft.Upsnap.capitalizeFirst(message),
			...args
		);
	};
}

Craft.Upsnap.Monitor = {
	init() {
		this.registerAddMonitor();
		this.loadMonitorsDropdown();
		this.registerDeleteMonitor();
		this.registerLoadIntegrations();
		this.registerAdvancedSettingsAccordion();
		this.registerSubmitHandler();
		this.initIntervalSlider();
	},

	initIntervalSlider() {
		const sliders = document.querySelectorAll("[data-interval-slider]");

		if (!sliders.length) return;

		const MIN_SECONDS = 30;
		const MAX_SECONDS = 86400;
		const PLAN_MIN_SECONDS = 300; // static for now

		const logMin = Math.log(MIN_SECONDS);
		const logMax = Math.log(MAX_SECONDS);

		const secondsToSlider = (seconds) => {
			const logV = Math.log(seconds);
			return ((logV - logMin) / (logMax - logMin)) * 100;
		};

		const sliderToSeconds = (percent) => {
			const logValue = logMin + (percent / 100) * (logMax - logMin);
			return Math.round(Math.exp(logValue));
		};

		const format = (s) => {
			if (s < 60) return `${s}s`;
			if (s < 3600) return `${Math.round(s / 60)}m`;
			if (s < 86400) return `${Math.round(s / 3600)}h`;
			return `${Math.round(s / 86400)}d`;
		};

		sliders.forEach((slider) => {
			const hiddenInputId = slider.dataset.targetInput;
			const labelId = slider.dataset.label;

			const hiddenInput = document.getElementById(hiddenInputId);
			const label = document.getElementById(labelId);

			if (!hiddenInput || !label) return;

			let currentSeconds = Math.max(
				Number(hiddenInput.value || PLAN_MIN_SECONDS),
				PLAN_MIN_SECONDS
			);

			slider.value = secondsToSlider(currentSeconds);
			hiddenInput.value = currentSeconds;
			label.textContent = format(currentSeconds);

			slider.style.background = `linear-gradient(
            to right,
            #3b82f6 0%,
            #3b82f6 ${slider.value}%,
            #e5e7eb ${slider.value}%,
            #e5e7eb 100%
        )`;

			slider.addEventListener("input", (e) => {
				let seconds = sliderToSeconds(Number(e.target.value));

				if (seconds < PLAN_MIN_SECONDS) {
					seconds = PLAN_MIN_SECONDS;
				}

				hiddenInput.value = seconds;
				label.textContent = format(seconds);

				slider.style.background = `linear-gradient(
                to right,
                #3b82f6 0%,
                #3b82f6 ${slider.value}%,
                #e5e7eb ${slider.value}%,
                #e5e7eb 100%
            )`;
			});

			// Position ticks relative to this slider
			slider
				.closest(".field")
				?.querySelectorAll(".upsnap-range-tick")
				.forEach((tick) => {
					const seconds = Number(tick.dataset.seconds);
					const pos = secondsToSlider(seconds);
					tick.style.left = `${pos}%`;
				});
		});
	},

	// =============================
	// Fetch monitors for dropdown
	// =============================
	async loadMonitorsDropdown() {
		const dropdown = document.getElementById("monitorDropdown");
		const hiddenIdField = document.getElementById("monitorId");
		if (!dropdown) return;

		const savedValue = window?.Upsnap?.settings?.monitoringUrl || "";
		const apiKey = window?.Upsnap?.settings?.apiKey || "";

		// 🔒 If API key is missing → disable dropdown and show saved URL only
		if (!apiKey) {
			const addMonitorButton = document.getElementById("add-monitor-btn");
			if (addMonitorButton) {
				addMonitorButton.classList.add("disabled");
				addMonitorButton.disabled = true;
			}
			this.populateSavedMonitorDropdown(dropdown, savedValue, {
				disable: true,
				labelSuffix: "(Default)",
			});
			this.disableDeleteMonitorButton();
			return;
		}

		try {
			const response = await fetch("/actions/upsnap/monitors/list", {
				headers: { "X-CSRF-Token": Craft.csrfTokenValue },
			});
			const data = await response.json();

			if (
				!response.ok ||
				!data.success ||
				!data.data ||
				!Array.isArray(data.data.monitors)
			) {
				throw new Error(
					data?.message || data?.error || "Failed to load monitors."
				);
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

				this.disableDeleteMonitorButton();

				this.disableTab('a[href="#healthchecks-tab"]');
				this.disableTab('a[href="#notification-channels-tab"]');

				return;
			} else {
				this.enableDeleteMonitorButton();
			}
			this.enableDeleteMonitorButton();

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
				this.disableDeleteMonitorButton();
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

			// Disable delete button if no monitor ID (default monitor)
			if (!selectedOption?.dataset?.id) {
				this.disableDeleteMonitorButton();
			} else {
				this.enableDeleteMonitorButton();
			}

			// Ensure dropdown is enabled when monitors are loaded
			dropdown.disabled = false;
			dropdown.classList.remove("disabled-field");

			// When user changes dropdown, update hidden field and toggle delete button
			dropdown.addEventListener("change", (e) => {
				const selected = e.target.selectedOptions[0];
				hiddenIdField.value = selected?.dataset?.id || "";
				if (!selected?.dataset?.id) {
					this.disableDeleteMonitorButton();
				} else {
					this.enableDeleteMonitorButton();
				}
			});

			// optional: if nothing selected and savedValue exists but wasn't matched (maybe URL normalized),
			// try a loose match (strip trailing slash)
			if (!dropdown.value && savedValue) {
				const normalize = (s) => (s || "").replace(/\/$/, "");
				const optToSelect = Array.from(dropdown.options).find(
					(o) => normalize(o.value) === normalize(savedValue)
				);
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
			this.disableDeleteMonitorButton();

			// Render status container with error when the api key has either expired, suspended or deleted
			if (error.message === "Invalid authentication token") {
				this.renderStatusContainer({
					message: "There was a problem fetching data.",
					error: error.message || "",
				});
			} else {
				Craft.Upsnap.Monitor.notify(error.message, "error");
			}
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
			dropdown.disabled = true;
			dropdown.classList.add("disabled-field");
		} else {
			dropdown.disabled = false;
			dropdown.classList.remove("disabled-field");
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

	enableDeleteMonitorButton() {
		const deleteBtn = document.getElementById("delete-monitor-btn");
		if (deleteBtn) {
			deleteBtn.disabled = false;
			deleteBtn.style.display = "block";
		}
	},

	disableDeleteMonitorButton() {
		const deleteBtn = document.getElementById("delete-monitor-btn");
		if (deleteBtn) {
			deleteBtn.disabled = true;
			deleteBtn.style.display = "none";
		}
	},

	renderStatusContainer(data) {
		const statusContainerWrapper = document.getElementById(
			"status-container-wrapper"
		);
		if (!statusContainerWrapper) return;

		const apiTokenStatus =
			window.Upsnap?.settings?.apiTokenStatus || "unknown";
		const apiTokenStatuses =
			window.Upsnap?.settings?.apiTokenStatuses || {};

		// Default warning setup
		let statusClass = "warning";
		let containerClass = "warning";
		let icon = "!";
		let title = data.message || "There are some issues!";
		let error = data.error || "";

		// Adjust title/error message automatically based on token status
		switch (apiTokenStatus) {
			case apiTokenStatuses.expired:
				title = "Your API token has expired.";
				error =
					"Your current API token is invalid. Please provide a valid API token to create monitors, modify health check settings, and set up notification channels.";
				break;
			case apiTokenStatuses.suspended:
				title = "Your API token is suspended.";
				error =
					"Your current API token is invalid. Please provide a valid API token to create monitors, modify health check settings, and set up notification channels.";
				break;
			case apiTokenStatuses.deleted:
				title = "Your API token has been deleted.";
				error =
					"Your current API token is invalid. Please provide a valid API token to create monitors, modify health check settings, and set up notification channels.";
				break;
			case apiTokenStatuses.active:
				// Only override if custom message isn’t passed
				if (!data.message && !data.error) {
					title = "An unexpected error occurred.";
					error =
						"Something went wrong while fetching monitors. Please try again.";
				}
				break;
			default:
				if (!data.message && !data.error) {
					title = "There are some issues!";
					error =
						"Something went wrong while fetching monitors. Please try again.";
				}
				break;
		}

		const html = `
      <div class="status-container ${containerClass}">
        <div class="status-header">
          <div class="status-icon ${statusClass}">${icon}</div>
          <h3 class="status-title">${title}</h3>
        </div>
        ${error ? `<p class="status-message">${error}</p>` : ""}
      </div>
    `;

		statusContainerWrapper.innerHTML = html;
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
				Craft.Upsnap.Monitor.notify(
					"Please fill out all fields.",
					"error"
				);
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
			saveBtn.classList.add("disabled");
			saveBtn.textContent = "Saving...";

			try {
				const response = await fetch(
					"/actions/upsnap/monitors/create",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-CSRF-Token": Craft.csrfTokenValue,
						},
						body: JSON.stringify({ name, url }),
					}
				);

				const data = await response.json();

				if (!response.ok || !data.success) {
					const message =
						data?.message ||
						data?.error ||
						"Failed to add monitor.";
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
				const message = rawMessage;
				Craft.Upsnap.Monitor.notify(message, "error");
			} finally {
				// Re-enable button after API completes
				saveBtn.disabled = false;
				saveBtn.textContent = "Save";
				saveBtn.classList.remove("disabled");
			}
		});
	},

	registerDeleteMonitor() {
		const deleteBtn = document.getElementById("delete-monitor-btn");
		const modal = document.getElementById("delete-monitor-modal");
		if (!deleteBtn || !modal) return;

		const closeBtn = modal.querySelector(".upsnap-modal__close");
		const cancelBtn = document.getElementById("cancel-delete-monitor-btn");
		const confirmBtn = document.getElementById(
			"confirm-delete-monitor-btn"
		);

		const showModal = () => modal.classList.remove("hidden");
		const hideModal = () => modal.classList.add("hidden");

		deleteBtn.addEventListener("click", () => {
			const dropdown = document.getElementById("monitorDropdown");
			const selectedOption = dropdown?.selectedOptions[0];
			const monitorId = selectedOption?.dataset.id;

			if (!monitorId) {
				Craft.Upsnap.Monitor.notify(
					"Please select a monitor to delete.",
					"error"
				);
				return;
			}
			showModal();
		});

		closeBtn?.addEventListener("click", hideModal);
		cancelBtn?.addEventListener("click", hideModal);

		confirmBtn?.addEventListener("click", async () => {
			const dropdown = document.getElementById("monitorDropdown");
			const selectedOption = dropdown?.selectedOptions[0];
			const monitorId = selectedOption?.dataset.id;

			if (!monitorId) {
				Craft.Upsnap.Monitor.notify("No monitor selected.", "error");
				hideModal();
				return;
			}

			confirmBtn.disabled = true;
			confirmBtn.textContent = "Deleting...";

			try {
				const response = await fetch(
					"/actions/upsnap/monitors/delete",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-CSRF-Token": Craft.csrfTokenValue,
						},
						body: JSON.stringify({ monitorId: monitorId }),
					}
				);

				const data = await response.json();
				if (!response.ok || !data.success) {
					const message =
						data?.message || "Failed to delete monitor.";
					throw new Error(message);
				}

				Craft.Upsnap.Monitor.notify(
					data?.message || "Monitor deleted successfully.",
					"success"
				);

				// Refresh dropdown list after a short delay to allow user to see the success message
				setTimeout(() => {
					window.location.reload();
				}, 1500);

				hideModal();
			} catch (error) {
				const message = error?.message || "Something went wrong.";
				Craft.Upsnap.Monitor.notify(message, "error");
			} finally {
				confirmBtn.disabled = false;
				confirmBtn.textContent = "Delete";
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

	registerAdvancedSettingsAccordion() {
		const accordionBtn = document.querySelector("#settings-accordion");
		const accordionContent = document.querySelector(
			"#advanced-settings-content"
		);
		if (!accordionBtn) return;
		// Accordion toggle
		accordionBtn.addEventListener("click", async () => {
			const expanded =
				accordionBtn.getAttribute("aria-expanded") === "true";
			accordionBtn.setAttribute("aria-expanded", !expanded);
			accordionContent.classList.toggle("hidden");
		});
	},

	registerLoadIntegrations() {
		const accordionBtn = document.querySelector("#integrations-trigger");
		if (!accordionBtn) return;
		const accordionContent = document.querySelector(
			"#notification-channels-content"
		);
		const spinner = document.querySelector("#channels-loading-spinner");
		const table = document.querySelector("#channels-table");
		const tbody = document.querySelector("#channels-tbody");
		const selectAll = document.querySelector("#select-all-channels");

		let channelsLoaded = false;

		// Accordion toggle
		accordionBtn.addEventListener("click", async () => {
			const expanded =
				accordionBtn.getAttribute("aria-expanded") === "true";
			accordionBtn.setAttribute("aria-expanded", !expanded);
			accordionContent.classList.toggle("hidden");

			if (!channelsLoaded) {
				loadChannels();
				channelsLoaded = true;
			}
		});

		// Load Integrations
		async function loadChannels() {
			spinner.classList.remove("hidden");

			try {
				const response = await Craft.sendActionRequest(
					"POST",
					"upsnap/monitor-notification-channels/list"
				);

				const channels = response.data.data.channels;
				renderTable(channels);
			} catch (e) {
				console.error(e);
				Craft.cp.displayError("Failed to load channels.");
			} finally {
				spinner.classList.add("hidden");
			}
		}

		// Render table
		function renderTable(channels) {
			tbody.innerHTML = "";

			if (!channels.length) {
				const noMsg = document.querySelector("#no-channels-msg");
				table.style.display = "none";
				noMsg.classList.remove("hidden");
				return;
			}

			channels.forEach((c) => {
				const row = document.createElement("tr");
				row.innerHTML = `
                    <td class="thin">
                        <input 
                            type="checkbox" 
                            class="channel-checkbox" 
                            value="${c.id}"
							data-id="${c.id}"
                        >
                    </td>
                    <td>${c.name}</td>
                    <td>${formatChannelType(c.channel_type)}</td>
                `;
				tbody.appendChild(row);
			});

			table.style.display = "table";

			// Add event listeners to individual checkboxes
			const checkboxes = document.querySelectorAll(".channel-checkbox");

			checkboxes.forEach((cb) => {
				cb.addEventListener("change", () => {
					const all = checkboxes.length;
					const checked = [...checkboxes].filter(
						(c) => c.checked
					).length;

					if (checked === all) {
						selectAll.checked = true;
					} else {
						selectAll.checked = false;
					}
				});
			});
			preselectSavedIntegrations();
		}
		function preselectSavedIntegrations() {
			const selectedIds = window.preSelectedChannelIds || [];
			if (!Array.isArray(selectedIds) || selectedIds.length === 0) return;

			selectedIds.forEach((id) => {
				const checkbox = document.querySelector(
					`.channel-checkbox[data-id="${id}"]`
				);
				if (checkbox) checkbox.checked = true;
			});

			// 👉 After selecting saved ones, update "select all"
			const checkboxes = document.querySelectorAll(".channel-checkbox");
			const all = checkboxes.length;
			const checked = [...checkboxes].filter((cb) => cb.checked).length;

			selectAll.checked = checked === all;
		}

		// Format channel type
		function formatChannelType(type) {
			return type
				.replace("_", " ")
				.replace(/\b\w/g, (l) => l.toUpperCase());
		}

		// SELECT ALL
		selectAll.addEventListener("change", (e) => {
			const checked = e.target.checked;
			document.querySelectorAll(".channel-checkbox").forEach((cb) => {
				cb.checked = checked;
				cb.dispatchEvent(new Event("change")); // IMPORTANT
			});
		});
	},
	registerSubmitHandler() {
		const btn = document.querySelector("#save-monitor");
		if (!btn) return;

		btn.addEventListener("click", async () => {
			// Validate fields
			const validName = this.validateField(
				"name",
				"Monitor name is required."
			);
			const validUrl = this.validateField(
				"url",
				"Monitor URL is required"
			);

			if (!validName || !validUrl) {
				return;
			}
			try {
				const payload = this.buildPayload();

				const response = await fetch("/actions/upsnap/monitors/save", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-CSRF-Token": Craft.csrfTokenValue,
					},
					body: JSON.stringify(payload),
				});

				const data = await response.json();

				if (data.success) {
					Craft.cp.displayNotice(
						data.message || "Monitor saved successfully."
					);
					window.location.href = Craft.getCpUrl(`upsnap/settings`);
				} else {
					Craft.cp.displayError(data.message || "Failed.");
				}
			} catch (e) {
				console.error(e);
				Craft.cp.displayError("Failed to create monitor.");
			}
		});
	},

	// --------------------------
	// Build Complete Payload
	// --------------------------

	buildPayload() {
		// Basic fields
		const name = document.querySelector("#name").value;
		const url = document.querySelector("#url").value;

		// Collect channel IDs
		const channelIds = [
			...document.querySelectorAll(".channel-checkbox:checked"),
		].map((cb) => cb.value);

		// Service configs

		const isEnabled = (name) =>
			document.querySelector(`input[name="${name}"]`)?.value === "1";

		const isMonitoringEnabled = isEnabled("enabled");

		const brokenLinksEnabled = isEnabled("brokenLinksEnabled");
		const mixedContentEnabled = isEnabled("mixedContentEnabled");
		const lighthouseEnabled = isEnabled("lighthouseEnabled");
		const reachabilityEnabled = isEnabled("reachabilityEnabled");
		const sslEnabled = isEnabled("sslEnabled");
		const domainEnabled = isEnabled("domainEnabled");
		const monitorEl = document.querySelector("[name='monitorId']");

		// Advanced settings
		return {
			monitorId: monitorEl && monitorEl.value ? monitorEl.value : null,
			name: name,
			service_type: "website",
			channel_ids: channelIds,
			is_enabled: isMonitoringEnabled,

			config: {
				meta: {
					follow_redirects: false,
					timeout: 15,
					url: url,
				},

				services: {
					broken_links: {
						enabled: brokenLinksEnabled,
						monitor_interval: this.getSeconds(
							"#brokenLinksMonitoringInterval"
						),
					},

					mixed_content: {
						enabled: mixedContentEnabled,
						monitor_interval: this.getSeconds(
							"#mixedContentMonitoringInterval"
						),
					},

					lighthouse: {
						enabled: lighthouseEnabled,
						monitor_interval: this.getSeconds(
							"#lighthouseMonitoringInterval"
						),
						strategy: document.querySelector("#lighthouseStrategy")
							.value,
					},

					ssl: {
						enabled: sslEnabled,
						monitor_interval: this.getSeconds(
							"#securityCertificatesMonitoringInterval"
						),
						notify_days_before_expiry: parseInt(
							document.querySelector("#sslExpiryDays").value
						),
					},

					domain: {
						enabled: domainEnabled,
						monitor_interval: this.getSeconds(
							"#domainMonitoringInterval"
						),
						notify_days_before_expiry: parseInt(
							document.querySelector("#domainExpiryDays").value
						),
					},

					uptime: {
						enabled: reachabilityEnabled,
						monitor_interval: this.getSeconds(
							"#reachabilityMonitoringInterval"
						),
					},
				},
			},
		};
	},
	ensureErrorContainer(field) {
		let errorList = field.querySelector(".errors");
		if (!errorList) {
			errorList = document.createElement("ul");
			errorList.classList.add("errors");
			field.querySelector(".input").appendChild(errorList);
		}
		return errorList;
	},

	isValidHttpUrl(value) {
		if (!value) return false;

		try {
			const url = new URL(value);

			// Allow only http/https
			if (!["http:", "https:"].includes(url.protocol)) {
				return false;
			}

			const hostname = url.hostname;

			// Must contain at least one dot (.)
			if (!hostname.includes(".")) {
				return false;
			}

			// TLD must be at least 2 characters
			const tld = hostname.split(".").pop();
			if (tld.length < 2) {
				return false;
			}

			// Hostname regex (no underscores, no spaces, valid chars)
			const hostnameRegex = /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*$/;

			if (!hostnameRegex.test(hostname)) {
				return false;
			}

			return true;
		} catch (e) {
			return false;
		}
	},
	validateField(id, message) {
		const field = document.querySelector(`#${id}-field`);
		const input = document.querySelector(`#${id}`);

		if (!field || !input) {
			console.warn(`Missing field or input for ${id}`);
			return false;
		}

		const errorList = this.ensureErrorContainer(field);

		// Reset
		field.classList.remove("has-errors");
		errorList.innerHTML = "";

		const value = input.value.trim();

		// Required check
		if (!value) {
			field.classList.add("has-errors");
			errorList.innerHTML = `<li>${message}</li>`;
			return false;
		}

		// URL-specific validation
		if (id === "url" && !this.isValidHttpUrl(value)) {
			field.classList.add("has-errors");
			errorList.innerHTML =
				"<li>Please enter a valid URL starting with http:// or https://</li>";
			return false;
		}

		return true;
	},

	// Convert interval strings like “5m”, “1h” → seconds
	getSeconds(selector) {
		const val = document.querySelector(selector).value;

		if (val.endsWith("m")) return parseInt(val) * 60;
		if (val.endsWith("h")) return parseInt(val) * 3600;
		if (val.endsWith("d")) return parseInt(val) * 86400;

		return parseInt(val); // fallback
	},
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	Craft.Upsnap.Monitor.init();
});
