document.addEventListener("DOMContentLoaded", function () {
    const typeFilter = document.getElementById("type-filter");
    const statusFilter = document.getElementById("status-filter");

    // Filter functionality
    function applyFilters() {
        const typeValue = typeFilter ? typeFilter.value : 'all';
        const statusValue = statusFilter ? statusFilter.value : 'all';
        const rows = document.querySelectorAll('.main-row');
        let filteredRowsCount = 0;

        rows.forEach(row => {
            const rowType = row.dataset.type;
            const rowStatus = row.dataset.status;
            const expandableRow = row.nextElementSibling;

            let show = true;

            // Type filter
            if (typeValue !== 'all' && rowType !== typeValue) {
                show = false;
            }

            // Status filter
            if (statusValue !== 'all' && !rowStatus.includes(statusValue)) {
                show = false;
            }

            // Show/hide row and its expandable content
            row.style.display = show ? '' : 'none';
            if (expandableRow && expandableRow.classList.contains('expandable-row')) {
                expandableRow.style.display = show ? (expandableRow.classList.contains('show') ? 'table-row' : 'none') : 'none';
            }

            if (show) filteredRowsCount++;
        });
         // Handle "No data" row
        const tbody = document.querySelector('#broken-links-table tbody');
        let noRow = tbody.querySelector('.no-results');

        if (filteredRowsCount === 0) {
            if (!noRow) {
                noRow = document.createElement('tr');
                noRow.classList.add('no-results');
                noRow.innerHTML = `<td colspan="6">No data found for selected filters</td>`;
                tbody.appendChild(noRow);
            }
        } else {
            if (noRow) {
                noRow.remove();
            }
        }
    }

    // Add filter event listeners
    if (typeFilter) {
        typeFilter.addEventListener('change', applyFilters);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
});

// Toggle row expansion
function toggleRow(index) {
    const expandableRow = document.getElementById('row-' + index);
    const btn = document.querySelector('[onclick="toggleRow(' + index + ')"]');
    const btnText = btn.querySelector('.btn-text');

    if (expandableRow.classList.contains('show')) {
        expandableRow.classList.remove('show');
        btn.classList.remove('expanded');
        btnText.textContent = 'View More';
    } else {
        expandableRow.classList.add('show');
        btn.classList.add('expanded');
        btnText.textContent = 'View Less';
    }
}