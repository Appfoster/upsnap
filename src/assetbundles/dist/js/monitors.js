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
			...args,
		);
	};

	Craft.cp.displayError = function (message, ...args) {
		return originalDisplayError.call(
			this,
			Craft.Upsnap.capitalizeFirst(message),
			...args,
		);
	};
}

Craft.Upsnap.Monitor = {
	init() {
		this.registerLoadIntegrations();
		this.registerAdvancedSettingsAccordion();
		this.registerSubmitHandler();
		this.initIntervalSlider();
		this.bindMonitorUrlListener();
		this.initRegionsMultiSelect();
	},
	bindMonitorUrlListener() {
		const field =
			document.getElementById("url") ||
			document.querySelector('input[name="url"]');
		if (!field) return;
		this.enforceHttpsHealthchecks();

		field.addEventListener("input", () => {
			this.enforceHttpsHealthchecks();
		});
	},
	getMonitorUrl() {
		const field =
			document.getElementById("url") ||
			document.querySelector('input[name="url"]');

		return field ? field.value.trim() : "";
	},
	isHttpsUrl(url) {
		if (!url) return false;

		return url.trim().toLowerCase().startsWith("https://");
	},

	enforceHttpsHealthchecks() {
		const url = this.getMonitorUrl();
		const isHttps = this.isHttpsUrl(url);

		if (!isHttps) {
			// Disable whole cards
			this.disableHttpCards();
		} else {
			this.enableHttpCards();
		}
	},
	disableHttpCards() {
		document
			.querySelectorAll(".healthcheck-section.http-disabled")
			.forEach((card) => {
				card.classList.add("is-disabled");
				card.setAttribute(
					"title",
					Craft.t(
						"upsnap",
						"These checks are not enabled for non HTTPS URLs.",
					),
				);
			});
	},
	enableHttpCards() {
		document
			.querySelectorAll(".healthcheck-section.http-disabled")
			.forEach((card) => {
				card.classList.remove("is-disabled");
				card.removeAttribute("title");
			});
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
			const hiddenInput = document.getElementById(
				slider.dataset.targetInput,
			);
			const label = document.getElementById(slider.dataset.label);
			if (!hiddenInput || !label) return;

			const partitions = JSON.parse(slider.dataset.partitions);

			const secondsList = partitions.map((p) => p.seconds);
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
				PLAN_MIN_SECONDS,
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
			"#advanced-settings-content",
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
			"#notification-channels-content",
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
					"upsnap/monitor-notification-channels/list",
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
						(c) => c.checked,
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
					`.channel-checkbox[data-id="${id}"]`,
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
	disableSavebtn() {
		const saveBtn = document.getElementById("save-monitor");
		if (!saveBtn) return;

		saveBtn.disabled = true;
		saveBtn.classList.add("disabled");
	},

	enableSavebtn() {
		const saveBtn = document.getElementById("save-monitor");
		if (!saveBtn) return;

		saveBtn.disabled = false;
		saveBtn.classList.remove("disabled");
	},
	registerSubmitHandler() {
		const btn = document.querySelector("#save-monitor");
		if (!btn) return;

		btn.addEventListener("click", async () => {
			// Validate fields
			const validName = this.validateField(
				"name",
				"Monitor name is required.",
			);
			const validUrl = this.validateField(
				"url",
				"Monitor URL is required",
			);

			// Validate regions
			if (
				window.validateRegionsMultiSelect &&
				!window.validateRegionsMultiSelect()
			) {
				return;
			}

			if (!validName || !validUrl) {
				return;
			}
			try {
				this.disableSavebtn();
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
						data.message || "Monitor saved successfully.",
					);

					// 🔔 Notify monitors-list.js
					const isCreate = !payload.monitorId;
					const shouldQueue =
						isCreate || this.hasCriticalChanges(payload);

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
			} finally {
				this.enableSavebtn();
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

		return originalEnabled !== updatedEnabled || originalUrl !== updatedUrl;
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

		// Get regions data
		const regionsDataInput = document.querySelector("#regions-data-input");
		let regions = [];
		if (regionsDataInput && regionsDataInput.value) {
			try {
				regions = JSON.parse(regionsDataInput.value);
			} catch (e) {
				console.error("Failed to parse regions data:", e);
				regions = [];
			}
		}

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
			regions: regions,

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
							"#brokenLinksMonitoringInterval",
						),
					},

					mixed_content: {
						enabled: mixedContentEnabled,
						monitor_interval: this.getSeconds(
							"#mixedContentMonitoringInterval",
						),
					},

					lighthouse: {
						enabled: lighthouseEnabled,
						monitor_interval: this.getSeconds(
							"#lighthouseMonitoringInterval",
						),
						strategy: document.querySelector("#lighthouseStrategy")
							.value,
					},

					ssl: {
						enabled: sslEnabled,
						monitor_interval: this.getSeconds(
							"#securityCertificatesMonitoringInterval",
						),
						notify_days_before_expiry: parseInt(
							document.querySelector("#sslExpiryDays").value,
						),
					},

					domain: {
						enabled: domainEnabled,
						monitor_interval: this.getSeconds(
							"#domainMonitoringInterval",
						),
						notify_days_before_expiry: parseInt(
							document.querySelector("#domainExpiryDays").value,
						),
					},

					uptime: {
						enabled: reachabilityEnabled,
						monitor_interval: this.getSeconds(
							"#reachabilityMonitoringInterval",
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
	// Initialize Regions MultiSelect
	initRegionsMultiSelect() {
		const RegionsMultiSelect = {
			container: document.getElementById("regions-multiselect-container"),
			dropdown: document.getElementById("regions-dropdown"),
			input: document.getElementById("regions-multiselect-input"),
			chipsContainer: document.getElementById("regions-chips-container"),
			listContainer: document.getElementById("regions-list-container"),
			loadingSpinner: document.querySelector(".regions-loading-spinner"),
			chevronBtn: document.querySelector(".regions-chevron-toggle"),
			chevronIcon: document.querySelector(".regions-chevron-icon"),
			noResults: document.getElementById("regions-no-results"),
			dataInput: document.getElementById("regions-data-input"),

			allRegions: [],
			selectedRegions: [],
			primaryRegionId: null,
			isOpen: false,
			userPlan: null,

			init() {
				if (!this.container) return; // Component might not be present
				this.getUserPlan();
				this.bindEvents();
				this.fetchRegions();
			},

			getUserPlan() {
				if (
					window.CraftPageData &&
					window.CraftPageData.userDetails &&
					window.CraftPageData.userDetails.user
				) {
					this.userPlan =
						window.CraftPageData.userDetails.user
							.subscription_type || "trial";
				} else {
					this.userPlan = "trial";
				}
			},

			isFreeUser() {
				return this.userPlan === "trial";
			},

			bindEvents() {
				// Open/close dropdown
				this.container.addEventListener("click", (e) => {
					if (
						e.target !== this.input &&
						!this.input.contains(e.target)
					) {
						this.toggleDropdown();
					}
				});

				this.chevronBtn.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.toggleDropdown();
				});

				// Search input
				this.input.addEventListener("input", (e) => {
					this.filterRegions(e.target.value);
				});

				this.input.addEventListener("focus", () => {
					this.openDropdown();
				});

				// Close on outside click
				document.addEventListener("mousedown", (e) => {
					if (
						!this.container.contains(e.target) &&
						!this.dropdown.contains(e.target)
					) {
						this.closeDropdown();
					}
				});

				// Keyboard navigation
				this.input.addEventListener("keydown", (e) => {
					if (
						e.key === "Backspace" &&
						!this.input.value &&
						this.selectedRegions.length > 0
					) {
						this.removeRegion(
							this.selectedRegions[
								this.selectedRegions.length - 1
							].id,
						);
					}
				});
			},

			fetchRegions() {
				const endpoint = this.container.dataset.endpoint;
				this.showLoadingSpinner(true);

				fetch(endpoint)
					.then((res) => {
						if (!res.ok) throw new Error("Failed to fetch regions");
						return res.json();
					})
					.then((data) => {
						if (data.success && Array.isArray(data.data)) {
							// Sort regions with default first
							this.allRegions = this.sortRegionsWithDefaultFirst(
								data.data,
							);

							// Load existing regions if in edit mode
							const existingRegions = this.getExistingRegions();
							if (existingRegions && existingRegions.length > 0) {
								this.selectedRegions = existingRegions;
								const primaryRegion = existingRegions.find(
									(r) => r.is_primary,
								);
								if (primaryRegion) {
									this.primaryRegionId = primaryRegion.id;
								}
							} else {
								// Pre-select default region on new monitor form
								const defaultRegion = this.allRegions.find(
									(r) => r.id === "default",
								);
								if (defaultRegion) {
									this.addRegion("default");
								}
							}

							this.render();
						}
					})
					.catch((error) => {
						console.error("Error fetching regions:", error);
						this.showError("Failed to load regions");
					})
					.finally(() => {
						this.showLoadingSpinner(false);
					});
			},

			sortRegionsWithDefaultFirst(regions) {
				const defaultRegion = regions.find((r) => r.id === "default");
				const otherRegions = regions.filter((r) => r.id !== "default");
				return defaultRegion
					? [defaultRegion, ...otherRegions]
					: regions;
				this.isOpen ? this.closeDropdown() : this.openDropdown();
			},

			getExistingRegions() {
				// Try to load from monitor data if available
				if (
					window.CraftPageData &&
					window.CraftPageData.monitorData &&
					window.CraftPageData.monitorData.regions
				) {
					return window.CraftPageData.monitorData.regions;
				}
				return null;
			},

			toggleDropdown() {
				this.isOpen ? this.closeDropdown() : this.openDropdown();
			},

			openDropdown() {
				this.isOpen = true;
				this.dropdown.classList.remove("hidden");
				this.input.style.display = "block";
				this.input.focus();
				this.chevronIcon.classList.add("rotated");
				this.renderDropdownList();
			},

			closeDropdown() {
				this.isOpen = false;
				this.dropdown.classList.add("hidden");
				this.input.style.display = "none";
				this.input.value = "";
				this.chevronIcon.classList.remove("rotated");
				this.filterRegions("");
			},

			toggleRegion(regionId) {
				const isSelected = this.selectedRegions.some(
					(r) => r.id === regionId,
				);

				if (isSelected) {
					this.removeRegion(regionId);
				} else {
					this.addRegion(regionId);
				}
			},

			addRegion(regionId) {
				const region = this.allRegions.find((r) => r.id === regionId);
				if (!region) return;
				const regionWithPrimary = {
					...region,
					is_primary: this.selectedRegions.length === 0, // First region is primary by default
				};

				// For free users, only allow adding default region
				if (this.isFreeUser() && regionId !== "default") {
					return;
				}

				// Prevent adding multiple regions for free users
				if (this.isFreeUser() && this.selectedRegions.length > 0) {
					return;
				}

				if (regionWithPrimary.is_primary) {
					this.primaryRegionId = regionId;
				}

				this.selectedRegions.push(regionWithPrimary);
				this.updateDataInput();
				this.render();
				this.renderDropdownList();
			},

			removeRegion(regionId) {
				this.selectedRegions = this.selectedRegions.filter(
					(r) => r.id !== regionId,
				);

				// Update primary if removed region was primary
				if (this.primaryRegionId === regionId) {
					if (this.selectedRegions.length > 0) {
						this.primaryRegionId = this.selectedRegions[0].id;
						this.selectedRegions[0].is_primary = true;
					} else {
						this.primaryRegionId = null;
					}
				}

				this.updateDataInput();
				this.render();
				this.renderDropdownList();
			},

			setPrimaryRegion(regionId) {
				// Auto-select if not already selected
				if (!this.selectedRegions.some((r) => r.id === regionId)) {
					this.addRegion(regionId);
				}

				// Remove primary flag from all regions
				this.selectedRegions.forEach((r) => (r.is_primary = false));

				// Set as primary
				const primaryRegion = this.selectedRegions.find(
					(r) => r.id === regionId,
				);
				if (primaryRegion) {
					primaryRegion.is_primary = true;
					this.primaryRegionId = regionId;
				}

				this.updateDataInput();
				this.render();
				this.renderDropdownList();
			},

			filterRegions(query) {
				const filtered = this.allRegions.filter((region) =>
					region.name.toLowerCase().includes(query.toLowerCase()),
				);
				this.renderDropdownList(filtered);
			},

			render() {
				// Render chips
				this.chipsContainer.innerHTML = "";

				this.selectedRegions.forEach((region) => {
					const chip = document.createElement("div");
					chip.className = "regions-chip";
					if (region.is_primary) {
						chip.classList.add("primary");
					}

					chip.innerHTML = `
						<span class="regions-chip-name">${this.escapeHtml(region.name)}</span>
						${region.is_primary ? '<span class="regions-chip-badge">Primary</span>' : ""}
						<button type="button" class="regions-chip-remove" data-region-id="${region.id}">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						</button>
					`;

					chip.querySelector(".regions-chip-remove").addEventListener(
						"click",
						(e) => {
							e.preventDefault();
							e.stopPropagation();
							this.removeRegion(region.id);
						},
					);

					this.chipsContainer.appendChild(chip);
				});

				// Show/hide input placeholder
				if (this.selectedRegions.length === 0 && !this.isOpen) {
					this.container.classList.add("empty");
				} else {
					this.container.classList.remove("empty");
				}
			},

			renderDropdownList(regions = null) {
				const regionsToRender = regions || this.allRegions;
				this.listContainer.innerHTML = "";

				if (regionsToRender.length === 0 && regions !== null) {
					this.noResults.classList.remove("hidden");
					return;
				} else {
					this.noResults.classList.add("hidden");
				}

				regionsToRender.forEach((region) => {
					const isSelected = this.selectedRegions.some(
						(r) => r.id === region.id,
					);
					const isPrimary = this.primaryRegionId === region.id;
					const isDisabled =
						this.isFreeUser() && region.id !== "default";

					const item = document.createElement("div");
					item.className = "regions-dropdown-item";
					if (isSelected) item.classList.add("selected");
					if (isDisabled) item.classList.add("disabled");

					const checkboxButton = document.createElement("button");
					checkboxButton.type = "button";
					checkboxButton.className = "regions-checkbox";
					checkboxButton.dataset.regionId = region.id;
					if (isDisabled) {
						checkboxButton.disabled = true;
						checkboxButton.title =
							"Upgrade to a paid plan to monitor your applications across multiple regions worldwide.";
					}
					checkboxButton.innerHTML = `
					<span class="regions-checkbox-box">
						${isSelected ? '<span class="regions-checkbox-check">✓</span>' : ""}
					</span>
					<span class="regions-item-name">${this.escapeHtml(region.name)}</span>
				`;

					checkboxButton.addEventListener("click", (e) => {
						if (!isDisabled) {
							e.preventDefault();
							this.toggleRegion(region.id);
						}
					});

					const primaryLabel = document.createElement("label");
					primaryLabel.className = "regions-primary-label";
					const primaryCheckbox = document.createElement("input");
					primaryCheckbox.type = "checkbox";
					primaryCheckbox.className = "regions-primary-checkbox";
					primaryCheckbox.dataset.regionId = region.id;
					if (isPrimary) primaryCheckbox.checked = true;
					if (!isSelected || isDisabled)
						primaryCheckbox.disabled = true;
					if (isDisabled) {
						primaryCheckbox.title =
							"Upgrade to a paid plan to monitor your applications across multiple regions worldwide.";
					}

					primaryCheckbox.addEventListener("change", (e) => {
						e.stopPropagation();
						if (e.target.checked && !isDisabled) {
							this.setPrimaryRegion(region.id);
						}
					});

					const spanText = document.createElement("span");
					spanText.textContent = "Primary";

					primaryLabel.appendChild(primaryCheckbox);
					primaryLabel.appendChild(spanText);

					item.appendChild(checkboxButton);
					item.appendChild(primaryLabel);
					this.listContainer.appendChild(item);
				});
			},

			updateDataInput() {
				this.dataInput.value = JSON.stringify(this.selectedRegions);
				this.clearError();
			},

			showLoadingSpinner(show) {
				if (show) {
					this.loadingSpinner.classList.remove("hidden");
				} else {
					this.loadingSpinner.classList.add("hidden");
				}
			},

			ensureErrorContainer() {
				const field = document.querySelector("#regions-field");
				if (!field) return null;

				let errorList = field.querySelector(".errors");
				if (!errorList) {
					errorList = document.createElement("ul");
					errorList.classList.add("errors");
					const inputDiv = field.querySelector(".input");
					if (inputDiv) {
						inputDiv.appendChild(errorList);
					}
				}
				return errorList;
			},

			showError(message) {
				const field = document.querySelector("#regions-field");
				if (!field) return;

				const errorList = this.ensureErrorContainer();
				if (errorList) {
					field.classList.add("has-errors");
					errorList.innerHTML = `<li>${this.escapeHtml(message)}</li>`;
				}
			},

			clearError() {
				const field = document.querySelector("#regions-field");
				if (!field) return;

				const errorList = field.querySelector(".errors");
				field.classList.remove("has-errors");
				if (errorList) {
					errorList.innerHTML = "";
				}
			},

			escapeHtml(text) {
				const map = {
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					'"': "&quot;",
					"'": "&#039;",
				};
				return text.replace(/[&<>"']/g, (m) => map[m]);
			},

			validatePrimaryRegion() {
				if (this.selectedRegions.length === 0) {
					this.showError("Please select at least one region");
					return false;
				}

				if (
					!this.primaryRegionId ||
					!this.selectedRegions.some((r) => r.is_primary)
				) {
					this.showError("Please set a primary region");
					return false;
				}

				return true;
			},
		};

		RegionsMultiSelect.init();

		// Make validation accessible globally for form submission
		window.validateRegionsMultiSelect = () =>
			RegionsMultiSelect.validatePrimaryRegion();
	},
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	Craft.Upsnap.Monitor.init();
});
