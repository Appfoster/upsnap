(() => {
	const widgets = document.querySelectorAll(".upsnap-monitor-widget");
	if (!widgets.length || !window.Craft) return;

	const escapeHtml = (value) =>
		String(value ?? "").replace(/[&<>"']/g, (char) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		})[char]);

	const formatDate = (value) => {
		if (!value) return "Not checked yet";

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "Not checked yet";

		return date.toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	};

	const statusClass = (status) => {
		if (status === "up") return "is-up";
		if (status === "down") return "is-down";
		if (status === "degraded") return "is-degraded";
		return "is-unknown";
	};

	const statusLabel = (status) => {
		if (status === "up") return "Up";
		if (status === "down") return "Down";
		if (status === "degraded") return "Degraded";
		return "Unknown";
	};

	const render = (widget, payload) => {
		const state = widget.querySelector("[data-upsnap-widget-state]");
		const data = payload?.data || {};
		const monitors = data.monitors || [];
		const dashboardUrl = widget.dataset.dashboardUrl;
		const monitorsUrl = widget.dataset.monitorsUrl;
		const settingsUrl = widget.dataset.settingsUrl;
		const upgradeUrl = widget.dataset.upgradeUrl;

		if (!payload?.success) {
			state.innerHTML = `
				<div class="upsnap-monitor-widget__empty">
					<div>${escapeHtml(payload?.message || "Unable to load monitor statuses.")}</div>
					<a class="btn small" href="${escapeHtml(settingsUrl)}">Open Settings</a>
				</div>
			`;
			return;
		}

		if (!monitors.length) {
			const upgrade = data.isFreePlan
				? `<a class="btn small" href="${escapeHtml(upgradeUrl)}" target="_blank" rel="noopener">Upgrade</a>`
				: "";

			state.innerHTML = `
				<div class="upsnap-monitor-widget__empty">
					<div>No monitors configured yet.</div>
					<div class="upsnap-monitor-widget__empty-actions">
						<a class="btn small submit" href="${escapeHtml(monitorsUrl)}">Add Monitor</a>
						${upgrade}
					</div>
				</div>
			`;
			return;
		}

		const rows = monitors.map((monitor) => {
			const status = monitor.status || "unknown";
			const url = `${dashboardUrl}?monitor_id=${encodeURIComponent(monitor.id || "")}`;

			return `
				<a class="upsnap-monitor-widget__row" href="${escapeHtml(url)}">
					<span class="upsnap-monitor-widget__dot ${statusClass(status)}"></span>
					<span class="upsnap-monitor-widget__main">
						<span class="upsnap-monitor-widget__name">${escapeHtml(monitor.name)}</span>
						<span class="upsnap-monitor-widget__checked">${escapeHtml(formatDate(monitor.lastCheckedAt))}</span>
					</span>
					<span class="upsnap-monitor-widget__status ${statusClass(status)}">${statusLabel(status)}</span>
				</a>
			`;
		}).join("");

		const upgrade = data.isFreePlan
			? `
				<div class="upsnap-monitor-widget__upgrade">
					<span>Free plan shows up to 3 monitors.</span>
					<a href="${escapeHtml(upgradeUrl)}" target="_blank" rel="noopener">Upgrade</a>
				</div>
			`
			: "";

		state.innerHTML = `<div class="upsnap-monitor-widget__rows">${rows}</div>${upgrade}`;
	};

	const load = async (widget) => {
		try {
			const response = await fetch(widget.dataset.endpoint, {
				headers: {
					Accept: "application/json",
					"X-CSRF-Token": Craft.csrfTokenValue,
					"X-Requested-With": "XMLHttpRequest",
				},
			});

			render(widget, await response.json());
		} catch (error) {
			render(widget, {
				success: false,
				message: error?.message || "Unable to load monitor statuses.",
			});
		}
	};

	widgets.forEach((widget) => {
		load(widget);
		setInterval(() => load(widget), 60000);
	});
})();
