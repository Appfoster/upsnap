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

		this.fetchMonitors();
		this.registerFormSubmit();
		this.registerPasswordProtection();
		this.registerAccentColorEvents();
		this.registerAssetEvents();
		this.registerCharCounters();
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
            ${viewIcon}
            ${this.actionMenu(page)}
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
