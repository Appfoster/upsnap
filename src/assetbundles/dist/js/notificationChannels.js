/**
 * Integrations Manager - Handles CRUD operations for notification channels
 * Following Craft CMS standards and best practices
 */
(function () {
	"use strict";

	/**
	 * Integration type definitions - will be populated dynamically from API
	 */
	let INTEGRATION_TYPES = {};

	/**
	 * Channel type configurations - will be populated dynamically from API
	 */
	let CHANNEL_CONFIG = {};

	/**
	 * Main Integrations Manager Class
	 */
	class IntegrationsManager {
		constructor() {
			this.channels = [];
			this.supportedTypes = [];
			this.planLimits = null;
			this.currentFilter = "my-integrations";
			this.searchQuery = "";

			this.init();
		}

		/**
		 * Initialize the manager
		 */
		async init() {
			this.cacheElements();
			this.attachEventListeners();
			await this.loadSupportedTypes();
			this.loadIntegrations();
		}

		/**
		 * Cache DOM elements
		 */
		cacheElements() {
			this.$list = document.getElementById("integrations-list");
			this.$loading = document.getElementById("integrations-loading");
			this.$empty = document.getElementById("integrations-empty");
			this.$usage = document.getElementById("integration-usage");
			this.$search = document.getElementById("integration-search");
			this.$navItems = document.querySelectorAll(
				".integrations-nav-item"
			);

			this.menuEl = document.createElement("div");
			this.menuEl.className = "custom-context-menu";
			this.menuEl.style.position = "absolute";
			this.menuEl.style.display = "none";
			this.menuEl.style.zIndex = "9999";

			document.body.appendChild(this.menuEl);

			// hide when clicking outside
			document.addEventListener("click", (e) => {
				if (!this.menuEl.contains(e.target)) {
					this.hideMenu();
				}
			});
		}
		showMenu(html, x, y) {
			this.menuEl.innerHTML = html;
			this.menuEl.style.left = `${x}px`;
			this.menuEl.style.top = `${y}px`;
			this.menuEl.style.display = "block";
		}

		hideMenu() {
			this.menuEl.style.display = "none";
		}

		/**
		 * Attach event listeners
		 */
		attachEventListeners() {
			// Category filter navigation
			this.$navItems.forEach(($item) => {
				$item.addEventListener("click", (e) => {
					this.handleFilterChange(e.currentTarget);
				});
			});

			// Search input
			if (this.$search) {
				this.$search.addEventListener("input", (e) => {
					this.handleSearch(e.target.value);
				});
			}

			// Delegated event listeners for dynamic content
			this.$list.addEventListener("click", (e) => {
				this.handleListClick(e);
			});
		}

		/**
		 * Handle clicks within the integrations list (event delegation)
		 */
		handleListClick(e) {
			const $target = e.target;

			// Add button
			const $addBtn = $target.closest(".integration-add-btn");

			if ($addBtn) {
				e.stopPropagation();
				const integrationType = $addBtn.dataset.type;
				this.openAddModal(integrationType);
				return;
			}

			// Expand/collapse integration
			const $header = $target.closest(".integration-header");
			if ($header) {
				const $item = $header.closest(".integration-item");
				this.toggleIntegration($item);
				return;
			}

			// Channel menu button
			const $menuBtn = $target.closest(".channel-menu-btn");
			if ($menuBtn) {
				e.stopPropagation();
				const channelId = $menuBtn.dataset.channelId;
				this.handleChannelMenu(channelId, $menuBtn, e);
				return;
			}
		}

		/**
		 * Load integrations from API
		 */
		async loadIntegrations() {
			this.showLoading(true);

			try {
				const response = await Craft.sendActionRequest(
					"GET",
					"upsnap/monitor-notification-channels/list"
				);
				const { data } = response?.data || {};

				if (!data) {
					throw new Error("Invalid response format");
				}

				this.channels = data.channels || [];
				this.planLimits = data.plan_limits || null;

				this.renderIntegrations();
				this.updateUsageDisplay();
				this.showLoading(false);
			} catch (error) {
				console.error("Failed to load integrations:", error);
				this.showCraftMessage(
					"error",
					error?.response?.data?.message ||
						"Failed to load integrations"
				);
				this.showLoading(false);
				this.showEmpty(true);
			}
		}

		/**
		 * Load supported integration types from API
		 */
		async loadSupportedTypes() {
			try {
				const response = await Craft.sendActionRequest(
					"GET",
					"upsnap/monitor-notification-channels/list-supported-types"
				);
				const { data } = response?.data || {};

				if (!data || !data.channels) {
					throw new Error("Invalid response format");
				}

				this.supportedTypes = data.channels;
				this.buildIntegrationTypes();
			} catch (error) {
				console.error("Failed to load supported types:", error);
				// Fallback to empty array if API fails
				this.supportedTypes = [];
			}
		}

		/**
		 * Build INTEGRATION_TYPES and CHANNEL_CONFIG from API response
		 */
		buildIntegrationTypes() {
			INTEGRATION_TYPES = {};
			CHANNEL_CONFIG = {};

			const CATEGORY_MAP = {
				slack:       'chat_platforms',
				teams:       'chat_platforms',
				discord:     'chat_platforms',
				google_chat: 'chat_platforms',
				telegram:    'chat_platforms',
				pagerduty:   'incident_management',
				zapier:      'automation_connectors',
				webhook:     'webhooks',
				email:       'email_sms',
			};

			this.supportedTypes.forEach((channel) => {
				const type = channel.type;
				const category = CATEGORY_MAP[type] || 'chat_platforms';

				// Build INTEGRATION_TYPES
				INTEGRATION_TYPES[type] = {
					name: channel.label,
					description: channel.description,
					category: category,
					icon: channel.icon,
				};

				// Build CHANNEL_CONFIG from config_schema
				CHANNEL_CONFIG[type] = {
					fields: channel.config_schema?.fields || [],
				};
			});
		}

		/**
		 * Render all integrations
		 */
		renderIntegrations() {
			const grouped = this.groupChannelsByType();
			const $fragment = document.createDocumentFragment();

			// Render each integration type
			Object.keys(INTEGRATION_TYPES).forEach((type) => {
				const typeChannels = grouped[type] || [];
				const $item = this.createIntegrationItem(type, typeChannels);
				$fragment.appendChild($item);
			});

			this.$list.innerHTML = "";
			this.$list.appendChild($fragment);

			this.applyFilters();
		}

		/**
		 * Group channels by their type
		 */
		groupChannelsByType() {
			const grouped = {};

			this.channels.forEach((channel) => {
				const type = channel.channel_type;
				if (!grouped[type]) {
					grouped[type] = [];
				}
				grouped[type].push(channel);
			});

			return grouped;
		}

		/**
		 * Create integration item HTML
		 */
		createIntegrationItem(type, channels) {
			const config = INTEGRATION_TYPES[type];
			const $item = document.createElement("div");
			$item.className = "integration-item";
			$item.dataset.type = type;
			$item.dataset.category = config.category;

			const canAdd = this.canAddMoreIntegrations();
			const hasChannels = channels.length > 0;
			$item.dataset.hasChannels = hasChannels ? "true" : "false";


			$item.innerHTML = `
                <div class="integration-header">
                    <div class="integration-icon">
                        ${this.getIntegrationIcon(config.icon)}
                    </div>
                    <div class="integration-info">
                        <h3 class="integration-name">${config.name}</h3>
                        <p class="integration-description">${
							config.description
						}</p>
                    </div>
                    <div class="integration-actions">
                        <button class="integration-add-btn" data-type="${type}" ${
				!canAdd ? "disabled" : ""
			}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add
                        </button>
                        <svg
							class="integration-expand-icon ${!hasChannels ? 'is-placeholder' : ''}"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polyline points="6 9 12 15 18 9"></polyline>
						</svg>
                    </div>
                </div>
                ${
					hasChannels
						? `
                    <div class="integration-channels">
                        <div class="integration-channels-inner">
                            ${channels
								.map((channel) =>
									this.createChannelCard(channel)
								)
								.join("")}
                        </div>
                    </div>
                `
						: ""
				}
            `;

			return $item;
		}

		/**
		 * Create channel card HTML
		 */
		createChannelCard(channel) {
			const statusClass = channel.is_enabled ? "active" : "inactive";
			const statusText = channel.is_enabled ? "Active" : "Inactive";
			const details = this.getChannelDetails(channel);

			return `
                <div class="channel-card" data-channel-id="${channel.id}">
                    <div class="channel-info">
                        <div class="channel-name">
                            ${this.escapeHtml(channel.name)}
                            <span class="channel-status ${statusClass}">${statusText}</span>
                        </div>
                        <p class="channel-details">${details}</p>
                    </div>
                    <div class="channel-actions">
                        <button class="channel-menu-btn" data-channel-id="${
							channel.id
						}" title="More options">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="12" cy="5" r="1"></circle>
                                <circle cx="12" cy="19" r="1"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
		}

		/**
		 * Get integration icon — uses a colour PNG from the logo folder.
		 * Falls back to a generic mail SVG if the image fails to load or
		 * the base URL is not available (mirrors the Next.js onError pattern).
		 */
		getIntegrationIcon(iconName) {
			const fallbackSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path></svg>';

			const logoBaseUrl = window?.Upsnap?.settings?.logoBaseUrl || '';

			if (!iconName || !logoBaseUrl) {
				return fallbackSvg;
			}

			// Normalise: lowercase, underscores → hyphens (matches file names)
			const normalizedName = iconName.toLowerCase().replace(/_/g, '-');

			// Human-readable alt text
			const humanName = iconName
				.replace(/[_-]+/g, ' ')
				.trim()
				.replace(/\b\w/g, c => c.toUpperCase());

			// Render the PNG with a hidden sibling SVG revealed on error,
			// exactly mirroring the React onError → setHasError pattern.
			return `<img
				src="${logoBaseUrl}/${normalizedName}.png"
				alt="${humanName} integration"
				class="integration-icon-img"
				onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
			/><span class="integration-icon-fallback" aria-hidden="true" style="display:none">${fallbackSvg}</span>`;
		}

		/**
		 * Get channel details text
		 */
		getChannelDetails(channel) {
			const config = channel.config || {};
			const channelType = channel.channel_type;

			// Get the first field from config_schema for this channel type
			const channelConfig = CHANNEL_CONFIG[channelType];
			if (!channelConfig || !channelConfig.fields || channelConfig.fields.length === 0) {
				return "Configured";
			}

			const firstField = channelConfig.fields[0];
			const value = this.getNestedValue(config, firstField.name);

			if (!value) {
				return `No ${firstField.label.toLowerCase()} configured`;
			}

			// For webhook URLs, try to extract a meaningful identifier
			if (firstField.type === "url") {
				try {
					const url = new URL(value);
					
					// Discord webhook
					if (url.hostname.includes("discord.com")) {
						const pathParts = url.pathname.split("/");
						if (pathParts.length >= 4 && pathParts[3]) {
							return `Discord Webhook (${pathParts[3]})`;
						}
						return "Discord Webhook";
					}
					
					// Google Chat webhook
					if (url.hostname.includes("chat.googleapis.com")) {
						const spaceMatch = url.pathname.match(/\/spaces\/([^\/]+)/);
						if (spaceMatch && spaceMatch[1]) {
							return `Google Chat Space (${spaceMatch[1]})`;
						}
						return "Google Chat Webhook";
					}
					
					// Slack webhook
					if (url.hostname.includes("slack.com")) {
						return "Slack Webhook";
					}
					
					// Generic webhook
					return `${INTEGRATION_TYPES[channelType]?.name || "Webhook"}`;
				} catch (e) {
					return `${INTEGRATION_TYPES[channelType]?.name || "Webhook"}`;
				}
			}

			// For email or text fields, return the value directly
			return value;
		}

		/**
		 * Toggle integration expansion
		 */
		toggleIntegration($item) {
			const isExpanded = $item.classList.contains("expanded");

			// Close all other expanded items
			document
				.querySelectorAll(".integration-item.expanded")
				.forEach(($el) => {
					if ($el !== $item) {
						$el.classList.remove("expanded");
					}
				});

			// Toggle current item
			$item.classList.toggle("expanded");
		}

		/**
		 * Handle filter change
		 */
		handleFilterChange($navItem) {
			this.$navItems.forEach(($item) => $item.classList.remove("active"));
			$navItem.classList.add("active");

			this.currentFilter = $navItem.dataset.filter;
			this.applyFilters();
		}

		/**
		 * Handle search input
		 */
		handleSearch(query) {
			this.searchQuery = query.toLowerCase().trim();
			this.applyFilters();
		}

		/**
		 * Apply filters and search
		 */
		applyFilters() {
			const $items = document.querySelectorAll(".integration-item");
			let visibleCount = 0;

			$items.forEach(($item) => {
				const category = $item.dataset.category;
				const type = $item.dataset.type;
				const config = INTEGRATION_TYPES[type];

				let matchesFilter = false;

				if (this.currentFilter === "all") {
					matchesFilter = true;
				} else if (this.currentFilter === "my-integrations") {
					matchesFilter = $item.dataset.hasChannels === "true";
				} else {
					matchesFilter = category === this.currentFilter;
				}

				const matchesSearch =
					!this.searchQuery ||
					config.name.toLowerCase().includes(this.searchQuery) ||
					config.description.toLowerCase().includes(this.searchQuery);

				if (matchesFilter && matchesSearch) {
					$item.classList.remove("hidden");
					visibleCount++;
				} else {
					$item.classList.add("hidden");
					$item.classList.remove("expanded");
				}
			});
			this.showEmpty(visibleCount === 0);
		}

		/**
		 * Handle add/edit integration button click
		 */
		handleAddIntegration(type, editData = null) {
			const modal = document.getElementById(
				"add-notification-channel-modal"
			);
			if (!modal) {
				console.warn("Notification channel modal not found");
				return;
			}

			const closeBtn = modal.querySelector(".upsnap-modal__close");
			const cancelBtn = document.getElementById(
				"cancel-notification-channel-btn"
			);
			const saveBtn = document.getElementById(
				"save-notification-channel-btn"
			);
			const overlay = modal.querySelector(".upsnap-modal__overlay");
			const subscriptionTypes = window?.Upsnap?.settings?.subscriptionTypes || {}; // user details data

			// Form fields
			const typeField = document.getElementById("channelType");
			const nameField = document.getElementById("channelName");
			const dynamicFieldsContainer = document.getElementById("dynamic-fields-container");
			const modalTitle = modal.querySelector(".upsnap-modal__title");

			let editMode = false;
			let currentChannelId = null;
			let currentChannelType = type ?? "email";

			/**
			 * Get field config for current channel type
			 */
			const getCurrentFieldsConfig = () => {
				const config = CHANNEL_CONFIG[currentChannelType];
				return config?.fields || [];
			};

			/**
			 * Generate dynamic form fields based on config_schema
			 */
			const generateDynamicFields = (channelData = null) => {
				if (!dynamicFieldsContainer) return;

				const fields = getCurrentFieldsConfig();
				dynamicFieldsContainer.innerHTML = "";

				// Get user details for trial restriction
				const userdetails = window?.Upsnap?.settings?.userDetails || {};
				const subscriptionType = userdetails?.user?.subscription_type;
				const userEmail = userdetails?.user?.email || "";
				const isTrial = subscriptionType === subscriptionTypes.trial;

				fields.forEach((field) => {
					const fieldWrapper = document.createElement("div");
					fieldWrapper.className = "field";
					fieldWrapper.dataset.fieldName = field.name;

					// Create label
					const label = document.createElement("label");
					label.textContent = field.label;
					label.setAttribute("for", `field-${field.name}`);
					if (field.required) {
						label.classList.add("required");
					}
					fieldWrapper.appendChild(label);

					// Create input container for proper error styling
					const inputContainer = document.createElement("div");
					inputContainer.className = "input";

					// Create input based on field type
					let input;
					if (field.type === "password") {
						input = document.createElement("input");
						input.type = "password";
						input.autocomplete = "new-password";
					} else if (field.type === "email") {
						input = document.createElement("input");
						input.type = "email";
						input.autocomplete = "off";
					} else if (field.type === "url") {
						input = document.createElement("input");
						input.type = "url";
						input.autocomplete = "off";
					} else {
						input = document.createElement("input");
						input.type = "text";
						input.autocomplete = "off";
					}

					input.id = `field-${field.name}`;
					input.name = field.name;
					input.className = "text fullwidth";
					input.placeholder = field.placeholder || "";
					input.required = field.required || false;

					// Set value if editing
					if (channelData && channelData.config) {
						const value = this.getNestedValue(channelData.config, field.name);
						if (value) {
							input.value = value;
						}
					}

					// Apply trial user email restriction for email type integrations
					// Check if this is an email integration and the field is for recipient email
					const isEmailRecipientField = currentChannelType === 'email' && 
						field.type === 'email' && 
						(field.name === 'recipients.to' || field.name.includes('recipient'));

					if (isEmailRecipientField && isTrial) {
						// Trial users cannot edit email - lock the field
						input.value = userEmail;
						input.disabled = true;
						input.classList.add("disabled");
						input.setAttribute("title", "Email editing is available only for paid plans");
					} else if (isEmailRecipientField && !channelData) {
						// For non-trial users creating new email integration, pre-fill with their email
						if (!input.value) {
							input.value = userEmail;
						}
					}

					// Add input change listener to clear errors
					input.addEventListener('input', () => {
						clearFieldError(field.name);
					});

					inputContainer.appendChild(input);

					// Add password toggle button for password fields
					if (field.type === "password") {
						const toggleBtn = document.createElement("button");
						toggleBtn.type = "button";
						toggleBtn.className = "password-toggle-btn";
						toggleBtn.setAttribute("aria-label", "Toggle password visibility");
						toggleBtn.innerHTML = `
							<svg class="password-show-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
								<circle cx="12" cy="12" r="3"></circle>
							</svg>
							<svg class="password-hide-icon hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
								<line x1="1" y1="1" x2="23" y2="23"></line>
							</svg>
						`;

						toggleBtn.addEventListener("click", () => {
							const isPassword = input.type === "password";
							input.type = isPassword ? "text" : "password";
							
							const showIcon = toggleBtn.querySelector(".password-show-icon");
							const hideIcon = toggleBtn.querySelector(".password-hide-icon");
							
							if (isPassword) {
								showIcon.classList.add("hidden");
								hideIcon.classList.remove("hidden");
							} else {
								showIcon.classList.remove("hidden");
								hideIcon.classList.add("hidden");
							}
						});

						inputContainer.classList.add("password-field");
						inputContainer.appendChild(toggleBtn);
					}

					fieldWrapper.appendChild(inputContainer);

					// Add error container for this field
					const errorContainer = document.createElement("ul");
					errorContainer.className = "errors hidden";
					errorContainer.id = `field-${field.name}-errors`;
					fieldWrapper.appendChild(errorContainer);

					// Add description/help text if available
					if (field.description) {
						const helpText = document.createElement("p");
						helpText.className = "light";
						helpText.textContent = field.description;
						fieldWrapper.appendChild(helpText);
					}

					dynamicFieldsContainer.appendChild(fieldWrapper);
				});
			};

			/**
			 * Show error message for a specific field
			 */
			const showFieldError = (fieldName, message) => {
				const errorContainer = document.getElementById(`field-${fieldName}-errors`);
				const inputElement = document.getElementById(`field-${fieldName}`);
				const fieldWrapper = dynamicFieldsContainer?.querySelector(`[data-field-name="${fieldName}"]`);

				if (errorContainer) {
					errorContainer.innerHTML = `<li>${message}</li>`;
					errorContainer.classList.remove('hidden');
				}

				if (inputElement) {
					inputElement.classList.add('error');
				}

				if (fieldWrapper) {
					fieldWrapper.classList.add('has-errors');
				}
			};

			/**
			 * Clear error message for a specific field
			 */
			const clearFieldError = (fieldName) => {
				const errorContainer = document.getElementById(`field-${fieldName}-errors`);
				const inputElement = document.getElementById(`field-${fieldName}`);
				const fieldWrapper = dynamicFieldsContainer?.querySelector(`[data-field-name="${fieldName}"]`);

				if (errorContainer) {
					errorContainer.innerHTML = '';
					errorContainer.classList.add('hidden');
				}

				if (inputElement) {
					inputElement.classList.remove('error');
				}

				if (fieldWrapper) {
					fieldWrapper.classList.remove('has-errors');
				}
			};

			/**
			 * Clear all field errors
			 */
			const clearAllErrors = () => {
				// Clear name field error
				const nameErrorContainer = document.getElementById('channelName-errors');
				const nameInput = document.getElementById('channelName');
				const nameFieldWrapper = nameInput?.closest('.field');

				if (nameErrorContainer) {
					nameErrorContainer.innerHTML = '';
					nameErrorContainer.classList.add('hidden');
				}
				if (nameInput) {
					nameInput.classList.remove('error');
				}
				if (nameFieldWrapper) {
					nameFieldWrapper.classList.remove('has-errors');
				}

				// Clear dynamic field errors
				const fields = getCurrentFieldsConfig();
				fields.forEach(field => {
					clearFieldError(field.name);
				});
			};

			/**
			 * Reset form to default state
			 */
			const resetForm = () => {
				if (typeField) typeField.value = "email";
				if (nameField) nameField.value = "";

				editMode = false;
				currentChannelId = null;
				currentChannelType = "email";

				if (modalTitle)
					modalTitle.textContent = "Add Notification Channel";
				if (saveBtn) saveBtn.textContent = "Save Channel";

				clearAllErrors();
				generateDynamicFields();
			};

			/**
			 * Show modal
			 */
			const showModal = () => {
				modal.classList.remove("hidden");
				// Focus on name field after modal opens
				setTimeout(() => nameField?.focus(), 100);
			};

			/**
			 * Hide modal
			 */
			const hideModal = () => {
				modal.classList.add("hidden");
				resetForm();
			};

			/**
			 * Open modal for adding new channel
			 */
			function openNotificationChannelModal(channelType) {
				resetForm();
				currentChannelType = channelType;

				if (typeField) {
					typeField.value = channelType;
				}

				generateDynamicFields();

				// Update modal title based on type
				if (modalTitle && channelType) {
					const typeName = INTEGRATION_TYPES[channelType]?.name || "Notification Channel";
					modalTitle.textContent = `Add ${typeName}`;
				}

				showModal();
			}

			if (editData) {
                // EDIT MODE
                openModalForEdit(editData);
            } else {
                // ADD MODE
                openNotificationChannelModal(type);
            }

			/**
			 * Open modal for editing existing channel
			 */
			function openModalForEdit(channelData) {
				editMode = true;
				currentChannelId = channelData.id;
				currentChannelType = channelData.channel_type;

				if (typeField) typeField.value = channelData.channel_type;
				if (nameField) nameField.value = channelData.name || "";

				generateDynamicFields(channelData);

				if (modalTitle)
					modalTitle.textContent = `Edit ${
						channelData.name || "Channel"
					}`;
				if (saveBtn) saveBtn.textContent = "Update Channel";

				showModal();
			}

			/**
			 * Validate form based on channel type
			 */
			const validateForm = () => {
				clearAllErrors();
				let isValid = true;

				const name = nameField?.value.trim();

				if (!name) {
					showNameFieldError("Please enter a channel name.");
					isValid = false;
				}

				const fields = getCurrentFieldsConfig();

				for (const field of fields) {
					const input = document.getElementById(`field-${field.name}`);
					if (!input) continue;

					const value = input.value.trim();

					if (field.required && !value) {
						showFieldError(field.name, `${field.label} is required.`);
						isValid = false;
						continue;
					}

					// Validate URL fields
					if (field.type === "url" && value) {
						try {
							new URL(value);
						} catch (e) {
							showFieldError(field.name, `Please enter a valid URL.`);
							isValid = false;
						}
					}

					// Validate email fields
					if (field.type === "email" && value) {
						const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
						if (!emailRegex.test(value)) {
							showFieldError(field.name, `Please enter a valid email address.`);
							isValid = false;
						}
					}
				}

				return isValid;
			};

			/**
			 * Show error message for name field
			 */
			const showNameFieldError = (message) => {
				const nameInput = document.getElementById('channelName');
				const nameFieldWrapper = nameInput?.closest('.field');
				
				if (!nameFieldWrapper) return;

				// Check if error container exists, if not create it
				let errorContainer = document.getElementById('channelName-errors');
				if (!errorContainer) {
					errorContainer = document.createElement("ul");
					errorContainer.className = "errors";
					errorContainer.id = "channelName-errors";
					
					// Insert after input
					const inputContainer = nameInput.parentElement;
					if (inputContainer.classList.contains('input')) {
						inputContainer.parentElement.insertBefore(errorContainer, inputContainer.nextSibling);
					} else {
						nameInput.parentElement.insertBefore(errorContainer, nameInput.nextSibling);
					}
				}

				errorContainer.innerHTML = `<li>${message}</li>`;
				errorContainer.classList.remove('hidden');
				nameInput.classList.add('error');
				nameFieldWrapper.classList.add('has-errors');
			};

			/**
			 * Build payload based on channel type
			 */
			const buildPayload = () => {
				const name = nameField?.value.trim();
				const type = typeField?.value || currentChannelType;
				const fields = getCurrentFieldsConfig();

				const payload = {
					type: type,
					label: name,
					config: {},
				};

				// Build config object from dynamic fields
				fields.forEach((field) => {
					const input = document.getElementById(`field-${field.name}`);
					if (input && input.value.trim()) {
						this.setNestedValue(payload.config, field.name, input.value.trim());
					}
				});

				if (editMode && currentChannelId) {
					payload.channelId = currentChannelId;
				}

				return payload;
			};

			/**
			 * Save or update channel
			 */
			const saveChannel = async () => {
				if (!validateForm()) {
					return;
				}

				// Disable button and show loading state
				saveBtn.disabled = true;
				const originalText = saveBtn.textContent;
				saveBtn.textContent = editMode ? "Updating..." : "Saving...";
				saveBtn.classList.add("disabled");

				try {
					const endpoint = editMode
						? "upsnap/monitor-notification-channels/update"
						: "upsnap/monitor-notification-channels/create";

					const payload = buildPayload();

					const response = await Craft.sendActionRequest(
						"POST",
						endpoint,
						{
							data: payload,
						}
					);

					const data = response?.data || {};

					if (!data.success) {
						throw new Error(
							data?.message ||
								`Failed to ${
									editMode ? "update" : "add"
								} notification channel.`
						);
					}

					showCraftMessage(
						"success",
						data?.message ||
							`Notification channel ${
								editMode ? "updated" : "created"
							} successfully.`
					);

					hideModal();
					this.loadIntegrations();

					// Reload integrations list
					if (window.integrationsManager) {
						await this.loadIntegrations();
					}
				} catch (error) {
					console.error("Save channel error:", error);
					const message =
						error?.response?.data?.message ||
						error?.message ||
						"Something went wrong.";
					showCraftMessage("error", message);
				} finally {
					saveBtn.disabled = false;
					saveBtn.textContent = originalText;
					saveBtn.classList.remove("disabled");
				}
			};

			/**
			 * Display Craft notification
			 */
			const showCraftMessage = (type, message) => {
				if (!message) message = "Something went wrong";

				switch (type) {
					case "success":
						Craft.cp.displayNotice(message);
						break;
					case "error":
						Craft.cp.displayError(message);
						break;
					default:
						Craft.cp.displayNotice(message);
						break;
				}
			};

			// Event listeners
			if (closeBtn) closeBtn.onclick = hideModal;
			if (cancelBtn) cancelBtn.onclick = hideModal;
			if (overlay) overlay.onclick = hideModal;
			if (saveBtn) saveBtn.onclick = saveChannel;

			// Add input listener to name field to clear errors
			if (nameField) {
				nameField.addEventListener('input', () => {
					const nameErrorContainer = document.getElementById('channelName-errors');
					const nameFieldWrapper = nameField.closest('.field');

					if (nameErrorContainer) {
						nameErrorContainer.innerHTML = '';
						nameErrorContainer.classList.add('hidden');
					}
					nameField.classList.remove('error');
					if (nameFieldWrapper) {
						nameFieldWrapper.classList.remove('has-errors');
					}
				});
			}

			// Close modal on ESC key
			document.addEventListener("keydown", (e) => {
				if (e.key === "Escape" && !modal.classList.contains("hidden")) {
					hideModal();
				}
			});

			// Listen for type changes (if you add a type selector in the future)
			if (typeField) {
				typeField.addEventListener("change", (e) => {
					currentChannelType = e.target.value;
					generateDynamicFields();
				});
			}
		}

		/**
		 * Handle channel menu button click
		 */
		handleChannelMenu(channelId, button, event) {
			event.preventDefault();
			event.stopPropagation();

			const channel = this.channels.find((ch) => ch.id === channelId);
			if (!channel) return;
			const toggleLabel = channel.is_enabled ? "Disable" : "Enable";

			const html = `
                <ul>
                    <li data-action="toggle">${toggleLabel}</li>
                    <li data-action="test">Test Connection</li>
                    <li data-action="edit">Edit</li>
                    <li data-action="delete" class="error">Delete</li>
                </ul>
            `;

			// position near the button
			const rect = button.getBoundingClientRect();
			const x = rect.right + window.scrollX - 150; // adjust as needed
			const y = rect.bottom + window.scrollY;

			this.showMenu(html, x, y);

			// click handler for menu items
			this.menuEl.onclick = (e) => {
				const action = e.target.dataset.action;
				if (!action) return;

				this.handleChannelAction(action, channelId);
				this.hideMenu();
			};
		}

		/**
		 * Handle channel actions
		 */
		async handleChannelAction(action, channelId) {
			const channel = this.channels.find((ch) => ch.id === channelId);

			if (!channel) return;

			switch (action) {
				case "toggle":
					await this.toggleChannel(channel);
					break;
				case "edit":
					this.editChannel(channelId);
					break;
				case "test":
					await this.testChannel(channelId);
					break;
				case "delete":
					await this.deleteChannel(channelId);
					break;
			}
		}

        /**
         * Public helper — open the modal for adding
         */
        openAddModal(type = "email") {
            this.handleAddIntegration(type, null);
        }

        /**
         * Public helper — open the modal for editing
         */
        openEditModal(channelData) {
            this.handleAddIntegration(channelData.channel_type, channelData);
        }

		/**
		 * Edit channel
		 */
        async editChannel(channelId) {
            const channel = this.channels.find(ch => ch.id === channelId);
            if (!channel) return;

            this.openEditModal(channel);
        }

		async toggleChannel(channel) {
			const newState = !channel.is_enabled;

			try {
				const response = await Craft.sendActionRequest(
					"POST",
					"upsnap/monitor-notification-channels/update",
					{
						data: {
							channelId: channel.id,
							label: channel.name,
							is_enabled: newState,
							config: channel.config
						},
					}
				);

				const data = response?.data;

				if (!data?.success) {
					throw new Error(data?.message || "Failed to update channel status");
				}

				this.showCraftMessage(
					"success",
					`Channel ${newState ? "enabled" : "disabled"} successfully`
				);

				channel.is_enabled = newState;
				this.renderIntegrations();
			} catch (error) {
				console.error("Toggle failed:", error);
				this.showCraftMessage(
					"error",
					error?.response?.data?.message || error.message || "Failed to update channel"
				);
			}
		}

		/**
		 * Test channel connection
		 */
		async testChannel(channelId) {
			try {
				this.showCraftMessage("notice", "Testing connection...");

				const response = await Craft.sendActionRequest(
					"POST",
					"upsnap/monitor-notification-channels/test",
					{
						data: { channelId },
					}
				);
                const data = response.data;

                if (!data?.success) {
                    throw new Error(data?.message || "Connection test failed");
                }

				this.showCraftMessage("success", "Connection test successful!");
			} catch (error) {
				console.error("Test failed:", error);
				this.showCraftMessage(
                    "error",
                    error?.response?.data?.message || error.message || "Connection test failed"
                );
			}
		}

		/**
		 * Delete channel
		 */
		async deleteChannel(channelId) {
			if (!confirm("Are you sure you want to delete this channel?")) {
				return;
			}

			try {
				const response = await Craft.sendActionRequest(
					"POST",
					"upsnap/monitor-notification-channels/delete",
					{
						data: { channelId },
					}
				);

				this.channels = this.channels.filter(
					(ch) => ch.id !== channelId
				);
				this.showCraftMessage(
					"success",
					"Channel deleted successfully"
				);
				this.loadIntegrations();
				this.updateUsageDisplay();
			} catch (error) {
				console.error("Delete failed:", error);
				this.showCraftMessage(
					"error",
					error?.response?.data?.message || "Failed to delete channel"
				);
			}
		}

		/**
		 * Check if more integrations can be added
		 */
		canAddMoreIntegrations() {
			if (!this.planLimits) return true;
			return this.planLimits.can_add_more;
		}

		/**
		 * Update usage display
		 */
		updateUsageDisplay() {
			if (!this.planLimits || !this.$usage) return;

			const { used_integrations, max_integrations } = this.planLimits;
			this.$usage.textContent = `${used_integrations}/${max_integrations} used`;
		}

		/**
		 * Show/hide loading state
		 */
		showLoading(show) {
			if (this.$loading) {
				this.$loading.classList.toggle("hidden", !show);
			}
		}

		/**
		 * Show/hide empty state
		 */
		showEmpty(show) {
			if (this.$empty) {
				this.$empty.classList.toggle("hidden", !show);
			}
		}

		/**
		 * Display Craft CP notification
		 */
		showCraftMessage(type, message) {
			if (!message) message = "Something went wrong";

			switch (type) {
				case "success":
					Craft.cp.displayNotice(message);
					break;
				case "error":
					Craft.cp.displayError(message);
					break;
				default:
					Craft.cp.displayNotice(message);
					break;
			}
		}

		/**
		 * Escape HTML to prevent XSS
		 */
		escapeHtml(text) {
			const div = document.createElement("div");
			div.textContent = text;
			return div.innerHTML;
		}

		/**
		 * Get nested value from object using dot notation
		 * e.g., getNestedValue({recipients: {to: 'email@test.com'}}, 'recipients.to')
		 */
		getNestedValue(obj, path) {
			return path.split('.').reduce((current, key) => current?.[key], obj);
		}

		/**
		 * Set nested value in object using dot notation
		 * e.g., setNestedValue({}, 'recipients.to', 'email@test.com')
		 */
		setNestedValue(obj, path, value) {
			const keys = path.split('.');
			const lastKey = keys.pop();
			const target = keys.reduce((current, key) => {
				if (!current[key]) {
					current[key] = {};
				}
				return current[key];
			}, obj);
			target[lastKey] = value;
		}
	}

	// Export to global scope
	window.IntegrationsManager = IntegrationsManager;
})();
