// Initialize Upsnap namespace on Craft object
if (typeof Craft.Upsnap === 'undefined') {
    Craft.Upsnap = {};
}

// Settings page specific functionality
Craft.Upsnap.Settings = {
    // DOM elements
    elements: {},

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

    // Check if API key is provided
    hasApiKey: function() {
        return this.elements.apiKeyField && this.elements.apiKeyField.value.trim() !== '';
    },

    // Handle lightswitch toggle
    handleMonitoringToggle: function(event) {
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
    toggleHealthcheckSettings: function(lightswitchId, settingsId) {
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

    // Form validation
    validateForm: function(event) {
        // Add any form validation logic here if needed
        return true;
    },

    // Initialize the settings page
    init: function() {
        // Get DOM elements
        this.elements = {
            urlField: document.getElementById('monitoringUrl'),
            apiKeyField: document.getElementById('apiKey'),
            emailField: document.getElementById('notificationEmail'),
            enabledField: document.getElementById('enabled'),
            advancedSettings: document.getElementById('advanced-settings'),
            settingsForm: document.getElementById('settings-form'),
        };

        // Initial check on page load
        if (this.elements.enabledField && this.elements.advancedSettings) {
            this.toggleAdvancedSettings();
        }

        // Event listeners for main monitoring toggle
        if (this.elements.enabledField) {
            this.elements.enabledField.addEventListener('click', this.handleMonitoringToggle.bind(this));
        }

        // Initialize healthcheck toggles
        this.healthchecks.forEach(function(healthcheck) {
            const lightswitch = document.getElementById(healthcheck.id);
            
            if (lightswitch) {
                // Initial state
                this.toggleHealthcheckSettings(healthcheck.id, healthcheck.settingsId);
                
                // Add event listener
                lightswitch.addEventListener('click', function() {
                    // Use setTimeout to allow the lightswitch to update its state first
                    setTimeout(function() {
                        this.toggleHealthcheckSettings(healthcheck.id, healthcheck.settingsId);
                    }.bind(this), 10);
                }.bind(this));
            }
        }.bind(this));

        // Form submit validation
        if (this.elements.settingsForm) {
            this.elements.settingsForm.addEventListener('submit', this.validateForm.bind(this));
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Craft.Upsnap.Settings.init();
});