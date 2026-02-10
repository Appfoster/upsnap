// resources/js/monitorsTable.js
(() => {
	if (!window.Craft) {
		console.error("Craft global missing.");
		return;
	}

	const Polling = {
		generalInterval: null,
		monitorIntervals: new Map(),
		completedMonitors: new Set(),
		monitorAttempts: new Map(),
		lastKnownStatus: new Map(),
		activeMonitorIds: new Set(),
	};

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
		console.log("Building row,", monitor.config.meta);
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

		// monitor column: name + url + selected pill
		const tdMonitor = document.createElement("td");
		tdMonitor.innerHTML = `
		<div class="heading">${escapeHtml(name)}</div>
		<div class="light" style="margin-top:4px;">${escapeHtml(urlLabel)}</div>
		
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
			if (serviceType === "website" && url) {
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
			const monitors = [];
			if (apiKey) {
				const response = await fetch(endpoint, {
					headers: { "X-CSRF-Token": Craft.csrfTokenValue },
				});
				const json = await response.json();

				if (
					!json.success ||
					!json.data ||
					!Array.isArray(json.data.monitors)
				) {
					throw new Error(json.message || "Failed to load monitors");
				}
				monitors.push(...json.data.monitors);
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
	const MAX_ATTEMPTS = 5;
	const POLL_INTERVAL = 30 * 1000;

	function startMonitorSpecificPolling(monitorId) {
		if (!monitorId) return;

		if (Polling.completedMonitors.has(monitorId)) return;
		if (Polling.monitorIntervals.has(monitorId)) return;

		Polling.monitorAttempts.set(monitorId, 0);
		Polling.activeMonitorIds.add(monitorId);

		const intervalId = setInterval(async () => {
			const attempts = (Polling.monitorAttempts.get(monitorId) || 0) + 1;

			Polling.monitorAttempts.set(monitorId, attempts);

			try {
				const updatedMonitor = await fetchSingleMonitor(monitorId);
				if (!updatedMonitor) return;

				const previousStatus = Polling.lastKnownStatus.get(monitorId);

				// Get primary region status
				const primaryStatus = getPrimaryRegionStatus(updatedMonitor);
				const currentStatus = primaryStatus.lastStatus;

				// First run → store baseline
				if (previousStatus === undefined) {
					Polling.lastKnownStatus.set(monitorId, currentStatus);
				}

				// ✅ Status changed → stop immediately
				if (
					previousStatus !== undefined &&
					currentStatus !== previousStatus
				) {
					stopMonitorSpecificPolling(monitorId);
					updateMonitorRow(updatedMonitor);
					return;
				}

				// Update DOM without loader
				updateMonitorRow(updatedMonitor);

				// ❌ Max attempts reached
				if (attempts >= MAX_ATTEMPTS) {
					stopMonitorSpecificPolling(monitorId);
				}
			} catch (e) {
				console.error("Monitor polling failed", e);
				stopMonitorSpecificPolling(monitorId);
			}
		}, POLL_INTERVAL);

		Polling.monitorIntervals.set(monitorId, intervalId);
	}

	const getPrimaryRegionStatus = (monitor) => {
		if (!monitor.regions || !Array.isArray(monitor.regions)) {
			return {
				lastStatus: monitor.last_status,
				lastCheckAt: monitor.last_check_at,
			};
		}

		const primaryRegion = monitor.regions.find((r) => r.is_primary);
		if (!primaryRegion) {
			return {
				lastStatus: monitor.last_status,
				lastCheckAt: monitor.last_check_at,
			};
		}

		const regionId = primaryRegion.id;
		const serviceLastChecks = monitor.service_last_checks || {};
		const regionChecks = serviceLastChecks[regionId];

		if (!regionChecks) {
			return { lastStatus: null, lastCheckAt: null };
		}

		// Get the uptime check data (most relevant for status monitoring)
		const uptimeCheck = regionChecks.uptime;
		if (uptimeCheck) {
			return {
				lastStatus: uptimeCheck.last_status,
				lastCheckAt: uptimeCheck.last_checked_at,
			};
		}
	};

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
		const intervalId = Polling.monitorIntervals.get(monitorId);
		if (!intervalId) return;

		clearInterval(intervalId);

		Polling.monitorIntervals.delete(monitorId);
		Polling.monitorAttempts.delete(monitorId);
		Polling.lastKnownStatus.delete(monitorId);
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
				Polling.activeMonitorIds.add(monitorId);
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
