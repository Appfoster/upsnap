// resources/js/monitorsTable.js
(() => {
	if (!window.Craft) {
		console.error("Craft global missing.");
		return;
	}

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

	const buildRow = (monitor, selectedUrl) => {
		const url = monitor.config?.meta?.url || "";
		const name = monitor.name || url || "Unnamed Monitor";
		const isSelected =
			selectedUrl && normalize(url) === normalize(selectedUrl);

		const tr = document.createElement("tr");
		tr.dataset.id = monitor.id ?? "";
		tr.dataset.url = url;

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
		<div class="heading">${escapeHtml(name)}</div> ${
			isSelected
				? '<span class="pill pill--green small" style="margin-left:6px;">Selected</span>'
				: ""
		}
		<div class="light" style="margin-top:4px;">${escapeHtml(url)}</div>
		
		`;

		// primary column
		const tdPrimary = document.createElement("td");
		tdPrimary.className = "thin";
		tdPrimary.innerHTML = `
			<button class="btn small upsnap-set-primary" data-url="${escapeHtmlAttr(
				url
			)}">Set as Primary Monitor</button>
		`;

		tr.appendChild(tdCheck);
		tr.appendChild(tdMonitor);
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
				}[s])
		);
	}
	function escapeHtmlAttr(s) {
		return escapeHtml(s);
	}
	function escapeId(s) {
		return btoa(s || "").replace(/=/g, "");
	}
	function normalize(s) {
		return (s || "").replace(/\/+$/, "").toLowerCase();
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
	// Primary button handler (AJAX → Save → Refresh table)
	async function handleSetPrimary(e) {
		const btn = e.currentTarget;
		const url = btn.dataset.url;
		const row = btn.closest("tr");
		const monitorId = row ? row.dataset.id : null;

		if (!url || !monitorId) {
			craftError("Monitor data missing.");
			return;
		}

		btn.classList.add("loading");

		try {
			const response = await fetch(
				"/actions/upsnap/settings/set-primary-monitor",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-CSRF-Token": Craft.csrfTokenValue,
					},
					body: JSON.stringify({
						monitorId: monitorId,
						monitoringUrl: url,
					}),
				}
			);

			const json = await response.json();

			if (!json.success) {
				throw new Error(json.message || "Failed to update monitor.");
			}

			craftNotice("Primary monitor updated.");

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

	// Load monitors and render
	async function loadAndRender() {
		const wrap = document.querySelector(endpointSelector);
		const tbody = document.querySelector(tbodySelector);
		if (!wrap || !tbody) return;

		const endpoint = wrap.dataset.endpoint;
		const selectedUrl =
			wrap.dataset.selected || monitoringUrlField()?.value || "";

		// show loading row
		tbody.innerHTML = `<tr><td colspan="4">Loading monitors…</td></tr>`;

		try {
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

			const monitors = json.data.monitors;

			if (monitors.length === 0) {
				// fallback to showing selected/default url if provided
				const url = selectedUrl || monitoringUrlField()?.value || "";
				tbody.innerHTML = `
            	<tr>
                <td></td>
                <td>
                <div class="heading">${escapeHtml(
					url || "No monitors available"
				)}</div>
                ${
					url
						? `<div class="light" style="margin-top:6px">${escapeHtml(
								url
						  )}</div><span class="pill pill--green small" style="margin-left:6px">Selected</span>`
						: ""
				}
                </td>
                <td></td>
                <td></td>
            	</tr>
            `;
				return;
			}

			// build rows
			tbody.innerHTML = "";
			monitors.forEach((m) => {
				tbody.appendChild(buildRow(m, selectedUrl));
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
		}
	}

	function updateBulkMenuState() {
		const checkboxes = document.querySelectorAll(".upsnap-row-checkbox");
		const checked = [...checkboxes].filter((cb) => cb.checked);

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

	function initBulkMenu() {
		const menuBtn = document.getElementById("upsnap-actions-menubtn");
		const menu = document.getElementById("upsnap-actions-menu");
		const editBtn = document.getElementById("upsnap-edit-btn");
		const deleteBtn = document.getElementById("upsnap-delete-btn");

		// If menu isn't rendered yet, stop and wait for loadAndRender to call it later
		if (!menuBtn || !menu || !editBtn || !deleteBtn) {
			console.warn("Bulk menu skipped – elements not found yet.");
			return;
		}

		new Garnish.MenuBtn($(menuBtn), { menu: $(menu) });

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
					}
				);

				const json = await res.json();

				if (!res.ok || !json.success) {
					throw new Error(json.message || "Bulk delete failed");
				}

				craftNotice(json.message || "Deleted");
				loadAndRender();
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
				`upsnap/monitors/edit/${monitorId}`
			);
		});
	}

	// Init
	function init() {
		document.addEventListener("DOMContentLoaded", () => {
			initBulkMenu();
			loadAndRender();
		});
	}

	init();
})();
