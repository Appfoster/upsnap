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

		const apiKey = window.CraftPageData?.apiKey;
		if (!apiKey) {
			this.renderStatusContainer();
		}

		if (this.refreshBtn) {
			this.refreshBtn.addEventListener("click", () => {
				this.runWithRefreshButton(this.refreshBtn, () =>
					this.initializeDashboard()
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
			"reachability-card",
		];

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
		Promise.all([
			this.render24hChartCard(window.CraftPageData?.monitorData),
			this.renderResponseTimeCard(window.CraftPageData?.monitorData),
			this.renderUptimeStatCards(),
			this.fetchAndRenderReachability(),
		]).catch((err) => {
			console.error("Failed to refresh dashboard for region:", err);
		});
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
				<a href="${detailUrl}" class="detail-link" target="_blank" rel="noopener">
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
				"uptime-day-card"
			);
			this.renderSingleUptimeStatCard(
				"Last Week",
				null,
				"uptime-week-card"
			);
			this.renderSingleUptimeStatCard(
				"Last 30 Days",
				null,
				"uptime-month-card"
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
				"uptime-day-card"
			);
			this.renderSingleUptimeStatCard(
				"Last Week",
				stats?.week,
				"uptime-week-card"
			);
			this.renderSingleUptimeStatCard(
				"Last 30 Days",
				stats?.month,
				"uptime-month-card"
			);
		} catch (err) {
			console.error("Failed to fetch uptime stats:", err);

			// Show error state for all cards
			this.renderSingleUptimeStatCard(
				"Last 24h",
				null,
				"uptime-day-card"
			);
			this.renderSingleUptimeStatCard(
				"Last Week",
				null,
				"uptime-week-card"
			);
			this.renderSingleUptimeStatCard(
				"Last 30 Days",
				null,
				"uptime-month-card"
			);
		}
	},

	renderSingleUptimeStatCard(label, stats, elementId) {
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
			<div class="card-footer-incidents">
				${incidents} incident${incidents === 1 ? "" : "s"}
			</div>
		`;
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

				const uptimeCheck = regionChecks?.uptime;
				if (uptimeCheck) {
					lastStatus = uptimeCheck.last_status;
					lastCheckAt = uptimeCheck.last_checked_at;
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

	renderStatusContainer() {
		const statusContainerWrapper = document.getElementById(
			"status-container-wrapper"
		);
		const upsnapDashboardUrl = window.CraftPageData?.upsnapDashboardUrl;
		if (!statusContainerWrapper) return;

		let icon = "!";

		const html = `
			<div class="status-container warning">
				<div class="status-header">
					<div class="status-icon warning">${icon}</div>
					<h3 class="status-title">Unlock Full Monitoring Insights</h3>
				</div>
				<p class="status-message-dashboard">
					<a href="${upsnapDashboardUrl}/signup" class="status-link">Register</a>  to unlock complete monitoring insights - last 24-hour histograms, uptime statistics, response time charts, live incident notifications, a public status page, and more.
				</p>
			</div>
		`;
		statusContainerWrapper.innerHTML = html;
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
