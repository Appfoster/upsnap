// Multi-site monitor setup page functionality

window.Craft = window.Craft || {};
Craft.Upsnap = Craft.Upsnap || {};

Craft.Upsnap.MultisiteSetup = {
	cfg: null,

	init() {
		this.cfg = window.UpsnapMultisite;
		if (!this.cfg) return;

		this.wireSelectAll();
		this.wireSubmit();
	},

	wireSelectAll() {
		const selectAll = document.getElementById('upsnap-select-all');
		if (!selectAll) return;

		selectAll.addEventListener('change', function () {
			document.querySelectorAll('.upsnap-site-checkbox:not([disabled])').forEach(function (cb) {
				cb.checked = selectAll.checked;
			});
		});
	},

	wireSubmit() {
		const submitBtn = document.getElementById('upsnap-multisite-submit');
		if (!submitBtn) return;

		const self = this;
		submitBtn.addEventListener('click', async function () {
			await self.handleSubmit(submitBtn);
		});
	},

	async handleSubmit(submitBtn) {
		const cfg  = this.cfg;
		const i18n = cfg.i18n;

		const checkboxes = document.querySelectorAll('.upsnap-site-checkbox:not([disabled]):checked');

		if (checkboxes.length === 0) {
			alert(i18n.selectAtLeastOne);
			return;
		}

		// Build payload - URL comes from data-url on the row, not from <code> text
		const sites = [];
		checkboxes.forEach(function (cb) {
			const siteId    = cb.dataset.siteId;
			const nameInput = document.querySelector('.upsnap-site-name[data-site-id="' + siteId + '"]');
			const row       = document.getElementById('upsnap-site-' + siteId);

			sites.push({
				name: nameInput ? nameInput.value.trim() : '',
				url:  row      ? (row.dataset.url || '') : '',
			});
		});

		const validSites = sites.filter(function (s) { return s.url !== ''; });
		if (validSites.length === 0) {
			alert(i18n.noValidUrls);
			return;
		}

		submitBtn.disabled    = true;
		submitBtn.textContent = i18n.creating;

		try {
			const response = await fetch(cfg.bulkCreateUrl, {
				method:  'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept':       'application/json',
					'X-CSRF-Token': cfg.csrfTokenValue,
				},
				body: JSON.stringify({ sites: validSites }),
			});

			const json = await response.json();

			// Hard failure - token expired, bad request, etc.
			if (!json.success) {
				this.showBanner('error', json.message || i18n.anErrorOccurred);

				// Token-related failure: offer redirect to settings
				if (json.message && json.message.toLowerCase().includes('token')) {
					setTimeout(function () {
						if (confirm(i18n.sessionExpiredPrompt)) {
							window.location.href = cfg.settingsUrl;
						}
					}, 500);
				}

				submitBtn.disabled    = false;
				submitBtn.textContent = i18n.createMonitors;
				return;
			}

			const { created, skipped, failed } = json.summary;

			// Update per-row status pills
			(json.results || []).forEach((result) => {
				const row = this.findRowByUrl(result.url);
				if (!row) return;

				const pill = row.querySelector('.pill[id^="status-"]');
				if (!pill) return;

				if (result.status === 'created') {
					pill.className   = 'pill pill--green';
					pill.textContent = i18n.statusCreated;
				} else if (result.status === 'skipped') {
					pill.className   = 'pill pill--yellow';
					pill.textContent = i18n.statusSkipped;
					pill.title       = result.message || '';
				} else {
					pill.className   = 'pill pill--red';
					pill.textContent = i18n.statusFailed;
					pill.title       = result.message || '';
				}
			});

			const parts = [];
			if (created > 0) parts.push(created + ' ' + i18n.created);
			if (skipped > 0) parts.push(skipped + ' ' + i18n.skippedAlreadyExists);
			if (failed  > 0) parts.push(failed  + ' ' + i18n.failed);

			this.showBanner(failed > 0 ? 'warning' : 'success', parts.join(', ') + '.');

			if (created > 0) {
				submitBtn.textContent = i18n.doneGoToMonitors;
				submitBtn.disabled    = false;
				submitBtn.addEventListener('click', function () {
					window.location.href = cfg.monitorsUrl;
				}, { once: true });
			} else {
				submitBtn.disabled    = false;
				submitBtn.textContent = i18n.createMonitors;
			}

		} catch (err) {
			console.error('Bulk create error:', err);
			this.showBanner('error', i18n.unexpectedError);
			submitBtn.disabled    = false;
			submitBtn.textContent = i18n.createMonitors;
		}
	},

	findRowByUrl(url) {
		const rows = document.querySelectorAll('#upsnap-multisite-table tbody tr');
		for (let i = 0; i < rows.length; i++) {
			if ((rows[i].dataset.url || '').replace(/\/$/, '') === (url || '').replace(/\/$/, '')) {
				return rows[i];
			}
		}
		return null;
	},

	showBanner(type, message) {
		const el = document.getElementById('upsnap-multisite-results');
		if (!el) return;

		el.className = type === 'success' ? 'status-container' : 'status-container ' + type;
		el.innerHTML = '<p class="status-message-dashboard">' + this.escapeHtml(message) + '</p>';
		el.style.display = '';
		el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	},

	escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	},
};

document.addEventListener('DOMContentLoaded', function () {
	Craft.Upsnap.MultisiteSetup.init();
});
