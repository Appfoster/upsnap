// incidents.js – Vanilla JS IIFE for the Upsnap Incidents listing page.
(() => {
    if (!window.Craft || !window.UpsnapIncidents) {
        console.error('[Upsnap] incidents.js: required globals missing.');
        return;
    }

    /* ─── Config ──────────────────────────────────────────────────────────── */
    const cfg = window.UpsnapIncidents;
    console.log('[Upsnap] Incidents config:', cfg);

    /* ─── State ───────────────────────────────────────────────────────────── */
    const state = {
        monitorId:   null,
        timeRange:   '24h',
        page:        1,
        pageSize:    20,
        search:      '',
        checkTypes:  [],  // committed only on Apply Filters
        regions:     [],  // committed only on Apply Filters
        sortBy:      'timestamp',
        sortOrder:   'desc',
        // drafted (not yet applied) filter selections
        _draftCheckTypes: [],
        _draftRegions:    [],
    };

    /* ─── Selectors ───────────────────────────────────────────────────────── */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const el = {
        monitorSelect:   () => $('#incidents-monitor-select'),
        timeframeSelect: () => $('#incidents-timeframe-select'),
        searchInput:     () => $('#incidents-search'),
        filterBtn:       () => $('#incidents-filter-btn'),
        filterBadge:     () => $('#incidents-filter-badge'),
        filterDropdown:  () => $('#incidents-filter-dropdown'),
        filterContainer: () => $('#incidents-filter-container'),
        checkTypeCbs:    () => $$('.incidents-checktype-cb'),
        regionList:      () => $('#incidents-region-filter-list'),
        regionLoading:   () => $('#incidents-region-loading'),
        applyFilters:    () => $('#incidents-apply-filters'),
        clearFilters:    () => $('#incidents-clear-filters'),
        tbody:           () => $('#incidents-tbody'),
        loader:          () => $('#incidents-loader'),
        sortHeaders:     () => $$('.incidents-th--sortable'),
        pageSizeSelect:  () => $('#incidents-page-size'),
        prevBtn:         () => $('#incidents-prev-btn'),
        nextBtn:         () => $('#incidents-next-btn'),
        showing:         () => $('#incidents-showing'),
        pageInfo:        () => $('#incidents-page-info'),
        exportBtn:       () => $('#incidents-export-btn'),
        exportDropdown:  () => $('#incidents-export-dropdown'),
        exportContainer: () => $('#incidents-export-container'),
        exportCsv:       () => $('#incidents-export-csv'),
        exportPdf:       () => $('#incidents-export-pdf'),
    };

    /* ─── Helpers ─────────────────────────────────────────────────────────── */
    const escapeHtml = (str) => {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const formatDate = (ts) => {
        if (!ts && ts !== 0) return '—';
        try {
            // API returns Unix timestamps in seconds; JS Date needs milliseconds.
            // If the value is numeric (or a numeric string) treat it as seconds.
            const ms = isNaN(Number(ts)) ? ts : Number(ts) * 1000;
            const d = new Date(ms);
            return d.toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch {
            return String(ts);
        }
    };

    const humanCheckType = (v) =>
        (v || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const craftNotice = (msg) => {
        if (Craft && Craft.cp && Craft.cp.displayNotice) Craft.cp.displayNotice(msg);
    };
    const craftError = (msg) => {
        if (Craft && Craft.cp && Craft.cp.displayError) Craft.cp.displayError(msg);
    };

    /* ─── Debounce ──────────────────────────────────────────────────────── */
    let searchDebounceTimer = null;
    const debounce = (fn, delay) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(fn, delay);
    };

    /* ─── Convert timeRange string → { start_time, end_time } unix seconds ── */
    const timeRangeToTimestamps = (range) => {
        const now = Math.floor(Date.now() / 1000);
        const offsets = { '24h': 86400, '7d': 604800, '30d': 2592000 };
        const offset  = offsets[range] ?? 86400;
        return { start_time: now - offset, end_time: now };
    };

    /* ─── Populate monitors <select> ──────────────────────────────────────── */
    const populateMonitorSelect = (monitors) => {
        const sel = el.monitorSelect();
        if (!sel) return;
        sel.innerHTML = '';
        monitors = monitors.monitors || []

        if (!monitors || !monitors.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No monitors found';
            sel.appendChild(opt);
            return;
        }

        monitors.forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            sel.appendChild(opt);
        });

        // Pre-select: honour ?monitor_id= URL param first, then fall back to first in list
        const urlMonitorId = new URLSearchParams(window.location.search).get('monitor_id');
        const preselect = urlMonitorId && monitors.find((m) => m.id === urlMonitorId)
            ? urlMonitorId
            : monitors[0].id;
        state.monitorId = preselect;
        sel.value = state.monitorId;
    };

    /* ─── Build a table row ────────────────────────────────────────────────── */
    const buildRow = (inc) => {
        const tr = document.createElement('tr');

        // Check Type
        const tdType = document.createElement('td');
        const typeVal = inc.check_type || '';
        tdType.innerHTML = `<span class="check-type-badge check-type-${escapeHtml(typeVal)}">${escapeHtml(humanCheckType(typeVal))}</span>`;

        // Region
        const tdRegion = document.createElement('td');
        const regionDisplay = regionMap[inc.region] || inc.region || '—';
        tdRegion.innerHTML = `<span class="region-badge">${escapeHtml(regionDisplay)}</span>`;

        // Message
        const tdMsg = document.createElement('td');
        const msg = inc.error_message || inc.message || '';
        const short = msg.length > 100 ? msg.slice(0, 100) + '…' : msg;
        tdMsg.innerHTML = `<span class="incident-message" title="${escapeHtml(msg)}">${escapeHtml(short) || '—'}</span>`;

        // Status Code
        const tdCode = document.createElement('td');
        const code = inc.status_code != null ? inc.status_code : '—';
        tdCode.innerHTML = `<span class="status-code-badge status-${escapeHtml(String(code))}">${escapeHtml(String(code))}</span>`;

        // Occurred At
        const tdTime = document.createElement('td');
        const ts = inc.timestamp || inc.occurred_at || inc.created_at || '';
        tdTime.innerHTML = `<time datetime="${escapeHtml(ts)}">${escapeHtml(formatDate(ts))}</time>`;

        tr.append(tdType, tdRegion, tdMsg, tdCode, tdTime);
        return tr;
    };

    /* ─── Render table body ───────────────────────────────────────────────── */
    const renderTable = (incidents) => {
        const tbody = el.tbody();
        if (!tbody) return;
        tbody.innerHTML = '';

        const exportBtn = el.exportBtn();

        if (!incidents || !incidents.length) {
            if (exportBtn) exportBtn.classList.add('disable');
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" class="incidents-empty-cell">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="opacity:.4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>No incidents found.</span>
            </td>`;
            tbody.appendChild(tr);
            return;
        }

        if (exportBtn) exportBtn.classList.remove('disable');
        incidents.forEach((inc) => tbody.appendChild(buildRow(inc)));
    };

    /* ─── Render pagination ───────────────────────────────────────────────── */
    const renderPagination = (pagination) => {
        if (!pagination) return;

        const total      = pagination.total_count   ?? pagination.total        ?? 0;
        const totalPages = pagination.total_pages   ?? pagination.pages        ?? 1;
        const current    = pagination.page          ?? pagination.current_page ?? state.page;
        const perPage    = pagination.page_size     ?? pagination.per_page     ?? state.pageSize;

        const from = total === 0 ? 0 : (current - 1) * perPage + 1;
        const to   = Math.min(current * perPage, total);

        const showEl    = el.showing();
        const pageEl    = el.pageInfo();
        const prevBtn   = el.prevBtn();
        const nextBtn   = el.nextBtn();

        if (showEl) {
            showEl.textContent = total === 0
                ? 'Showing 0 incidents'
                : `Showing ${from} to ${to} of ${total} incidents`;
        }

        if (pageEl) {
            pageEl.textContent = `Page ${current} of ${totalPages}`;
        }

        if (prevBtn) prevBtn.disabled = current <= 1;
        if (nextBtn) nextBtn.disabled = current >= totalPages;

        // sync local state to what server returned
        state.page = current;
    };

    /* ─── Show / hide loader overlay ─────────────────────────────────────── */
    const setLoading = (loading) => {
        const loader = el.loader();
        if (!loader) return;
        if (loading) {
            loader.classList.remove('hidden');
        } else {
            loader.classList.add('hidden');
        }
    };

    /* ─── Fetch & render ──────────────────────────────────────────────────── */
    const fetchAndRender = async () => {
        if (!state.monitorId) {
            renderTable([]);
            return;
        }

        setLoading(true);

        // Build on top of the existing endpoint URL (which may already contain
        // Craft's ?site= or other query params from actionUrl()).
        const url = new URL(cfg.listEndpoint, window.location.origin);
        url.searchParams.set('monitorId',  state.monitorId);
        url.searchParams.set('time_range', state.timeRange);
        url.searchParams.set('page',       state.page);
        url.searchParams.set('page_size',  state.pageSize);
        url.searchParams.set('sort_by',    state.sortBy);
        url.searchParams.set('sort_order', state.sortOrder);

        if (state.search)            url.searchParams.set('search',     state.search);
        if (state.checkTypes.length) url.searchParams.set('check_type', state.checkTypes.join(','));
        if (state.regions.length)    url.searchParams.set('region',     state.regions.join(','));

        try {
            const res = await fetch(url.toString(), {
                headers: {
                    'Accept':       'application/json',
                    'X-CSRF-Token': Craft.csrfTokenValue,
                },
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();

            if (!json.success) {
                craftError(json.message || 'Failed to fetch incidents.');
                renderTable([]);
                return;
            }

            const responseData = json.data ?? {};
            renderTable(responseData.incidents ?? []);
            renderPagination(responseData);
        } catch (err) {
            console.error('[Upsnap] incidents fetch error:', err);
            craftError('Failed to load incidents. Please try again.');
            renderTable([]);
        } finally {
            setLoading(false);
        }
    };

    /* ─── Sort headers ────────────────────────────────────────────────────── */
    const updateSortIcons = () => {
        el.sortHeaders().forEach((th) => {
            const icon = th.querySelector('.incidents-sort-icon');
            if (!icon) return;
            if (th.dataset.sortKey === state.sortBy) {
                icon.className = `incidents-sort-icon incidents-sort-icon--${state.sortOrder}`;
                th.setAttribute('aria-sort', state.sortOrder === 'asc' ? 'ascending' : 'descending');
            } else {
                icon.className = 'incidents-sort-icon incidents-sort-icon--none';
                th.removeAttribute('aria-sort');
            }
        });
    };

    const bindSortHeaders = () => {
        el.sortHeaders().forEach((th) => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => {
                const key = th.dataset.sortKey;
                if (state.sortBy === key) {
                    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    state.sortBy    = key;
                    state.sortOrder = 'asc';
                }
                state.page = 1;
                updateSortIcons();
                fetchAndRender();
            });
        });
    };
    /* ─── Filter dropdown ────────────────────────────────────────────────── */
    let regionsLoaded = false;
    const regionMap = {};  // slug/id → human-readable name

    const loadRegions = async () => {
        if (regionsLoaded) return;

        try {
            const res = await fetch(cfg.regionsEndpoint, {
                headers: {
                    'Accept':       'application/json',
                    'X-CSRF-Token': Craft.csrfTokenValue,
                },
            });
            const json = await res.json();

            const listEl = el.regionList();
            const loadingEl = el.regionLoading();
            if (loadingEl) loadingEl.remove();

            if (!json.success || !json.data?.length) {
                if (listEl) listEl.innerHTML = '<p class="light" style="padding:4px 0;font-size:12px;">No regions available.</p>';
                return;
            }

            const ul = document.createElement('ul');
            ul.className = 'incidents-filter-list';
            ul.id        = 'incidents-region-list';

            json.data.forEach((region) => {
                const id   = region.id   || region.slug  || region;
                const name = region.name || region.label || id;

                // Populate the lookup map so buildRow() can resolve names
                regionMap[String(id)] = String(name);

                const li  = document.createElement('li');
                li.innerHTML = `
                    <label class="incidents-filter-item">
                        <input type="checkbox" class="incidents-region-cb" value="${escapeHtml(String(id))}" />
                        <span>${escapeHtml(String(name))}</span>
                    </label>`;
                ul.appendChild(li);
            });

            if (listEl) listEl.appendChild(ul);
            regionsLoaded = true;
        } catch (err) {
            console.error('[Upsnap] regions load error:', err);
            const loadingEl = el.regionLoading();
            if (loadingEl) loadingEl.innerHTML = '<span style="color:red;font-size:12px;">Failed to load regions.</span>';
        }
    };

    const updateFilterBadge = () => {
        const count = state.checkTypes.length + state.regions.length;
        const badge = el.filterBadge();
        if (!badge) return;
        badge.textContent = count;
        if (count > 0) badge.classList.remove('hidden');
        else           badge.classList.add('hidden');
    };

    const restoreDraftFromState = () => {
        // sync draft checkboxes to committed state
        state._draftCheckTypes = [...state.checkTypes];
        state._draftRegions    = [...state.regions];

        el.checkTypeCbs().forEach((cb) => {
            cb.checked = state._draftCheckTypes.includes(cb.value);
        });
        $$('.incidents-region-cb').forEach((cb) => {
            cb.checked = state._draftRegions.includes(cb.value);
        });
    };

    const bindFilterDropdown = () => {
        const filterBtn = el.filterBtn();
        const dropdown  = el.filterDropdown();
        const applyBtn  = el.applyFilters();
        const clearBtn  = el.clearFilters();

        if (!filterBtn || !dropdown) return;

        filterBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isOpen = !dropdown.classList.contains('hidden');
            if (isOpen) {
                dropdown.classList.add('hidden');
            } else {
                dropdown.classList.remove('hidden');
                await loadRegions();
                restoreDraftFromState();
            }
        });

        // close on outside click
        document.addEventListener('click', (e) => {
            const container = el.filterContainer();
            if (container && !container.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                state.checkTypes = $$('.incidents-checktype-cb')
                    .filter((cb) => cb.checked)
                    .map((cb) => cb.value);

                state.regions = $$('.incidents-region-cb')
                    .filter((cb) => cb.checked)
                    .map((cb) => cb.value);

                state._draftCheckTypes = [...state.checkTypes];
                state._draftRegions    = [...state.regions];

                state.page = 1;
                updateFilterBadge();
                dropdown.classList.add('hidden');
                fetchAndRender();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                $$('.incidents-checktype-cb').forEach((cb) => (cb.checked = false));
                $$('.incidents-region-cb').forEach((cb) => (cb.checked = false));
                state.checkTypes = [];
                state.regions    = [];
                state._draftCheckTypes = [];
                state._draftRegions    = [];
                state.page = 1;
                updateFilterBadge();
                dropdown.classList.add('hidden');
                fetchAndRender();
            });
        }
    };

    /* ─── Export dropdown ─────────────────────────────────────────────────── */
    const triggerExport = (fileType) => {
        if (!state.monitorId) {
            craftError('Please select a monitor before exporting.');
            return;
        }

        const { start_time, end_time } = timeRangeToTimestamps(state.timeRange);

        const url = new URL(cfg.exportEndpoint, window.location.origin);
        url.searchParams.set('monitorId',  state.monitorId);
        url.searchParams.set('file_type',  fileType);
        url.searchParams.set('start_time', start_time);
        url.searchParams.set('end_time',   end_time);

        if (state.search)            url.searchParams.set('search', state.search);
        if (state.checkTypes.length) url.searchParams.set('type',   state.checkTypes.join(','));
        if (state.regions.length)    url.searchParams.set('region', state.regions.join(','));

        // Trigger browser file download via navigation –
        // the response carries Content-Disposition: attachment.
        window.location.href = url.toString();

        const dropdown = el.exportDropdown();
        if (dropdown) dropdown.classList.add('hidden');
    };

    const bindExportDropdown = () => {
        const exportBtn = el.exportBtn();
        const dropdown  = el.exportDropdown();
        const csvBtn    = el.exportCsv();
        const pdfBtn    = el.exportPdf();

        if (!exportBtn || !dropdown) return;

        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (exportBtn.classList.contains('disable')) return;
            // Close filter dropdown if open
            const filterDropdown = el.filterDropdown();
            if (filterDropdown) filterDropdown.classList.add('hidden');
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            const container = el.exportContainer();
            if (container && !container.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });

        if (csvBtn) csvBtn.addEventListener('click', () => triggerExport('csv'));
        if (pdfBtn) pdfBtn.addEventListener('click', () => triggerExport('pdf'));
    };

    /* ─── Bind all other controls ─────────────────────────────────────────── */
    const bindControls = () => {
        // Monitor select
        const monSel = el.monitorSelect();
        if (monSel) {
            monSel.addEventListener('change', () => {
                state.monitorId = monSel.value;
                state.page = 1;
                fetchAndRender();
            });
        }

        // Timeframe select
        const timeSel = el.timeframeSelect();
        if (timeSel) {
            timeSel.addEventListener('change', () => {
                state.timeRange = timeSel.value;
                state.page = 1;
                fetchAndRender();
            });
        }

        // Search input (debounced)
        const searchInput = el.searchInput();
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                debounce(() => {
                    state.search = searchInput.value.trim();
                    state.page = 1;
                    fetchAndRender();
                }, 350);
            });
        }

        // Rows per page
        const pageSizeSel = el.pageSizeSelect();
        if (pageSizeSel) {
            pageSizeSel.addEventListener('change', () => {
                state.pageSize = parseInt(pageSizeSel.value, 10) || 20;
                state.page = 1;
                fetchAndRender();
            });
        }

        // Prev / Next
        const prevBtn = el.prevBtn();
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (state.page > 1) {
                    state.page -= 1;
                    fetchAndRender();
                }
            });
        }

        const nextBtn = el.nextBtn();
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                state.page += 1;
                fetchAndRender();
            });
        }
    };

    /* ─── Init ────────────────────────────────────────────────────────────── */
    const init = () => {
        const monitors = cfg.monitors || [];
        populateMonitorSelect(monitors);

        bindSortHeaders();
        updateSortIcons();
        bindFilterDropdown();
        bindExportDropdown();
        bindControls();

        // Eagerly load regions so regionMap is populated before the first
        // fetchAndRender() call — ensures the Region column shows names.
        loadRegions();

        if (state.monitorId) {
            fetchAndRender();
        } else {
            setLoading(false);
            renderTable([]);
        }
    };

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
