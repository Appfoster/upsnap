/* global Craft, Garnish */

Craft.Upsnap = Craft.Upsnap || {};

Craft.Upsnap.StatusPages = {
	table: null,
	tbody: null,
	loader: null,
	emptyState: null,
	selectedMonitors: new Map(),
	monitors: [],
	pillsContainer: null,
	statusPagesCount: 0,

	init() {
		this.cacheElements();
		if (document.getElementById("status-pages-wrapper")) {
			this.fetchStatusPages();
			this.registerTableActions();
		}
		// Add/Edit page only
		if (document.getElementById("status-page-form")) {
			this.initForm();
		}
	},
	// Add/Edit page
	initForm() {
		this.form = document.getElementById("status-page-form");
		this.nameInput = document.getElementById("name");
		this.multiSelectContainer = document.getElementById(
			"monitor-multiselect"
		);

		this.fetchMonitors();
		this.registerFormSubmit();
	},

	cacheElements() {
		this.table = document.getElementById("status-pages-table");
		this.tbody = this.table?.querySelector("tbody");
		this.loader = document.getElementById("status-pages-loader");
		this.emptyState = document.getElementById("status-pages-empty");
	},

	showLoader(show = true) {
		this.loader?.classList.toggle("hidden", !show);
		this.table?.classList.toggle("hidden", show);
		this.emptyState?.classList.add("hidden");
	},

	statusBadge(isPublished) {
		return isPublished
			? '<span class="status green"></span> Published'
			: '<span class="status gray"></span> Unpublished';
	},

	actionMenu(page) {
		return `
		<button type="button" class="btn icon menubtn menu-btn" title="Actions"></button>
		<div class="menu" data-status-page-id="${page.id}">
			<ul>
				<li data-action="toggle">
					<a>${page.is_published ? "Unpublish" : "Publish"}</a>
				</li>
				<li data-action="reset"><a>Reset shareable link</a></li>
				<li data-action="edit"><a>Edit</a></li>
				<li class="separator"></li>
				<li data-action="delete" class="error"><a>Delete</a></li>
			</ul>
		</div>
	`;
	},
	renderRow(page) {
		const tr = document.createElement("tr");
		tr.dataset.id = page.id;

		const viewIcon = page.is_published
			? `
            <a
                href="${window.Upsnap.upsnapDashboardUrl}/shared/${page.shareable_id}"
                class="btn icon"
                target="_blank"
                title="View Status Page"
                data-icon="view">
            </a>
        `
			: `
            <span
                class="btn icon disabled"
                title="This page is disabled"
                data-icon="view"
                aria-disabled="true">
            </span>
        `;

		tr.innerHTML = `
        <td>
            <strong>${Craft.escapeHtml(page.name)}</strong>
        </td>
        <td>
            ${this.statusBadge(page.is_published)}
        </td>
        <td class="thin">
            ${viewIcon}
            ${this.actionMenu(page)}
        </td>
    `;

		this.tbody.appendChild(tr);
		new Garnish.MenuBtn(tr.querySelector(".menubtn"));
	},

	fetchStatusPages() {
		this.showLoader(true);

		Craft.postActionRequest("upsnap/status-page/list", {}, (response) => {
			this.showLoader(false);

			if (!response || !response.success) {
				Craft.cp.displayError(
					response?.message || "Failed to load status pages."
				);
				return;
			}

			const pages = response.data?.status_pages || [];
			this.statusPagesCount = pages.length;

			this.updateAddStatusPageButton();

			this.tbody.innerHTML = "";

			if (!pages.length) {
				this.table.classList.add("hidden");
				this.emptyState.classList.remove("hidden");
				return;
			}

			pages.forEach((page) => this.renderRow(page));
			this.table.classList.remove("hidden");
		});
	},
	fetchMonitors() {
		Craft.postActionRequest("upsnap/monitors/list", {}, (response) => {
			if (!response || !response.success) {
				Craft.cp.displayError(
					response?.message || "Failed to fetch monitors."
				);
				return;
			}

			this.monitors = response.data?.monitors || [];
			// 👇 NEW: hydrate selected monitors in edit mode
			this.hydrateSelectedMonitors();
			this.renderMonitorMultiselect();
		});
	},
	renderMonitorMultiselect() {
		this.multiSelectContainer.innerHTML = `
            <div class="multiselect">
                <div class="multiselect-input">
                    <div class="pills"></div>
                    <div class="caret"></div>
                </div>
                <div class="multiselect-menu hidden"></div>
            </div>
        `;

		this.pillsContainer = this.multiSelectContainer.querySelector(".pills");
		this.menu =
			this.multiSelectContainer.querySelector(".multiselect-menu");
		this.input =
			this.multiSelectContainer.querySelector(".multiselect-input");

		this.renderMonitorOptions();
		this.registerMultiselectEvents();
	},

	renderMonitorOptions() {
		this.menu.innerHTML = "";

		this.monitors.forEach((monitor) => {
			const checked = this.selectedMonitors.has(monitor.id);

			const option = document.createElement("div");
			option.className = "multiselect-option";

			option.innerHTML = `
            <label>
                <input
                    type="checkbox"
                    value="${monitor.id}"
                    ${checked ? "checked" : ""}
                >
                ${Craft.escapeHtml(monitor.name)}
            </label>
        `;

			option.querySelector("input").addEventListener("change", (e) => {
				if (e.target.checked) {
					this.selectedMonitors.set(monitor.id, monitor);
				} else {
					this.selectedMonitors.delete(monitor.id);
				}

				this.renderSelectedPills();
			});

			this.menu.appendChild(option);
		});

		this.renderSelectedPills();
	},

	renderSelectedPills() {
		this.pillsContainer.innerHTML = "";

		this.selectedMonitors.forEach((monitor, id) => {
			const pill = document.createElement("span");
			pill.className = "pill";

			pill.innerHTML = `
            ${Craft.escapeHtml(monitor.name)}
            <button type="button" data-id="${id}">&times;</button>
        `;

			pill.querySelector("button").addEventListener("click", () => {
				this.selectedMonitors.delete(id);
				this.renderMonitorOptions();
			});

			this.pillsContainer.appendChild(pill);
		});
	},
	registerMultiselectEvents() {
		this.input.addEventListener("click", () => {
			this.menu.classList.toggle("hidden");
		});

		document.addEventListener("click", (e) => {
			if (!this.multiSelectContainer.contains(e.target)) {
				this.menu.classList.add("hidden");
			}
		});
	},
	registerFormSubmit() {
		this.form.addEventListener("submit", (e) => {
			e.preventDefault();

			const name = this.nameInput.value.trim();

			if (!name) {
				Craft.cp.displayError("Name is required.");
				return;
			}

			if (!this.selectedMonitors.size) {
				Craft.cp.displayError("Select at least one monitor.");
				return;
			}

			const payload = {
				statusPageId: window.Upsnap?.statusPage?.id,
				name,
				monitor_ids: Array.from(this.selectedMonitors.keys()),
				is_published: true,
			};

			this.saveStatusPage(payload);
		});
	},

	saveStatusPage(payload) {
		Craft.postActionRequest(
			"upsnap/status-page/save",
			{
				payload: JSON.stringify(payload),
			},
			(response) => {
				if (!response || !response.success) {
					Craft.cp.displayError(
						response?.message || "Failed to save status page."
					);
					return;
				}

				Craft.cp.displayNotice(response.message);
				window.location.href = Craft.getUrl("upsnap/status-page");
			}
		);
	},
	registerTableActions() {
		document.addEventListener("click", (e) => {
			const actionEl = e.target.closest(".menu li[data-action]");
			if (!actionEl) return;

			const action = actionEl.dataset.action;
			const menu = actionEl.closest(".menu");
			const statusPageId = menu?.dataset.statusPageId;

			if (!statusPageId) return;

			e.preventDefault();

			switch (action) {
				case "toggle":
					this.togglePublish(statusPageId);
					break;

				case "delete":
					this.confirmDelete(statusPageId);
					break;

				case "edit":
					window.location.href = Craft.getUrl(
						`upsnap/status-page/edit/${statusPageId}`
					);
					break;

				case "reset":
					this.resetShareableLink(statusPageId);
					break;
			}
		});
	},

	togglePublish(statusPageId) {
		const row = this.tbody.querySelector(`tr[data-id="${statusPageId}"]`);
		const isPublished = row.querySelector(".status.green") !== null;

		const payload = {
			statusPageId,
			is_published: !isPublished,
		};

		Craft.postActionRequest(
			"upsnap/status-page/save",
			{ payload: JSON.stringify(payload) },
			(response) => {
				if (!response || !response.success) {
					Craft.cp.displayError(
						response?.message || "Failed to update status page."
					);
					return;
				}

				Craft.cp.displayNotice(response.message);
				this.fetchStatusPages();
			}
		);
	},
	deleteStatusPage(statusPageId) {
		Craft.postActionRequest(
			"upsnap/status-page/delete",
			{ statusPageId },
			(response) => {
				if (!response || !response.success) {
					Craft.cp.displayError(
						response?.message || "Failed to delete status page."
					);
					return;
				}

				Craft.cp.displayNotice(response.message);
				this.fetchStatusPages();

				// Empty state check
				if (!this.tbody.children.length) {
					this.table.classList.add("hidden");
					this.emptyState.classList.remove("hidden");
				}
			}
		);
	},
	resetShareableLink(statusPageId) {
		Craft.postActionRequest(
			"upsnap/status-page/reset-shareable-id",
			{ statusPageId },
			(response) => {
				if (!response || !response.success) {
					Craft.cp.displayError(
						response?.message || "Failed to reset shareable link."
					);
					return;
				}

				Craft.cp.displayNotice(response.message);
				this.fetchStatusPages();
			}
		);
	},
	confirmDelete(statusPageId) {
		if (
			!confirm(
				"Are you sure you want to delete this status page? This action cannot be undone."
			)
		) {
			return;
		}

		this.deleteStatusPage(statusPageId);
	},
	hasReachedStatusPageLimit() {
		const limits = window.Upsnap?.userDetails?.plan_limits;
		if (!limits) return false;

		const max = limits.max_status_pages;

		// If unlimited or not defined
		if (max === null || max === undefined) return false;

		return this.statusPagesCount >= max;
	},
	updateAddStatusPageButton() {
		const addBtn = document.getElementById("add-status-page-btn");
		if (!addBtn) return;

		if (this.hasReachedStatusPageLimit()) {
			addBtn.disabled = true;
			addBtn.classList.add("disabled");
			addBtn.setAttribute(
				"title",
				"Plan limit reached. Upgrade your plan to add more status pages."
			);

			addBtn.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
			});
		} else {
			addBtn.disabled = false;
			addBtn.classList.remove("disabled");
			addBtn.removeAttribute("title");
		}
	},
	hydrateSelectedMonitors() {
		const statusPage = window.Upsnap?.statusPage;

		if (!statusPage || !Array.isArray(statusPage.monitor_ids)) {
			return; // add mode
		}

		const selectedIds = new Set(statusPage.monitor_ids);

		this.selectedMonitors.clear();

		this.monitors.forEach((monitor) => {
			if (selectedIds.has(monitor.id)) {
				this.selectedMonitors.set(monitor.id, monitor);
			}
		});
	},
};

document.addEventListener("DOMContentLoaded", () => {
	Craft.Upsnap.StatusPages.init();
});
