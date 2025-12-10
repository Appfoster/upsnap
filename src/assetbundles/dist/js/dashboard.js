Craft.UpsnapDashboard = {
	init() {
		this.refreshBtn = document.getElementById("refresh-btn");

		this.initializeDashboard();
		this.renderMonitorCards();

		if (this.refreshBtn) {
			this.refreshBtn.addEventListener("click", () => {
				this.runWithRefreshButton(this.refreshBtn, () =>
					this.initializeDashboard()
				);
			});
		}
	},

	renderCard({ cardId, title, status, message, checkedAt, detailUrl }) {
		const card = document.getElementById(cardId);
		if (!card) return;

		card.classList.remove("skeleton");

		const statusClass =
			status === "ok"
				? "success"
				: status === "error"
				? "error"
				: "warning";

		const icon = status === "ok" ? "✓" : status === "error" ? "✗" : "!";

		const formattedCheckedAt = checkedAt
			? new Date(checkedAt).toLocaleString()
			: "N/A";

		card.innerHTML = `
            <div class="card-header">
                <h3>${title}</h3>
                <hr>
            </div>
            <div class="card-body">
                <p class="status-message">
                    <span class="status-icon ${statusClass}">${icon}</span>
                    ${message ?? "Something Went Wrong!"}
                </p>
                <p><strong>Last checked at:</strong> ${formattedCheckedAt}</p>
            </div>
            <div class="card-footer">
                <a href="${detailUrl}" class="detail-link" target="_blank" rel="noopener">View Details →</a>
            </div>
        `;
	},

	renderErrorCard({ cardId, title, errorMsg }) {
		const card = document.getElementById(cardId);
		if (!card) return;

		card.classList.remove("skeleton");
		card.innerHTML = `
            <div class="card-header">
                <h3>${title}</h3>
                <hr>
            </div>
            <div class="card-body">
                <p class="error">✗ Failed to load ${title.toLowerCase()}: ${errorMsg}</p>
            </div>
        `;
	},

	fetchAndRenderCard({ action, cardId, getMessage, getStatus }) {
		return Craft.sendActionRequest("POST", action)
			.then((response) => {
				response = response?.data;
				const data = response?.data;

				this.renderCard({
					cardId,
					title: response?.title,
					status: getStatus ? getStatus(data) : data.status,
					message: getMessage
						? getMessage(data)
						: data.status === "ok"
						? data.message
						: data.error,
					checkedAt: data.checkedAt,
					detailUrl: response?.url,
				});
			})
			.catch((error) => {
				const msg = error.response?.data
					? error.response.data.error || "Unknown error"
					: error.message;

				this.renderErrorCard({
					cardId,
					title: action,
					errorMsg: msg,
				});
			});
	},

	initializeDashboard() {
		const calls = [
			this.fetchAndRenderCard({
				action: "upsnap/health-check/reachability",
				cardId: "reachability-card",
			}),
			this.fetchAndRenderCard({
			    action: 'upsnap/health-check/security-certificates',
			    cardId: 'ssl-card',
			}),
			this.fetchAndRenderCard({
			    action: 'upsnap/health-check/broken-links',
			    cardId: 'broken-links-card',
			    getMessage: (data) =>
			        data.status === 'false' ? data.error : data.message
			}),
			this.fetchAndRenderCard({
			    action: 'upsnap/health-check/domain-check',
			    cardId: 'domain-check-card',
			}),
			this.fetchAndRenderCard({
			    action: 'upsnap/health-check/mixed-content',
			    cardId: 'mixed-content-card',
			}),
			this.fetchAndRenderCard({
			    action: 'upsnap/health-check/lighthouse',
			    cardId: 'lighthouse-card',
			}),
		];

		return Promise.allSettled(calls);
	},

	runWithRefreshButton(button, fetchFn) {
		if (!button || typeof fetchFn !== "function") return;

		const originalHtml = button.innerHTML;

		button.disabled = true;
		button.classList.add("disabled");

		return Promise.resolve()
			.then(fetchFn)
			.catch((err) => console.error("Dashboard refresh error:", err))
			.finally(() => {
				button.disabled = false;
				button.classList.remove("disabled");
				button.innerHTML = originalHtml;
			});
	},
	// ===========================================================
	//  Helper: Uptime Color
	// ===========================================================
	uptimeColor(value) {
		if (value === null) return "gray";
		if (value >= 99) return "green";
		if (value >= 95) return "yellow";
		return "red";
	},

	renderNoDataCard(card, title) {
		if (!card) return;

		card.classList.remove("skeleton");
		card.innerHTML = `
			<div class="card-header">${title}</div>
			<div class="card-body gray">No data available</div>
		`;
	},

	// ===========================================================
	// 1. Current Status Card
	// ===========================================================
	renderStatusCard(data) {
		const card = document.getElementById("monitor-status-card");
		if (!card) return;

		if (!data || !data.last_status) {
			this.renderNoDataCard(card, "Current Status");
			return;
		}

		let status = data.last_status;
		let label, colorClass;

		if (status === "up") {
			label = "Up";
			colorClass = "green";
		} else if (status === "down") {
			label = "Down";
			colorClass = "red";
		} else {
			label = "Checking…";
			colorClass = "gray";
		}

		card.classList.remove("skeleton");
		card.innerHTML = `
        <div class="card-header">Current Status</div>
        <div class="card-body ${colorClass}">${label}</div>
    `;
	},

	// ===========================================================
	// 2. Last Check Card
	// ===========================================================
	renderLastCheckCard(data) {
		const card = document.getElementById("monitor-last-check-card");
		if (!card) return;

		if (!data) {
			this.renderNoDataCard(card, "Last check");
			return;
		}

		const lastCheck = data.last_check_at
			? new Date(data.last_check_at).toLocaleString()
			: "N/A";

		const intervalSeconds =
			data?.config?.services?.uptime?.monitor_interval;
		const intervalMinutes = intervalSeconds
			? Math.round(intervalSeconds / 60)
			: null;

		card.classList.remove("skeleton");
		card.innerHTML = `
        <div class="card-header">Last check</div>
        <div class="card-body">
            <strong>${lastCheck}</strong><br>
            ${intervalMinutes ? `Checked every ${intervalMinutes}m` : ""}
        </div>
    `;
	},

	// ===========================================================
	// 3. 24h Summary Card
	// ===========================================================
	render24hChartCard(data) {
		const card = document.getElementById("monitor-24h-card");
		if (!card) return;

		if (!data || !data.histogram.data || data.histogram.data.length === 0) {
			this.renderNoDataCard(card, "Last 24 hours");
			return;
		}

		const histogram = data?.histogram?.data ?? [];
		const lastStatus = data?.last_status;
		const isEnabled = data?.is_enabled ?? true;

		// Handle states (disabled, checking, no data)
		if (!isEnabled) {
			card.classList.remove("skeleton");
			card.innerHTML = `
            <div class="card-header">Last 24 hours</div>
            <div class="card-body gray">Monitor paused</div>
        `;
			return;
		}

		if (isEnabled && lastStatus == null) {
			card.classList.remove("skeleton");
			card.innerHTML = `
            <div class="card-header">Last 24 hours</div>
            <div class="card-body gray">Checking latest results…</div>
        `;
			return;
		}

		if (!histogram || histogram.length === 0) {
			card.classList.remove("skeleton");
			card.innerHTML = `
            <div class="card-header">Last 24 hours</div>
            <div class="card-body gray">No data available</div>
        `;
			return;
		}

		// Build histogram bars
		let bars = histogram
			.map((bucket) => {
				const date = new Date(bucket.timestamp * 1000);
				const formatted = date.toLocaleString("en-US", {
					month: "short",
					day: "numeric",
					year: "2-digit",
					hour: "2-digit",
					minute: "2-digit",
				});

				// tooltip text
				let tooltip = "";
				if (bucket.uptime === null) {
					tooltip = `
                    <div class="tooltip-date">${formatted}</div>
                    <div class="tooltip-text gray">No data</div>
                `;
				} else if (bucket.uptime === 0) {
					tooltip = `
                    <div class="tooltip-date">${formatted}</div>
                    <div class="tooltip-text red">Down 0%</div>
                `;
				} else {
					tooltip = `
                    <div class="tooltip-date">${formatted}</div>
                    <div class="tooltip-text green">Up ${(
						bucket.uptime * 100
					).toFixed(3)}%</div>
                `;
				}

				// bar color
				let colorClass = "";
				if (bucket.uptime === null) colorClass = "bar-gray";
				else if (bucket.uptime === 0) colorClass = "bar-red";
				else if (bucket.uptime >= 1) colorClass = "bar-green";
				else if (bucket.uptime >= 0.99) colorClass = "bar-yellow";
				else colorClass = "bar-red";

				return `
                <div class="histogram-bar-wrapper">
                    <div class="histogram-bar ${colorClass}" data-tooltip="${encodeURIComponent(
					tooltip
				)}"></div>
                    <div class="tooltip-box"></div>
                </div>
            `;
			})
			.join("");

		const score = data.histogram.total_score; 
		const percentage = (score * 100).toFixed(2) + '%';

		// Render final card
		card.classList.remove("skeleton");
		card.innerHTML = `
            <div class="card-header">
                Last 24 hours <span style="float:right;">${percentage}</span>
            </div>
            <div class="card-body">
                <div class="histogram">${bars}</div>
            </div>
        `;

		// Activate tooltips
		this.initHistogramTooltips();
	},
	initHistogramTooltips() {
		const bars = document.querySelectorAll(".histogram-bar-wrapper");

		bars.forEach((wrapper) => {
			const bar = wrapper.querySelector(".histogram-bar");
			const tooltip = wrapper.querySelector(".tooltip-box");

			bar.addEventListener("mouseenter", () => {
				tooltip.innerHTML = decodeURIComponent(bar.dataset.tooltip);
				tooltip.classList.add("visible");
			});

			bar.addEventListener("mouseleave", () => {
				tooltip.classList.remove("visible");
			});
		});
	},
    // ===========================================================
    // Response Time Area Chart Renderer
    // ===========================================================
    renderResponseTimeCard(data) {
        const card = document.getElementById("response-time-card");
        if (!card) return;

		if (!data || !data?.response_time?.chart_data || data?.response_time?.chart_data.length === 0) {
			this.renderNoDataCard(card, "Response Time");
			return;
		}

        const points = data.response_time?.chart_data || [];
		const responseTime = data?.response_time

        // Prepare chart inputs
        const labels = points.map(p => {
            const d = new Date(p.timestamp * 1000);
            return d.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });
        });
        
        const values = points.map(p => p.response_time);

        card.classList.remove("skeleton");
        card.innerHTML = `
            <div class="card-header">Response Time</div>

            <div class="response-chart-container">
                <canvas id="responseChart"></canvas>
            </div>

            <div class="response-stats">
                <div class="response-stat-box">
                    <div class="stat-value">${responseTime.avg_response_time}ms</div>
                    <div class="stat-label">Avg. response time</div>
                </div>
                <div class="response-stat-box">
                    <div class="stat-value">${responseTime.max_response_time}ms</div>
                    <div class="stat-label">Max. response time</div>
                </div>
                <div class="response-stat-box">
                    <div class="stat-value">${responseTime.min_response_time}ms</div>
                    <div class="stat-label">Min. response time</div>
                </div>
            </div>
        `;

        // Build the Chart.js area chart
        const ctx = document.getElementById("responseChart").getContext("2d");

        // Gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 220);
        gradient.addColorStop(0, "rgba(34, 197, 94, 0.35)");
        gradient.addColorStop(1, "rgba(34, 197, 94, 0)");

        new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Response Time",
                        data: values,
                        borderColor: "#22c55e",
                        backgroundColor: gradient,
                        borderWidth: 3,
                        fill: true,
                        cubicInterpolationMode: "monotone",
                        tension: 0.45,
                        pointRadius: 0,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "nearest",
                    intersect: false,
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        ticks: {
                            callback: (v) => v + "ms",
                            color: "#9CA3AF",
                            font: { size: 11 }
                        },
                        grid: { display: false },
                        border: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: (ctx) => `${ctx.raw}ms`
                        }
                    }
                }
            }
        });
    },

	// ===========================================================
	// 4. Reusable Uptime Stats Card (Day, Week, Month)
	// ===========================================================
	renderUptimeStatCard(label, stats, elementId) {
		const card = document.getElementById(elementId);
		if (!card) return;

		if (!stats) {
			this.renderNoDataCard(card, label);
			return;
		}

		const pct = stats?.uptime_percentage ?? null;
		const incidents = stats?.incident_count ?? 0;

		const color = this.uptimeColor(pct);

		card.classList.remove("skeleton");
		card.innerHTML = `
        <div class="card-header">${label}</div>
        <div class="card-body ${color}">
            ${pct !== null ? pct.toFixed(1) + "%" : "N/A"}
        </div>
        <div class="card-footer">
            ${incidents} incident${incidents === 1 ? "" : "s"}
        </div>
    `;
	},

	// ===========================================================
	//  MAIN FUNCTION: Clean and Simple
	// ===========================================================
	renderMonitorCards() {
		const data = window.CraftPageData?.monitorData;
		if (!data) {
			console.warn("No monitor data found.");
		}

		const stats = data?.uptime_stats ?? {};

		// Render primary cards
		this.renderStatusCard(data);
		this.renderLastCheckCard(data);
		this.render24hChartCard(data);

		// Render uptime cards (second row)
		this.renderUptimeStatCard("Last 24h", stats?.day, "uptime-day-card");
		this.renderUptimeStatCard("Last Week", stats?.week, "uptime-week-card");
		this.renderUptimeStatCard(
			"Last 30 Days",
			stats?.month,
			"uptime-month-card"
		);

        // render the response time area chart
        this.renderResponseTimeCard(data)

	},
};

// ---------------------------
// UNIVERSAL CRAFT INIT HOOKS
// ---------------------------

// 1) Initial page load
document.addEventListener("DOMContentLoaded", () => {
	Craft.UpsnapDashboard.init();
});

// 2) Craft CP AJAX navigation (PJAX)
$(document).on("ajaxComplete", () => {
	Craft.UpsnapDashboard.init();
});

// 3) Craft element index reloads / partial reinitialization
$(document).on("pjax:end", () => {
	Craft.UpsnapDashboard.init();
});
