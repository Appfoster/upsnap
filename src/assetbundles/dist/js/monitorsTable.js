// resources/js/monitorsTable.js
(() => {
	if (!window.Craft) {
		console.error("Craft global missing.");
		return;
	}

	const Polling = {
		generalInterval: null,
		monitorTimeouts: new Map(),
		completedMonitors: new Set(),
		activeMonitorIds: new Set(),
	};

	// Store tags map for lookup (id -> tag object)
	let tagsMap = new Map();

	// Store region names map for tooltip (region_id -> human-readable name)
	let regionNameMap = new Map();

	const endpointSelector = "#upsnap-monitors-wrap";
	const tbodySelector = "#upsnap-monitors-tbody";
	const selectAllSelector = "#upsnap-select-all";
	const monitorIdField = () => document.querySelector("#monitorId");
	const monitoringUrlField = () =>
		document.querySelector("#monitoringUrlInput");

	const craftNotice = (msg) => {
		if (Craft.cp && Craft.cp.displayNotice) Craft.cp.displayNotice(msg);
		else alert(msg);
	};
	const craftError = (msg) => {
		if (Craft.cp && Craft.cp.displayError) Craft.cp.displayError(msg);
		else alert(msg);
	};

	// Update monitor object with primary region status data
	const updateMonitorWithPrimaryRegionStatus = (monitor) => {
		if (!monitor.regions || !Array.isArray(monitor.regions)) {
			return monitor;
		}

		const primaryRegion = monitor.regions.find((r) => r.is_primary);
		if (!primaryRegion) {
			return monitor;
		}

		const regionId = primaryRegion.id;
		const serviceLastChecks = monitor.service_last_checks || {};
		const regionChecks = serviceLastChecks[regionId];

		if (!regionChecks) {
			return monitor;
		}

		// Determine which service to check based on monitor type
		const serviceType = monitor.service_type || "website";
		let serviceCheckKey = "uptime"; // default for website monitors

		if (serviceType === "keyword") {
			serviceCheckKey = "keyword";
		} else if (serviceType === "port") {
			serviceCheckKey = "port_check";
		}

		// Get the service check data and update monitor object directly
		const serviceCheck = regionChecks[serviceCheckKey];
		if (serviceCheck) {
			monitor.last_status = serviceCheck.last_status;
			monitor.last_check_at = serviceCheck.last_checked_at;
		}

		return monitor;
	};

	const buildRow = (monitor, primaryMonitorId) => {
		// Update monitor with primary region data
		updateMonitorWithPrimaryRegionStatus(monitor);

		const url = monitor.config?.meta?.url || "";
		const serviceType = monitor.service_type || "website";
		const name = monitor.name || url || "Unnamed Monitor";
		const isSelected = primaryMonitorId && monitor?.id === primaryMonitorId;
		const isPollingRelevant = Polling.activeMonitorIds.has(monitor.id);
		const inPollingState =
			isPollingRelevant &&
			isRecentlyChecked(monitor.last_check_at, monitor.updated_at);
		const incidentRegions = monitor.incident_regions || [];
		const totalIncidents = incidentRegions.reduce((sum, r) => sum + (r.incident_count || 0), 0);


		// Determine status
		let statusLabel = "";
		let statusClass = "";

		if (!monitor.is_enabled) {
			statusLabel = "Paused";
			statusClass = "pill--gray";
		} else if (inPollingState) {
			// 👇 override only for polling monitors
			statusLabel = "Checking";
			statusClass = "pill--yellow";
		} else if (!monitor.last_status) {
			statusLabel = "Checking";
			statusClass = "pill--yellow";
		} else if (monitor.last_status === "up") {
			statusLabel = "Up";
			statusClass = "pill--green";
		} else if (monitor.last_status === "down") {
			statusLabel = "Down";
			statusClass = "pill--red";
		}

		const tr = document.createElement("tr");
		tr.dataset.id = monitor.id ?? "";
		tr.dataset.url = url;
		tr.dataset.serviceType = serviceType;
		let urlLabel = null;
		if (serviceType === "port") {
			urlLabel = `${monitor.config?.meta?.host}:${monitor.config?.meta?.port || ""}`;
		} else {
			urlLabel = url;
		}

		// checkbox column
		const tdCheck = document.createElement("td");
		tdCheck.className = "checkbox-cell";

		tdCheck.innerHTML = `
        <input type="checkbox" class="upsnap-row-checkbox" 
		data-id="${monitor.id ?? ""}"
		id="upsnap-checkbox-${escapeId(url)}">
		
        <label for="upsnap-checkbox-${escapeId(url)}"></label>
    `;

		// monitor column: name + url + type pill
		const tdMonitor = document.createElement("td");
		const regionStatsAttr = incidentRegions.length > 0
			? `data-region-stats="${escapeHtmlAttr(JSON.stringify(incidentRegions))}"`
			: '';

		tdMonitor.innerHTML = `
			<div class="heading">${escapeHtml(name)} 				${
					totalIncidents > 0
						? `<span
								class="monitor-incidents-link"
								data-monitor-id="${monitor.id}"
								${regionStatsAttr}
							>
								• ${totalIncidents} incident${totalIncidents === 1 ? "" : "s"}
						</span>`
						: ""
				}</div>
			<div class="light" style="margin-top:4px;">
				<span class="monitor-type-pill monitor-type-pill--${escapeHtml(serviceType)}">${escapeHtml(serviceType)}</span>
				${escapeHtml(urlLabel)}
				${buildTagsChips(monitor.tag_ids || [])}
			</div>
		`;

		// Status column
		const tdStatus = document.createElement("td");
		tdStatus.innerHTML = `
			<span class="pill small ${statusClass}">${statusLabel}</span>
		`;

		// primary column
		const tdPrimary = document.createElement("td");
		tdPrimary.className = "thin";

		if (isSelected) {
			tdPrimary.innerHTML = `
			<button class="btn small upsnap-set-primary disabled"
					data-url="${escapeHtmlAttr(url)}"
					data-service-type="${serviceType}">
					Selected
				</button>
			`;
		} else {
			tdPrimary.innerHTML = `
				<button class="btn small upsnap-set-primary"
					data-url="${escapeHtmlAttr(url)}"
					data-service-type="${serviceType}">
					Set primary
				</button>
			`;
		}

		tr.appendChild(tdCheck);
		tr.appendChild(tdMonitor);
		tr.appendChild(tdStatus);
		tr.appendChild(tdPrimary);

		return tr;
	};

	// Helpers
	function escapeHtml(str) {
		if (!str && str !== 0) return "";
		return String(str).replace(
			/[&<>"'`=\/]/g,
			(s) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					'"': "&quot;",
					"'": "&#39;",
					"/": "&#x2F;",
					"`": "&#96;",
					"=": "&#61;",
				})[s],
		);
	}
	function escapeHtmlAttr(s) {
		return escapeHtml(s);
	}
	function escapeId(s) {
		return btoa(s || "").replace(/=/g, "");
	}

	// Build tags chips HTML from tag IDs
	function buildTagsChips(tagIds) {
		if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
			return "";
		}

		return tagIds
			.map((tagId) => {
				const tag = tagsMap.get(tagId);
				if (!tag) return "";
				const bgColor = tag.color || "#6c757d";
				return `<span class="monitor-tag-chip" style="background-color: ${escapeHtml(bgColor)}">${escapeHtml(tag.name)}</span>`;
			})
			.filter(Boolean)
			.join("");
	}

	// Toggle menu dropdown simple
	function wireMenuButtons(container) {
		container.querySelectorAll(".menu").forEach((menu) => {
			const btn = menu.querySelector(".menu-btn");
			const dropdown = menu.querySelector(".menu-dropdown");
			if (!btn || !dropdown) return;

			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const isHidden = dropdown.classList.toggle("hidden")
					? dropdown.classList.contains("hidden")
					: false;
				// close other open menus
				document.querySelectorAll(".menu-dropdown").forEach((d) => {
					if (d !== dropdown) d.classList.add("hidden");
				});
				dropdown.classList.toggle("hidden");
			});
		});

		// close on document click
		document.addEventListener("click", () => {
			document
				.querySelectorAll(".menu-dropdown")
				.forEach((d) => d.classList.add("hidden"));
		});
	}

	// Primary button handler
	async function handleSetPrimary(e) {
		const btn = e.currentTarget;
		const url = btn.dataset.url;
		const serviceType = btn.dataset.serviceType || "website";
		const row = btn.closest("tr");
		const monitorId = row ? row.dataset.id : null;

		if (!monitorId) {
			craftError("Monitor ID missing.");
			return;
		}

		btn.classList.add("loading");

		try {
			// Build payload based on monitor type
			const payload = { monitorId: monitorId };

			// Only include monitoringUrl for website monitors
			if (serviceType != "port" && url) {
				payload.monitoringUrl = url;
			}

			const response = await fetch(
				"/actions/upsnap/settings/set-primary-monitor",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-CSRF-Token": Craft.csrfTokenValue,
					},
					body: JSON.stringify(payload),
				},
			);

			const json = await response.json();

			if (!json.success) {
				throw new Error(json.message || "Failed to update monitor.");
			}

			craftNotice("Primary monitor updated.");
			window.location.href = Craft.getCpUrl(`upsnap/settings`);

			// Update hidden fields so page state matches
			if (monitoringUrlField()) monitoringUrlField().value = url;
			if (monitorIdField()) monitorIdField().value = monitorId;

			// Refresh table so the "Selected" pill updates
			await loadAndRender();
		} catch (err) {
			console.error(err);
			craftError(err.message || "Error setting primary.");
		} finally {
			btn.classList.remove("loading");
		}
	}

	// Select-all checkbox logic
	function wireSelectAll(tbody) {
		const selectAll = document.querySelector(selectAllSelector);
		if (!selectAll) return;

		selectAll.checked = false;

		selectAll.addEventListener("change", () => {
			const checked = selectAll.checked;

			// toggle all checkboxes
			tbody.querySelectorAll(".upsnap-row-checkbox").forEach((cb) => {
				cb.checked = checked;
			});

			// update bulk button states
			updateBulkMenuState();
		});
	}

	/**
	 * Disable the "Add Monitor" button, optionally showing a tooltip.
	 * Used when the API token is inactive or when the monitor limit is reached.
	 *
	 * @param {string|null} message - Optional tooltip text to display on hover.
	 */
	function disableAddMonitorBtn(message = null) {
		const addMonitorButton = document.getElementById("add-monitor-btn");

		if (!addMonitorButton) return;

		addMonitorButton.classList.add("disabled");
		addMonitorButton.disabled = true;

		// If a message is passed, show a tooltip
		if (message) {
			addMonitorButton.setAttribute("title", message);
		}
	}

	function enableAddMonitorBtn() {
		const addMonitorButton = document.getElementById("add-monitor-btn");
		if (!addMonitorButton) return;

		addMonitorButton.classList.remove("disabled");
		addMonitorButton.disabled = false;
		addMonitorButton.removeAttribute("title");
	}

	// Load monitors and render
	async function loadAndRender(showLoading = false) {
		const apiKey = window.Upsnap?.settings?.apiKey;
		const wrap = document.querySelector(endpointSelector);
		const tbody = document.querySelector(tbodySelector);
		if (!wrap || !tbody) return;

		const endpoint = wrap.dataset.endpoint;
		const selectedUrl =
			wrap.dataset.selected || monitoringUrlField()?.value || "";
		const primaryMonitorId = monitorIdField().value || "";

		const isActiveApiToken =
			window?.Upsnap?.settings?.isActiveApiToken || "";
		const userdetails = window?.Upsnap?.settings?.userDetails || {};
		const maxMonitors = userdetails?.plan_limits?.max_monitors || 0;

		// show loading row
		if (showLoading)
			tbody.innerHTML = `<tr><td colspan="5" class="table-empty-state">Loading monitors…</td></tr>`;

		try {
			let monitors = [];
			// const monitors = [];
			let settingsMap = new Map();

			if (apiKey) {
				// Fetch monitors, settings, tags, and regions in parallel
				const [monitorsResponse, settingsResponse, tagsResponse, regionsResponse] = await Promise.all([
					fetch(endpoint, {
						headers: { "X-CSRF-Token": Craft.csrfTokenValue },
					}),
					fetch("/actions/upsnap/monitors/get-settings", {
						headers: {
							"X-CSRF-Token": Craft.csrfTokenValue,
							Accept: "application/json",
						},
					}),
					fetch("/actions/upsnap/tags/list", {
						headers: {
							"X-CSRF-Token": Craft.csrfTokenValue,
							Accept: "application/json",
						},
					}),
					fetch("/actions/upsnap/regions/list", {
						headers: {
							"X-CSRF-Token": Craft.csrfTokenValue,
							Accept: "application/json",
						},
					}),
				]);

				const monitorsJson = await monitorsResponse.json();
				const settingsJson = await settingsResponse.json();
				const tagsJson = await tagsResponse.json();
				const regionsJson = await regionsResponse.json();

				// Build tags map for lookup
				if (tagsJson.success && Array.isArray(tagsJson.data)) {
					tagsMap.clear();
					tagsJson.data.forEach((tag) => {
						tagsMap.set(tag.id, tag);
					});
				}

				// Build region names map for tooltip
				regionNameMap.clear();
				if (regionsJson.success && Array.isArray(regionsJson.data)) {
					regionsJson.data.forEach((region) => {
						const id = region.id ?? region.slug ?? region;
						const name = region.name ?? region.label ?? String(id);
						regionNameMap.set(String(id), String(name));
					});
				}

				if (
					!monitorsJson.success ||
					!monitorsJson.data ||
					!Array.isArray(monitorsJson.data.monitors)
				) {
					throw new Error(monitorsJson.message || "Failed to load monitors");
				}

				// Build settings map from monitor_id -> config
				if (
					settingsJson.success &&
					settingsJson.data?.settings &&
					Array.isArray(settingsJson.data.settings)
				) {
					settingsJson.data.settings.forEach((setting) => {
						if (setting.monitor_id && setting.config) {
							settingsMap.set(setting.monitor_id, setting.config);
						}
					});
				}

				// Merge config into each monitor and add to array
				monitorsJson.data.monitors.forEach((monitor) => {
					const config = settingsMap.get(monitor.id);
					if (config) {
						monitor.config = config;
					}
					monitors.push(monitor);
				});

				// ------------------------------------
				// FETCH + MERGE UPTIME STATS + INCIDENT STATS (parallel)
				// ------------------------------------
				let uptimeStats = [];
				let incidentStats = [];
				try {
					[uptimeStats, incidentStats] = await Promise.all([
						fetchUptimeStats().catch((e) => { console.warn('Failed to load uptime stats:', e); return []; }),
						fetchIncidentStats().catch((e) => { console.warn('Failed to load incident stats:', e); return []; }),
					]);
				} catch (e) {
					console.warn('Failed to load stats:', e);
				}

				// enrich monitors
				monitors = mergeUptimeStats(monitors, uptimeStats);
				monitors = matchIncidentStats(monitors, incidentStats);
			}

			const monitorCount = monitors.length;

			if (!isActiveApiToken) {
				disableAddMonitorBtn();
			} else {
				if (monitorCount >= maxMonitors) {
					disableAddMonitorBtn(
						`Monitor limit reached (${monitorCount}/${maxMonitors})`,
					);
				} else {
					enableAddMonitorBtn();
				}
			}

			// -------------------------------
			//  NO MONITORS → FALLBACK
			// -------------------------------
			if (monitors.length === 0) {
				populateWithDefaultMonitor(tbody);
				return;
			}

			// build rows
			tbody.innerHTML = "";
			monitors.forEach((m) => {
				tbody.appendChild(buildRow(m, primaryMonitorId));
			});
			// run once initially
			tbody.querySelectorAll(".upsnap-row-checkbox").forEach((cb) => {
				cb.addEventListener("change", updateBulkMenuState);
			});
			updateBulkMenuState();

			wireMenuButtons(tbody);
			wireSelectAll(tbody);

			// set primary button handlers
			tbody.querySelectorAll(".upsnap-set-primary").forEach((b) => {
				b.addEventListener("click", handleSetPrimary);
			});

			// set incidents button handlers + region tooltip
			initiateRegionTooltip();
			wireRegionTooltips(tbody);
			tbody.querySelectorAll(".monitor-incidents-link").forEach((el) => {
				el.addEventListener("click", (e) => {
					e.stopPropagation();

					const monitorId = el.dataset.monitorId;
					if (!monitorId) return;

					const url = Craft.getCpUrl("upsnap/incidents", {
						monitor_id: monitorId,
						timeframe: "24h",
					});

					window.location.href = url;
				});
			});

		} catch (err) {
			tbody.innerHTML = `<tr><td colspan="4">Error loading monitors. See console for details.</td></tr>`;
			console.error("Error loading monitors:", err);

			// Fallback for API errors (including invalid key)
			populateWithDefaultMonitor(tbody);
			if (err.message === "Invalid authentication token") {
				renderStatusContainer({
					message: "There was a problem fetching data.",
					error: err.message || "",
				});
			} else {
				Craft.Upsnap.Monitor.notify(err.message, "error");
			}
		}
	}

	/**
	 * Fetches the uptime stats for the current monitor.
	 *
	 * @return {Promise<Array<object>>} A promise that resolves to an array of uptime stats objects.
	 */
	/**
	 * Fetches region-wise incident stats for all monitors (last 24 hours).
	 *
	 * @returns {Promise<Array>} Array of { monitor_id, regions } objects
	 */
	async function fetchIncidentStats() {
		const res = await fetch(
			'/actions/upsnap/incidents/incident-stats',
			{
				headers: {
					'X-CSRF-Token': Craft.csrfTokenValue,
					'X-Requested-With': 'XMLHttpRequest',
				},
			}
		);

		const json = await res.json();

		if (!json.success) {
			throw new Error(json.message || 'Failed to fetch incident stats');
		}

		return json.data?.stats || [];
	}

	/**
	 * Attaches incident region data from the stats API to each monitor.
	 *
	 * @param {Array<Object>} monitors
	 * @param {Array<Object>} incidentStats - Array of { monitor_id, regions }
	 * @returns {Array<Object>}
	 */
	function matchIncidentStats(monitors, incidentStats) {
		if (!Array.isArray(incidentStats) || incidentStats.length === 0) {
			return monitors;
		}
		return monitors.map((monitor) => {
			const stat = incidentStats.find((s) => s.monitor_id === monitor.id);
			if (stat && Array.isArray(stat.regions)) {
				return { ...monitor, incident_regions: stat.regions };
			}
			return monitor;
		});
	}

	/**
	 * Creates the shared floating tooltip element and wires all delegation
	 * listeners once per page load. Safe to call on every render cycle —
	 * subsequent calls are no-ops because of the ID guard.
	 */
	function initiateRegionTooltip() {
		if (document.getElementById('upsnap-region-tooltip')) return;

		const tooltip = document.createElement('div');
		tooltip.id = 'upsnap-region-tooltip';
		tooltip.className = 'upsnap-region-tooltip';
		document.body.appendChild(tooltip);

		const hideTooltip = () => tooltip.classList.remove('visible');

		const positionTooltip = (e) => {
			const GAP = 12;
			const tw = tooltip.offsetWidth;
			const th = tooltip.offsetHeight;
			const vw = window.innerWidth;
			const vh = window.innerHeight;

			let left = e.clientX + GAP;
			let top  = e.clientY + GAP;

			if (left + tw > vw - GAP) left = e.clientX - tw - GAP;
			if (top  + th > vh - GAP) top  = e.clientY - th - GAP;

			tooltip.style.left = left + 'px';
			tooltip.style.top  = top  + 'px';
		};

		// Delegated mouseover — show when over a trigger, hide otherwise
		document.addEventListener('mouseover', (e) => {
			const trigger = e.target.closest('.monitor-incidents-link[data-region-stats]');
			if (!trigger) {
				hideTooltip();
				return;
			}

			let regions;
			try {
				regions = JSON.parse(trigger.dataset.regionStats);
			} catch {
				hideTooltip();
				return;
			}

			const rows = regions
				.map((r) => {
					const name = escapeHtml(regionNameMap.get(r.region_id) || r.region_id);
					const count = r.incident_count || 0;
					const cls = count > 0 ? 'upsnap-rtt-count--red' : 'upsnap-rtt-count--green';
					return `<div class="upsnap-rtt-row"><span>${name}</span><span class="${cls}">${count}</span></div>`;
				})
				.join('');

			tooltip.innerHTML = `
				<div class="upsnap-rtt-header">Incidents by region (24h)</div>
				${rows}
			`;

			tooltip.classList.add('visible');
			positionTooltip(e);
		});

		// Follow cursor while visible
		document.addEventListener('mousemove', (e) => {
			if (tooltip.classList.contains('visible')) positionTooltip(e);
		});

		// Hide on click anywhere or any scroll
		document.addEventListener('click', hideTooltip);
		document.addEventListener('scroll', hideTooltip, true);
	}

	/**
	 * No-op — tooltip delegation is set up once in initiateRegionTooltip().
	 * Kept so call sites don't need to change.
	 */
	function wireRegionTooltips(container) { // eslint-disable-line no-unused-vars
	}

	async function fetchUptimeStats() {
		const res = await fetch(
			Craft.getCpUrl('upsnap/monitors/uptime-stats'),
			{
				headers: {
					'X-CSRF-Token': Craft.csrfTokenValue,
					'X-Requested-With': 'XMLHttpRequest',
				},
			}
		);

		const json = await res.json();

		if (!json.success) {
			throw new Error(json.message || 'Failed to fetch uptime stats');
		}

		return json.data?.uptime_stats || [];
	}

	/**
	 * Merges an array of monitors with an array of uptime stats.
	 *
	 * @param {Array<Object>} monitors - An array of monitor objects.
	 * @param {Array<Object>} uptimeStats - An array of uptime stats objects.
	 * @returns {Array<Object>} - A new array of monitors with the incident count merged.
	 */
	function mergeUptimeStats(monitors, uptimeStats) {
		return monitors.map((monitor) => {
			const stat = uptimeStats.find(
				(u) => u.monitor_id === monitor.id
			);

			if (stat?.stats) {
				return {
					...monitor,
					incident_count: stat.stats?.day?.incident_count ?? 0,
				};
			}

			return monitor;
		});
	}

	function populateWithDefaultMonitor(tbody) {
		const url = monitoringUrlField()?.value || "";
		tbody.innerHTML = `
		<tr>
			<td></td>

			<td>
				<div class="heading">Default Monitor</div>
				<div class="light" style="margin-top:4px;">${escapeHtml(url)}</div>
			</td>

			<td>
				<span class="pill small pill--gray">N/A</span>
			</td>

			<td class="thin">
				<button class="btn small disabled">Selected</button>
			</td>
		</tr>
		`;

		// hide select-all checkbox
		const selectAll = document.querySelector("#upsnap-select-all");
		if (selectAll) {
			selectAll.style.display = "none";
		}

		// hide bulk-actions menu
		const menuBtn = document.querySelector("#upsnap-actions-menubtn");
		const menuWrapper = document.querySelector(
			"#upsnap-actions-menu-wrapper",
		);
		if (menuBtn) menuBtn.style.display = "none";
		if (menuWrapper) menuWrapper.style.display = "none";
	}

	function updateBulkMenuState() {
		const checkboxes = document.querySelectorAll(".upsnap-row-checkbox");
		const checked = [...checkboxes].filter((cb) => cb.checked);

		const selectAll = document.querySelector("#upsnap-select-all");
		if (selectAll) {
			selectAll.checked =
				checked.length === checkboxes.length && checkboxes.length > 0;
		}

		const editBtn = document.getElementById("upsnap-edit-btn");
		const deleteBtn = document.getElementById("upsnap-delete-btn");

		// If menu isn't rendered yet, bail out safely
		if (!editBtn || !deleteBtn) {
			return;
		}

		editBtn.classList.add("disabled");
		deleteBtn.classList.add("disabled");

		if (checked.length === 1) {
			editBtn.classList.remove("disabled");
			deleteBtn.classList.remove("disabled");
		}

		if (checked.length > 1) {
			deleteBtn.classList.remove("disabled");
		}
	}

	function renderStatusContainer(data) {
		const statusContainerWrapper = document.getElementById(
			"status-container-wrapper",
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
					"Your API token has expired. Please generate a new API token to continue using the service.";
				break;
			case apiTokenStatuses.account_expired:
				title = "Your account has expired.";
				error =
					"Your 3-day free trial has expired. Please verify your email to continue using the service. Check your inbox for the verification link sent at registration, or use the forgot-password flow to verify your account.";
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
	}

	function initBulkMenu() {
		const menuBtn = document.getElementById("upsnap-actions-menubtn");
		const menu = document.getElementById("upsnap-actions-menu");
		const editBtn = document.getElementById("upsnap-edit-btn");
		const deleteBtn = document.getElementById("upsnap-delete-btn");

		// If menu isn't rendered yet, stop and wait for loadAndRender to call it later
		if (!menuBtn || !menu || !editBtn || !deleteBtn) {
			return;
		}

		const menuBtnInstance = new Garnish.MenuBtn($(menuBtn), {
			menu: $(menu),
		});

		menuBtn.addEventListener("click", () => {
			updateBulkMenuState();

			// Force Garnish.MenuBtn to rebuild the menu items
			menuBtnInstance.menu.$container.find("li").each(function () {
				const link = $(this).find("a");
				if (link.hasClass("disabled")) {
					$(this).addClass("disabled");
				} else {
					$(this).removeClass("disabled");
				}
			});
		});

		deleteBtn.addEventListener("click", async () => {
			const deleteBtn = document.getElementById("upsnap-delete-btn");
			if (!deleteBtn || deleteBtn.classList.contains("disabled")) return;

			const rows = [...document.querySelectorAll(".upsnap-row-checkbox")]
				.filter((cb) => cb.checked)
				.map((cb) => cb.closest("tr"));

			const ids = rows.map((r) => r.dataset.id).filter(Boolean);

			if (!ids.length) {
				craftNotice("No monitors selected.");
				return;
			}

			if (!confirm("Delete selected monitors?")) return;

			try {
				const res = await fetch(
					"/actions/upsnap/monitors/bulk-actions",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-CSRF-Token": Craft.csrfTokenValue,
						},
						body: JSON.stringify({ ids, action: "delete" }),
					},
				);

				const json = await res.json();

				if (!res.ok || !json.success) {
					throw new Error(json.message || "Bulk delete failed");
				}

				craftNotice(json.message || "Deleted");
				window.location.href = Craft.getCpUrl(`upsnap/settings`);
			} catch (err) {
				console.error("Bulk delete error", err);
				craftError(err.message || err);
			}
		});

		editBtn.addEventListener("click", () => {
			if (editBtn.classList.contains("disabled")) return;

			const checked = [
				...document.querySelectorAll(".upsnap-row-checkbox"),
			].filter((cb) => cb.checked);

			if (checked.length !== 1) return;

			const monitorId = checked[0].dataset.id;
			if (!monitorId) {
				craftError("Monitor ID not found.");
				return;
			}

			// Redirect to edit page
			window.location.href = Craft.getUrl(
				`upsnap/monitors/edit/${monitorId}`,
			);
		});
	}

	async function fetchSingleMonitor(monitorId) {
		const endpoint = `/admin/upsnap/monitors/detail/${monitorId}?`;

		const response = await fetch(endpoint, {
			headers: { "X-CSRF-Token": Craft.csrfTokenValue },
		});

		const json = await response.json();
		if (!json.success) return null;

		return json.data.monitor;
	}

	function startGeneralPolling() {
		stopGeneralPolling();

		Polling.generalInterval = setInterval(() => {
			loadAndRender();
		}, 500 * 1000); // 5 minutes
	}

	function stopGeneralPolling() {
		if (Polling.generalInterval) {
			clearInterval(Polling.generalInterval);
			Polling.generalInterval = null;
		}
	}
	const POLL_DELAY =  60 * 1000;

	function startMonitorSpecificPolling(monitorId) {
		if (!monitorId) return;
		if (Polling.completedMonitors.has(monitorId)) return;
		if (Polling.monitorTimeouts.has(monitorId)) return;

		// Immediately mark as active so buildRow shows "Checking"
		Polling.activeMonitorIds.add(monitorId);

		// After 60 s fire a single fetch — render result and stop
		const timeoutId = setTimeout(async () => {
			try {
				const updatedMonitor = await fetchSingleMonitor(monitorId);
				// Remove from active set BEFORE updating row so buildRow shows real status
				stopMonitorSpecificPolling(monitorId);
				if (updatedMonitor) {
					updateMonitorRow(updatedMonitor);
				}
			} catch (e) {
				console.error("Monitor polling failed", e);
				stopMonitorSpecificPolling(monitorId);
			}
		}, POLL_DELAY);

		Polling.monitorTimeouts.set(monitorId, timeoutId);
	}

	function isRecentlyChecked(
		lastCheckAt,
		lastUpdatedAt,
		thresholdMs = 2 * 60 * 1000,
	) {
		if (!lastCheckAt) return true;

		const now = Date.now();

		const lastCheckTime = new Date(lastCheckAt).getTime();
		if (isNaN(lastCheckTime)) return true;

		// Case 1: recently checked
		if (now - lastCheckTime < thresholdMs) {
			return true;
		}

		// Case 2: recently updated after last check
		if (lastUpdatedAt) {
			const lastUpdatedTime = new Date(lastUpdatedAt).getTime();
			if (!isNaN(lastUpdatedTime)) {
				return (
					lastUpdatedTime > lastCheckTime &&
					now - lastUpdatedTime < thresholdMs
				);
			}
		}

		return false;
	}

	function stopMonitorSpecificPolling(monitorId) {
		const timeoutId = Polling.monitorTimeouts.get(monitorId);
		if (timeoutId != null) {
			clearTimeout(timeoutId);
		}

		Polling.monitorTimeouts.delete(monitorId);
		Polling.activeMonitorIds.delete(monitorId);

		Polling.completedMonitors.add(monitorId);
	}

	function updateMonitorRow(monitor) {
		const row = document.querySelector(`tr[data-id="${monitor.id}"]`);

		if (!row) return;

		const newRow = buildRow(monitor);
		row.replaceWith(newRow);

		// Re-wire row events
		newRow
			.querySelector(".upsnap-row-checkbox")
			?.addEventListener("change", updateBulkMenuState);

		wireMenuButtons(newRow);

		// Re-wire "Set as Primary" button
		newRow.querySelectorAll(".upsnap-set-primary").forEach((b) => {
			b.addEventListener("click", handleSetPrimary);
		});
	}

	function consumeMonitorChangeQueue() {
		const key = "upsnap:monitor-changes";
		const raw = sessionStorage.getItem(key);
		if (!raw) return;

		let queue = [];
		try {
			queue = JSON.parse(raw) || [];
		} catch (e) {
			queue = [];
		}

		sessionStorage.removeItem(key);

		if (!queue.length) return;

		loadAndRender();

		queue.forEach(({ monitorId }) => {
			if (monitorId && !Polling.completedMonitors.has(monitorId)) {
				startMonitorSpecificPolling(monitorId);
			}
		});
	}

	// Init
	function init() {
		document.addEventListener("DOMContentLoaded", () => {
			initBulkMenu();
			loadAndRender(true);
			startGeneralPolling();
			consumeMonitorChangeQueue();
		});
	}
	init();
})();
