// Initialize Upsnap namespace on Craft object
if (typeof Craft.Upsnap === 'undefined') {
    Craft.Upsnap = {};
}

// Settings page specific functionality
Craft.Upsnap.Settings = {
    // DOM elements
    elements: {},

    // Validation functions
    isValidUrl: function (url) {
        const pattern = /^https:\/\/[^\s\/$.?#].[^\s]*$/i;
        return pattern.test(url);
    },

    // Toggle monitoring options based on URL validation
    toggleEnableMonitoring: function() {
        const urlValue = this.elements.urlField.value.trim();
        if (this.isValidUrl(urlValue)) {
            this.elements.enableMonitoring.style.display = 'block';
        } else {
            this.elements.enableMonitoring.style.display = 'none';
        }
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

    // Form validation
    validateForm: function(event) {
        const urlValue = Craft.Upsnap.Settings.elements.urlField.value.trim();

        if (!Craft.Upsnap.Settings.isValidUrl(urlValue)) {
            event.preventDefault();
            Craft.cp.displayError('Please enter a valid URL starting with https://');
            return false;
        }

        return true;
    },

    // Initialize the settings page
    init: function() {
        // Get DOM elements
        this.elements = {
            urlField: document.getElementById('monitoringUrl'),
            emailField: document.getElementById('notificationEmail'),
            enableMonitoring: document.getElementById('enable-monitoring'),
            enabledField: document.getElementById('enabled'),
            advancedSettings: document.getElementById('advanced-settings'),
            settingsForm: document.getElementById('settings-form')
        };

        // // Initial check on page load
        // if (this.elements.urlField && this.elements.enableMonitoring) {
        //     this.toggleEnableMonitoring();
        // }

        // if (this.elements.enabledField && this.elements.advancedSettings) {
        //     this.toggleAdvancedSettings();
        // }

        // // Event listeners
        // if (this.elements.urlField) {
        //     this.elements.urlField.addEventListener('input', this.toggleEnableMonitoring.bind(this));
        // }

        // if (this.elements.enabledField) {
        //     this.elements.enabledField.addEventListener('click', this.toggleAdvancedSettings.bind(this));
        // }

        if (this.elements.settingsForm) {
            this.elements.settingsForm.addEventListener('submit', this.validateForm.bind(this));
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Craft.Upsnap.Settings.init();
});