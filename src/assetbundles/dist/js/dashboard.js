Craft.UpsnapDashboard = {
	// response time filter state
	currentResponseTimeFilter: "last_24_hours",
	responseChartInstance: null,
	monitorId: null, // Store monitor ID for API calls
	selectedRegionId: null, // Store selected region ID for API calls

	init() {
		this.refreshBtn = document.getElementById("refresh-btn");
		this.regionDropdown = document.getElementById("regionDropdown");

		// Extract monitor ID from page data
		this.monitorId = window.CraftPageData?.monitorData?.id;

		// Initialize region dropdown if available
		if (this.regionDropdown) {
			this.selectedRegionId = this.regionDropdown.value;
			this.regionDropdown.addEventListener("change", (e) => {
				this.selectedRegionId = e.target.value;
				this.onRegionChange();
			});
		}

		this.initializeDashboard();
		this.renderMonitorCards();
		this.loadAndApplyRegionNames();
		this.loadIncidentStatsCard();
		this.loadConnectedChannelsCard();
		this.initIncidentTableRowNavigation();

		if (this.refreshBtn) {
			this.refreshBtn.addEventListener("click", () => {
				this.runWithRefreshButton(this.refreshBtn, () =>
					Promise.all([
						this.initializeDashboard(),
						this.loadConnectedChannelsCard(),
					])
				);
			});
		}
	},
	
	onRegionChange() {
		// Show existing skeletons for all affected cards
		const cardsToShow = [
			"monitor-24h-card",
			"uptime-day-card",
			"uptime-week-card",
			"uptime-month-card",
		];

		// Add website-only cards
		if (this.isWebsiteMonitor()) {
			cardsToShow.push("reachability-card");
		}

		cardsToShow.forEach((cardId) => {
			const card = document.getElementById(cardId);
			if (card) {
				card.classList.add("skeleton");
				const skeleton = card.querySelector(".card-skeleton");
				const content = card.querySelector(".card-content");
				if (skeleton) skeleton.hidden = false;
				if (content) content.hidden = true;
			}
		});

		// Re-fetch data with new region
		const calls = [
			this.render24hChartCard(window.CraftPageData?.monitorData),
			this.renderResponseTimeCard(window.CraftPageData?.monitorData),
			this.renderUptimeStatCards(),
		];

		// Only fetch healthcheck data for website monitors
		if (this.isWebsiteMonitor()) {
			calls.push(this.fetchAndRenderReachability());
		}

		Promise.all(calls).catch((err) => {
			console.error("Failed to refresh dashboard for region:", err);
		});
	},

	isWebsiteMonitor() {
		const serviceType = window.CraftPageData?.monitorData?.service_type || "website";
		return serviceType === "website";
	},

	isHttpsMonitor() {
		const url = window.CraftPageData?.monitorUrl;

		if (!url) return false;

		try {
			return new URL(url).protocol === "https:";
		} catch (e) {
			return false;
		}
	},

	renderHttpsOnlyCard({ cardId, cardTitle }) {
		const card = document.getElementById(cardId);
		if (!card) return;

		const content = card.querySelector(".card-content");
		const skeleton = card.querySelector(".card-skeleton");

		card.classList.remove("skeleton");
		skeleton.hidden = true;
		content.hidden = false;

		content.innerHTML = `
			<div class="card-body">
				<p class="status-message">
					<span class="status-icon warning">!</span>
					This check is only enabled for https urls
				</p>
			</div>
		`;
	},

	renderCard({
		cardId,
		title,
		status,
		message,
		checkedAt,
		detailUrl,
		action,
		cardTitle,
	}) {
		const card = document.getElementById(cardId);
		if (!card) return;

		const content = card.querySelector(".card-content");
		const skeleton = card.querySelector(".card-skeleton");

		card.classList.remove("skeleton");
		skeleton.hidden = true;
		content.hidden = false;

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

		content.innerHTML = `
			<div class="card-body">
				<p class="status-message">
					<span class="status-icon ${statusClass}">${icon}</span>
					${message ?? "Something Went Wrong!"}
				</p>
				<p><strong>Last checked at:</strong> ${formattedCheckedAt}</p>
			</div>
			<div class="card-footer">
				<button class="fetch-recent-btn" type="button" data-icon="refresh">
					Check Now
				</button>
				<a href="${detailUrl}" class="detail-link" rel="noopener">
					View Details →
				</a>
			</div>
		`;

		content
			.querySelector(".fetch-recent-btn")
			.addEventListener("click", () => {
				this.showSkeleton(cardId);

				this.fetchAndRenderCard({
					action,
					cardId,
					cardTitle,
					forceFetch: true,
				});
			});
	},

	showSkeleton(cardId) {
		const card = document.getElementById(cardId);
		if (!card) return;

		card.classList.add("skeleton");

		card.querySelector(".card-skeleton").hidden = false;
		card.querySelector(".card-content").hidden = true;
	},

	renderErrorCard({ cardId, title, errorMsg }) {
		const card = document.getElementById(cardId);
		if (!card) return;

		const content = card.querySelector(".card-content");
		const skeleton = card.querySelector(".card-skeleton");

		card.classList.remove("skeleton");
		skeleton.hidden = true;
		content.hidden = false;

		content.innerHTML = `
			<div class="card-header">
				<h3>${title}</h3>
				<hr>
			</div>
			<div class="card-body">
				<p class="error">✗ Failed to load ${title.toLowerCase()}: ${errorMsg}</p>
			</div>
		`;
	},

	fetchAndRenderCard({
		action,
		cardId,
		cardTitle,
		getMessage,
		getStatus,
		forceFetch = false,
	}) {
		return Craft.sendActionRequest("POST", action, {
			data: {
				force_fetch: forceFetch,
				region: this.selectedRegionId,
			},
		})
			.then((response) => {
				response = response?.data;
				const data = response?.data;

				// cache reachability response for paused monitor logic
				if (action === "upsnap/health-check/reachability") {
					window.CraftPageData = window.CraftPageData || {};
					window.CraftPageData.reachabilityData = data;

					// notify dashboard that reachability is ready
					document.dispatchEvent(
						new CustomEvent("upsnap:reachability:loaded", {
							detail: data,
						})
					);
				}

				this.renderCard({
					cardId,
					title: response?.title,
					status: getStatus ? getStatus(data) : data.status,
					message:
						data.message === "ok"
							? data.message
							: data.error
							? data.error
							: data.message,
					checkedAt: data.checkedAt,
					detailUrl: response?.url,
					action,
					cardTitle,
				});
			})
			.catch((error) => {
				const msg = error.response?.data
					? error.response.data.error || "Unknown error"
					: error.message;

				this.renderErrorCard({
					cardId,
					title: cardTitle,
					errorMsg: msg,
				});
			});
	},

	initializeDashboard() {
		// Only fetch healthcheck data for website monitors
		if (!this.isWebsiteMonitor()) {
			return Promise.resolve();
		}

		const isHttps = this.isHttpsMonitor();
		const calls = [
			this.fetchAndRenderCard({
				action: "upsnap/health-check/reachability",
				cardTitle: "Reachability",
				cardId: "reachability-card",
			}),
			// SSL
			isHttps
				? this.fetchAndRenderCard({
						action: "upsnap/health-check/security-certificates",
						cardTitle: "Security Certificates",
						cardId: "ssl-card",
				  })
				: this.renderHttpsOnlyCard({
						cardId: "ssl-card",
						cardTitle: "Security Certificates",
				  }),
			this.fetchAndRenderCard({
				action: "upsnap/health-check/broken-links",
				cardTitle: "Broken Links",
				cardId: "broken-links-card",
			}),
			this.fetchAndRenderCard({
				action: "upsnap/health-check/domain-check",
				cardTitle: "Domain Check",
				cardId: "domain-check-card",
			}),
			// Mixed Content
			isHttps
				? this.fetchAndRenderCard({
						action: "upsnap/health-check/mixed-content",
						cardTitle: "Mixed Content",
						cardId: "mixed-content-card",
				  })
				: this.renderHttpsOnlyCard({
						cardId: "mixed-content-card",
						cardTitle: "Mixed Content",
				  }),
			// Lighthouse
			isHttps
				? this.fetchAndRenderCard({
						action: "upsnap/health-check/lighthouse",
						cardTitle: "Lighthouse",
						cardId: "lighthouse-card",
				  })
				: this.renderHttpsOnlyCard({
						cardId: "lighthouse-card",
						cardTitle: "Lighthouse",
				  }),
		];

		return Promise.allSettled(calls);
	},

	async fetchAndRenderReachability() {
		// Only fetch for website monitors
		if (!this.isWebsiteMonitor()) {
			return Promise.resolve();
		}

		const cardId = "reachability-card";
		const card = document.getElementById(cardId);
		if (!card) return;

		try {
			return this.fetchAndRenderCard({
				action: "upsnap/health-check/reachability",
				cardTitle: "Reachability",
				cardId: cardId,
			});
		} catch (err) {
			console.error("Failed to fetch reachability:", err);
		}
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

	renderNoDataCard(card, title, message) {
		if (!card) return;

		card.classList.remove("skeleton");
		card.innerHTML = `
			<div class="card-header">${title}</div>
			<div class="card-body gray">${message || "No data available"}</div>
		`;
	},

	formatUptime(value) {
		if (value === null || value === undefined) return "N/A";

		// Convert to percentage
		let pct = value * 100;

		// Round to max 2 decimals
		pct = Math.round(pct * 100) / 100;

		// Remove trailing .0 if whole number
		if (pct % 1 === 0) {
			return pct.toString();
		}

		return pct.toString();
	},

	// ===========================================================
	// API Fetch Helper
	// ===========================================================
	async fetchMonitorData(endpoint) {
		try {
			// Add region parameter if selected
			const separator = endpoint.includes('?') ? '&' : '?';
			const regionParam = this.selectedRegionId ? `${separator}region=${encodeURIComponent(this.selectedRegionId)}` : '';
			const finalEndpoint = this.selectedRegionId ? endpoint + regionParam : endpoint;

			const res = await fetch(finalEndpoint, {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
				},
			});

			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}

			const json = await res.json();

			if (!json.success) {
				throw new Error(json.message || "Unknown error");
			}

			return json.data;
		} catch (err) {
			console.error(`Failed to fetch from ${endpoint}:`, err);
			throw err;
		}
	},

	// ===========================================================
	// 1. Current Status Card
	// ===========================================================
	renderStatusCard(data) {
		const card = document.getElementById("monitor-status-card");
		if (!card) return;

		const reachability = window.CraftPageData?.reachabilityData;
		const isDisabled = data?.is_enabled === false;

		let status = null;
		let message = "No data available";

		if (!data) {
			if (!reachability) {
				this.renderNoDataCard(card, "Current Status", message);
				return;
			}

			status = reachability.status === "ok" ? "up" : "down";
		} else if (isDisabled) {
			message = "Monitoring Paused";

			if (!reachability) {
				this.renderNoDataCard(card, "Current Status", message);
				return;
			}

			status = reachability.status === "ok" ? "up" : "down";
		} else {
			
			if (!data.last_status) {
				this.renderNoDataCard(card, "Current Status", message);
				return;
			}

			status = data.last_status;
		}

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

		const reachability = window.CraftPageData?.reachabilityData;
		const isDisabled = data?.is_enabled === false;

		let timestamp = null;
		let message = "No data available";

		if (!data) {
			if (!reachability?.checkedAt) {
				this.renderNoDataCard(card, "Last check", message);
				return;
			}

			timestamp = reachability.checkedAt;
		} else if (isDisabled) {
			message = "Monitoring Paused";

			if (!reachability?.checkedAt) {
				this.renderNoDataCard(card, "Last check", message);
				return;
			}

			timestamp = reachability.checkedAt;
		} else {
			
			if (!data.last_check_at) {
				this.renderNoDataCard(card, "Last check", message);
				return;
			}

			timestamp = data.last_check_at;
		}

		const lastCheck = new Date(timestamp).toLocaleString();

		const intervalSeconds =
			data?.config?.services?.uptime?.monitor_interval;

		const intervalMinutes = intervalSeconds
			? Math.round(intervalSeconds / 60)
			: null;

		card.classList.remove("skeleton");
		card.innerHTML = `
			<div class="card-header">Last check</div>
			<div class="card-body">
				${lastCheck}<br>
				${
					!isDisabled && intervalMinutes
						? `<span class="gray">Checked Every ${intervalMinutes}m</span>`
						: ""
				}
			</div>
		`;
	},

	// ===========================================================
	// 3. 24h Summary Card - NOW FETCHES FROM API
	// ===========================================================
	async render24hChartCard(monitorData) {
		const card = document.getElementById("monitor-24h-card");
		if (!card) return;
		// Show skeleton while loading
		card.innerHTML = `
			<div class="card-header">Last 24 hours</div>
			<div class="card-skeleton">
				<div class="skeleton-line"></div>
			</div>
		`;

		const isDisabled = monitorData?.is_enabled === false;

		if (isDisabled) {
			card.classList.remove("skeleton");
			card.innerHTML = `
				<div class="card-header">Last 24 hours</div>
				<div class="card-body gray">Monitor paused</div>
			`;
			return;
		}

		if (!this.monitorId) {
			this.renderNoDataCard(card, "Last 24 hours", "No data available");
			return;
		}

		try {
			const data = await this.fetchMonitorData(
				`/admin/upsnap/monitors/histogram/${this.monitorId}`
			);

			const histogram = data?.histogram?.data ?? [];
			const lastStatus = monitorData?.last_status;
			const isEnabled = monitorData?.is_enabled ?? true;

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
							<div class="tooltip-text green">Up ${this.formatUptime(bucket.uptime)}%</div>
						`;
					}

					let colorClass = "";
					if (bucket.uptime === null) colorClass = "bar-gray";
					else if (bucket.uptime >= 0.99) colorClass = "bar-green";
					else if (bucket.uptime >= 0.95) colorClass = "bar-yellow";
					else if (bucket.uptime > 0) colorClass = "bar-orange";
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

			const score = data?.histogram?.total_score || 0;
			const percentage = this.formatUptime(score) + "%";

			card.classList.remove("skeleton");
			card.innerHTML = `
				<div class="card-header">
					Last 24 hours <span style="float:right;">${percentage}</span>
				</div>
				<div class="card-body">
					<div class="histogram">${bars}</div>
				</div>
			`;

			this.initHistogramTooltips();
		} catch (err) {
			card.classList.remove("skeleton");
			card.innerHTML = `
				<div class="card-header">Last 24 hours</div>
				<div class="card-body gray">Failed to load histogram data</div>
			`;
		}
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

	formatMsToSecs(ms) {
		if (ms === null || ms === undefined) return "N/A";
		if (ms >= 1000) {
			return (ms / 1000).toFixed(2) + "s";
		}
        return parseFloat(ms).toFixed(2) + "ms";
	},

	// ===========================================================
	// Response Time Area Chart - NOW FETCHES FROM API
	// ===========================================================
	async renderResponseTimeCard(monitorData) {
		this.showResponseChartLoader();
		// Register no data plugin (safe-guard against double register)
		if (!Chart.registry.plugins.get("noDataMessage")) {
			Chart.register({
				id: "noDataMessage",
				afterDraw(chart, args, options) {
					const { ctx, chartArea, data } = chart;

					const hasData = data?.datasets?.some(
						(ds) => Array.isArray(ds.data) && ds.data.length > 0
					);

					if (hasData) return;

					ctx.save();
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.font =
						"14px system-ui, -apple-system, BlinkMacSystemFont";
					ctx.fillStyle = "#9CA3AF";

					ctx.fillText(
						options?.text || "No data available",
						(chartArea.left + chartArea.right) / 2,
						(chartArea.top + chartArea.bottom) / 2
					);

					ctx.restore();
				},
			});
		}

		const card = document.getElementById("response-time-card");
		if (!card) return;

		card.classList.add("skeleton");
		card.classList.remove("hidden");

		let responseTime = null;
		let points = [];
		let hasData = false;

		try {
			// --------------------------------------------------
			// CASE 1: monitorId NOT AVAILABLE → NO DATA CHART
			// --------------------------------------------------
			if (this.monitorId) {
				const range = this.getResponseTimeRange(
					this.currentResponseTimeFilter
				);
				const queryParams = new URLSearchParams(range).toString();

				const data = await this.fetchMonitorData(
					`/admin/upsnap/monitors/response-time/${this.monitorId}?${queryParams}`
				);

				responseTime = data?.response_time_data;
				points = responseTime?.chart_data || [];

				// Aggregate data based on time range for better performance
				if (window.UpsnapUtils?.aggregateResponseTimeData) {
					points = window.UpsnapUtils.aggregateResponseTimeData(points, this.currentResponseTimeFilter);
				}

				hasData = points.length > 0;
			}

			const labels = points.map((p) => {
				const d = new Date(p.timestamp * 1000);
				return d.toLocaleString("en-US", {
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
					hour12: true,
				});
			});

			const values = points.map((p) => p.response_time);

			card.classList.remove("skeleton");

			card.innerHTML = `
			<div class="card-header response-card-header">
				<span>Response Time</span>
				<select id="responseTimeFilter" class="response-time-filter">
					<option value="last_hour" ${
						this.currentResponseTimeFilter === "last_hour"
							? "selected"
							: ""
					}>Last hour</option>
					<option value="last_24_hours" ${
						this.currentResponseTimeFilter === "last_24_hours"
							? "selected"
							: ""
					}>Last 24 hours</option>
					<option value="last_7_days" ${
						this.currentResponseTimeFilter === "last_7_days"
							? "selected"
							: ""
					}>Last 7 days</option>
					<option value="last_30_days" ${
						this.currentResponseTimeFilter === "last_30_days"
							? "selected"
							: ""
					}>Last 30 days</option>
					<option value="last_90_days" ${
						this.currentResponseTimeFilter === "last_90_days"
							? "selected"
							: ""
					}>Last 90 days</option>
				</select>
			</div>

			<div class="response-chart-container">
				<div class="chart-loader hidden" id="responseChartLoader"></div>
				<canvas id="responseChart"></canvas>
			</div>

			<div class="response-stats ${hasData ? "" : "opacity-50"}">
				<div class="response-stat-box">
					<div class="stat-value">${this.formatMsToSecs(
						responseTime?.avg_response_time
					)}</div>
					<div class="stat-label">Avg. response time</div>
				</div>
				<div class="response-stat-box">
					<div class="stat-value">${this.formatMsToSecs(
						responseTime?.max_response_time
					)}</div>
					<div class="stat-label">Max. response time</div>
				</div>
				<div class="response-stat-box">
					<div class="stat-value">${this.formatMsToSecs(
						responseTime?.min_response_time
					)}</div>
					<div class="stat-label">Min. response time</div>
				</div>
			</div>
		`;

			const filterEl = document.getElementById("responseTimeFilter");
			if (filterEl) {
				filterEl.addEventListener("change", async (e) => {
					this.currentResponseTimeFilter = e.target.value;
					this.showResponseChartLoader();
					try {
						await this.renderResponseTimeCard(monitorData);
					} finally {
						this.hideResponseChartLoader();
					}
				});
			}

			const ctx = document
				.getElementById("responseChart")
				.getContext("2d");

			const gradient = ctx.createLinearGradient(0, 0, 0, 220);
			gradient.addColorStop(0, "rgba(34, 197, 94, 0.35)");
			gradient.addColorStop(1, "rgba(34, 197, 94, 0)");

			new Chart(ctx, {
				type: "line",
				data: {
					labels: hasData ? labels : [],
					datasets: [
						{
							label: "Response Time",
							data: hasData ? values : [],
							borderColor: "#22c55e",
							backgroundColor: gradient,
							borderWidth: 3,
							fill: true,
							cubicInterpolationMode: "monotone",
							tension: 0.45,
							pointRadius: 0,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					interaction: {
						mode: "nearest",
						intersect: false,
					},
					scales: {
						x: { display: false },
						y: {
							display: hasData,
							ticks: {
								callback: (v) => v + "ms",
								color: "#9CA3AF",
								font: { size: 11 },
							},
							grid: { display: false },
							border: { display: false },
						},
					},
					plugins: {
						legend: { display: false },
						tooltip: { enabled: hasData },
						noDataMessage: {
							text: "No response time data available",
						},
					},
				},
			});
		} catch (err) {
			card.classList.remove("skeleton");
			console.error("Failed to render response time card:", err);
		}
		this.hideResponseChartLoader();
	},

	// ===========================================================
	// 4. Reusable Uptime Stats Card - NOW FETCHES FROM API
	// ===========================================================
	async renderUptimeStatCards() {
		if (!this.monitorId) {
			// Show error state for all cards
			this.renderSingleUptimeStatCard(
				"Last 24h",
				null,
				"uptime-day-card",
				"24h"
			);
			this.renderSingleUptimeStatCard(
				"Last Week",
				null,
				"uptime-week-card",
				"7D"
			);
			this.renderSingleUptimeStatCard(
				"Last 30 Days",
				null,
				"uptime-month-card",
				"1M"
			);
			return;
		}

		// Show skeleton for all three cards
		const dayCard = document.getElementById("uptime-day-card");
		const weekCard = document.getElementById("uptime-week-card");
		const monthCard = document.getElementById("uptime-month-card");

		[dayCard, weekCard, monthCard].forEach((card) => {
			if (card) card.classList.add("skeleton");
		});

		try {
			const data = await this.fetchMonitorData(
				`/admin/upsnap/monitors/uptime-stats/${this.monitorId}`
			);

			const stats = data?.uptime_stats ?? {};

			this.renderSingleUptimeStatCard(
				"Last 24h",
				stats?.day,
				"uptime-day-card",
				"24h"
			);
			this.renderSingleUptimeStatCard(
				"Last Week",
				stats?.week,
				"uptime-week-card",
				"7D"
			);
			this.renderSingleUptimeStatCard(
				"Last 30 Days",
				stats?.month,
				"uptime-month-card",
				"1M"
			);
		} catch (err) {
			console.error("Failed to fetch uptime stats:", err);

			// Show error state for all cards
			this.renderSingleUptimeStatCard(
				"Last 24h",
				null,
				"uptime-day-card",
				"24h"
			);
			this.renderSingleUptimeStatCard(
				"Last Week",
				null,
				"uptime-week-card",
				"7D"
			);
			this.renderSingleUptimeStatCard(
				"Last 30 Days",
				null,
				"uptime-month-card",
				"1M"
			);
		}
	},

	renderSingleUptimeStatCard(label, stats, elementId, timeframe) {
		const card = document.getElementById(elementId);
		if (!card) return;

		const content = card.querySelector(".card-content");
		const skeleton = card.querySelector(".card-skeleton");

		if (!stats) {
			this.renderNoDataCard(card, label);
			return;
		}

		const pct = stats?.uptime_percentage ?? null;
		const incidents = stats?.incident_count ?? 0;

		const color = this.uptimeColor(pct);

		card.classList.remove("skeleton");
		if (skeleton) skeleton.hidden = true;
		if (content) content.hidden = false;

		content.innerHTML = `
			<div class="card-body ${color}">
				${pct !== null ? pct + "%" : "N/A"}
			</div>
			${
				incidents > 0
					? `<div class="card-footer-incidents">
							${incidents} incident${incidents === 1 ? "" : "s"}
					</div>`
					: ""
			}
		`;

		const footer = card.querySelector(".card-footer-incidents");

		if (!footer) return;

		footer.addEventListener("click", (e) => {
			e.stopPropagation();

			if (!this.monitorId) return;
			const url = Craft.getCpUrl('upsnap/incidents', {
				monitor_id: this.monitorId,
				timeframe: timeframe || '24h',
			});

			window.location.href = url;
		});

	},

	appendPrimaryRegionStatus(monitor) {
		if (!monitor || typeof monitor !== 'object') {
			return monitor;
		}

		let lastStatus = monitor.last_status;
		let lastCheckAt = monitor.last_check_at;

		if (Array.isArray(monitor.regions)) {
			const primaryRegion = monitor.regions.find(r => r.is_primary);

			if (primaryRegion) {
				const regionId = primaryRegion.id;
				const regionChecks = monitor.service_last_checks?.[regionId];

				// Determine which service to check based on monitor type
				const serviceType = monitor.service_type || "website";
				let serviceCheckKey = "uptime"; // default for website monitors

				if (serviceType === "keyword") {
					serviceCheckKey = "keyword";
				} else if (serviceType === "port") {
					serviceCheckKey = "port_check";
				}

				// Get the service check data
				const serviceCheck = regionChecks?.[serviceCheckKey];
				if (serviceCheck) {
					lastStatus = serviceCheck.last_status;
					lastCheckAt = serviceCheck.last_checked_at;
				}
			}
		}

		monitor.last_status = lastStatus;
		monitor.last_check_at = lastCheckAt;

		return monitor;
	},


	// ===========================================================
	//  MAIN FUNCTION: Updated to use API calls
	// ===========================================================
	renderMonitorCards() {
		let data = window.CraftPageData?.monitorData;
		data = this.appendPrimaryRegionStatus(data)


		// Render primary cards (these use existing data)
		this.renderStatusCard(data);
		this.renderLastCheckCard(data);

		// Render cards that fetch from API
		this.render24hChartCard(data);
		this.renderResponseTimeCard(data);
		this.renderUptimeStatCards();
	},

	getResponseTimeRange(filter) {
		const now = Math.floor(Date.now() / 1000);

		const map = {
			last_hour: 3600,
			last_24_hours: 86400,
			last_7_days: 604800,
			last_30_days: 2592000,
			last_90_days: 7776000,
		};

		return {
			start: now - map[filter],
			end: now,
		};
	},

	showResponseChartLoader() {
		const loader = document.getElementById("responseChartLoader");
		if (loader) loader.classList.remove("hidden");
	},

	hideResponseChartLoader() {
		const loader = document.getElementById("responseChartLoader");
		if (loader) loader.classList.add("hidden");
	},

	/**
	 * Fetches region-wise incident stats for the current monitor and renders the
	 * incident stats card in the right sidebar.
	 */
	async loadIncidentStatsCard() {
		const monitorId = this.monitorId;
		const card = document.getElementById('incident-stats-card');
		if (!card) return;

		try {
			if (!monitorId) throw new Error('No monitor ID');

			const url = Craft.getActionUrl('upsnap/incidents/incident-stats', { monitor_id: monitorId });
			const [regionMap, json] = await Promise.all([
				this._fetchRegionMap(),
				fetch(url, {
					headers: {
						'X-CSRF-Token': Craft.csrfTokenValue,
						'Accept': 'application/json',
					},
				}).then((res) => res.json()),
			]);

			if (!json.success) throw new Error(json.message || 'Failed to fetch incident stats');

			const stats = Array.isArray(json.data?.stats) ? json.data.stats : [];
			const entry = stats.find((s) => s.monitor_id === monitorId) || stats[0];
			const regions = Array.isArray(entry?.regions) ? entry.regions : [];

			this._renderIncidentStatsCard(card, regions, monitorId, regionMap);
		} catch (err) {
			console.warn('Failed to load incident stats:', err);
			this._renderIncidentStatsCardEmpty(card);
		}
	},

	_renderIncidentStatsCard(card, regions, monitorId, regionMap) {
		const total = regions.reduce((sum, r) => sum + (r.incident_count || 0), 0);

		const badgeHtml = total > 0
			? `<span class="is-badge is-badge--red is-badge--clickable" data-incidents-monitor-id="${this._escapeAttr(monitorId)}">${total} total</span>`
			: `<span class="is-badge is-badge--green">All clear</span>`;

		const getRegionName = (id) => (regionMap && regionMap[id]) ? regionMap[id] : id;

		const rowsHtml = regions.length > 0
			? regions.map((r) => {
					const name = this._escapeHtml(getRegionName(r.region_id));
					const count = r.incident_count || 0;
					const cls = count > 0 ? 'is-count--red' : 'is-count--green';
					return `<div class="is-region-row"><span class="is-region-name">${name}</span><span class="${cls}">${count}</span></div>`;
				}).join('')
			: `<p class="is-empty">No data available.</p>`;

		const content = card.querySelector('.card-content');
		const skeleton = card.querySelector('.card-skeleton');

		card.classList.remove('skeleton');
		if (skeleton) skeleton.hidden = true;
		if (content) {
			content.hidden = false;
			content.innerHTML = `
				<div class="is-header">
					<span class="is-label">Incidents &middot; 24h</span>
					${badgeHtml}
				</div>
				<hr class="is-divider">
				${rowsHtml}
			`;

			// Wire badge click (only when total > 0)
			if (total > 0) {
				const badge = content.querySelector('.is-badge--clickable');
				if (badge) {
					badge.addEventListener('click', () => {
						window.location.href = Craft.getCpUrl('upsnap/incidents', {
							monitor_id: monitorId,
							timeframe: '24h',
						});
					});
				}
			}
		}
	},

	_renderIncidentStatsCardEmpty(card) {
		const content = card.querySelector('.card-content');
		const skeleton = card.querySelector('.card-skeleton');

		card.classList.remove('skeleton');
		if (skeleton) skeleton.hidden = true;
		if (content) {
			content.hidden = false;
			content.innerHTML = `
				<div class="is-header">
					<span class="is-label">Incidents &middot; 24h</span>
				</div>
				<hr class="is-divider">
				<p class="is-empty">No data available.</p>
			`;
		}
	},

	getMonitorChannelIds() {
		const monitor = window.CraftPageData?.monitorData || {};

		if (Array.isArray(monitor.channel_ids)) {
			return monitor.channel_ids.map((id) => String(id));
		}

		if (Array.isArray(monitor.channelIds)) {
			return monitor.channelIds.map((id) => String(id));
		}

		if (Array.isArray(monitor.notification_channels)) {
			return monitor.notification_channels
				.map((channel) => channel?.id)
				.filter((id) => id !== null && id !== undefined)
				.map((id) => String(id));
		}

		return [];
	},

	renderConnectedChannelsCardEmpty(card) {
		const content = card.querySelector('.card-content');
		const skeleton = card.querySelector('.card-skeleton');
		this.setConnectedChannelsCountPill(card, 0);

		card.classList.remove('skeleton');
		if (skeleton) skeleton.hidden = true;
		if (!content) return;

		content.hidden = false;
		content.innerHTML = `
			<div class="ccc-empty-state">
				<span class="ccc-empty-icon" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9.5 17h5"></path>
						<path d="M10.5 5.25a6 6 0 0 1 10.33 4.2v3.8l1.2 2.4a1 1 0 0 1-.9 1.45H7.77"></path>
						<path d="M3 3l18 18"></path>
					</svg>
				</span>
				<span>No notification channels attached.</span>
			</div>
		`;
	},

	setConnectedChannelsCountPill(card, count, href = null) {
		const countPill = card.querySelector('#connected-channels-count-pill');
		if (!countPill) return;

		if (count > 0 && href) {
			countPill.textContent = `${count} ${count === 1 ? 'channel' : 'channels'}`;
			countPill.href = href;
			countPill.classList.remove('hidden');
			return;
		}

		countPill.textContent = '';
		countPill.removeAttribute('href');
		countPill.classList.add('hidden');
	},

	buildChannelTooltipHtml(channelType, channels) {
		const integrationMeta = window.UpsnapUtils?.getIntegrationMeta
			? window.UpsnapUtils.getIntegrationMeta(channelType)
			: {
				label: this._escapeHtml(channelType || 'Integration'),
			  };

		const label = this._escapeHtml(integrationMeta?.label || channelType || 'Integration');

		const getStatusHtml = (isEnabled) => {
			const statusClass = isEnabled ? 'active' : 'inactive';
			const statusText = isEnabled ? 'Active' : 'Inactive';
			return `<span class="ccc-tooltip-status ${statusClass}">${statusText}</span>`;
		};

		const rowsHtml = channels
			.map((channel, idx) => {
				const name = this._escapeHtml(channel?.name || 'Unnamed channel');
				const info = window.UpsnapUtils?.getNotificationChannelDisplayInfo
					? window.UpsnapUtils.getNotificationChannelDisplayInfo(channel, 'Configured')
					: 'Configured';

				const isEnabled = channel?.is_enabled !== false;

				return `
					<div class="ccc-tooltip-item ${idx > 0 ? 'with-divider' : ''}">
						<div class="ccc-tooltip-item-row">
							<span class="ccc-tooltip-name">${name}</span>
							${channels.length > 1 ? getStatusHtml(isEnabled) : ''}
						</div>
						<div class="ccc-tooltip-info">${this._escapeHtml(info)}</div>
					</div>
				`;
			})
			.join('');

		const headingStatus = channels.length === 1
			? getStatusHtml(channels[0]?.is_enabled !== false)
			: '';

		return `
			<div class="ccc-tooltip-inner">
				<div class="ccc-tooltip-head">
					<span>${label}</span>
					${headingStatus}
				</div>
				${rowsHtml}
			</div>
		`;
	},

	renderConnectedChannelsCard(card, channels) {
		const content = card.querySelector('.card-content');
		const skeleton = card.querySelector('.card-skeleton');
		if (!content) return;

		const grouped = channels.reduce((acc, channel) => {
			const key = String(channel?.channel_type || 'integration');
			if (!acc[key]) acc[key] = [];
			acc[key].push(channel);
			return acc;
		}, {});

		const groups = Object.entries(grouped);
		const count = channels.length;
		const settingsUrl = `${Craft.getCpUrl('upsnap/settings')}#notification-channels-tab`;

		const groupsHtml = groups
			.map(([type, list]) => {
				const iconMarkup = window.UpsnapUtils?.getIntegrationIcon
					? window.UpsnapUtils.getIntegrationIcon(type, {
						imgClass: 'ccc-icon-img',
						fallbackClass: 'ccc-icon-fallback',
					})
					: '';

				const tooltip = this.buildChannelTooltipHtml(type, list);

				return `
					<div class="ccc-icon-group" tabindex="0" aria-label="${this._escapeAttr(type)} channels">
						<div class="ccc-icon-circle">${iconMarkup}</div>
						${list.length > 1 ? `<span class="ccc-count-dot">${list.length}</span>` : ''}
						<div class="ccc-tooltip" role="tooltip">${tooltip}</div>
					</div>
				`;
			})
			.join('');

		card.classList.remove('skeleton');
		if (skeleton) skeleton.hidden = true;
		content.hidden = false;

		if (count === 0) {
			this.renderConnectedChannelsCardEmpty(card);
			return;
		}

		this.setConnectedChannelsCountPill(card, count, settingsUrl);

		content.innerHTML = `
			<div class="ccc-groups-row">
				${groupsHtml}
			</div>
		`;
	},

	async loadConnectedChannelsCard() {
		const card = document.getElementById('connected-channels-card');
		if (!card) return;

		try {
			const monitorChannelIds = this.getMonitorChannelIds();
			if (!monitorChannelIds.length) {
				this.renderConnectedChannelsCardEmpty(card);
				return;
			}

			const monitorChannelIdSet = new Set(monitorChannelIds.map((id) => String(id)));

			const response = await Craft.sendActionRequest(
				'POST',
				'upsnap/monitor-notification-channels/list'
			);

			const channels = Array.isArray(response?.data?.data?.channels)
				? response.data.data.channels
				: [];

			const filtered = channels.filter((channel) =>
				monitorChannelIdSet.has(String(channel?.id))
			);

			this.renderConnectedChannelsCard(card, filtered);
		} catch (err) {
			console.warn('Failed to load connected channels:', err);
			this.renderConnectedChannelsCardEmpty(card);
		}
	},

	_escapeHtml(str) {
		if (!str && str !== 0) return '';
		return String(str).replace(/[&<>"']/g, (s) => ({
			'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
		})[s]);
	},

	_escapeAttr(str) {
		return this._escapeHtml(str);
	},

	/**
	 * Lazily fetches the region id→name map and caches the promise so the
	 * regions endpoint is only called once per page load regardless of how
	 * many callers await it.
	 */
	_fetchRegionMap() {
		if (!this._regionMapPromise) {
			const endpoint = window.CraftPageData?.regionsEndpoint;
			if (!endpoint) {
				this._regionMapPromise = Promise.resolve({});
			} else {
				this._regionMapPromise = fetch(endpoint, {
					headers: {
						'Accept': 'application/json',
						'X-CSRF-Token': Craft.csrfTokenValue,
					},
				})
					.then((res) => res.json())
					.then((json) => {
						if (!json.success || !json.data?.length) return {};
						const map = {};
						json.data.forEach((region) => {
							const id   = region.id   ?? region.slug  ?? region;
							const name = region.name ?? region.label ?? String(id);
							map[String(id)] = String(name);
						});
						return map;
					})
					.catch(() => ({}));
			}
		}
		return this._regionMapPromise;
	},

	async loadAndApplyRegionNames() {
		try {
			const regionMap = await this._fetchRegionMap();

			document
				.querySelectorAll('#incidents-table-card .region-badge')
				.forEach((badge) => {
					const raw = badge.textContent.trim();
					if (regionMap[raw]) badge.textContent = regionMap[raw];
				});
		} catch (err) {
			console.error('Failed to load region names for incidents table:', err);
		}
	},

	initIncidentTableRowNavigation() {
		document.querySelectorAll('#incidents-table-card tr[data-href]').forEach((tr) => {
			tr.addEventListener('click', (e) => {
				if (e.target.closest('a')) return;
				window.location.href = tr.dataset.href;
			});
			tr.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					if (e.key === ' ') e.preventDefault();
					window.location.href = tr.dataset.href;
				}
			});
		});
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

// ===========================================================
// Reachability Ready → Re-render dependent cards
// ===========================================================
document.addEventListener("upsnap:reachability:loaded", () => {
	const reachability = window.CraftPageData?.reachabilityData;

	if (!reachability) return;

	// Prefer reachability status and timestamp over primary region data
	Craft.UpsnapDashboard.renderStatusCard(null);
	Craft.UpsnapDashboard.renderLastCheckCard(null);
});
