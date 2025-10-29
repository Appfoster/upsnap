// Initialize Upsnap namespace on Craft object
if (typeof Craft.Upsnap === 'undefined') {
    Craft.Upsnap = {};
}

// Settings page specific functionality
Craft.Upsnap.Settings = {
    // DOM elements
    elements: {},

    emailTags: [],

    // Healthcheck toggles configuration
    healthchecks: [
        {
            id: 'reachabilityEnabled',
            settingsId: 'reachability-settings'
        },
        {
            id: 'sslEnabled',
            settingsId: 'ssl-settings'
        },
        {
            id: 'domainEnabled',
            settingsId: 'domain-settings'
        }
    ],

    // Email validation
    isValidEmail: function (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Add email tag
    addEmailTag: function (email) {
        email = email.trim();

        if (!email) return;

        if (!this.isValidEmail(email)) {
            Craft.cp.displayNotice('Please enter a valid email address.');
            return;
        }

        if (this.emailTags.includes(email)) {
            Craft.cp.displayNotice('This email address is already added.');
            return;
        }

        this.emailTags.push(email);
        this.renderEmailTags();
        this.updateHiddenField();

        // Clear input
        if (this.elements.emailInput) {
            this.elements.emailInput.value = '';
        }
    },

    // Remove email tag
    removeEmailTag: function (email) {
        const index = this.emailTags.indexOf(email);
        if (index > -1) {
            this.emailTags.splice(index, 1);
            this.renderEmailTags();
            this.updateHiddenField();
        }
    },

    // Render email tags
    renderEmailTags: function () {
        if (!this.elements.emailContainer) return;

        this.elements.emailContainer.innerHTML = '';

        this.emailTags.forEach(function (email) {
            const tag = document.createElement('span');
            tag.className = 'email-tag';
            tag.setAttribute('data-email', email);
            tag.innerHTML = email + '<button type="button" class="email-tag-remove" aria-label="Remove">×</button>';

            const removeBtn = tag.querySelector('.email-tag-remove');
            removeBtn.addEventListener('click', function () {
                this.removeEmailTag(email);
            }.bind(this));

            this.elements.emailContainer.appendChild(tag);
        }.bind(this));
    },

    // Update hidden field with email array
    updateHiddenField: function () {
        if (this.elements.emailHidden) {
            this.elements.emailHidden.value = JSON.stringify(this.emailTags);
            this.elements.emailHidden.dispatchEvent(new Event('input'));
        }
    },

    // Check if API key is provided
    hasApiKey: function () {
        return this.elements.apiKeyField && this.elements.apiKeyField.value.trim() !== '';
    },

    // Handle lightswitch toggle
    handleMonitoringToggle: function (event) {
        const isEnabled = this.elements.enabledField.getAttribute('aria-checked') === 'true';

        // If trying to enable monitoring
        if (isEnabled) {
            // Check if API key is present
            if (!this.hasApiKey()) {
                // Prevent the toggle
                event.preventDefault();

                // Turn the lightswitch back off
                this.elements.enabledField.setAttribute('aria-checked', 'false');
                this.elements.enabledField.classList.remove('on');

                // Show toast notification
                Craft.cp.displayNotice('Please obtain and add an API key before enabling monitoring.');

                return false;
            }
        }

        // Toggle advanced settings
        this.toggleAdvancedSettings();
    },

    // Toggle advanced settings based on enabled lightswitch
    toggleAdvancedSettings: function () {
        if (!this.elements.enabledField || !this.elements.advancedSettings) return;

        const isEnabled = this.elements.enabledField.getAttribute('aria-checked') === 'true';

        if (isEnabled) {
            this.elements.advancedSettings.style.display = 'block';
        } else {
            this.elements.advancedSettings.style.display = 'none';
        }
    },

    // Toggle healthcheck specific settings
    toggleHealthcheckSettings: function (lightswitchId, settingsId) {
        const lightswitch = document.getElementById(lightswitchId);
        const settings = document.getElementById(settingsId);

        if (!lightswitch || !settings) return;

        const isEnabled = lightswitch.getAttribute('aria-checked') === 'true';

        if (isEnabled) {
            settings.style.display = 'block';
        } else {
            settings.style.display = 'none';
        }
    },

    isValidUrl: function (url) {
        const pattern = /^https:\/\/[^\s\/$.?#].[^\s]*$/i;
        return pattern.test(url);
    },
    // Form validation
    validateForm: function (event) {
        const urlValue = Craft.Upsnap.Settings.elements.monitoringUrl.value.trim();

        if (!Craft.Upsnap.Settings.isValidUrl(urlValue)) {
            event.preventDefault();
            Craft.cp.displayError('Please enter a valid URL starting with https://');
            return false;
        }
        return true;
    },

    // Initialize the settings page
    init: function () {
        // Get DOM elements
        this.elements = {
            urlField: document.getElementById('monitoringUrl'),
            apiKeyField: document.getElementById('apiKey'),
            emailContainer: document.getElementById('email-tags-container'),
            emailInput: document.getElementById('notificationEmails-input'),
            emailHidden: document.getElementById('notificationEmails-hidden'),
            enabledField: document.getElementById('enabled'),
            advancedSettings: document.getElementById('advanced-settings'),
            settingsForm: document.getElementById('settings-form'),
        };

        // Initialize email tags from hidden field
        if (this.elements.emailHidden && this.elements.emailHidden.value) {
            try {
                this.emailTags = JSON.parse(this.elements.emailHidden.value);
            } catch (e) {
                this.emailTags = [];
            }
            this.renderEmailTags();
        }

        // Email input handlers
        if (this.elements.emailInput) {
            this.elements.emailInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const email = e.target.value.replace(',', '').trim();
                    if (email) {
                        this.addEmailTag(email);
                    }
                }
            }.bind(this));

            this.elements.emailInput.addEventListener('blur', function (e) {
                const email = e.target.value.trim();
                if (email) {
                    this.addEmailTag(email);
                }
            }.bind(this));
        }

        // Initial check on page load
        if (this.elements.enabledField && this.elements.advancedSettings) {
            this.toggleAdvancedSettings();
        }

        // Event listeners for main monitoring toggle
        if (this.elements.enabledField) {
            this.elements.enabledField.addEventListener('click', this.handleMonitoringToggle.bind(this));
        }

        // Initialize healthcheck toggles
        this.healthchecks.forEach(function (healthcheck) {
            const lightswitch = document.getElementById(healthcheck.id);

            if (lightswitch) {
                // Initial state
                this.toggleHealthcheckSettings(healthcheck.id, healthcheck.settingsId);

                // Add event listener
                lightswitch.addEventListener('click', function () {
                    // Use setTimeout to allow the lightswitch to update its state first
                    setTimeout(function () {
                        this.toggleHealthcheckSettings(healthcheck.id, healthcheck.settingsId);
                    }.bind(this), 10);
                }.bind(this));
            }
        }.bind(this));

        // Form submit validation
        if (this.elements.settingsForm) {
            this.elements.settingsForm.addEventListener('submit', this.validateForm.bind(this));
        }
        // Add Craft-native form state tracking
        if (this.elements.settingsForm) {
            const form = this.elements.settingsForm;
            const saveBtn = document.getElementById('save-button');

            const initialData = new FormData(form);
            const original = Object.fromEntries(initialData.entries());

            // Disable save button by default
            saveBtn.disabled = true;
            saveBtn.classList.add("disabled");

            const isDirty = () => {
                const current = Object.fromEntries(new FormData(form).entries());
                return Object.keys(current).some(
                    (key) => current[key] !== original[key]
                );
            };

            const toggleSaveButton = () => {
                const dirty = isDirty();
                if (dirty) {
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('disabled');
                } else {
                    saveBtn.disabled = true;
                    saveBtn.classList.add('disabled');
                }
            };

            // Listen for any input/change in the form
            form.querySelectorAll('input, select, textarea').forEach((el) => {
                el.addEventListener('input', toggleSaveButton);
                el.addEventListener('change', toggleSaveButton);
            });

            // Add Craft lightswitch listeners
            form.querySelectorAll('.lightswitch').forEach((ls) => {
                ls.addEventListener('click', () => {
                    setTimeout(() => {
                        toggleSaveButton();
                    }, 50);
                });
            });

            // Optional: disable after submit
            form.addEventListener('submit', () => {
                saveBtn.disabled = true;
                saveBtn.classList.add('disabled');
            });
        }



    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    Craft.Upsnap.Settings.init();
});