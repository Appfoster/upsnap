// Reachability page JavaScript
document.addEventListener("DOMContentLoaded", function () {
    const refreshBtn = document.getElementById("refresh-btn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            window.location.reload(); // reloads the current page
        });
    }

    // Include show-details functionality if needed
    const moreDetails = document.getElementById('more-details');
    const showDetailsBtn = document.querySelector('.show-details');
    const showLessBtn = document.querySelector('.show-less');

    if (showDetailsBtn && showLessBtn && moreDetails) {
        showDetailsBtn.addEventListener('click', function (e) {
            e.preventDefault();
            moreDetails.style.display = 'block';
            showDetailsBtn.style.display = 'none';
            showLessBtn.style.display = 'inline-block';
        });

        showLessBtn.addEventListener('click', function (e) {
            e.preventDefault();
            moreDetails.style.display = 'none';
            showDetailsBtn.style.display = 'inline-block';
            showLessBtn.style.display = 'none';
        });
    }
});

// Function for history page details toggle
function toggleDetails(recordId) {
    const detailsRow = document.getElementById('details-' + recordId);
    const toggleIcon = event.currentTarget.querySelector('.toggle-icon');

    if (detailsRow.style.display === 'none' || !detailsRow.style.display) {
        detailsRow.style.display = 'table-row';
        toggleIcon.textContent = '▲';
    } else {
        detailsRow.style.display = 'none';
        toggleIcon.textContent = '▼';
    }
}