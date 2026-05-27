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
	assetState: {
		logo: { file: null, removed: false, changed: false, currentUrl: "" },
		favicon: { file: null, removed: false, changed: false, currentUrl: "" },
	},
	announcements: [],
	announcementsLoaded: false,
	announcementsLoading: false,
	selectedAnnouncementId: null,

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
		this.passwordInput = document.getElementById("password");
		this.passwordPromptInput = document.getElementById("password_prompt");
		this.multiSelectContainer = document.getElementById(
			"monitor-multiselect"
		);

		this.headerTitleInput = document.getElementById("custom_header_title");
		this.headerCompanyNameInput = document.getElementById(
			"custom_header_company_name"
		);
		this.headerDescriptionInput = document.getElementById(
			"custom_header_description"
		);
		this.footerTextInput = document.getElementById("custom_footer_text");
		this.contactEmailInput = document.getElementById(
			"custom_footer_contact_email"
		);
		this.copyrightInput = document.getElementById(
			"custom_footer_copyright_text"
		);
		this.supportUrlInput = document.getElementById("custom_links_support_url");
		this.privacyUrlInput = document.getElementById("custom_links_privacy_url");
		this.tosUrlInput = document.getElementById("custom_links_tos_url");
		this.accentColorInput = document.getElementById("custom_display_accent_color");
		this.accentColorHexInput = document.getElementById(
			"custom_display_accent_color_hex"
		);
		this.accentColorSwatch = document.getElementById(
			"custom_display_accent_color_swatch"
		);
		this.historyRangeDaysInput = document.getElementById(
			"custom_display_history_range_days"
		);

		this.logoFileInput = document.getElementById("logo_file");
		this.faviconFileInput = document.getElementById("favicon_file");
		this.logoPreview = document.getElementById("logo-preview");
		this.faviconPreview = document.getElementById("favicon-preview");
		this.logoRemoveBtn = document.getElementById("logo_remove_btn");
		this.faviconRemoveBtn = document.getElementById("favicon_remove_btn");

		this.mode =
			window.Upsnap?.formMode ||
			(window.Upsnap?.statusPage?.id ? "edit" : "add");
		this.isEditMode = this.mode === "edit";
		this.wasProtected = window.Upsnap?.statusPage?.is_protected === true;

		this.initializeAssetState();
		this.renderAssetPreviews();

		this.registerTabVisibility();
		this.fetchMonitors();
		this.registerFormSubmit();
		this.registerPasswordProtection();
		this.registerAccentColorEvents();
		this.registerAssetEvents();
		this.initAnnouncements();
		this.registerCharCounters();
	},

	registerTabVisibility() {
		this.statusPageSaveBtn = document.getElementById("status-page-btn");
		if (!this.statusPageSaveBtn) return;

		const syncSaveButtonVisibility = () => {
			const activeHash = window.location.hash || "#general-tab";
			this.statusPageSaveBtn.classList.toggle(
				"hidden",
				activeHash === "#announcements-tab"
			);
		};

		document
			.querySelectorAll('a[href="#general-tab"], a[href="#customization-tab"], a[href="#announcements-tab"]')
			.forEach((tabLink) => {
				tabLink.addEventListener("click", () => {
					requestAnimationFrame(syncSaveButtonVisibility);
				});
			});

		window.addEventListener("hashchange", syncSaveButtonVisibility);
		syncSaveButtonVisibility();
	},

	registerCharCounters() {
		if (!this.form) return;

		const fields = this.form.querySelectorAll(
			"input[maxlength], textarea[maxlength]"
		);

		fields.forEach((input) => {
			const maxlength = parseInt(input.getAttribute("maxlength"), 10);
			if (!maxlength) return;

			const counter = document.createElement("div");
			counter.className = "upsnap-char-counter";
			counter.textContent = `${input.value.length}/${maxlength}`;

			const inputWrapper = input.closest(".input");
			const insertAfter = inputWrapper || input;
			insertAfter.after(counter);

			input.addEventListener("input", () => {
				counter.textContent = `${input.value.length}/${maxlength}`;
			});
		});
	},

	initAnnouncements() {
		if (!this.isEditMode) return;

		this.announcementsStatusPageId = this.getStatusPageId();
		if (!this.announcementsStatusPageId) return;

		this.announcementsTab = document.getElementById("announcements-tab");
		this.announcementsTable = document.getElementById("announcements-table");
		this.announcementsTbody = document.getElementById("announcements-tbody");
		this.announcementsErrorEl = document.getElementById("announcements-error");

		this.announcementModal = document.getElementById("announcement-modal");
		this.announcementModalTitle = document.getElementById(
			"announcement-modal-title"
		);
		this.announcementIdInput = document.getElementById("announcement_id");
		this.announcementTitleInput = document.getElementById("announcement_title");
		this.announcementMessageInput = document.getElementById(
			"announcement_message"
		);
		this.announcementTypeInput = document.getElementById("announcement_type");
		this.announcementStartAtInput = document.getElementById(
			"announcement_start_at"
		);
		this.announcementEndAtInput = document.getElementById("announcement_end_at");
		this.announcementStatusInput = document.getElementById("announcement_status");
		this.announcementSaveBtn = document.getElementById("announcement-save-btn");
		this.announcementAddBtn = document.getElementById("announcements-add-btn");

		this.announcementDeleteModal = document.getElementById(
			"announcement-delete-modal"
		);
		this.announcementDeleteConfirmBtn = document.getElementById(
			"announcement-delete-confirm-btn"
		);

		if (!this.announcementsTab || !this.announcementsTable || !this.announcementsTbody) {
			return;
		}

		this.initAnnouncementDateTimePickers();

		this.registerAnnouncementsEvents();
		this.fetchAnnouncements();

		const announcementsTabLink = document.querySelector(
			'a[href="#announcements-tab"]'
		);

		announcementsTabLink?.addEventListener("click", () => {
			if (!this.announcementsLoaded && !this.announcementsLoading) {
				this.fetchAnnouncements();
			}
		});
	},

	getStatusPageId() {
		return window.Upsnap?.statusPage?.id || null;
	},

	registerAnnouncementsEvents() {
		this.announcementAddBtn?.addEventListener("click", () => {
			this.openAnnouncementCreateModal();
		});

		document
			.getElementById("announcement-modal-close")
			?.addEventListener("click", () => this.closeAnnouncementModal());
		document
			.getElementById("announcement-cancel-btn")
			?.addEventListener("click", () => this.closeAnnouncementModal());
		document
			.querySelector('[data-close-modal="announcement"]')
			?.addEventListener("click", () => this.closeAnnouncementModal());

		this.announcementSaveBtn?.addEventListener("click", () => {
			this.saveAnnouncement();
		});

		this.announcementsTbody?.addEventListener("click", (event) => {
			const actionBtn = event.target.closest("button[data-action]");
			if (!actionBtn) return;

			const action = actionBtn.dataset.action;
			const announcementId = actionBtn.dataset.announcementId;
			if (!announcementId) {
				Craft.cp.displayError("Announcement ID is required.");
				return;
			}

			if (action === "edit") {
				this.openAnnouncementEditModal(announcementId);
				return;
			}

			if (action === "delete") {
				this.openAnnouncementDeleteModal(announcementId);
			}
		});

		document
			.getElementById("announcement-delete-close")
			?.addEventListener("click", () => this.closeAnnouncementDeleteModal());
		document
			.getElementById("announcement-delete-cancel-btn")
			?.addEventListener("click", () => this.closeAnnouncementDeleteModal());
		document
			.querySelector('[data-close-modal="announcement-delete"]')
			?.addEventListener("click", () => this.closeAnnouncementDeleteModal());

		this.announcementDeleteConfirmBtn?.addEventListener("click", () => {
			this.deleteAnnouncement();
		});

		const revalidate = () => this.syncAnnouncementSaveBtn();

		this.announcementTitleInput?.addEventListener("input",    revalidate);
		this.announcementMessageInput?.addEventListener("input",  revalidate);
		this.announcementTypeInput?.addEventListener("change",    revalidate);
		this.announcementStartAtInput?.addEventListener("change", revalidate);
		this.announcementStartAtInput?.addEventListener("input",  revalidate);
	},

	initAnnouncementDateTimePickers() {
		if (typeof window.flatpickr !== "function") {
			return;
		}

		const now = new Date();
		now.setSeconds(0, 0);

		const pickerConfig = {
			enableTime: true,
			time_24hr: true,
			allowInput: true,
			minuteIncrement: 1,
			dateFormat: "Y-m-d\\TH:i",
			altInput: true,
			altFormat: "d/m/Y H:i",
			disableMobile: true,
			minDate: now,
			onChange: () => {
				this.syncAnnouncementSaveBtn();
			},

			onClose: () => {
				this.syncAnnouncementSaveBtn();
			},

			onReady(_dates, _str, instance) {
				const input = instance.altInput || instance.input;
				input.addEventListener("blur", () => {
					const selected = instance.selectedDates[0];
					if (selected && selected < new Date()) {
						instance.clear();
						Craft.cp.displayError("Past dates are not allowed.");
					}
				});
			},
		};

		if (this.announcementStartAtPicker) {
			this.announcementStartAtPicker.destroy();
		}
		if (this.announcementEndAtPicker) {
			this.announcementEndAtPicker.destroy();
		}

		if (this.announcementStartAtInput) {
			this.announcementStartAtPicker = window.flatpickr(
				this.announcementStartAtInput,
				pickerConfig
			);
		}

		if (this.announcementEndAtInput) {
			this.announcementEndAtPicker = window.flatpickr(
				this.announcementEndAtInput,
				pickerConfig
			);
		}
	},

	syncAnnouncementSaveBtn() {
		if (!this.announcementSaveBtn) return;

		const title   = (this.announcementTitleInput?.value   || "").trim();
		const message = (this.announcementMessageInput?.value || "").trim();
		const type    = this.announcementTypeInput?.value     || "";
		const startAt = this.announcementStartAtInput?.value  || "";

		const titleOk   = title.length > 0 && title.length <= 100;
		const messageOk = message.length > 0 && message.length <= 500;
		const typeOk    = ["info", "warning", "critical"].includes(type);

		const startDate = new Date(startAt);
		const startOk =
			!!startAt &&
			!Number.isNaN(startDate.getTime()) &&
			startDate >= new Date();

		const valid = titleOk && messageOk && typeOk && startOk;
		this.announcementSaveBtn.disabled = !valid;
		this.announcementSaveBtn.classList.toggle("disabled", !valid);
	},

	syncAnnouncementCharCounters() {
		if (!this.announcementModal) return;
		const fields = this.announcementModal.querySelectorAll(
			"input[maxlength], textarea[maxlength]"
		);
		fields.forEach((input) => {
			const maxlength = parseInt(input.getAttribute("maxlength"), 10);
			if (!maxlength) return;
			const counter = input
				.closest(".field")
				?.querySelector(".upsnap-char-counter");
			if (counter) {
				counter.textContent = `${input.value.length}/${maxlength}`;
			}
		});
	},

	setAnnouncementDateTimeValue(input, picker, value) {
		if (picker) {
			if (value) {
				picker.setDate(value, true, "Y-m-d\\TH:i");
			} else {
				picker.clear();
			}
			return;
		}

		if (input) {
			input.value = value || "";
		}
	},

	setAnnouncementsLoading(isLoading) {
		this.announcementsLoading = isLoading;
		const loadingRow = document.getElementById("announcements-loading-row");
		const emptyRow = document.getElementById("announcements-empty-row");
		
		if (isLoading) {
			// Show loading row, hide empty row
			if (loadingRow) loadingRow.classList.remove("hidden");
			if (emptyRow) emptyRow.classList.add("hidden");
		} else {
			// Hide loading row, show empty row if no data
			if (loadingRow) loadingRow.classList.add("hidden");
		}
	},

	renderAnnouncementsError(message = "") {
		if (!this.announcementsErrorEl) return;

		if (!message) {
			this.announcementsErrorEl.classList.add("hidden");
			this.announcementsErrorEl.textContent = "";
			return;
		}

		this.announcementsErrorEl.textContent = message;
		this.announcementsErrorEl.classList.remove("hidden");
	},

	fetchAnnouncements() {
		if (!this.announcementsStatusPageId) return;

		this.setAnnouncementsLoading(true);
		this.renderAnnouncementsError("");

		Craft.postActionRequest(
			"upsnap/status-page/announcements-list",
			{ statusPageId: this.announcementsStatusPageId },
			(response) => {
				this.setAnnouncementsLoading(false);

				if (!response || !response.success) {
					const message =
						response?.message || "Failed to load announcements.";
					this.renderAnnouncementsError(message);
					Craft.cp.displayError(message);
					return;
				}

				this.announcements = response?.data?.announcements || [];
				this.announcementsLoaded = true;
				this.renderAnnouncementsTable();
			}
		);
	},

	getAnnouncementTypeMeta(type) {
		switch (type) {
			case "warning":
				return { label: "Warning", className: "warning-pill", icon: "⚠" };
			case "critical":
				return { label: "Critical", className: "critical-pill", icon: "!" };
			case "info":
			default:
				return { label: "Info", className: "info-pill", icon: "i" };
		}
	},

	getAnnouncementStatusMeta(status) {
		switch (status) {
			case "active":
				return { label: "Active", className: "active-pill" };
			case "expired":
				return { label: "Expired", className: "expired-pill" };
			case "inactive":
			default:
				return { label: "Inactive", className: "inactive-pill" };
		}
	},

	formatAnnouncementDate(value) {
		if (!value) return "N/A";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "N/A";

		return date.toLocaleString();
	},

	renderAnnouncementsTable() {
		if (!this.announcementsTbody || !this.announcementsTable) return;

		const emptyRow = document.getElementById("announcements-empty-row");
		const loadingRow = document.getElementById("announcements-loading-row");
		
		// Clear all rows except the empty and loading state rows
		const rows = Array.from(this.announcementsTbody.querySelectorAll("tr:not(#announcements-empty-row):not(#announcements-loading-row)"));
		rows.forEach(row => row.remove());

		if (!Array.isArray(this.announcements) || !this.announcements.length) {
			// Show empty state, hide loading
			if (emptyRow) emptyRow.classList.remove("hidden");
			if (loadingRow) loadingRow.classList.add("hidden");
			return;
		}

		// Hide both empty and loading rows when data is present
		if (emptyRow) emptyRow.classList.add("hidden");
		if (loadingRow) loadingRow.classList.add("hidden");

		this.announcements.forEach((item) => {
			const typeMeta = this.getAnnouncementTypeMeta(item.type);
			const statusMeta = this.getAnnouncementStatusMeta(item.status);
			const tr = document.createElement("tr");
			tr.innerHTML = `
				<td><strong>${Craft.escapeHtml(item.title || "")}</strong></td>
				<td>
					<span class="upsnap-announcement-chip type ${typeMeta.className}">
						<span class="upsnap-announcement-chip-icon">${typeMeta.icon}</span>
						${Craft.escapeHtml(typeMeta.label)}
					</span>
				</td>
				<td>
					<span class="upsnap-announcement-chip ${statusMeta.className}">
						${Craft.escapeHtml(statusMeta.label)}
					</span>
				</td>
				<td>${Craft.escapeHtml(this.formatAnnouncementDate(item.start_at))}</td>
				<td>${Craft.escapeHtml(this.formatAnnouncementDate(item.end_at))}</td>
				<td class="thin upsnap-announcement-actions">
					<div class="upsnap-monitor-inline-actions" aria-label="Announcement row actions">
						<button
							type="button"
							class="btn small icon upsnap-announcement-edit"
							data-action="edit"
							data-announcement-id="${Craft.escapeHtml(item.id || "")}"
							title="Edit announcement"
							aria-label="Edit announcement"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
						</button>
						<button
							type="button"
							class="btn small icon upsnap-announcement-delete"
							data-action="delete"
							data-announcement-id="${Craft.escapeHtml(item.id || "")}"
							title="Delete announcement"
							aria-label="Delete announcement"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
						</button>
					</div>
				</td>
			`;
			this.announcementsTbody.appendChild(tr);
		});
	},

	openAnnouncementModal() {
		if (!this.announcementModal) return;
		this.announcementModal.classList.remove("hidden");
		document.body.classList.add("upsnap-modal-open");
	},

	closeAnnouncementModal() {
		if (!this.announcementModal) return;
		this.announcementModal.classList.add("hidden");
		document.body.classList.remove("upsnap-modal-open");
	},

	openAnnouncementCreateModal() {
		if (!this.announcementModalTitle) return;

		this.selectedAnnouncementId = null;
		this.announcementModalTitle.textContent = "Add Announcement";
		if (this.announcementSaveBtn) this.announcementSaveBtn.textContent = "Save";

		if (this.announcementIdInput) this.announcementIdInput.value = "";
		if (this.announcementTitleInput) this.announcementTitleInput.value = "";
		if (this.announcementMessageInput) this.announcementMessageInput.value = "";
		if (this.announcementTypeInput) this.announcementTypeInput.value = "info";
		this.setAnnouncementDateTimeValue(
			this.announcementStartAtInput,
			this.announcementStartAtPicker,
			""
		);
		this.setAnnouncementDateTimeValue(
			this.announcementEndAtInput,
			this.announcementEndAtPicker,
			""
		);
		if (this.announcementStatusInput) this.announcementStatusInput.value = "active";

		const dismissibleSwitch = document
			.getElementById("announcement_is_dismissible")
			?.querySelector('input[type="hidden"]');
		if (dismissibleSwitch) dismissibleSwitch.value = "1";

		this.syncAnnouncementCharCounters();
		this.syncAnnouncementSaveBtn();
		this.openAnnouncementModal();
	},

	openAnnouncementEditModal(announcementId) {
		if (!announcementId) {
			Craft.cp.displayError("Announcement ID is required.");
			return;
		}

		Craft.postActionRequest(
			"upsnap/status-page/announcement-detail",
			{
				statusPageId: this.announcementsStatusPageId,
				announcementId,
			},
			(response) => {
				if (!response || !response.success || !response?.data?.announcement) {
					Craft.cp.displayError(
						response?.message || "Failed to fetch announcement details."
					);
					return;
				}

				const announcement = response.data.announcement;
				this.selectedAnnouncementId = announcement.id;
				this.announcementModalTitle.textContent = "Edit Announcement";
				if (this.announcementSaveBtn) this.announcementSaveBtn.textContent = "Update";

				if (this.announcementIdInput) {
					this.announcementIdInput.value = announcement.id || "";
				}
				if (this.announcementTitleInput) {
					this.announcementTitleInput.value = announcement.title || "";
				}
				if (this.announcementMessageInput) {
					this.announcementMessageInput.value = announcement.message || "";
				}
				if (this.announcementTypeInput) {
					this.announcementTypeInput.value = this.normalizeAnnouncementType(
						announcement.type
					);
				}
				this.setAnnouncementDateTimeValue(
					this.announcementStartAtInput,
					this.announcementStartAtPicker,
					this.toLocalDateTimeInputValue(announcement.start_at)
				);
				this.setAnnouncementDateTimeValue(
					this.announcementEndAtInput,
					this.announcementEndAtPicker,
					this.toLocalDateTimeInputValue(announcement.end_at)
				);
				if (this.announcementStatusInput) {
					this.announcementStatusInput.value =
						this.normalizeAnnouncementStatusForForm(announcement.status);
				}

				const dismissibleSwitch = document
					.getElementById("announcement_is_dismissible")
					?.querySelector('input[type="hidden"]');
				if (dismissibleSwitch) {
					dismissibleSwitch.value = announcement.is_dismissible ? "1" : "";
				}

				this.syncAnnouncementCharCounters();
				this.syncAnnouncementSaveBtn();
				this.openAnnouncementModal();
			}
		);
	},

	normalizeAnnouncementType(type) {
		if (["info", "warning", "critical"].includes(type)) {
			return type;
		}
		return "info";
	},

	normalizeAnnouncementStatusForForm(status) {
		if (status === "active") return "active";
		if (status === "expired") return "inactive";
		return "inactive";
	},

	toUtcIsoOrNull(localValue) {
		if (!localValue) return null;

		const normalizedValue = String(localValue).trim().replace(" ", "T");
		const date = new Date(normalizedValue);
		if (Number.isNaN(date.getTime())) return null;
		return date.toISOString().replace(/\.\d{3}Z$/, "Z");
	},

	toLocalDateTimeInputValue(utcValue) {
		if (!utcValue) return "";
		const date = new Date(utcValue);
		if (Number.isNaN(date.getTime())) return "";

		const pad = (value) => String(value).padStart(2, "0");
		const year = date.getFullYear();
		const month = pad(date.getMonth() + 1);
		const day = pad(date.getDate());
		const hours = pad(date.getHours());
		const minutes = pad(date.getMinutes());

		return `${year}-${month}-${day}T${hours}:${minutes}`;
	},

	collectAnnouncementFormData() {
		const title = (this.announcementTitleInput?.value || "").trim();
		const message = (this.announcementMessageInput?.value || "").trim();
		const type = this.normalizeAnnouncementType(this.announcementTypeInput?.value);
		const startAt = this.announcementStartAtInput?.value || "";
		const endAt = this.announcementEndAtInput?.value || "";
		const status = this.announcementStatusInput?.value === "active" ? "active" : "inactive";

		const dismissible = this.getLightswitchState("announcement_is_dismissible");

		return {
			title,
			message,
			type,
			start_at: this.toUtcIsoOrNull(startAt),
			end_at: this.toUtcIsoOrNull(endAt),
			is_dismissible: dismissible,
			status,
		};
	},

	validateAnnouncementForm(data) {
		if (!data.title) {
			Craft.cp.displayError("Title is required.");
			return false;
		}

		if (data.title.length > 100) {
			Craft.cp.displayError("Title must be 100 characters or fewer.");
			return false;
		}

		if (!data.message) {
			Craft.cp.displayError("Message is required.");
			return false;
		}

		if (data.message.length > 500) {
			Craft.cp.displayError("Message must be 500 characters or fewer.");
			return false;
		}

		if (!["info", "warning", "critical"].includes(data.type)) {
			Craft.cp.displayError("Type must be one of info, warning, or critical.");
			return false;
		}

		if (!data.start_at) {
			Craft.cp.displayError("Start Date & Time is required.");
			return false;
		}

		if (Number.isNaN(new Date(data.start_at).getTime())) {
			Craft.cp.displayError("Start Date & Time must be a valid date.");
			return false;
		}

		if (new Date(data.start_at) < new Date()) {
			Craft.cp.displayError("Start Date & Time cannot be in the past.");
			return false;
		}

		if (data.end_at && Number.isNaN(new Date(data.end_at).getTime())) {
			Craft.cp.displayError("End Date & Time must be a valid date.");
			return false;
		}

		if (
			data.start_at &&
			data.end_at &&
			new Date(data.end_at).getTime() <= new Date(data.start_at).getTime()
		) {
			Craft.cp.displayError("End Date & Time must be after Start Date & Time.");
			return false;
		}

		return true;
	},

	saveAnnouncement() {
		if (!this.announcementsStatusPageId) {
			Craft.cp.displayError("Status Page ID is required.");
			return;
		}

		const data = this.collectAnnouncementFormData();
		if (!this.validateAnnouncementForm(data)) return;

		const payload = {
			statusPageId: this.announcementsStatusPageId,
			...data,
		};

		if (!payload.start_at) delete payload.start_at;
		if (!payload.end_at) delete payload.end_at;

		if (this.selectedAnnouncementId) {
			payload.announcementId = this.selectedAnnouncementId;
		}

		if (this.announcementSaveBtn) {
			this.announcementSaveBtn.disabled = true;
			this.announcementSaveBtn.classList.add("disabled");
		}

		Craft.postActionRequest(
			"upsnap/status-page/announcement-save",
			{ payload: JSON.stringify(payload) },
			(response) => {
				if (this.announcementSaveBtn) {
					this.announcementSaveBtn.disabled = false;
					this.announcementSaveBtn.classList.remove("disabled");
				}

				if (!response || !response.success) {
					Craft.cp.displayError(
						response?.message || "Failed to save announcement."
					);
					return;
				}

				this.closeAnnouncementModal();
				this.selectedAnnouncementId = null;
				this.fetchAnnouncements();
				Craft.cp.displayNotice(
					response?.message || "Announcement saved successfully."
				);
			}
		);
	},

	openAnnouncementDeleteModal(announcementId) {
		this.selectedAnnouncementId = announcementId;
		if (!this.announcementDeleteModal) return;
		this.announcementDeleteModal.classList.remove("hidden");
		document.body.classList.add("upsnap-modal-open");
	},

	closeAnnouncementDeleteModal() {
		if (!this.announcementDeleteModal) return;
		this.announcementDeleteModal.classList.add("hidden");
		document.body.classList.remove("upsnap-modal-open");
		if (this.announcementDeleteConfirmBtn) {
			this.announcementDeleteConfirmBtn.disabled = false;
			this.announcementDeleteConfirmBtn.classList.remove("disabled");
			this.announcementDeleteConfirmBtn.textContent = "Delete";
		}
	},

	deleteAnnouncement() {
		if (!this.announcementsStatusPageId) {
			Craft.cp.displayError("Status Page ID is required.");
			return;
		}

		if (!this.selectedAnnouncementId) {
			Craft.cp.displayError("Announcement ID is required.");
			return;
		}

		if (this.announcementDeleteConfirmBtn) {
			this.announcementDeleteConfirmBtn.disabled = true;
			this.announcementDeleteConfirmBtn.classList.add("disabled");
			this.announcementDeleteConfirmBtn.textContent = "Deleting...";
		}

		Craft.postActionRequest(
			"upsnap/status-page/announcement-delete",
			{
				statusPageId: this.announcementsStatusPageId,
				announcementId: this.selectedAnnouncementId,
			},
			(response) => {
				if (!response || !response.success) {
					if (this.announcementDeleteConfirmBtn) {
						this.announcementDeleteConfirmBtn.disabled = false;
						this.announcementDeleteConfirmBtn.classList.remove("disabled");
						this.announcementDeleteConfirmBtn.textContent = "Delete";
					}

					Craft.cp.displayError(
						response?.message || "Failed to delete announcement."
					);
					return;
				}

				this.closeAnnouncementDeleteModal();
				this.selectedAnnouncementId = null;
				this.fetchAnnouncements();
				Craft.cp.displayNotice(
					response?.message || "Announcement deleted successfully."
				);
			}
		);
	},

	cacheElements() {
		this.table = document.getElementById("status-pages-table");
		this.tbody = this.table?.querySelector("tbody");
		this.loader = document.getElementById("status-pages-loader");
		this.emptyState = document.getElementById("status-pages-empty");
	},

	showLoader(show = true) {
		this.loader?.classList.toggle("hidden", !show);
		if (show) {
			this.table?.classList.add("hidden");
		}
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
		<div class="menu" data-status-page-id="${page.id}" data-shareable-id="${page.shareable_id}">
			<ul>
				<li data-action="toggle">
					<a>${page.is_published ? "Unpublish" : "Publish"}</a>
				</li>
				<li data-action="copy-link"><a>Copy link</a></li>
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
		const monitorsCount = Array.isArray(page.monitor_ids)
			? page.monitor_ids.length
			: 0;

		const viewIcon = page.is_published
			? `
            <a
                href="${window.Upsnap.upsnapStatsPageUrl}/shared/${page.shareable_id}"
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

		const announcementIcon = `
			<a
				href="${Craft.getUrl(`upsnap/status-page/edit/${page.id}`)}#announcements-tab"
				class="btn icon"
				title="Create Announcement"
				aria-label="Create Announcement"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 123.52 113.54" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M82.33,16.91c-1.07,0.88-2.65,0.74-3.54-0.34s-0.74-2.65,0.34-3.54L94.2,0.58c1.07-0.88,2.65-0.74,3.54,0.33 c0.88,1.07,0.74,2.65-0.34,3.54L82.33,16.91L82.33,16.91L82.33,16.91z M9.12,60.78c-1.66,0.49-2.88,1.57-3.69,3 c-0.93,1.65-1.35,3.78-1.32,6.06c0.01,0.98,0.11,1.99,0.28,3.01c0.17,1.03,0.43,2.06,0.75,3.07c0.33,1.02,0.73,2.01,1.2,2.96 c0.46,0.92,0.98,1.8,1.55,2.6l0,0c1.4,1.95,3.14,3.5,5.15,4.28c1.75,0.69,3.72,0.79,5.84,0.06l0.04-0.01 c0.24-0.08,0.48-0.11,0.72-0.09c0.17,0.01,0.34,0.04,0.51,0.09l0.05-0.02c0.57-0.19,1.16-0.37,1.74-0.55l1.59-0.49 c0.58-0.17,1.13-0.33,1.65-0.48c0.51-0.15,1.03-0.29,1.56-0.43c0.55-0.15,1.1-0.06,1.56,0.2l0.05,0.03 c0.43,0.26,0.76,0.68,0.91,1.21c0.03,0.09,0.04,0.16,0.05,0.24c0.14,0.63,0.31,1.28,0.43,1.91c1.09,4.88,2.15,9.58,3.56,13.39 c0.12,0.38,0.27,0.75,0.41,1.13c0.43,1.2,0.88,2.44,1.38,3.57c0.48,1.1,0.99,2.08,1.57,2.8l0,0.01c0.43,0.54,0.93,0.88,1.52,0.91 c0.65,0.03,1.46-0.28,2.48-1.07c0.44-0.41,0.84-0.76,1.25-1.11l0.09-0.08c1.2-1.04,2.4-2.07,2.92-3.48 c-0.08-0.06-0.17-0.12-0.27-0.17c-0.23-0.13-0.52-0.26-0.81-0.38l-0.03-0.01c-1.07-0.45-2.13-0.91-2.9-1.87 c-0.78-0.97-1.2-2.38-0.91-4.68c0.01-0.14,0.03-0.26,0.05-0.38c0.02-0.14,0.04-0.28,0.05-0.42c0.13-1.04,0.2-1.58,0.16-1.73l0-0.02 c-0.03-0.04-0.24-0.19-0.66-0.58c-0.12-0.11-0.25-0.22-0.36-0.34c-0.62-0.58-1.06-1.27-1.34-2.03c-0.31-0.84-0.43-1.76-0.42-2.72 c0.01-0.94,0.15-1.92,0.36-2.85c0.26-1.13,0.63-2.21,1-3.1l0.02-0.03c0.14-0.33,0.36-0.6,0.62-0.8c0.28-0.22,0.62-0.36,0.97-0.41 l0.02,0c7.57-1.05,13.68-0.91,18.81-0.25c4.63,0.6,8.44,1.61,11.83,2.57c-2.59-2.95-4.97-6.42-7.12-10.2 c-2.77-4.88-5.15-10.29-7.07-15.77c-1.94-5.54-3.41-11.16-4.33-16.4c-0.77-4.4-1.16-8.54-1.11-12.13 c-2.89,4.15-6.78,9.19-12.5,14.27c-6.53,5.79-15.45,11.63-28.01,16.25c-0.13,0.04-0.26,0.09-0.39,0.13l-0.06,0.1 c0,0,0.01-0.01-0.22,0.35l-0.02,0.03c-0.13,0.2-0.29,0.37-0.47,0.51l0,0c-0.2,0.15-0.42,0.27-0.66,0.34L9.12,60.78L9.12,60.78z M66.17,68.52c1.88,3.61,3.96,6.97,6.21,9.88c2.14,2.76,4.44,5.13,6.86,6.92l0.25,0.02c0.12,0.01,0.24,0.01,0.34,0l0.04,0 c0.19-0.01,0.38-0.04,0.58-0.1c0.19-0.06,0.39-0.15,0.6-0.27c0.51-0.52,0.93-1.2,1.27-2c0.38-0.88,0.66-1.92,0.84-3.08 c0.55-3.43,0.29-7.82-0.56-12.67c-0.93-5.3-2.58-11.13-4.66-16.84c-2.04-5.61-4.5-11.09-7.12-15.83 c-2.49-4.52-5.12-8.36-7.66-10.99c-0.95-0.99-1.87-1.78-2.74-2.35c-0.81-0.53-1.56-0.87-2.25-0.98l-0.02,0 c-0.16-0.03-0.29-0.04-0.39-0.05c-0.04,0,0-0.03-0.02-0.02l0,0c-0.01,0-0.01,0.02-0.06,0.06c-0.09,0.08-0.22,0.2-0.37,0.35 c-0.13,0.12-0.26,0.27-0.38,0.41l-0.04,0.08c-1.16,2.4-1.56,6.2-1.31,10.83c0.26,4.7,1.2,10.23,2.73,15.97 c4.35-1,7.75-0.08,10.09,1.87c1.37,1.14,2.36,2.62,2.97,4.27c0.6,1.64,0.82,3.45,0.64,5.26C71.67,62.82,69.76,66.34,66.17,68.52 L66.17,68.52z M78.89,89.41c-0.2,0.03-0.4,0.03-0.6,0c-0.19-0.03-0.38-0.08-0.56-0.17c-0.27-0.05-0.54-0.1-0.8-0.16 c-1.89-0.39-3.73-0.92-5.71-1.48l-0.13-0.04c-6.79-1.93-15.28-4.35-28.88-2.67c-0.18,0.52-0.33,1.08-0.45,1.63 c-0.12,0.58-0.19,1.16-0.2,1.69c0,0.42,0.04,0.81,0.13,1.13c0.07,0.24,0.18,0.44,0.33,0.58l0.24,0.22 c1.11,1.01,1.65,1.51,1.96,2.65c0.25,0.92,0.14,1.77-0.08,3.45c-0.03,0.23-0.05,0.46-0.09,0.69c-0.1,0.81,0.03,1.28,0.27,1.57 c0.25,0.3,0.68,0.49,1.12,0.67l0.05,0.02c1.4,0.6,2.8,1.21,3.52,3.2c0.08,0.18,0.13,0.38,0.15,0.58c0.02,0.2,0.02,0.4-0.02,0.61 l0,0.01c-0.31,1.61-0.97,2.84-1.8,3.89c-0.81,1.03-1.77,1.85-2.72,2.67l-0.22,0.19c-0.33,0.28-0.65,0.56-0.96,0.86l-0.16,0.14 c-2.17,1.73-4.02,2.35-5.65,2.18c-1.65-0.17-3.02-1.15-4.18-2.61c-0.8-1-1.46-2.23-2.05-3.54c-0.58-1.3-1.08-2.67-1.56-4 c-0.13-0.37-0.27-0.74-0.41-1.11c-1.48-3.99-2.57-8.84-3.69-13.85c-0.36,0.1-0.72,0.22-1.08,0.32c-0.56,0.17-1.11,0.33-1.64,0.5 c-0.54,0.17-1.07,0.34-1.59,0.5l-0.03,0.01c-0.08,0.02-0.14,0.05-0.19,0.07l-0.03,0.01c-0.38,0.16-0.66,0.27-0.98,0.3 c-0.29,0.03-0.56,0-0.88-0.12c-2.89,0.8-5.56,0.56-7.94-0.4c-2.7-1.1-5.02-3.15-6.86-5.72L4.5,83.86 c-0.69-0.99-1.31-2.05-1.86-3.17c-0.56-1.13-1.03-2.31-1.42-3.51c-0.39-1.2-0.69-2.43-0.89-3.66C0.13,72.3,0.02,71.08,0,69.88 c-0.03-3.02,0.56-5.88,1.87-8.19C3.05,59.62,4.81,58,7.2,57.1c0.09-0.14,0.16-0.26,0.24-0.36c0.13-0.17,0.27-0.32,0.46-0.48 l0.04-0.03c0.2-0.17,0.39-0.28,0.61-0.39c0.2-0.09,0.43-0.18,0.74-0.29l0.28-0.1c12.71-4.68,21.5-10.66,27.81-16.51 c6.31-5.85,10.15-11.57,12.92-15.73l0.06-0.09c1.55-2.32,2.8-4.17,4.05-5.42l0,0c0.32-0.32,0.6-0.58,0.9-0.8 c0.31-0.23,0.63-0.41,1-0.55c0.39-0.14,0.77-0.22,1.18-0.24c0.4-0.02,0.83,0.02,1.33,0.1c1.18,0.19,2.38,0.68,3.59,1.44 c1.23,0.77,2.47,1.82,3.7,3.1c2.74,2.84,5.56,6.94,8.21,11.73c2.76,4.98,5.34,10.7,7.46,16.55c2.18,6,3.9,12.14,4.87,17.77 c0.89,5.19,1.15,9.96,0.53,13.77c-0.26,1.6-0.67,3.06-1.24,4.32c-0.56,1.24-1.29,2.31-2.19,3.18c-0.04,0.04-0.09,0.08-0.13,0.12 c-0.06,0.04-0.12,0.09-0.18,0.13c-0.59,0.39-1.16,0.67-1.73,0.85c-0.58,0.19-1.16,0.28-1.74,0.31h-0.04c-0.2,0-0.39,0-0.57-0.01 C79.22,89.44,79.05,89.43,78.89,89.41L78.89,89.41z M103.5,78.48c-1.39,0.06-2.55-1.02-2.6-2.41c-0.06-1.39,1.02-2.55,2.41-2.6 l17.6-0.66c1.38-0.04,2.54,1.04,2.6,2.41c0.05,1.39-1.02,2.55-2.41,2.61L103.5,78.48L103.5,78.48L103.5,78.48z M103,61.38 c-1.38,0.18-2.64-0.79-2.82-2.15c-0.18-1.38,0.79-2.64,2.15-2.82l16.26-2.16c1.38-0.18,2.64,0.79,2.82,2.15 c0.18,1.38-0.79,2.64-2.15,2.82L103,61.38L103,61.38L103,61.38z M99.58,45.68c-1.31,0.45-2.75-0.24-3.2-1.55 c-0.46-1.31,0.24-2.75,1.55-3.2l16.67-5.79c1.31-0.47,2.75,0.24,3.2,1.55c0.46,1.31-0.24,2.75-1.55,3.2L99.58,45.68L99.58,45.68 L99.58,45.68z M91.72,30.57c-1.2,0.69-2.74,0.27-3.42-0.94c-0.69-1.2-0.27-2.73,0.94-3.42l15.8-9.06c1.2-0.69,2.74-0.27,3.42,0.94 c0.69,1.2,0.27,2.73-0.94,3.42L91.72,30.57L91.72,30.57L91.72,30.57z"/></svg>
			</a>
		`;

		const lockIcon = page.is_protected 
			? '<span data-icon="lock" class="status-page-lock-icon" title="Password Protected"></span>' 
			: '';

		tr.innerHTML = `
        <td>
            <strong>${Craft.escapeHtml(page.name)}</strong>${lockIcon}
			 <div class="light smalltext">
            ${monitorsCount} monitor${monitorsCount === 1 ? "" : "s"}
        </div>
        </td>
        <td>
            ${this.statusBadge(page.is_published)}
        </td>
        <td class="thin">
            <div class="upsnap-status-page-actions" aria-label="Status page row actions">
                ${viewIcon}
				${announcementIcon}
                ${this.actionMenu(page)}
            </div>
        </td>
    `;

		this.tbody.appendChild(tr);
		new Garnish.MenuBtn(tr.querySelector(".menubtn"));
	},

	/* ─── Dummy data helpers ────────────────────────────────────────────── */
	getDummyStatusPages() {
		return [
			{ name: 'Main Website',       is_published: true,  is_protected: false, monitor_count: 3 },
			{ name: 'API Services',       is_published: true,  is_protected: true,  monitor_count: 5 },
			{ name: 'Staging Environment',is_published: false, is_protected: false, monitor_count: 2 },
		];
	},

	renderDummyStatusPagesPreview() {
		const wrapper = document.getElementById('status-pages-wrapper');
		if (!wrapper) return;

		// Hide the real table & empty state
		this.table.classList.add('hidden');
		this.emptyState.classList.add('hidden');

		// Remove any stale preview
		const existing = wrapper.querySelector('.sp-preview-wrap');
		if (existing) existing.remove();

		const dummy = this.getDummyStatusPages();
		const rowsHtml = dummy.map((page) => {
			const lock = page.is_protected ? '<span data-icon="lock" class="status-page-lock-icon" title="Password Protected"></span>' : '';
			const badge = page.is_published
				? '<span class="status green"></span> Published'
				: '<span class="status gray"></span> Unpublished';
			const count = page.monitor_count;
			return `<tr>
				<td><strong>${Craft.escapeHtml(page.name)}</strong>${lock}<div class="light smalltext">${count} monitor${count === 1 ? '' : 's'}</div></td>
				<td>${badge}</td>
				<td class="thin"><span class="btn icon disabled" data-icon="view" aria-disabled="true"></span></td>
			</tr>`;
		}).join('');

		const preview = document.createElement('div');
		preview.className = 'sp-preview-wrap';
		preview.innerHTML = `
			<div class="sp-preview-table-wrapper">
				<div class="sp-preview-gate">
					<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<h3>No status pages yet</h3>
					<p>Share real-time uptime with your users, reduce support requests, and build trust with a public or private status page.</p>
					<a href="${Craft.getUrl('upsnap/status-page/new')}" class="btn submit sp-preview-gate-btn">Create your first Status Page</a>
				</div>
				<table class="data fullwidth sp-preview-table">
					<thead><tr>
						<th>Name</th>
						<th>Status</th>
						<th class="thin">Actions</th>
					</tr></thead>
					<tbody>${rowsHtml}</tbody>
				</table>
			</div>
		`;
		wrapper.appendChild(preview);
	},

	clearDummyStatusPagesPreview() {
		const wrapper = document.getElementById('status-pages-wrapper');
		if (!wrapper) return;
		const preview = wrapper.querySelector('.sp-preview-wrap');
		if (preview) preview.remove();
	},

	fetchStatusPages() {
		this.showLoader(true);

		const timeoutId = setTimeout(() => {
			this.loader?.classList.add("hidden");
			Craft.cp.displayError("Status pages took too long to load. Please refresh the page.");
		}, 15000);

		Craft.postActionRequest("upsnap/status-page/list", {}, (response) => {
			clearTimeout(timeoutId);
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
				this.emptyState.classList.add("hidden");
				this.renderDummyStatusPagesPreview();
				return;
			}

			this.clearDummyStatusPagesPreview();
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

	disableSavebtn() {
		const saveBtn = document.getElementById("status-page-btn");
		if (!saveBtn) return;

		saveBtn.disabled = true;
		saveBtn.classList.add("disabled");
	},

	enableSavebtn() {
		const saveBtn = document.getElementById("status-page-btn");
		if (!saveBtn) return;

		saveBtn.disabled = false;
		saveBtn.classList.remove("disabled");
	},
	getLightswitchState(elementId) {
		const lightswitchBtn = document.getElementById(elementId);
		if (!lightswitchBtn) return false;
		const hiddenInput = lightswitchBtn.querySelector('input[type="hidden"]');
		return (
			hiddenInput?.value === "1" ||
			lightswitchBtn.getAttribute("aria-checked") === "true"
		);
	},
	registerFormSubmit() {
		this.form.addEventListener("submit", async (e) => {
			e.preventDefault();

			const payload = this.buildSavePayload();
			if (!payload) return;

			this.disableSavebtn();
			try {
				const saveResult = await this.saveStatusPage(payload);
				const savedStatusPageId =
					saveResult?.data?.id ||
					saveResult?.data?.status_page?.id ||
					window.Upsnap?.statusPage?.id;

				if (savedStatusPageId) {
					await this.uploadSelectedAssets(savedStatusPageId);
				}

				Craft.cp.displayNotice(
					saveResult?.message || "Status page saved successfully."
				);
				window.location.href = Craft.getUrl("upsnap/status-page");
			} catch (error) {
				Craft.cp.displayError(error?.message || "Failed to save status page.");
			} finally {
				this.enableSavebtn();
			}
		});
	},
	saveStatusPage(payload) {
		return new Promise((resolve, reject) => {
			Craft.postActionRequest(
				"upsnap/status-page/save",
				{
					payload: JSON.stringify(payload),
				},
				(response) => {
					if (!response || !response.success) {
						reject(
							new Error(response?.message || "Failed to save status page.")
						);
						return;
					}
					resolve(response);
				}
			);
		});
	},
	buildSavePayload() {
		const name = this.nameInput.value.trim();
		const isProtected = this.getLightswitchState("is_protected");
		const password = this.passwordInput.value;
		const passwordPrompt = (this.passwordPromptInput.value || "").trim();
		const isPasswordDirty = password.length > 0;

		if (
			!this.validateForm({
				name,
				isProtected,
				password,
				passwordPrompt,
				isPasswordDirty,
			})
		) {
			return null;
		}

		const payload = {
			statusPageId: window.Upsnap?.statusPage?.id,
			name,
			monitor_ids: Array.from(this.selectedMonitors.keys()),
			is_published: true,
			is_protected: isProtected,
			password: null,
			customization: this.buildCustomizationPayload(isProtected),
		};

		if (this.isEditMode) {
			if (this.wasProtected && !isProtected) {
				payload.password = null;
			} else if (isProtected && isPasswordDirty) {
				payload.password = password;
			} else if (!this.wasProtected && isProtected) {
				payload.password = password;
			}
		} else if (isProtected) {
			payload.password = password;
		}

		return payload;
	},
	buildCustomizationPayload(isProtected) {
		const poweredBy = this.getLightswitchState("custom_footer_display_powered_by");
		const customization = {
			header: {
				title: (this.headerTitleInput.value || "").trim(),
				company_name: (this.headerCompanyNameInput.value || "").trim(),
				description: (this.headerDescriptionInput.value || "").trim(),
			},
			asset_urls: {
				favicon: this.assetState.favicon.removed
					? ""
					: this.assetState.favicon.currentUrl,
				logo: this.assetState.logo.removed
					? ""
					: this.assetState.logo.currentUrl,
			},
			links: {
				support_url: (this.supportUrlInput.value || "").trim(),
				privacy_url: (this.privacyUrlInput.value || "").trim(),
				tos_url: (this.tosUrlInput.value || "").trim(),
			},
			footer: {
				footer_text: (this.footerTextInput.value || "").trim(),
				contact_email: (this.contactEmailInput.value || "").trim(),
				copyright_text: (this.copyrightInput.value || "").trim(),
				display_powered_by: poweredBy,
			},
			password_prompt: isProtected
				? (this.passwordPromptInput.value || "").trim()
				: "",
			display_config: {
				accent_color: (this.accentColorHexInput.value || "").trim(),
				show_uptime_percentage: true,
				history_range_days: Number(this.historyRangeDaysInput.value),
			},
		};

		if (this.isEditMode) {
			const changedAssetUrls = {};
			if (this.assetState.logo.changed) {
				changedAssetUrls.logo = customization.asset_urls.logo;
			}
			if (this.assetState.favicon.changed) {
				changedAssetUrls.favicon = customization.asset_urls.favicon;
			}
			if (Object.keys(changedAssetUrls).length) {
				customization.asset_urls = changedAssetUrls;
			} else {
				delete customization.asset_urls;
			}
		}

		return customization;
	},
	validateForm({ name, isProtected, password, passwordPrompt, isPasswordDirty }) {
		if (!name) {
			Craft.cp.displayError("Name is required.");
			return false;
		}

		if (name.length > 100) {
			Craft.cp.displayError("Name must be 100 characters or fewer.");
			return false;
		}

		if (!this.selectedMonitors.size) {
			Craft.cp.displayError("Select at least one monitor.");
			return false;
		}

		if (isProtected) {
			if (!this.isEditMode && !password) {
				Craft.cp.displayError(
					"Password is required when page protection is enabled."
				);
				return false;
			}

			if (this.isEditMode && !this.wasProtected && !password) {
				Craft.cp.displayError(
					"Password is required when enabling page protection."
				);
				return false;
			}

			if (isPasswordDirty && !this.validatePassword(password)) {
				return false;
			}
		}

		if (passwordPrompt.length > 100) {
			Craft.cp.displayError(
				"Password Prompt Message must be 100 characters or fewer."
			);
			return false;
		}

		const title = (this.headerTitleInput.value || "").trim();
		const companyName = (this.headerCompanyNameInput.value || "").trim();
		const headerDescription = (this.headerDescriptionInput.value || "").trim();
		const footerText = (this.footerTextInput.value || "").trim();
		const contactEmail = (this.contactEmailInput.value || "").trim();
		const copyrightText = (this.copyrightInput.value || "").trim();
		const supportUrl = (this.supportUrlInput.value || "").trim();
		const privacyUrl = (this.privacyUrlInput.value || "").trim();
		const tosUrl = (this.tosUrlInput.value || "").trim();
		const accentColor = (this.accentColorHexInput.value || "").trim();
		const historyDays = Number(this.historyRangeDaysInput.value);

		if (!title) {
			Craft.cp.displayError("Page Title is required.");
			return false;
		}

		if (title.length > 50) {
			Craft.cp.displayError("Page Title must be 50 characters or fewer.");
			return false;
		}

		if (companyName.length > 25) {
			Craft.cp.displayError("Company Name must be 25 characters or fewer.");
			return false;
		}

		if (headerDescription.length > 100) {
			Craft.cp.displayError(
				"Header Description must be 100 characters or fewer."
			);
			return false;
		}

		if (footerText.length > 100) {
			Craft.cp.displayError("Footer Text must be 100 characters or fewer.");
			return false;
		}

		if (copyrightText.length > 50) {
			Craft.cp.displayError("Copyright Text must be 50 characters or fewer.");
			return false;
		}

		if (contactEmail.length > 255) {
			Craft.cp.displayError(
				"Contact Email must be 255 characters or fewer."
			);
			return false;
		}

		if (contactEmail && !this.isValidEmail(contactEmail)) {
			Craft.cp.displayError("Contact Email must be a valid email address.");
			return false;
		}

		if (!this.validateOptionalUrl(supportUrl, "Support URL")) return false;
		if (!this.validateOptionalUrl(privacyUrl, "Privacy Policy URL")) return false;
		if (!this.validateOptionalUrl(tosUrl, "Terms of Service URL")) return false;

		if (!/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
			Craft.cp.displayError("Accent Color must be in #RRGGBB format.");
			return false;
		}

		if (![7, 30, 90].includes(historyDays)) {
			Craft.cp.displayError(
				"History Range Days must be one of: 7, 30, or 90."
			);
			return false;
		}

		return true;
	},
	validateOptionalUrl(value, label) {
		if (!value) return true;

		if (value.length > 1080) {
			Craft.cp.displayError(`${label} must be 1080 characters or fewer.`);
			return false;
		}

		try {
			const parsed = new URL(value);
			if (!["http:", "https:"].includes(parsed.protocol)) {
				Craft.cp.displayError(`${label} must start with http:// or https://.`);
				return false;
			}
			return true;
		} catch {
			Craft.cp.displayError(`${label} must be a valid URL.`);
			return false;
		}
	},
	isValidEmail(value) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	},
	validatePassword(password) {
		if (password.length < 8) {
			Craft.cp.displayError("Password must be at least 8 characters long.");
			return false;
		}

		const hasUppercase = /[A-Z]/.test(password);
		const hasLowercase = /[a-z]/.test(password);
		const hasNumber = /\d/.test(password);
		const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

		if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
			Craft.cp.displayError(
				"Password must contain uppercase, lowercase, number, and special character."
			);
			return false;
		}

		return true;
	},
	registerPasswordProtection() {
		const lightswitchBtn = document.getElementById("is_protected");
		if (!lightswitchBtn || !this.passwordInput || !this.passwordPromptInput) return;

		const hiddenInput = lightswitchBtn.querySelector('input[type="hidden"]');
		const passwordField = this.passwordInput.closest(".field");
		const promptField = this.passwordPromptInput.closest(".field");
		if (!passwordField || !promptField) return;

		const updateVisibility = () => {
			const isProtected = this.getLightswitchState("is_protected");
			if (isProtected) {
				passwordField.style.display = "block";
				passwordField.classList.remove("hidden");
				promptField.style.display = "block";
				promptField.classList.remove("hidden");
				this.passwordPromptInput.disabled = false;
			} else {
				passwordField.style.display = "none";
				passwordField.classList.add("hidden");
				promptField.style.display = "none";
				promptField.classList.add("hidden");
				this.passwordInput.value = "";
				this.passwordPromptInput.disabled = true;
			}
		};

		lightswitchBtn.addEventListener("click", () => {
			setTimeout(updateVisibility, 50);
		});

		if (hiddenInput) {
			hiddenInput.addEventListener("change", updateVisibility);
		}

		updateVisibility();
	},
	registerAccentColorEvents() {
		if (!this.accentColorInput || !this.accentColorHexInput || !this.accentColorSwatch) {
			return;
		}

		const syncFromColorInput = () => {
			const color = this.accentColorInput.value;
			this.accentColorHexInput.value = color;
			this.accentColorSwatch.style.backgroundColor = color;
		};

		const syncFromHexInput = () => {
			const hex = (this.accentColorHexInput.value || "").trim();
			if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
				this.accentColorInput.value = hex;
				this.accentColorSwatch.style.backgroundColor = hex;
			}
		};

		this.accentColorInput.addEventListener("input", syncFromColorInput);
		this.accentColorHexInput.addEventListener("input", syncFromHexInput);
		syncFromHexInput();
	},
	initializeAssetState() {
		const customization =
			window.Upsnap?.statusPage?.customization ||
			window.Upsnap?.defaultCustomization ||
			{};
		const assetUrls = customization.asset_urls || {};

		this.assetState.logo.currentUrl = assetUrls.logo || "";
		this.assetState.favicon.currentUrl = assetUrls.favicon || "";
	},
	registerAssetEvents() {
		if (this.logoFileInput) {
			this.logoFileInput.addEventListener("change", async () => {
				const file = this.logoFileInput.files?.[0] || null;
				await this.handleAssetSelection("logo", file);
			});
		}

		if (this.faviconFileInput) {
			this.faviconFileInput.addEventListener("change", async () => {
				const file = this.faviconFileInput.files?.[0] || null;
				await this.handleAssetSelection("favicon", file);
			});
		}

		if (this.logoRemoveBtn) {
			this.logoRemoveBtn.addEventListener("click", () => this.removeAsset("logo"));
		}

		if (this.faviconRemoveBtn) {
			this.faviconRemoveBtn.addEventListener("click", () =>
				this.removeAsset("favicon")
			);
		}
	},
	async handleAssetSelection(type, file) {
		if (!file) return;

		const rules =
			type === "logo"
				? {
					allowedExt: ["jpg", "jpeg", "png"],
					allowedMime: ["image/jpeg", "image/png"],
					maxWidth: 400,
					maxHeight: 200,
				}
				: {
					allowedExt: ["png", "gif", "ico"],
					allowedMime: [
						"image/png",
						"image/gif",
						"image/x-icon",
						"image/vnd.microsoft.icon",
					],
					maxWidth: 96,
					maxHeight: 96,
				};

		const extension = (file.name.split(".").pop() || "").toLowerCase();
		if (!rules.allowedExt.includes(extension) && !rules.allowedMime.includes(file.type)) {
			Craft.cp.displayError(`Invalid ${type} file type.`);
			this.clearAssetInput(type);
			return;
		}

		if (file.size > 150 * 1024) {
			Craft.cp.displayError(
				`${type === "logo" ? "Logo" : "Favicon"} must be 150 KB or smaller.`
			);
			this.clearAssetInput(type);
			return;
		}

		const dimensionsValid = await this.validateImageDimensions(
			file,
			rules.maxWidth,
			rules.maxHeight
		);

		if (!dimensionsValid) {
			Craft.cp.displayError(
				`${type === "logo" ? "Logo" : "Favicon"} must be at most ${rules.maxWidth}x${rules.maxHeight}px.`
			);
			this.clearAssetInput(type);
			return;
		}

		this.assetState[type].file = file;
		this.assetState[type].changed = true;
		this.assetState[type].removed = false;
		this.renderAssetPreviews();
	},
	clearAssetInput(type) {
		if (type === "logo" && this.logoFileInput) this.logoFileInput.value = "";
		if (type === "favicon" && this.faviconFileInput) this.faviconFileInput.value = "";
	},
	removeAsset(type) {
		this.assetState[type].file = null;
		this.assetState[type].removed = true;
		this.assetState[type].changed = true;
		this.assetState[type].currentUrl = "";
		this.clearAssetInput(type);
		this.renderAssetPreviews();
	},
	renderAssetPreviews() {
		this.renderAssetPreview("logo", this.logoPreview);
		this.renderAssetPreview("favicon", this.faviconPreview);
	},
	renderAssetPreview(type, targetEl) {
		if (!targetEl) return;
		targetEl.innerHTML = "";
		const state = this.assetState[type];

		if (state.file) {
			const url = URL.createObjectURL(state.file);
			const img = document.createElement("img");
			img.src = url;
			img.alt = `${type} preview`;
			img.className = "upsnap-asset-image";
			targetEl.appendChild(img);
			return;
		}

		if (state.currentUrl) {
			const img = document.createElement("img");
			img.src = state.currentUrl;
			img.alt = `${type} preview`;
			img.className = "upsnap-asset-image";
			targetEl.appendChild(img);
			return;
		}

		targetEl.innerHTML = '<span class="light">No asset selected</span>';
	},
	validateImageDimensions(file, maxWidth, maxHeight) {
		return new Promise((resolve) => {
			const img = new Image();
			const objectUrl = URL.createObjectURL(file);

			img.onload = () => {
				URL.revokeObjectURL(objectUrl);
				resolve(img.width <= maxWidth && img.height <= maxHeight);
			};

			img.onerror = () => {
				URL.revokeObjectURL(objectUrl);
				resolve(false);
			};

			img.src = objectUrl;
		});
	},
	async uploadSelectedAssets(statusPageId) {
		const failures = [];

		if (this.assetState.logo.file) {
			try {
				const data = await this.uploadSingleAsset(
					statusPageId,
					"logo",
					this.assetState.logo.file
				);
				const logoUrl = data?.url || data?.logo || data?.asset_url || data?.asset?.url;
				if (logoUrl) this.assetState.logo.currentUrl = logoUrl;
			} catch (error) {
				failures.push(error?.message || "Failed to upload logo.");
			}
		}

		if (this.assetState.favicon.file) {
			try {
				const data = await this.uploadSingleAsset(
					statusPageId,
					"favicon",
					this.assetState.favicon.file
				);
				const faviconUrl =
					data?.url || data?.favicon || data?.asset_url || data?.asset?.url;
				if (faviconUrl) this.assetState.favicon.currentUrl = faviconUrl;
			} catch (error) {
				failures.push(error?.message || "Failed to upload favicon.");
			}
		}

		if (failures.length) {
			Craft.cp.displayError(failures.join(" "));
		}
	},
	uploadSingleAsset(statusPageId, type, file) {
		const formData = new FormData();
		formData.append(Craft.csrfTokenName, Craft.csrfTokenValue);
		formData.append("statusPageId", String(statusPageId));
		formData.append("type", type);
		formData.append("file", file);

		return fetch(Craft.getActionUrl("upsnap/status-page/upload"), {
			method: "POST",
			headers: {
				Accept: "application/json",
				"X-Requested-With": "XMLHttpRequest",
			},
			body: formData,
		})
			.then((response) => response.json())
			.then((response) => {
				if (!response?.success) {
					throw new Error(response?.message || `Failed to upload ${type}.`);
				}
				return response.data || {};
			})
			.catch((error) => {
				const message =
					error?.response?.data?.message ||
					error?.message ||
					`Failed to upload ${type}.`;
				throw new Error(message);
			});
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

				case "copy-link": {
					const shareableId = menu?.dataset.shareableId;
					this.copyStatusPageLink(shareableId);
					break;
				}

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

	copyStatusPageLink(shareableId) {
		if (!shareableId) {
			Craft.cp.displayError("No shareable link available for this status page.");
			return;
		}
		const url = `${window.Upsnap.upsnapStatsPageUrl}/shared/${shareableId}`;

		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(url).then(() => {
				Craft.cp.displayNotice("Link copied to clipboard.");
			}).catch(() => {
				Craft.cp.displayError("Failed to copy link.");
			});
			return;
		}

		// Fallback for non-secure contexts (HTTP)
		const ta = document.createElement("textarea");
		ta.value = url;
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.focus();
		ta.select();
		try {
			document.execCommand("copy");
			Craft.cp.displayNotice("Link copied to clipboard.");
		} catch {
			Craft.cp.displayError("Failed to copy link.");
		} finally {
			document.body.removeChild(ta);
		}
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
	showCraftConfirmModal({
		title = "Confirm deletion",
		message = "Are you sure?",
		confirmLabel = "Delete",
		cancelLabel = "Cancel",
	}) {
		return new Promise((resolve) => {
			let settled = false;
			const settle = (confirmed) => {
				if (settled) return;
				settled = true;
				resolve(confirmed);
			};

			// Prefer Craft's built-in confirm modal helper when available.
			if (Craft?.ui?.createConfirmModal) {
				Craft.ui.createConfirmModal({
					title,
					message,
					confirmLabel,
					cancelLabel,
					destructive: true,
					onConfirm: () => settle(true),
					onCancel: () => settle(false),
				});
				return;
			}

			const modalElement = document.createElement("div");
			modalElement.className = "modal fitted";
			modalElement.innerHTML = `
				<div class="body">
					<div class="content">
						<h1>${Craft.escapeHtml(title)}</h1>
						<p>${Craft.escapeHtml(message)}</p>
					</div>
				</div>
				<div class="footer">
					<div class="buttons right">
						<button type="button" class="btn upsnap-modal-cancel">${Craft.escapeHtml(cancelLabel)}</button>
						<button type="button" class="btn submit upsnap-modal-confirm">${Craft.escapeHtml(confirmLabel)}</button>
					</div>
				</div>
			`;

			document.body.appendChild(modalElement);

			const $modal = $(modalElement);
			const modal = new Garnish.Modal($modal, {
				onHide: () => {
					settle(false);
					$modal.remove();
				},
			});

			const cancelButton = modalElement.querySelector(".upsnap-modal-cancel");
			const confirmButton =
				modalElement.querySelector(".upsnap-modal-confirm");

			cancelButton?.addEventListener("click", () => {
				settle(false);
				modal.hide();
			});

			confirmButton?.addEventListener("click", () => {
				settle(true);
				modal.hide();
			});
		});
	},
	async confirmDelete(statusPageId) {
		const confirmed = await this.showCraftConfirmModal({
			title: "Delete status page",
			message:
				"Are you sure you want to delete this status page? This action cannot be undone.",
			confirmLabel: "Delete",
		});

		if (!confirmed) {
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
