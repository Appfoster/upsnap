// incident-detail.js – Vanilla JS IIFE for the Upsnap Incident Detail page.
(() => {
	if (!window.Craft || !window.UpsnapIncidentDetail) {
		console.error("[Upsnap] incident-detail.js: required globals missing.");
		return;
	}

	/* ─── Config ──────────────────────────────────────────────────────────── */
	const cfg = window.UpsnapIncidentDetail;

	/* ─── Selectors ───────────────────────────────────────────────────────── */
	const $ = (sel) => document.querySelector(sel);

	/* ─── Utility helpers ─────────────────────────────────────────────────── */
	const escapeHtml = (str) => {
		if (str === null || str === undefined) return "";
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	};

	const formatDate = (ts) => {
		if (!ts) return "—";
		try {
			return new Date(ts).toLocaleString();
		} catch (_) {
			return ts;
		}
	};

	/**
	 * Normalise a timestamp to a JS Date.
	 * Handles Unix epoch seconds (≤ 9_999_999_999), epoch millis, and ISO strings.
	 */
	const toDate = (ts) => {
		if (!ts) return null;
		const n = Number(ts);
		if (!isNaN(n) && n > 0) {
			// Unix seconds if value is plausibly in seconds range (< year 2286)
			return new Date(n < 10000000000 ? n * 1000 : n);
		}
		const d = new Date(ts);
		return isNaN(d.getTime()) ? null : d;
	};

	/** Returns "YYYY-MM-DD HH:MM:SS" using local time. */
	const formatDateDisplay = (ts) => {
		if (!ts) return "—";
		try {
			const d = toDate(ts);
			if (!d) return String(ts);
			const pad = (n) => String(n).padStart(2, "0");
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
		} catch (_) {
			return String(ts);
		}
	};

	const relativeTime = (ts) => {
		if (!ts) return "—";
		const d = toDate(ts);
		if (!d) return String(ts);
		const diff = Date.now() - d.getTime();
		if (isNaN(diff)) return ts;
		const abs = Math.abs(diff);
		if (abs < 60000) return Craft.t("upsnap", "Just now");
		if (abs < 3600000)
			return Math.floor(abs / 60000) + "m " + Craft.t("upsnap", "ago");
		if (abs < 86400000)
			return Math.floor(abs / 3600000) + "h " + Craft.t("upsnap", "ago");
		return Math.floor(abs / 86400000) + "d " + Craft.t("upsnap", "ago");
	};

	const formatDuration = (seconds) => {
		if (seconds === null || seconds === undefined || isNaN(seconds))
			return "—";
		const s = parseInt(seconds, 10);
		if (s < 60) return s + "s";
		if (s < 3600) return Math.floor(s / 60) + "m " + (s % 60) + "s";
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		return h + "h " + m + "m";
	};

	const statusChipClass = (status) => {
		if (!status) return "chip-unknown";
		const s = String(status).toLowerCase();
		if (s === "down" || s === "failed" || s === "critical")
			return "chip-down";
		if (s === "up" || s === "resolved" || s === "ok") return "chip-up";
		if (s === "degraded" || s === "warning") return "chip-degraded";
		return "chip-unknown";
	};

	const copyToClipboard = (text, btn) => {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				const orig = btn.textContent;
				btn.textContent = Craft.t("upsnap", "Copied!");
				setTimeout(() => {
					btn.textContent = orig;
				}, 1500);
			})
			.catch(() => {});
	};

	/* ─── DOM helpers ─────────────────────────────────────────────────────── */
	const showLoading = () => {
		$("#incident-detail-loading").hidden = false;
		$("#incident-detail-error").hidden = true;
		$("#incident-detail-content").hidden = true;
	};

	const showError = (msg) => {
		$("#incident-detail-loading").hidden = true;
		$("#incident-detail-error").hidden = false;
		$("#incident-detail-content").hidden = true;
		$("#incident-detail-error-msg").textContent = msg;
	};

	const showContent = () => {
		$("#incident-detail-loading").hidden = true;
		$("#incident-detail-error").hidden = true;
		$("#incident-detail-content").hidden = false;
	};

	/* ─── API ─────────────────────────────────────────────────────────────── */
	const fetchIncident = () => {
		const sep = String(cfg.detailEndpoint).includes("?") ? "&" : "?";
		const url = `${cfg.detailEndpoint}${sep}incidentId=${encodeURIComponent(String(cfg.incidentId || ""))}`;
		return Craft.sendActionRequest("GET", url)
			.then((res) => res.data || { success: false })
			.catch((err) => {
				console.error("[Upsnap] fetchIncident failed:", err);
				return {
					success: false,
					message: Craft.t("upsnap", "Failed to load incident."),
				};
			});
	};

	const fetchRegions = () => {
		return Craft.sendActionRequest("GET", cfg.regionsEndpoint)
			.then((res) => res.data || { success: false, data: [] })
			.catch((err) => {
				console.error("[Upsnap] fetchRegions failed:", err);
				return { success: false, data: [] };
			});
	};

	/* ─── Activity log helpers ────────────────────────────────────────────── */
	const formatDateFull = (ts) => {
		if (!ts) return "—";
		const d = new Date(ts);
		if (isNaN(d.getTime())) return String(ts);
		return d.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	};

	const humanizeToken = (str) => {
		if (!str) return "";
		return String(str)
			.replace(/[_-]+/g, " ")
			.trim()
			.replace(/\b\w/g, (c) => c.toUpperCase());
	};

	const getTimelineIntegrationIcon = (iconName) => {
        const fallbackSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path></svg>';

        const logoBaseUrl = window?.UpsnapIncidentDetail?.logoBaseUrl || "";
        if (!iconName || !logoBaseUrl) return fallbackSvg;

        // Normalize incoming value (handles gooogle_chat, GOOGLE_CHAT, etc.)
        const raw = iconName.toLowerCase().trim();

        // Try direct match first
        let integration = window.UpsnapUtils.INTEGRATIONS_TYPES[raw];

        // Optional: fuzzy correction for common mistakes
        if (!integration) {
            if (raw.includes("google") && raw.includes("chat")) {
                integration = window.UpsnapUtils.INTEGRATIONS_TYPES.google_chat;
            }
        }

        // If still not found → fallback
        if (!integration) return fallbackSvg;

        const normalizedName = integration.name.replace(/_/g, "-");
        const humanName = integration.label;

        return `
            <img 
                src="${logoBaseUrl}/${normalizedName}.png" 
                alt="${humanName} integration" 
                style="width:16px;height:16px;display:block"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
            />
            <span style="display:none;align-items:center;justify-content:center">
                ${fallbackSvg}
            </span>
        `;
	};

	/* ─── Activity log grouping ────────────────────────────────────────────── */
	/**
	 * Mirrors Next.js buildTimelineEntries: groups consecutive STATUS_UPDATE/Down
	 * items (2+) into a single GROUPED_STATUS. Returns sorted descending (newest first).
	 */
	const buildTimelineEntries = (activityLog) => {
		if (!Array.isArray(activityLog) || activityLog.length === 0) return [];

		const getDate = (item) => item.date || item.created_at || item.timestamp || "";

		const sortedAsc = activityLog.slice().sort((a, b) => {
			const ta = new Date(getDate(a)).getTime() || 0;
			const tb = new Date(getDate(b)).getTime() || 0;
			return ta - tb;
		});

		const entriesAsc = [];
		let pendingDownEvents = [];

		const flushDownGroup = (downEvents) => {
			if (downEvents.length === 0) return;
			if (downEvents.length === 1) {
				entriesAsc.push(downEvents[0]);
				return;
			}
			const regions = [...new Set(
				downEvents.map((e) => e.region || e.region_id || "").filter(Boolean)
			)];
			const reasons = [...new Set(
				downEvents.map((e) => e.reason || e.message || e.body || e.description || "").filter(Boolean)
			)];
			const causes = [...new Set(
				downEvents
					.map((e) => e.cause != null ? e.cause : (e.http_status_code != null ? e.http_status_code : null))
					.filter((c) => c !== null)
			)];
			entriesAsc.push({
				type: "GROUPED_STATUS",
				alertLogType: "Down",
				count: downEvents.length,
				date: getDate(downEvents[downEvents.length - 1]),
				startDate: getDate(downEvents[0]),
				endDate: getDate(downEvents[downEvents.length - 1]),
				reasons,
				causes,
				regions,
			});
		};

		for (const event of sortedAsc) {
			const type = (event.type || event.log_type || "").toUpperCase();
			const alertLogType = event.alertLogType || event.alert_log_type || "";
			const isDown = type === "STATUS_UPDATE" && alertLogType.toLowerCase() === "down";

			if (isDown) {
				pendingDownEvents.push(event);
				continue;
			}

			flushDownGroup(pendingDownEvents);
			pendingDownEvents = [];
			entriesAsc.push(event);
		}

		flushDownGroup(pendingDownEvents);

		return entriesAsc.sort((a, b) => {
			const ta = new Date(a.date || a.created_at || a.timestamp || 0).getTime();
			const tb = new Date(b.date || b.created_at || b.timestamp || 0).getTime();
			return tb - ta;
		});
	};

	/* ─── Render functions ────────────────────────────────────────────────── */
	const renderHeader = (incident) => {
		const el = $("#incident-detail-header");
		if (!el) return;

		const status = incident.status || "unknown";
		const chipCls = statusChipClass(status);
		const monitorName = incident.monitor_name || incident.monitorName || "";
		const monitorId = String(
			incident.monitor_id || incident.monitorId || "",
		);
		const monitorUrl = monitorId
			? cfg.monitorDetailBaseUrl + monitorId
			: "";
		const checkType = incident.check_type || incident.checkType || "";
		const occurred =
			incident.timestamp ||
			incident.started_at ||
			incident.occurred_at ||
			incident.created_at ||
			"";
		const errorCode = incident.status_code
			"";
		const severity = incident.severity || "";
		const errorMsg =
			incident.error_message ||
			incident.message ||
			incident.body ||
			incident.description ||
			incident.error ||
			"";

		// Status icon SVG
		const isResolved = ["up", "resolved", "ok"].includes(
			status.toLowerCase(),
		);
		const isDown = ["down", "failed", "critical"].includes(
			status.toLowerCase(),
		);
		const iconSvg = isResolved
			? `<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`
			: isDown
				? `<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`
				: `<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`;

		// Copy text
		const copyLines = [
			`Incident ID: ${cfg.incidentId}`,
			monitorName ? `Monitor Name: ${monitorName}` : null,
			severity ? `Severity: ${severity}` : null,
			occurred ? `Occurred: ${formatDateDisplay(occurred)}` : null,
			errorCode ? `Error Code: ${errorCode}` : null,
			`Status: ${status}`,
			errorMsg ? `Incident details: ${errorMsg}` : null,
		]
			.filter(Boolean)
			.join("\n");

		const codeColor = errorCode
			? parseInt(errorCode, 10) >= 500
				? "5xx"
				: parseInt(errorCode, 10) >= 400
					? "4xx"
					: parseInt(errorCode, 10) >= 300
						? "3xx"
						: "2xx"
			: "";

		el.innerHTML = `
<div class="incident-detail-header__inner">
    <div class="incident-detail-header__top">
        <div class="incident-detail-header__left">
            <div class="incident-detail-header__text">
                <h1 class="incident-detail-title">${escapeHtml(errorMsg || "Incident #" + cfg.incidentId)}</h1>
                <span class="incident-detail-status-label">
                    <span class="incident-detail-status-dot incident-detail-status-dot--${escapeHtml(status.toLowerCase())}"></span>
                    ${escapeHtml(status.charAt(0).toUpperCase() + status.slice(1))}
                </span>
            </div>
        </div>
    </div>

    <div class="incident-detail-header__meta">
        ${checkType ? `<span class="incident-detail-meta-item"><span class="incident-detail-meta-label">${Craft.t("upsnap", "Check Type")}:</span> ${escapeHtml(checkType.charAt(0).toUpperCase() + checkType.slice(1))}</span>` : ""}
        ${occurred ? `<span class="incident-detail-meta-item"><span class="incident-detail-meta-label">${Craft.t("upsnap", "Occurred")}:</span> <time datetime="${escapeHtml(occurred)}">${escapeHtml(formatDateDisplay(occurred))}</time></span>` : ""}
        ${errorCode ? `<span class="status-code-badge status-${escapeHtml(codeColor)}">${escapeHtml(String(errorCode))}</span>` : ""}
        <button class="incident-detail-copy-icon-btn" type="button" title="${Craft.t("upsnap", "Copy incident details")}" aria-label="${Craft.t("upsnap", "Copy incident details")}">
            <svg viewBox="0 0 16 16" fill="currentColor" width="15" height="15" aria-hidden="true"><path d="M4 1.5H3a2 2 0 00-2 2V14a2 2 0 002 2h10a2 2 0 002-2V3.5a2 2 0 00-2-2h-1v1h1a1 1 0 011 1V14a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5a1 1 0 011-1h1v-1z"/><path d="M9.5 1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5h3zm-3-1A1.5 1.5 0 005 1.5v1A1.5 1.5 0 006.5 4h3A1.5 1.5 0 0011 2.5v-1A1.5 1.5 0 009.5 0h-3z"/></svg>
        </button>
    </div>
</div>`;

		// Wire copy button
		const copyBtn = el.querySelector(".incident-detail-copy-icon-btn");
		if (copyBtn) {
			copyBtn.addEventListener("click", () => {
				navigator.clipboard
					.writeText(copyLines)
					.then(() => {
						copyBtn.classList.add(
							"incident-detail-copy-icon-btn--copied",
						);
						const orig = copyBtn.innerHTML;
						copyBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z"/></svg>`;
						setTimeout(() => {
							copyBtn.innerHTML = orig;
							copyBtn.classList.remove(
								"incident-detail-copy-icon-btn--copied",
							);
						}, 2000);
					})
					.catch(() => {});
			});
		}
	};

	const renderOverviewCard = (incident) => {
		const el = $("#incident-detail-overview");
		if (!el) return;

		const monitorName = incident.monitor_name || incident.monitorName || "";
		const monitorId = incident.monitor_id || incident.monitorId || "";
		const monitorUrl = monitorId
			? cfg.monitorDetailBaseUrl + monitorId
			: "";
		const region = incident.region || "—";
		const incidentId = incident.id || cfg.incidentId;
		const incidentText =
			incident.error_message ||
			incident.message ||
			incident.body ||
			incident.description ||
			incident.error ||
			String(incidentId);
		const severity = incident.severity || "—";
		const checkType = incident.check_type || incident.checkType || "—";
		const startTs =
			incident.timestamp ||
			incident.started_at ||
			incident.created_at ||
			"";
		const endTs = incident.resolved_at || "";
		const duration =
			incident.duration_seconds !== undefined
				? incident.duration_seconds
				: incident.duration;
		const checksFailed =
			incident.checks_failed_count ?? incident.checksFailed ?? "—";
		const notifsSent =
			incident.notifications_sent_count ??
			incident.notificationsSent ??
			"—";

		const monitorCell = escapeHtml(monitorName || monitorId || "—");

		const severityClass =
			{
				critical: "severity-critical",
				high: "severity-high",
				medium: "severity-medium",
				low: "severity-low",
			}[String(severity).toLowerCase()] || "";

		const checkTypeDisplay =
			String(checkType).charAt(0).toUpperCase() +
			String(checkType).slice(1);

		const rows = [
			// Section: Monitor
			{ label: Craft.t("upsnap", "Monitor Name"), html: monitorCell },
			{ label: Craft.t("upsnap", "Region"), value: region },
			// Section: Incident
			{ label: Craft.t("upsnap", "Incident"), value: incidentText },
			// Section: Classification
			{
				label: Craft.t("upsnap", "Severity"),
				html:
					severity !== "—"
						? `<span class="incident-detail-severity-badge ${escapeHtml(severityClass)}">${escapeHtml(String(severity).charAt(0).toUpperCase() + String(severity).slice(1))}</span>`
						: "—",
			},
			{
				label: Craft.t("upsnap", "Affected Check"),
				value: checkTypeDisplay,
			},
			// Section: Timing
			{
				label: Craft.t("upsnap", "Start Time"),
				value: formatDateDisplay(startTs),
			},
			{
				label: Craft.t("upsnap", "End Time"),
				value: endTs ? formatDateDisplay(endTs) : "—",
			},
			{
				label: Craft.t("upsnap", "Duration"),
				value: formatDuration(duration),
			},
			// Section: Impact
			{
				label: Craft.t("upsnap", "Total Checks Failed"),
				value: String(checksFailed),
			},
			{
				label: Craft.t("upsnap", "Notifications Sent"),
				value: String(notifsSent),
			},
		];

		const rowsHtml = rows
			.map(
				({ label, value, html }) => `
<div class="incident-detail-overview-item">
    <dt class="incident-detail-overview-label">${escapeHtml(label)}</dt>
    <dd class="incident-detail-overview-value">${html !== undefined ? html : escapeHtml(value ?? "—")}</dd>
</div>`,
			)
			.join("");

		el.innerHTML = `
<h2 class="incident-detail-card__heading">${Craft.t("upsnap", "Overview")}</h2>
<dl class="incident-detail-overview-grid">${rowsHtml}
</dl>`;
	};

	const renderAiSummary = (incident) => {
		const el = $("#incident-detail-ai-summary");
		if (!el) return;

		const aiSummary =
			incident.ai_summary || incident.aiSummary || incident.summary;
		if (!aiSummary) {
			el.hidden = true;
			return;
		}
		el.hidden = false;

		const summaryText =
			typeof aiSummary === "string"
				? aiSummary
				: aiSummary.summary || "";
		const likelyCauses =
			typeof aiSummary === "object" && Array.isArray(aiSummary.likely_causes)
				? aiSummary.likely_causes
				: [];
		const whatToCheck =
			typeof aiSummary === "object" && Array.isArray(aiSummary.what_to_check)
				? aiSummary.what_to_check
				: [];

		const causesHtml = likelyCauses.length
			? likelyCauses
					.map((item) => `<li>${escapeHtml(String(item))}</li>`)
					.join("")
			: `<li>${Craft.t("upsnap", "No likely causes available.")}</li>`;

		const checksHtml = whatToCheck.length
			? whatToCheck
					.map((item) => `<li>${escapeHtml(String(item))}</li>`)
					.join("")
			: `<li>${Craft.t("upsnap", "No checks available.")}</li>`;

		el.innerHTML = `
<div class="incident-detail-ai-card">
	<div class="incident-detail-ai-head">
		<h2 class="incident-detail-card__heading incident-detail-ai-card__heading">✧ ${Craft.t("upsnap", "AI Incident Summary")}</h2>
		<p class="incident-detail-ai-subtitle">${Craft.t("upsnap", "High-level diagnosis and guidance")}</p>
	</div>

	<div class="incident-detail-ai-summary-box">
		${escapeHtml(summaryText || Craft.t("upsnap", "No AI summary available."))}
	</div>

	<div class="incident-detail-ai-columns">
		<div class="incident-detail-ai-panel incident-detail-ai-panel--causes">
			<h3 class="incident-detail-ai-panel-title">⚠ ${Craft.t("upsnap", "Likely Causes")}</h3>
			<ul class="incident-detail-ai-list">${causesHtml}</ul>
		</div>
		<div class="incident-detail-ai-panel incident-detail-ai-panel--checks">
			<h3 class="incident-detail-ai-panel-title">◎ ${Craft.t("upsnap", "What To Check")}</h3>
			<ul class="incident-detail-ai-list">${checksHtml}</ul>
		</div>
	</div>
</div>`;
	};

	const renderSuggestedActions = (incident) => {
		const el = $("#incident-detail-suggested-actions");
		if (!el) return;

		const actions = incident.suggested_actions || incident.suggestedActions;
		if (!Array.isArray(actions) || actions.length === 0) {
			el.hidden = true;
			return;
		}
		el.hidden = false;

		const actionItems = actions.map((a) =>
			typeof a === "string"
				? a
				: a.action || a.text || JSON.stringify(a),
		);

		el.innerHTML = `
<div class="incident-detail-actions-card">
	<div class="incident-detail-actions-head">
		<h2 class="incident-detail-card__heading incident-detail-actions-title">${Craft.t("upsnap", "Suggested Actions")}</h2>
		<p class="incident-detail-actions-subtitle">${Craft.t("upsnap", "Actionable steps to speed up incident resolution")}</p>
	</div>
	<ul class="incident-detail-actions-grid">
		${actionItems.map((text) => `<li class="incident-detail-action-item"><span class="incident-detail-action-icon" aria-hidden="true">◌</span><span class="incident-detail-action-text">${escapeHtml(text)}</span></li>`).join("")}
	</ul>
</div>`;
	};

	const renderHttpHeaders = (incident) => {
		const el = $("#incident-detail-http-headers");
		if (!el) return;

		const meta = incident.meta || {};
		const monitoredFrom = meta.monitoredFrom || {};

		const responseHeaders = {
			"Status Code":
				meta.statusCode ||
				incident.status_code ||
				incident.http_status_code ||
				incident.statusCode ||
				"N/A",
			"Final URL":
				meta.finalURL || meta.finalUrl || incident.final_url || "N/A",
			"Duration (ms)":
				meta.durationMs || meta.duration_ms || incident.duration_ms || "N/A",
		};

		const requestInfo = {
			"Monitored From": monitoredFrom.location || "N/A",
			"IP Address": monitoredFrom.ip || "N/A",
			ISP: monitoredFrom.org || "N/A",
			Timezone: monitoredFrom.timezone || "N/A",
			"Resolved IPs": Array.isArray(meta.resolvedIPs)
				? meta.resolvedIPs.join(", ") || "N/A"
				: "N/A",
		};

		const tlsInfo = meta.tls
			? {
					"TLS Version": meta.tls.version || "N/A",
					"Server Name": meta.tls.serverName || "N/A",
					ALPN: meta.tls.alpn || "N/A",
					"Cipher Suite": meta.tls.cipherSuite || "N/A",
				}
			: null;

		const renderRows = (obj) =>
			Object.entries(obj)
				.map(
					([key, value]) => `
<div class="incident-detail-kv-row">
    <span class="incident-detail-kv-key">${escapeHtml(String(key))}</span>
    <span class="incident-detail-kv-sep">: </span>
    <span class="incident-detail-kv-val">${escapeHtml(String(value ?? "N/A"))}</span>
</div>`,
				)
				.join("");

		const copyIcon = `
<svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M4 1.5H3a2 2 0 00-2 2V14a2 2 0 002 2h10a2 2 0 002-2V3.5a2 2 0 00-2-2h-1v1h1a1 1 0 011 1V14a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5a1 1 0 011-1h1v-1z"/><path d="M9.5 1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5h3zm-3-1A1.5 1.5 0 005 1.5v1A1.5 1.5 0 006.5 4h3A1.5 1.5 0 0011 2.5v-1A1.5 1.5 0 009.5 0h-3z"/></svg>`;
        const checkIcon = `
<svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" aria-hidden="true"><path fill-rule="evenodd" d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z"/></svg>`;

		const renderSection = (title, key, obj) => `
<div class="incident-detail-http-section">
    <div class="incident-detail-http-section__head">
        <h3 class="incident-detail-http-section__title">${escapeHtml(title)}</h3>
        <button class="incident-detail-copy-btn2" type="button" data-copy-section="${escapeHtml(key)}">${copyIcon}<span>${Craft.t("upsnap", "COPY")}</span></button>
    </div>
    <div class="incident-detail-code-box">${renderRows(obj)}</div>
</div>`;

		el.hidden = false;
		el.innerHTML = `
<details class="incident-detail-accordion">
    <summary class="incident-detail-accordion__toggle incident-detail-accordion__toggle--lg">
        <span>${Craft.t("upsnap", "HTTP Headers & Request Info")}</span>
    </summary>
    <div class="incident-detail-accordion__body incident-detail-accordion__body--spacious">
        ${renderSection(Craft.t("upsnap", "HTTP Headers"), "response", responseHeaders)}
        ${renderSection(Craft.t("upsnap", "Request Info"), "request", requestInfo)}
        ${tlsInfo ? renderSection(Craft.t("upsnap", "TLS Info"), "tls", tlsInfo) : ""}
    </div>
</details>`;

		const copyMap = {
			response: responseHeaders,
			request: requestInfo,
			tls: tlsInfo,
		};

		el.querySelectorAll("[data-copy-section]").forEach((btn) => {
			btn.addEventListener("click", () => {
				const key = btn.getAttribute("data-copy-section");
				const sectionData = key ? copyMap[key] : null;
				if (!sectionData) return;
				const text = Object.entries(sectionData)
					.map(([k, v]) => `${k}: ${v}`)
					.join("\n");

				navigator.clipboard
					.writeText(text)
					.then(() => {
						btn.innerHTML = `${checkIcon}<span>${Craft.t("upsnap", "Copied!")}</span>`;
						btn.classList.add("incident-detail-copy-btn2--copied");
						setTimeout(() => {
							btn.innerHTML = `${copyIcon}<span>${Craft.t("upsnap", "COPY")}</span>`;
							btn.classList.remove("incident-detail-copy-btn2--copied");
						}, 2000);
					})
					.catch(() => {});
			});
		});
	};

	const svgCheck = '<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>';
	const svgExclamation = '<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>';
	const svgArrowPath = '<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H5.498a.75.75 0 00-.75.75v3.464a.75.75 0 001.5 0v-1.43l.312.311a7 7 0 0011.186-3.139.75.75 0 00-1.434-.434zM5.171 10.56a5.5 5.5 0 019.083-2.626l.326.327H12.114a.75.75 0 000 1.5h3.094a.75.75 0 00.75-.75V5.544a.75.75 0 00-1.5 0v1.48l-.326-.327A7 7 0 003.8 10.84a.75.75 0 001.372.72z" clip-rule="evenodd"/></svg>';

	const getActivityIconHtml = (item) => {
		const type = (item.type || "").toUpperCase();
		const alertLogType = item.alertLogType || item.alert_log_type || "";

		if (type === "GROUPED_STATUS") {
			return alertLogType === "Up"
				? `<div class="tl-icon tl-icon--up">${svgCheck}</div>`
				: `<div class="tl-icon tl-icon--down">${svgExclamation}</div>`;
		}

		if (type === "NOTIFICATION") {
			const status = (item.notificationStatus || item.notification_status || "").toUpperCase();
			const isFailed = status !== "SUCCESS";
			let notifType = item.notificationType || item.notification_type || "";
			if (notifType === "email") notifType = "mail";
			const colorClass = isFailed ? "tl-icon--notif-failed" : "tl-icon--notif-success";
			return `<div class="tl-icon ${colorClass} tl-icon--notif">${getTimelineIntegrationIcon(notifType)}</div>`;
		}

		if (type === "STATUS_UPDATE") {
			return alertLogType === "Up"
				? `<div class="tl-icon tl-icon--up">${svgCheck}</div>`
				: `<div class="tl-icon tl-icon--down">${svgExclamation}</div>`;
		}

		return `<div class="tl-icon tl-icon--default">${svgArrowPath}</div>`;
	};

	const getActivityTitleHtml = (item) => {
		const type = (item.type || "").toUpperCase();
		const alertLogType = item.alertLogType || item.alert_log_type || "";

		if (type === "GROUPED_STATUS") {
			if (alertLogType === "Down") {
				const rc = (item.regions && item.regions.length) ? item.regions.length : 1;
				return `Down detected (${escapeHtml(String(item.count))} checks failed across ${rc} region${rc > 1 ? "s" : ""})`;
			}
			return `Recovered (${escapeHtml(String(item.count))} status updates)`;
		}

		if (type === "NOTIFICATION") {
			const notifStatus = (item.notificationStatus || item.notification_status || "").toUpperCase();
			const isSuccess = notifStatus === "SUCCESS";
			const notifEvent = (item.notificationEvent || item.notification_event || "").toLowerCase();
			let eventHtml;
			if (notifEvent === "down") {
				eventHtml = `<span class="tl-event-label tl-event-label--down">Down</span> Notification`;
			} else if (notifEvent === "up") {
				eventHtml = `<span class="tl-event-label tl-event-label--up">Up</span> Notification`;
			} else if (notifEvent === "detection") {
				eventHtml = `<span class="tl-event-label tl-event-label--detection">Detection</span> Notification`;
			} else {
				eventHtml = "Notification";
			}
			const badgeHtml = notifStatus
				? ` <span class="tl-badge ${isSuccess ? "tl-badge--success" : "tl-badge--failed"}">${isSuccess ? "Success" : "Failed"}</span>`
				: "";
			return `${eventHtml}${badgeHtml}`;
		}

		if (type === "STATUS_UPDATE") {
			return alertLogType === "Up" ? "Monitor recovered" : "Monitor down";
		}

		return "Activity";
	};

	const getActivityDescriptionHtml = (item) => {
		const type = (item.type || "").toUpperCase();

		if (type === "GROUPED_STATUS") {
			const mostRecentReason = (item.reasons && item.reasons[0]) || "Status changed";
			const primaryCause = item.causes && item.causes.length > 0 ? item.causes[0] : undefined;
			const causeHtml = (primaryCause !== undefined && primaryCause !== null && primaryCause !== 0)
				? ` <span class="tl-cause">(Status: ${escapeHtml(String(primaryCause))})</span>`
				: "";
			const dateRangeHtml = item.count > 1
				? `<span class="tl-daterange">From ${escapeHtml(formatDateFull(item.startDate))} to ${escapeHtml(formatDateFull(item.endDate))}</span>`
				: "";
			return `<span class="tl-desc-text">${escapeHtml(mostRecentReason)}${causeHtml}</span>${dateRangeHtml}`;
		}

		if (type === "NOTIFICATION") {
			const notifStatus = (item.notificationStatus || item.notification_status || "").toUpperCase();
			const isSuccess = notifStatus === "SUCCESS";
			const notifType = item.notificationType || item.notification_type || "";
			const channelName = humanizeToken(notifType) || "Unknown";
			if (isSuccess) {
				const sentTo = item.sentToFullName || item.sent_to_full_name || "Unknown";
				const tooltipValue = item.sentToValue || item.sent_to_value || channelName;
				return `<span class="tl-desc-text">Sent to <strong>${escapeHtml(sentTo)}</strong> via <span class="tl-channel-tooltip" data-tooltip="${escapeHtml(String(tooltipValue))}" aria-label="${escapeHtml(String(tooltipValue))}">${escapeHtml(channelName)}</span></span>`;
			}
			const failureReason = item.failureReason || item.failure_reason || "";
			const failureHtml = failureReason
				? `<span class="tl-failure-reason">${escapeHtml(failureReason)}</span>`
				: "";
			return `<span class="tl-desc-text">Tried sending notification to <strong>${escapeHtml(channelName)}</strong> but failed.</span>${failureHtml}`;
		}

		if (type === "STATUS_UPDATE") {
			const reason = item.reason || item.message || item.body || item.description || "";
			const cause = item.cause != null ? item.cause : (item.http_status_code != null ? item.http_status_code : null);
			const causeHtml = (cause !== null && cause !== 0)
				? ` <span class="tl-cause">(Status: ${escapeHtml(String(cause))})</span>`
				: "";
			return `<span class="tl-desc-text">${escapeHtml(reason || "Status changed")}${causeHtml}</span>`;
		}

		return "";
	};

	const renderActivityTimeline = (activityLog) => {
		const el = $("#incident-detail-timeline");
		if (!el) return;

		const entries = buildTimelineEntries(activityLog);

		if (entries.length === 0) {
			el.innerHTML = `
<h2 class="incident-detail-card__heading">${Craft.t("upsnap", "Activity Log")}</h2>
<div class="tl-empty"><span class="tl-empty-text">${Craft.t("upsnap", "No activity recorded yet")}</span></div>`;
			return;
		}

		const itemsHtml = entries.map((item) => {
			const ts = item.date || item.created_at || item.timestamp || "";
			return `
<div class="tl-item">
	<div class="tl-icon-wrap">${getActivityIconHtml(item)}</div>
	<div class="tl-body">
		<div class="tl-header-row">
			<span class="tl-title">${getActivityTitleHtml(item)}</span>
			<time class="tl-reltime">${escapeHtml(relativeTime(ts))}</time>
		</div>
		<div class="tl-desc">${getActivityDescriptionHtml(item)}</div>
		<time class="tl-abstime">${escapeHtml(formatDateFull(ts))}</time>
	</div>
</div>`;
		}).join("");

		el.innerHTML = `
<h2 class="incident-detail-card__heading">${Craft.t("upsnap", "Activity Log")}</h2>
<div class="tl-container">
	<div class="tl-line" aria-hidden="true"></div>
	<div class="tl-items">${itemsHtml}</div>
</div>`;
	};

	/* ─── Main render ─────────────────────────────────────────────────────── */
	const renderPage = (incident, regions) => {
		renderHeader(incident);
		renderOverviewCard(incident);
		renderAiSummary(incident);
		renderSuggestedActions(incident);
		renderHttpHeaders(incident);

		const activityLog = incident.activity_log || incident.activityLog || [];
		renderActivityTimeline(activityLog, regions);

		showContent();
	};

	/* ─── Init ────────────────────────────────────────────────────────────── */
	const init = () => {
		showLoading();

		Promise.all([fetchIncident(), fetchRegions()])
			.then(([incidentRes, regionsRes]) => {
				if (!incidentRes.success) {
					showError(
						incidentRes.message ||
							Craft.t("upsnap", "Failed to load incident."),
					);
					return;
				}

				const incidentData = incidentRes.data || {};
				const incident = incidentData.incident || incidentData;
				const regions =
					(regionsRes.success ? regionsRes.data : null) || [];

				renderPage(incident, regions);
			})
			.catch((err) => {
				console.error("[Upsnap] incident-detail fetch error:", err);
				showError(Craft.t("upsnap", "An unexpected error occurred."));
			});
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
