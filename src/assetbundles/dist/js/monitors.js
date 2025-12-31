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
		this.registerLoadIntegrations();
		this.registerAdvancedSettingsAccordion();
		this.registerSubmitHandler();
		this.initIntervalSlider();
	},

	initIntervalSlider() {
		const sliders = document.querySelectorAll("[data-interval-slider]");
		if (!sliders.length) return;

		const PLAN_MIN_SECONDS =
			window.CraftPageData.minMonitorIntervalSeconds || 300;

		const format = (s) => {
			if (s < 3600) return `${Math.round(s / 60)}m`;
			if (s < 86400) return `${Math.round(s / 3600)}h`;
			return `${Math.round(s / 86400)}d`;
		};

		sliders.forEach((slider) => {
			const hiddenInput = document.getElementById(slider.dataset.targetInput);
			const label = document.getElementById(slider.dataset.label);
			if (!hiddenInput || !label) return;

			const partitions = JSON.parse(slider.dataset.partitions);

			const secondsList = partitions.map(p => p.seconds);
			const minSeconds = Math.min(...secondsList);
			const maxSeconds = Math.max(...secondsList);

			const logMin = Math.log(minSeconds);
			const logMax = Math.log(maxSeconds);

			const secondsToSlider = (s) =>
				((Math.log(s) - logMin) / (logMax - logMin)) * 100;

			const sliderToSeconds = (p) =>
				Math.round(Math.exp(logMin + (p / 100) * (logMax - logMin)));

			let currentSeconds = Math.max(
				Number(hiddenInput.value || PLAN_MIN_SECONDS),
				PLAN_MIN_SECONDS
			);

			slider.value = secondsToSlider(currentSeconds);
			label.textContent = format(currentSeconds);
			hiddenInput.value = currentSeconds;

			const paint = (v) => {
				slider.style.background = `linear-gradient(
					to right,
					#3b82f6 0%,
					#3b82f6 ${v}%,
					#e5e7eb ${v}%,
					#e5e7eb 100%
				)`;
			};

			paint(slider.value);

			slider.addEventListener("input", (e) => {
				let secs = sliderToSeconds(Number(e.target.value));

				if (secs < PLAN_MIN_SECONDS) {
					secs = PLAN_MIN_SECONDS;
					e.target.value = secondsToSlider(PLAN_MIN_SECONDS);
				}

				hiddenInput.value = secs;
				label.textContent = format(secs);
				paint(e.target.value);
			});

			// Tick positioning
			slider
				.closest(".field")
				?.querySelectorAll(".upsnap-range-tick")
				.forEach((tick) => {
					const pos = secondsToSlider(Number(tick.dataset.seconds));
					tick.style.left = `${pos}%`;
				});
		});
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

					// 🔔 Notify monitors-list.js
					const isCreate = !payload.monitorId;
					const shouldQueue = isCreate || this.hasCriticalChanges(payload);

					if (shouldQueue) {
						this.pushMonitorChange({
							monitorId: data.data?.id || null,
							action: isCreate ? "created" : "updated",
						});
					}

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
	pushMonitorChange(change) {
		const key = "upsnap:monitor-changes";
		const existing = sessionStorage.getItem(key);

		let queue = [];
		if (existing) {
			try {
				queue = JSON.parse(existing) || [];
			} catch (e) {
				queue = [];
			}
		}

		queue.push({
			monitorId: change.monitorId,
			action: change.action,
			ts: Date.now(),
		});
		sessionStorage.setItem(key, JSON.stringify(queue));
	},
	// checks if there are critical changes between original and updated monitor data
	hasCriticalChanges(payload) {
		const original = window.CraftPageData.monitorData;

		// New monitor → always queue
		if (!payload.monitorId || !original) {
			return true;
		}

		const originalEnabled = Boolean(original.enabled);
		const updatedEnabled = Boolean(payload.is_enabled);

		const originalUrl = (original.url || "").trim();
		const updatedUrl = (payload.config?.meta?.url || "").trim();

		return (
			originalEnabled !== updatedEnabled ||
			originalUrl !== updatedUrl
		);
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

			if (!["http:", "https:"].includes(url.protocol)) {
				return false;
			}

			const hostname = url.hostname.toLowerCase();
			const labels = hostname.split(".");

			// Must have at least 2 labels
			if (labels.length < 2) {
				return false;
			}

			if (labels.length === 2 && labels[0] === "www") {
				return false;
			}

			// Hostname length
			if (hostname.length > 253) {
				return false;
			}

			// Validate labels
			for (const label of labels) {
				if (label.length < 1 || label.length > 63) {
					return false;
				}

				if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) {
					return false;
				}
			}

			// TLD: letters only, future-proof
			const tld = labels[labels.length - 1];
			if (!/^[a-z]{2,63}$/.test(tld)) {
				return false;
			}

			return true;
		} catch {
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
