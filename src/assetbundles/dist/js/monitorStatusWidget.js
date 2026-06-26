(() => {
	const widgets = document.querySelectorAll(".upsnap-monitor-widget");
	if (!widgets.length || !window.Craft) return;

	const SEARCH_SVG = `<svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" stroke-width="1.75"/><line x1="13.25" y1="13.25" x2="17" y2="17" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`;

	const esc = (v) =>
		String(v ?? "").replace(/[&<>"']/g, (c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

	const formatDate = (v) => {
		if (!v) return "";
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? ""
			: d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
	};

	const STATUS_FILTER = {
		up: "up", down: "down", degraded: "down",
		maintenance: "maintenance", paused: "paused",
	};

	const statusCls = (s) =>
		({ up: "is-up", down: "is-down", degraded: "is-degraded", maintenance: "is-maintenance", paused: "is-paused" }[s] ?? "is-unknown");

	const serviceLabel = (t) =>
		({ website: "WEB", port: "PORT", keyword: "KW" }[t] ?? String(t || "WEB").toUpperCase().slice(0, 4));

	const countStatuses = (monitors) => {
		const c = { all: monitors.length, up: 0, down: 0, maintenance: 0, paused: 0 };
		monitors.forEach((m) => {
			const fk = STATUS_FILTER[m.status];
			if (fk && fk in c) c[fk]++;
		});
		return c;
	};

	const uptimeBadgeHtml = (monitor, period) => {
		const s = monitor.status;
		if (s === "paused")      return `<span class="usw-status-pill is-paused"><span class="usw-badge__label">Paused</span></span>`;
		if (s === "maintenance") return `<span class="usw-status-pill is-maintenance"><span class="usw-badge__label">Maintenance</span></span>`;
		const pct = monitor.statsByPeriod?.[period]?.uptime;
		if (pct === null || pct === undefined) return "";
		const grade = pct >= 99 ? "is-green" : pct >= 90 ? "is-amber" : "is-red";
		return `<span class="usw-uptime-badge ${grade}">${pct}%<span class="usw-badge__label"> uptime</span></span>`;
	};


	const periodOpts = (current) =>
		[["day", "24 h"], ["week", "7 days"], ["month", "30 days"]]
			.map(([v, l]) => `<option value="${v}"${current === v ? " selected" : ""}>${l}</option>`)
			.join("");

	const applySort = (monitors, sort, period) => {
		const arr = [...monitors];
		if (sort === "uptime") {
			return arr.sort((a, b) =>
				(b.statsByPeriod?.[period]?.uptime ?? -1) - (a.statsByPeriod?.[period]?.uptime ?? -1));
		}
		if (sort === "incidents") {
			return arr.sort((a, b) =>
				(b.statsByPeriod?.[period]?.incidents ?? 0) - (a.statsByPeriod?.[period]?.incidents ?? 0));
		}
		return arr.sort((a, b) => a.name.localeCompare(b.name));
	};

	const applyFilter = (monitors, filter, search) => {
		let list = monitors;
		if (filter !== "all") {
			list = list.filter((m) => (STATUS_FILTER[m.status] ?? m.status) === filter);
		}
		const q = (search ?? "").trim().toLowerCase();
		if (q) list = list.filter((m) =>
			m.name.toLowerCase().includes(q) || (m.url ?? "").toLowerCase().includes(q));
		return list;
	};

	const renderRow = (monitor, dashboardUrl, uptimePeriod, incidentsPeriod) => {
		const cls = statusCls(monitor.status);
		const href = `${dashboardUrl}?monitor_id=${encodeURIComponent(monitor.id ?? "")}`;
		const incCount = monitor.statsByPeriod?.[incidentsPeriod]?.incidents;
		const incPill = incCount
			? `<span class="usw-incident-pill">${incCount}<span class="usw-badge__label"> incident${incCount === 1 ? "" : "s"}</span></span>`
			: "";
		const dateFmt = formatDate(monitor.lastCheckedAt);

		return `<a class="usw-row ${cls}" href="${esc(href)}">
			<span class="usw-row__dot-wrap"><span class="usw-row__dot ${cls}"></span></span>
			<span class="usw-row__body">
				<span class="usw-row__line1">
					<span class="usw-row__name">${esc(monitor.name)}</span>
					${dateFmt ? `<span class="usw-row__time">${esc(dateFmt)}</span>` : ""}
					${incPill}
					${uptimeBadgeHtml(monitor, uptimePeriod)}
				</span>
				${monitor.url ? `<span class="usw-row__line2">
					<span class="usw-tag">${esc(serviceLabel(monitor.serviceType))}</span>
					<span class="usw-row__url">${esc(monitor.url)}</span>
					${monitor.regionName ? `<span class="usw-row__region">${esc(monitor.regionName)}</span>` : ""}
				</span>` : ""}
			</span>
		</a>`;
	};

	const renderList = (widget) => {
		const saved = widget._monitorsData;
		if (!saved) return;
		const uptimePeriod    = widget.querySelector("[data-upsnap-period]")?.value ?? "day";
		const incidentsPeriod = widget.querySelector("[data-upsnap-incidents-period]")?.value ?? "day";
		const filter = widget._filter ?? "all";
		const search = widget._search ?? "";
		const sort   = widget._sort ?? "name";

		const visible = applySort(applyFilter(saved.monitors, filter, search), sort, uptimePeriod);

		const listEl = widget.querySelector(".usw-list");
		if (listEl) {
			listEl.innerHTML = visible.length
				? visible.map((m) => renderRow(m, saved.dashboardUrl, uptimePeriod, incidentsPeriod)).join("")
				: `<div class="usw-empty-filter"><p>No monitors match the current filter.</p></div>`;
		}

		widget.querySelectorAll("[data-usw-filter]").forEach((btn) =>
			btn.classList.toggle("is-active", btn.dataset.uswFilter === filter));
		widget.querySelectorAll("[data-usw-sort]").forEach((btn) =>
			btn.classList.toggle("is-active", btn.dataset.uswSort === sort));
	};

	const render = (widget, payload) => {
		const state = widget.querySelector("[data-upsnap-widget-state]");
		const data = payload?.data ?? {};
		const monitors = data.monitors ?? [];
		const { dashboardUrl, monitorsUrl, settingsUrl, upgradeUrl } = widget.dataset;

		if (!payload?.success) {
			state.innerHTML = `<div class="usw-empty"><p>${esc(payload?.message ?? "Unable to load monitor statuses.")}</p><a class="btn small" href="${esc(settingsUrl)}">Open Settings</a></div>`;
			return;
		}

		if (data.isFreePlan) {
			state.innerHTML = `<div class="usw-upgrade-gate">
				<span class="usw-upgrade-gate__icon">★</span>
				<p class="usw-upgrade-gate__title">Live Monitor Status</p>
				<p class="usw-upgrade-gate__desc">See all your monitor statuses at a glance, right from the Craft dashboard. Available on Pro and above.</p>
				<a class="btn submit small" href="${esc(upgradeUrl)}" target="_blank" rel="noopener">Upgrade to Pro</a>
			</div>`;
			return;
		}

		if (!monitors.length) {
			state.innerHTML = `<div class="usw-empty"><p>No monitors configured yet.</p><div class="usw-empty__actions"><a class="btn small submit" href="${esc(monitorsUrl)}">Add Monitor</a></div></div>`;
			return;
		}

		widget._monitorsData  = { monitors, data, dashboardUrl };
		widget._filter        ??= "all";
		widget._search        ??= "";
		widget._sort          ??= "name";

		const uptimePeriod    = widget.querySelector("[data-upsnap-period]")?.value ?? "day";
		const incidentsPeriod = widget.querySelector("[data-upsnap-incidents-period]")?.value ?? "day";
		const filter = widget._filter;
		const sort   = widget._sort;
		const search = widget._search;

		const counts = countStatuses(monitors);

		const chips = [
			{ key: "all",         label: "All",    dotCls: "",           count: counts.all },
			{ key: "up",          label: "Up",     dotCls: "is-up",      count: counts.up },
			{ key: "down",        label: "Down",   dotCls: "is-down",    count: counts.down },
			{ key: "maintenance", label: "Maint.", dotCls: "is-maint",   count: counts.maintenance },
			{ key: "paused",      label: "Paused", dotCls: "is-paused",  count: counts.paused },
		].filter((c) => c.key === "all" || c.count > 0);

		const visible = applySort(applyFilter(monitors, filter, search), sort, uptimePeriod);

		state.innerHTML = `
			<div class="usw-chips">
				${chips.map((c) => `<button class="usw-chip${filter === c.key ? " is-active" : ""}" data-usw-filter="${c.key}"><span class="usw-chip__dot${c.dotCls ? " " + c.dotCls : ""}"></span><span class="usw-chip__label">${esc(c.label)}</span><span class="usw-chip__count">${c.count}</span></button>`).join("")}
			</div>
			<div class="usw-controls">
				<div class="usw-search">
					<span class="usw-search__icon">${SEARCH_SVG}</span>
					<input class="usw-search__input" type="search" placeholder="Search monitors…" value="${esc(search)}" aria-label="Search monitors">
				</div>
				<div class="usw-sort">
					<button class="usw-sort__btn${sort === "name" ? " is-active" : ""}" data-usw-sort="name">Name</button>
					<button class="usw-sort__btn${sort === "uptime" ? " is-active" : ""}" data-usw-sort="uptime">Uptime</button>
					<button class="usw-sort__btn${sort === "incidents" ? " is-active" : ""}" data-usw-sort="incidents">Incidents</button>
				</div>
			</div>
			<div class="usw-period-row">
				<span class="usw-period-group">
					<span class="usw-period-label">Uptime</span>
					<select class="usw-period-select" data-upsnap-period aria-label="Uptime period">${periodOpts(uptimePeriod)}</select>
				</span>
				<span class="usw-period-group">
					<span class="usw-period-label">Incidents</span>
					<select class="usw-period-select" data-upsnap-incidents-period aria-label="Incidents period">${periodOpts(incidentsPeriod)}</select>
				</span>
			</div>
			<div class="usw-list">${visible.length
				? visible.map((m) => renderRow(m, dashboardUrl, uptimePeriod, incidentsPeriod)).join("")
				: `<div class="usw-empty-filter"><p>No monitors match the current filter.</p></div>`
			}</div>`;
	};

	const load = async (widget) => {
		try {
			const res = await fetch(widget.dataset.endpoint, {
				headers: {
					Accept: "application/json",
					"X-CSRF-Token": Craft.csrfTokenValue,
					"X-Requested-With": "XMLHttpRequest",
				},
			});
			render(widget, await res.json());
		} catch (err) {
			render(widget, { success: false, message: err?.message ?? "Unable to load monitor statuses." });
		}
	};

	widgets.forEach((widget) => {
		widget.addEventListener("change", (e) => {
			if (e.target.matches("[data-upsnap-period]") || e.target.matches("[data-upsnap-incidents-period]")) {
				renderList(widget);
			}
		});

		widget.addEventListener("input", (e) => {
			if (e.target.matches(".usw-search__input")) {
				widget._search = e.target.value;
				renderList(widget);
			}
		});

		widget.addEventListener("click", (e) => {
			const filterBtn = e.target.closest("[data-usw-filter]");
			if (filterBtn) {
				widget._filter = filterBtn.dataset.uswFilter;
				renderList(widget);
				return;
			}
			const sortBtn = e.target.closest("[data-usw-sort]");
			if (sortBtn) {
				widget._sort = sortBtn.dataset.uswSort;
				renderList(widget);
			}
		});

		load(widget);
		setInterval(() => load(widget), 60000);
	});
})();
