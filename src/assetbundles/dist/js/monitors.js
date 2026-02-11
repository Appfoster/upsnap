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
		this.initMonitorTypeSelector();
		this.initKeywordManagement();
		this.initEnableMonitoringToggles();
	},
	initMonitorTypeSelector() {
		const typeSelector = document.getElementById("monitorType");
		if (!typeSelector) return;

		typeSelector.addEventListener("change", (e) => {
			this.switchMonitorType(e.target.value);
		});
	},
	switchMonitorType(type) {
		// Hide all monitor type fields
		document.querySelectorAll("[data-monitor-type]").forEach((el) => {
			el.style.display = "none";
		});

		// Show selected type fields
		const typeFields = document.getElementById(`${type}-fields`);
		if (typeFields) {
			typeFields.style.display = "block";
		}

		// Clear validations on hidden fields
		this.clearValidations();
	},
	clearValidations() {
		document.querySelectorAll(".error").forEach((el) => {
			el.classList.remove("error");
		});
	},
	initEnableMonitoringToggles() {
		// Website monitor - Handle Craft lightswitch
		this.setupLightswitchToggle("enabled", "advanced-settings");

		// Port monitor
		this.setupLightswitchToggle("portEnabled", "port-advanced-settings");

		// Keyword monitor
		this.setupLightswitchToggle(
			"keywordEnabled",
			"keyword-advanced-settings",
		);
	},

	setupLightswitchToggle(inputName, advancedSettingsDivId) {
		const input = document.querySelector(`input[name="${inputName}"]`);
		if (!input) return;

		const advancedSettingsDiv = document.getElementById(
			advancedSettingsDivId,
		);
		if (!advancedSettingsDiv) return;

		// Function to update visibility
		const updateVisibility = () => {
			const isChecked = input.value === "1" || input.checked === true;
			advancedSettingsDiv.style.display = isChecked ? "block" : "none";
		};

		// Listen to multiple events that might be fired by the lightswitch
		input.addEventListener("change", updateVisibility);
		input.addEventListener("input", updateVisibility);

		// For Craft's custom lightswitch component, listen to the wrapper
		const lightswitchWrapper = input.closest(".lightswitch");
		if (lightswitchWrapper) {
			lightswitchWrapper.addEventListener("click", () => {
				// Delay to let Craft update the input value
				setTimeout(updateVisibility, 10);
			});
		}

		// Initial state
		updateVisibility();
	},
	initKeywordManagement() {
		const addBtn = document.getElementById("add-keyword-btn");
		const keywordInput = document.getElementById("keywordInput");

		if (!addBtn || !keywordInput) return;

		addBtn.addEventListener("click", () => {
			this.addKeyword(keywordInput.value);
			keywordInput.value = "";
			keywordInput.focus();
		});

		keywordInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.addKeyword(keywordInput.value);
				keywordInput.value = "";
				keywordInput.focus();
			}
		});

		// Attach remove handlers to existing keywords
		document.querySelectorAll(".remove-keyword").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.preventDefault();
				const keyword = btn.dataset.keyword;
				this.removeKeyword(keyword);
			});
		});
	},
	addKeyword(keyword) {
		keyword = keyword.trim();
		if (!keyword) {
			Craft.cp.displayError("Keyword cannot be empty");
			return;
		}

		const keywordsList = document.getElementById("keywords-list");
		const hiddenInput = document.getElementById("keywordsHidden");

		// Parse existing keywords
		let keywords = [];
		try {
			keywords = JSON.parse(hiddenInput.value || "[]");
		} catch (e) {
			keywords = [];
		}

		// Check for duplicate
		if (keywords.includes(keyword)) {
			Craft.cp.displayError("Keyword already exists");
			return;
		}

		// Add to list
		keywords.push(keyword);
		hiddenInput.value = JSON.stringify(keywords);

		// Create card element
		const card = document.createElement("div");
		card.className = "keyword-card";
		card.dataset.keyword = keyword;
		card.style.cssText =
			"border: 1px solid #e0e0e0; padding: 15px; border-radius: 5px; background: #fafafa;";

		const headerDiv = document.createElement("div");
		headerDiv.style.cssText =
			"display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;";

		const strong = document.createElement("strong");
		strong.textContent = keyword;

		const removeBtn = document.createElement("button");
		removeBtn.type = "button";
		removeBtn.className = "remove-keyword";
		removeBtn.dataset.keyword = keyword;
		removeBtn.textContent = "✕";
		removeBtn.style.cssText =
			"background: none; border: none; cursor: pointer; padding: 0; font-size: 16px; color: #d32f2f;";

		removeBtn.addEventListener("click", (e) => {
			e.preventDefault();
			this.removeKeyword(keyword);
		});

		headerDiv.appendChild(strong);
		headerDiv.appendChild(removeBtn);

		// Grid container for match condition and regex
		const gridDiv = document.createElement("div");
		gridDiv.style.cssText =
			"display: grid; grid-template-columns: 1fr 1fr; gap: 10px;";

		// Match condition select
		const matchSelect = document.createElement("select");
		matchSelect.className = "keyword-match-condition";
		matchSelect.dataset.keyword = keyword;
		matchSelect.style.cssText =
			"padding: 8px; border: 1px solid #ddd; border-radius: 3px;";
		matchSelect.innerHTML = `
			<option value="must_contain">Exists</option>
			<option value="must_not_contain">Does not exist</option>
		`;

		// Regex checkbox
		const regexLabel = document.createElement("label");
		regexLabel.style.cssText =
			"display: flex; align-items: center; gap: 8px;";

		const regexCheckbox = document.createElement("input");
		regexCheckbox.type = "checkbox";
		regexCheckbox.className = "keyword-is-regex";
		regexCheckbox.dataset.keyword = keyword;
		regexCheckbox.style.cssText = "cursor: pointer;";

		regexLabel.appendChild(regexCheckbox);
		regexLabel.appendChild(document.createTextNode("Regex"));

		gridDiv.appendChild(matchSelect);
		gridDiv.appendChild(regexLabel);

		// Case sensitive checkbox
		const caseLabel = document.createElement("label");
		caseLabel.style.cssText =
			"display: flex; align-items: center; gap: 8px; margin-top: 8px;";

		const caseCheckbox = document.createElement("input");
		caseCheckbox.type = "checkbox";
		caseCheckbox.className = "keyword-case-sensitive";
		caseCheckbox.dataset.keyword = keyword;
		caseCheckbox.style.cssText = "cursor: pointer;";

		caseLabel.appendChild(caseCheckbox);
		caseLabel.appendChild(document.createTextNode("Case Sensitive"));

		card.appendChild(headerDiv);
		card.appendChild(gridDiv);
		card.appendChild(caseLabel);
		keywordsList.appendChild(card);
	},
	removeKeyword(keyword) {
		const keywordsList = document.getElementById("keywords-list");
		const hiddenInput = document.getElementById("keywordsHidden");

		// Remove card from UI
		const card = keywordsList.querySelector(`[data-keyword="${keyword}"]`);
		if (card) {
			card.remove();
		}

		// Remove from hidden input
		let keywords = [];
		try {
			keywords = JSON.parse(hiddenInput.value || "[]");
		} catch (e) {
			keywords = [];
		}

		keywords = keywords.filter((k) => k !== keyword);
		hiddenInput.value = JSON.stringify(keywords);
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
			// Handle seconds (for timeout sliders)
			if (s < 60) return `${Math.round(s)}s`;
			// Handle minutes
			if (s < 3600) return `${Math.round(s / 60)}m`;
			// Handle hours
			if (s < 86400) return `${Math.round(s / 3600)}h`;
			// Handle days
			return `${Math.round(s / 86400)}d`;
		};

		sliders.forEach((slider) => {
			const hiddenInput = document.getElementById(
				slider.dataset.targetInput,
			);
			const label = document.getElementById(slider.dataset.label);
			if (!hiddenInput || !label) return;

			const partitions = JSON.parse(slider.dataset.partitions);
			const minMonitorIntervalSeconds = parseInt(
				slider.dataset.minMonitorIntervalSeconds || 0,
			);

			const secondsList = partitions.map((p) => p.seconds);
			const minSeconds = Math.min(...secondsList);
			const maxSeconds = Math.max(...secondsList);

			const logMin = Math.log(minSeconds);
			const logMax = Math.log(maxSeconds);

			const secondsToSlider = (s) =>
				((Math.log(s) - logMin) / (logMax - logMin)) * 100;

			const sliderToSeconds = (p) =>
				Math.round(Math.exp(logMin + (p / 100) * (logMax - logMin)));

			// Convert initial value to seconds (handles both numeric and formatted string values)
			let initialValue = hiddenInput.value;
			let currentSeconds = minSeconds;

			if (initialValue) {
				if (initialValue.endsWith("m")) {
					currentSeconds = parseInt(initialValue) * 60;
				} else if (initialValue.endsWith("h")) {
					currentSeconds = parseInt(initialValue) * 3600;
				} else if (initialValue.endsWith("d")) {
					currentSeconds = parseInt(initialValue) * 86400;
				} else if (initialValue.endsWith("s")) {
					currentSeconds = parseInt(initialValue);
				} else {
					currentSeconds = parseInt(initialValue) || minSeconds;
				}
			}

			// Apply minimum limits - use the greater of the two minimums
			const effectiveMinimum = Math.max(
				minSeconds,
				minMonitorIntervalSeconds,
			);
			currentSeconds = Math.max(currentSeconds, effectiveMinimum);

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

				// Apply the effective minimum (considers plan limits for monitoring intervals)
				if (secs < effectiveMinimum) {
					secs = effectiveMinimum;
					e.target.value = secondsToSlider(effectiveMinimum);
				}

				hiddenInput.value = secs;
				label.textContent = format(secs);
				paint(e.target.value);
			});

			// Handle direct input changes to the hidden field
			hiddenInput.addEventListener("change", (e) => {
				let newValue = e.target.value;
				let newSeconds = minSeconds;

				// Parse formatted string values (m, h, d, s) to seconds
				if (newValue.endsWith("m")) {
					newSeconds = parseInt(newValue) * 60;
				} else if (newValue.endsWith("h")) {
					newSeconds = parseInt(newValue) * 3600;
				} else if (newValue.endsWith("d")) {
					newSeconds = parseInt(newValue) * 86400;
				} else if (newValue.endsWith("s")) {
					newSeconds = parseInt(newValue);
				} else {
					newSeconds = parseInt(newValue) || minSeconds;
				}

				// Apply the effective minimum
				newSeconds = Math.max(newSeconds, effectiveMinimum);
				hiddenInput.value = newSeconds;
				slider.value = secondsToSlider(newSeconds);
				label.textContent = format(newSeconds);
				paint(slider.value);
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
		// Register all accordion buttons
		document.querySelectorAll(".accordion-trigger").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.preventDefault();
				const expanded = btn.getAttribute("aria-expanded") === "true";
				const contentId = btn.getAttribute("aria-controls");
				const content = document.getElementById(contentId);

				if (content) {
					btn.setAttribute("aria-expanded", !expanded);
					content.classList.toggle("hidden");
				}
			});
		});
	},

	registerLoadIntegrations() {
		// Register for all three monitor types
		const configs = [
			{
				btnId: "#integrations-trigger",
				contentId: "#notification-channels-content",
				spinnerId: "#channels-loading-spinner",
				tableId: "#channels-table",
				tbodyId: "#channels-tbody",
				selectAllId: "#select-all-channels",
				noMsgId: "#no-channels-msg",
			},
			{
				btnId: "#port-integrations-trigger",
				contentId: "#port-notification-channels-content",
				spinnerId: "#port-channels-loading-spinner",
				tableId: "#port-channels-table",
				tbodyId: "#port-channels-tbody",
				selectAllId: "#port-select-all-channels",
				noMsgId: "#port-no-channels-msg",
			},
			{
				btnId: "#keyword-integrations-trigger",
				contentId: "#keyword-notification-channels-content",
				spinnerId: "#keyword-channels-loading-spinner",
				tableId: "#keyword-channels-table",
				tbodyId: "#keyword-channels-tbody",
				selectAllId: "#keyword-select-all-channels",
				noMsgId: "#keyword-no-channels-msg",
			},
		];

		configs.forEach((config) => {
			this.setupIntegrationAccordion(config);
		});
	},

	setupIntegrationAccordion(config) {
		const accordionBtn = document.querySelector(config.btnId);
		if (!accordionBtn) {
			return;
		}

		const accordionContent = document.querySelector(config.contentId);
		const spinner = document.querySelector(config.spinnerId);
		const table = document.querySelector(config.tableId);
		const tbody = document.querySelector(config.tbodyId);
		const selectAll = document.querySelector(config.selectAllId);
		const noMsg = document.querySelector(config.noMsgId);

		let channelsLoaded = false;

		// Check and load channels when accordion content visibility changes
		const checkAndLoadChannels = () => {
			// Check if accordion is expanded (no hidden class)
			const isExpanded =
				accordionContent &&
				!accordionContent.classList.contains("hidden");
			if (isExpanded && !channelsLoaded) {
				loadChannels();
				channelsLoaded = true;
			}
		};

		// Listen to button clicks to load channels after accordion opens
		accordionBtn.addEventListener("click", () => {
			// Delay slightly to let the toggle happen first
			setTimeout(checkAndLoadChannels, 50);
		});

		// Also try to load immediately in case it's already open
		checkAndLoadChannels();

		// Load Integrations
		const loadChannels = async () => {
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
		};

		// Render table
		const renderTable = (channels) => {
			tbody.innerHTML = "";

			if (!channels.length) {
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
			const checkboxes = tbody.querySelectorAll(".channel-checkbox");

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
		};

		const formatChannelType = (type) => {
			return type
				.replace("_", " ")
				.replace(/\b\w/g, (l) => l.toUpperCase());
		};

		const preselectSavedIntegrations = () => {
			const selectedIds = window.preSelectedChannelIds || [];
			if (!Array.isArray(selectedIds) || selectedIds.length === 0) return;

			selectedIds.forEach((id) => {
				const checkbox = tbody.querySelector(
					`.channel-checkbox[data-id="${id}"]`,
				);
				if (checkbox) checkbox.checked = true;
			});

			// After selecting saved ones, update "select all"
			const checkboxes = tbody.querySelectorAll(".channel-checkbox");
			const all = checkboxes.length;
			const checked = [...checkboxes].filter((cb) => cb.checked).length;

			selectAll.checked = checked === all;
		};

		// SELECT ALL
		selectAll.addEventListener("change", (e) => {
			const checked = e.target.checked;
			tbody.querySelectorAll(".channel-checkbox").forEach((cb) => {
				cb.checked = checked;
				cb.dispatchEvent(new Event("change"));
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
			// Get selected monitor type
			const monitorType =
				document.querySelector("#monitorType").value || "website";

			// Validate based on monitor type
			if (!this.validateMonitorTypeFields(monitorType)) {
				return;
			}

			// Validate regions (only for website monitor)
			if (
				monitorType === "website" &&
				window.validateRegionsMultiSelect &&
				!window.validateRegionsMultiSelect()
			) {
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
	validateMonitorTypeFields(type) {
		switch (type) {
			case "port":
				return (
					this.validateField(
						"portName",
						"Monitor name is required",
					) &&
					this.validateField(
						"portHost",
						"Host / Address is required",
					) &&
					this.validateField("portNumber", "Port is required")
				);
			case "keyword":
				return (
					this.validateField(
						"keywordName",
						"Monitor name is required",
					) &&
					this.validateField("keywordUrl", "URL is required") &&
					this.validateKeywords()
				);
			case "website":
			default:
				return (
					this.validateField("name", "Monitor name is required") &&
					this.validateField("url", "Monitor URL is required")
				);
		}
	},
	validateKeywords() {
		const hiddenInput = document.getElementById("keywordsHidden");
		let keywords = [];

		try {
			keywords = JSON.parse(hiddenInput.value || "[]");
		} catch (e) {
			keywords = [];
		}

		if (keywords.length === 0) {
			Craft.cp.displayError("At least one keyword is required");
			return false;
		}

		return true;
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
		const monitorType =
			document.querySelector("#monitorType").value || "website";
		const monitorEl = document.querySelector("[name='monitorId']");

		// Get the correct name field based on monitor type
		let name = "";
		if (monitorType === "port") {
			name = document.querySelector("#portName").value;
		} else if (monitorType === "keyword") {
			name = document.querySelector("#keywordName").value;
		} else {
			name = document.querySelector("#name").value;
		}

		// Collect channel IDs
		const channelSelector =
			monitorType === "website"
				? "#notification-channels-content .channel-checkbox:checked"
				: monitorType === "port"
					? "#port-notification-channels-content .channel-checkbox:checked"
					: "#keyword-notification-channels-content .channel-checkbox:checked";

		const channelIds = [...document.querySelectorAll(channelSelector)].map(
			(cb) => cb.value,
		);

		// Get regions data (only for website monitor)
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

		const basePayload = {
			name: name,
			channel_ids: channelIds,
			regions: regions,
		};

		// Build monitor type specific payload
		let payload;
		switch (monitorType) {
			case "port":
				payload = this.buildPortMonitorPayload(basePayload);
				break;
			case "keyword":
				payload = this.buildKeywordMonitorPayload(basePayload);
				break;
			case "website":
			default:
				payload = this.buildWebsiteMonitorPayload(basePayload);
		}

		// Add monitorId if updating an existing monitor
		if (monitorEl && monitorEl.value) {
			payload.monitorId = monitorEl.value;
		}

		return payload;
	},

	buildWebsiteMonitorPayload(basePayload) {
		const isEnabled = (name) =>
			document.querySelector(`input[name="${name}"]`)?.value === "1";

		const url = document.querySelector("#url").value;
		const checkInterval = this.getSeconds("reachabilityMonitoringInterval");

		return {
			name: basePayload.name,
			service_type: "website",
			url: url,
			config: {
				meta: {
					url: url,
					timeout: 30,
					follow_redirects: true,
				},
				services: {
					uptime: {
						enabled: isEnabled("reachabilityEnabled"),
						monitor_interval: this.getSeconds(
							"reachabilityMonitoringInterval",
						),
						retries: 3,
					},
					ssl: {
						enabled: isEnabled("sslEnabled"),
						monitor_interval: this.getSeconds(
							"securityCertificatesMonitoringInterval",
						),
						notify_days_before_expiry: 7,
					},
					broken_links: {
						enabled: isEnabled("brokenLinksEnabled"),
						monitor_interval: this.getSeconds(
							"brokenLinksMonitoringInterval",
						),
					},
					mixed_content: {
						enabled: isEnabled("mixedContentEnabled"),
						monitor_interval: this.getSeconds(
							"mixedContentMonitoringInterval",
						),
					},
				},
			},
			regions: basePayload.regions,
			check_interval: checkInterval,
			channel_ids: basePayload.channel_ids,
		};
	},

	buildPortMonitorPayload(basePayload) {
		const isEnabled = (name) =>
			document.querySelector(`input[name="${name}"]`)?.value === "1";

		const host = document.querySelector("#portHost").value;
		const port = parseInt(document.querySelector("#portNumber").value);
		const timeout = this.getSeconds("portTimeoutMonitoringInterval");
		const checkInterval = this.getSeconds(
			"portMonitorIntervalMonitoringInterval",
		);

		return {
			name: basePayload.name,
			service_type: "port",
			config: {
				meta: {
					host: host,
					port: port,
					timeout: timeout,
				},
				services: {
					port_check: {
						enabled: isEnabled("portEnabled"),
						monitor_interval: checkInterval,
						retries: 3,
					},
				},
			},
			regions: basePayload.regions,
			channel_ids: basePayload.channel_ids,
		};
	},

	buildKeywordMonitorPayload(basePayload) {
		const isEnabled = (name) =>
			document.querySelector(`input[name="${name}"]`)?.value === "1";

		// Build keywords array with per-keyword settings
		const keywordsList = document.getElementById("keywords-list");
		const keywords = [];

		keywordsList.querySelectorAll(".keyword-card").forEach((card) => {
			const keyword = card.dataset.keyword;
			const matchCondition = card.querySelector(
				".keyword-match-condition",
			).value;
			const isRegex = card.querySelector(".keyword-is-regex").checked;
			const caseSensitive = card.querySelector(
				".keyword-case-sensitive",
			).checked;

			keywords.push({
				text: keyword,
				type: matchCondition,
				case_sensitive: caseSensitive,
				is_regex: isRegex,
			});
		});

		const url = document.querySelector("#keywordUrl").value;
		const checkInterval = this.getSeconds(
			"keywordMonitorIntervalMonitoringInterval",
		);

		return {
			name: basePayload.name,
			service_type: "keyword",
			url: url,
			config: {
				meta: {
					url: url,
					timeout: this.getSeconds(
						"keywordTimeoutMonitoringInterval",
					),
					follow_redirects: isEnabled("keywordFollowRedirects"),
				},
				services: {
					keyword: {
						enabled: isEnabled("keywordEnabled"),
						monitor_interval: checkInterval,
						keywords: keywords,
						match_all: isEnabled("keywordMatchAll"),
					},
				},
			},
			regions: basePayload.regions,
			check_interval: checkInterval,
			channel_ids: basePayload.channel_ids,
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
		// Try to find field wrapper first
		let field = document.querySelector(`#${id}-field`);
		let input = document.querySelector(`#${id}`);

		// If no field wrapper found, look just for the input
		if (!field && input) {
			field = input.closest(".field");
		}

		if (!input) {
			console.warn(`Missing input for ${id}`);
			return false;
		}

		const errorList = field ? this.ensureErrorContainer(field) : null;

		// Reset error state
		if (field) {
			field.classList.remove("has-errors");
			if (errorList) errorList.innerHTML = "";
		}

		const value = input.value.trim();

		// Required check
		if (!value) {
			if (field) {
				field.classList.add("has-errors");
				if (errorList) errorList.innerHTML = `<li>${message}</li>`;
			}
			return false;
		}

		// URL-specific validation (for website and keyword monitors)
		if (
			(id === "url" || id === "keywordUrl") &&
			!this.isValidHttpUrl(value)
		) {
			if (field) {
				field.classList.add("has-errors");
				if (errorList)
					errorList.innerHTML =
						"<li>Please enter a valid URL starting with http:// or https://</li>";
			}
			return false;
		}

		// Port number validation
		if (id === "portNumber") {
			const portNum = parseInt(value);
			if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
				if (field) {
					field.classList.add("has-errors");
					if (errorList)
						errorList.innerHTML =
							"<li>Port must be a number between 1 and 65535</li>";
				}
				return false;
			}
		}

		// Host validation - no protocol or paths
		if (id === "portHost") {
			if (
				value.includes("://") ||
				value.includes("/") ||
				value.includes(":")
			) {
				if (field) {
					field.classList.add("has-errors");
					if (errorList)
						errorList.innerHTML =
							"<li>Please enter only the domain or IP address without protocol or port</li>";
				}
				return false;
			}
		}

		return true;
	},

	// Convert interval strings like “5m”, “1h” → seconds
	getSeconds(selector) {
		// Add # prefix if not already present
		const fullSelector = selector.startsWith("#")
			? selector
			: `#${selector}`;
		const el = document.querySelector(fullSelector);
		if (!el) {
			console.warn(`Selector not found: ${fullSelector}`);
			return 0;
		}

		const val = el.value;
		if (!val) return 0;

		// The interval-slider component stores values as plain seconds (numbers)
		// Other sources might store formatted strings like "5m", "1h", etc.
		const numVal = parseInt(val);
		if (!isNaN(numVal)) {
			return numVal; // Already in seconds
		}

		// Handle formatted strings for backward compatibility
		if (val.endsWith("m")) return parseInt(val) * 60;
		if (val.endsWith("h")) return parseInt(val) * 3600;
		if (val.endsWith("d")) return parseInt(val) * 86400;

		return 0;
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
								// Initialize the data input field with existing regions
								this.updateDataInput();
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
				// this.isOpen ? this.closeDropdown() : this.openDropdown();
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
						} else if (!e.target.checked && !isDisabled) {
							// Uncheck primary - remove primary flag from this region
							const selectedRegion = this.selectedRegions.find(
								(r) => r.id === region.id,
							);
							if (selectedRegion) {
								selectedRegion.is_primary = false;
								if (this.primaryRegionId === region.id) {
									this.primaryRegionId = null;
								}
								this.updateDataInput();
								this.render();
								this.renderDropdownList();
							}
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
					this.showError("Please set at least one region as primary");
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
