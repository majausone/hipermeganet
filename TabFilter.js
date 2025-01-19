import * as TableRenderer from './TableRenderer.js';
import * as DataManager from './DataManager.js';
import * as popupManager from './popupManager.js';
import { setupBulkActions } from './bulkActions.js';

let channelSelections = {};

export const loadTabContent = async (tabName) => {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = '';

    try {
        let data;
        let tableId;
        switch (tabName) {
            case 'accounts':
                data = await window.electronAPI.databaseGet('accounts');
                await window.loadAccounts(data);
                break;
            case 'channels':
                data = await window.electronAPI.databaseGet('channels');
                await window.loadChannels(data);
                break;
            case 'videos':
                data = await window.electronAPI.databaseGet('videos');
                await window.loadVideos(data);
                tableId = 'videosTable';
                break;
            case 'video-details':
                data = await window.electronAPI.databaseGet('videos');
                await window.loadVideoDetails(data);
                tableId = 'videoDetailsTable';
                break;
            case 'video-details-2':
                data = await window.electronAPI.databaseGet('videos');
                await window.loadVideoDetails2(data);
                tableId = 'videoDetails2Table';
                break;
            case 'languages':
                data = await window.electronAPI.databaseGet('languages');
                await window.loadLanguages(data);
                break;
            case 'config':
                data = await window.electronAPI.databaseGet('config');
                await window.loadConfig(data);
                break;
        }
        if (tableId) {
            setupUnifiedFilter(tableId);
            await loadFilters(tableId);
            setupBulkActions(tableId);
            resetAllCheckboxes(tableId);
        }
    } catch (error) {
        console.error(`Error loading data for ${tabName}:`, error);
        contentDiv.innerHTML = `<p>Error loading data: ${error.message}</p>`;
    }
};

export const setupUnifiedFilter = (tableId) => {
    if (tableId !== 'videosTable' && tableId !== 'videoDetailsTable' && tableId !== 'videoDetails2Table' && tableId !== 'channelsTable') {
        return;
    }

    const existingFilterContainer = document.querySelector('.filter-container');
    if (existingFilterContainer) {
        existingFilterContainer.remove();
    }

    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';
    searchInput.className = 'search-input';

    const searchTypeSelect = document.createElement('select');
    searchTypeSelect.className = 'search-type-select';
    const searchTypes = ['All', 'Local ID', 'YouTube ID', 'Title', 'Description'];
    searchTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.toLowerCase().replace(' ', '_');
        option.textContent = type;
        searchTypeSelect.appendChild(option);
    });

    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchTypeSelect);
    filterContainer.appendChild(searchContainer);

    const dateContainer = document.createElement('div');
    dateContainer.className = 'date-container';

    const fromLabel = document.createElement('span');
    fromLabel.textContent = 'From';
    fromLabel.className = 'date-label';
    dateContainer.appendChild(fromLabel);

    const startDateInput = document.createElement('input');
    startDateInput.type = 'date';
    startDateInput.className = 'date-input';
    dateContainer.appendChild(startDateInput);

    const toLabel = document.createElement('span');
    toLabel.textContent = 'To';
    toLabel.className = 'date-label';
    dateContainer.appendChild(toLabel);

    const endDateInput = document.createElement('input');
    endDateInput.type = 'date';
    endDateInput.className = 'date-input';
    dateContainer.appendChild(endDateInput);

    filterContainer.appendChild(dateContainer);

    const channelSelectButton = document.createElement('button');
    channelSelectButton.textContent = 'Select Channels';
    channelSelectButton.className = 'channel-select-button';
    filterContainer.appendChild(channelSelectButton);

    const applyFilterButton = document.createElement('button');
    applyFilterButton.textContent = 'Apply Filters';
    applyFilterButton.className = 'apply-filter-button';
    filterContainer.appendChild(applyFilterButton);

    const resetFilterButton = document.createElement('button');
    resetFilterButton.textContent = 'Reset Filters';
    resetFilterButton.className = 'reset-filter-button';
    filterContainer.appendChild(resetFilterButton);

    const table = document.getElementById(tableId);
    if (table) {
        table.parentNode.insertBefore(filterContainer, table);

        channelSelectButton.onclick = () => showChannelSelectPopup(tableId);
        applyFilterButton.onclick = () => {
            applyUnifiedFilter(tableId, searchInput.value, searchTypeSelect.value, startDateInput.value, endDateInput.value);
            saveFilters(tableId, {
                searchValue: searchInput.value,
                searchType: searchTypeSelect.value,
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                selectedChannels: channelSelections[tableId]
            });
        };
        resetFilterButton.onclick = () => resetFilters(tableId);

        initializeChannelSelections(tableId);
    }
};

const initializeChannelSelections = async (tableId) => {
    const channels = await window.electronAPI.databaseGet('channels');
    channelSelections[tableId] = channels.map(c => c.id.toString());
    updateChannelSelectButtonText(tableId);
    return channelSelections[tableId];
};

export const showChannelSelectPopup = async (tableId) => {
    const popup = document.createElement('div');
    popup.className = 'custom-popup';

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);

    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';

    const popupTitle = document.createElement('div');
    popupTitle.className = 'popup-title';
    popupTitle.textContent = 'Select Channels';
    popupContent.appendChild(popupTitle);

    const closeButton = document.createElement('span');
    closeButton.className = 'popup-close';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    };
    popupContent.appendChild(closeButton);

    const channelSelect = document.createElement('div');
    channelSelect.className = 'channel-select';

    const channels = await window.electronAPI.databaseGet('channels');
    const selectAllLabel = document.createElement('label');
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.checked = channelSelections[tableId].length === channels.length;
    selectAllLabel.appendChild(selectAllCheckbox);
    selectAllLabel.appendChild(document.createTextNode('Select All'));
    channelSelect.appendChild(selectAllLabel);

    channels.forEach(channel => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = channel.id.toString();
        checkbox.checked = channelSelections[tableId].includes(channel.id.toString());
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(channel.name));
        channelSelect.appendChild(label);
    });

    selectAllCheckbox.onchange = () => {
        const checkboxes = channelSelect.querySelectorAll('input[type="checkbox"]:not([value="on"])');
        checkboxes.forEach(cb => {
            cb.checked = selectAllCheckbox.checked;
        });
    };

    popupContent.appendChild(channelSelect);

    const popupButtons = document.createElement('div');
    popupButtons.className = 'popup-buttons';

    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply';
    applyButton.className = 'confirm-button';
    applyButton.onclick = () => {
        const selectedChannels = Array.from(channelSelect.querySelectorAll('input[type="checkbox"]:checked:not([value="on"])'))
            .map(cb => cb.value);
        channelSelections[tableId] = selectedChannels;
        applyChannelFilter(tableId, selectedChannels);
        const filterContainer = document.querySelector('.filter-container');
        if (filterContainer) {
            const searchInput = filterContainer.querySelector('.search-input');
            const searchTypeSelect = filterContainer.querySelector('.search-type-select');
            const startDateInput = filterContainer.querySelectorAll('.date-input')[0];
            const endDateInput = filterContainer.querySelectorAll('.date-input')[1];
            applyUnifiedFilter(tableId, searchInput.value, searchTypeSelect.value, startDateInput.value, endDateInput.value);
            saveFilters(tableId, {
                searchValue: searchInput.value,
                searchType: searchTypeSelect.value,
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                selectedChannels
            });
        }
        updateChannelSelectButtonText(tableId);
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    };
    popupButtons.appendChild(applyButton);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'cancel-button';
    cancelButton.onclick = () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    };
    popupButtons.appendChild(cancelButton);

    popupContent.appendChild(popupButtons);
    popup.appendChild(popupContent);
    document.body.appendChild(popup);
};


export const applyUnifiedFilter = async (tableId, searchValue, searchType, startDate, endDate) => {
    const table = document.getElementById(tableId);
    if (!table) return;

    resetAllCheckboxes(tableId);

    const rows = table.getElementsByTagName('tr');
    const selectedChannels = channelSelections[tableId];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        let showRow = true;

        if (searchValue) {
            let rowText = '';
            if (searchType === 'all') {
                rowText = Array.from(cells).map(cell => cell.textContent.toLowerCase()).join(' ');
            } else {
                const targetCell = Array.from(cells).find(cell => cell.getAttribute('data-column-type') === searchType);
                rowText = targetCell ? targetCell.textContent.toLowerCase() : '';
            }

            if (!rowText.includes(searchValue.toLowerCase())) {
                showRow = false;
            }
        }

        if (startDate || endDate) {
            const dateCell = Array.from(cells).find(cell => cell.classList.contains('publish_date'));
            if (dateCell) {
                const rowDate = new Date(dateCell.textContent);
                if (startDate && rowDate < new Date(startDate)) {
                    showRow = false;
                }
                if (endDate && rowDate > new Date(endDate)) {
                    showRow = false;
                }
            }
        }

        let channelId;
        for (let j = 0; j < cells.length; j++) {
            if (cells[j].hasAttribute('data-channel-id')) {
                channelId = cells[j].getAttribute('data-channel-id');
                break;
            }
        }
        if (channelId && !selectedChannels.includes(channelId)) {
            showRow = false;
        }

        row.style.display = showRow ? '' : 'none';
    }

    const columnOrder = await window.electronAPI.loadColumnOrder(tableId);
    if (columnOrder) {
        TableRenderer.applyColumnOrder(table, columnOrder);
    }
};


export const applyChannelFilter = (tableId, selectedChannels) => {
    const table = document.getElementById(tableId);
    if (!table) return;

    const rows = table.getElementsByTagName('tr');

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const channelCell = row.cells[3];
        const channelId = channelCell.getAttribute('data-channel-id');
        row.style.display = selectedChannels.includes(channelId) ? '' : 'none';
    }
};

export const resetFilters = async (tableId) => {
    const filterContainer = document.querySelector('.filter-container');
    if (filterContainer) {
        const searchInput = filterContainer.querySelector('.search-input');
        const searchTypeSelect = filterContainer.querySelector('.search-type-select');
        const startDateInput = filterContainer.querySelectorAll('.date-input')[0];
        const endDateInput = filterContainer.querySelectorAll('.date-input')[1];

        if (searchInput) searchInput.value = '';
        if (searchTypeSelect) searchTypeSelect.value = 'all';
        if (startDateInput) startDateInput.value = '';
        if (endDateInput) endDateInput.value = '';
    }

    channelSelections[tableId] = await initializeChannelSelections(tableId);

    const table = document.getElementById(tableId);
    if (table) {
        const rows = table.getElementsByTagName('tr');
        for (let i = 1; i < rows.length; i++) {
            rows[i].style.display = '';
        }
    }

    const resetFilters = {
        searchValue: '',
        searchType: 'all',
        startDate: '',
        endDate: '',
        selectedChannels: channelSelections[tableId]
    };

    saveFilters(tableId, resetFilters);
    applyUnifiedFilter(tableId, '', 'all', '', '');
};

const updateChannelSelectButtonText = async (tableId) => {
    const channels = await window.electronAPI.databaseGet('channels');
    const selectedChannels = channelSelections[tableId];
    const channelSelectButton = document.querySelector('.channel-select-button');

    if (channelSelectButton) {
        if (selectedChannels.length === channels.length) {
            channelSelectButton.textContent = 'Select Channels';
        } else if (selectedChannels.length === 0) {
            channelSelectButton.textContent = 'Select Channels (0)';
        } else {
            channelSelectButton.textContent = `Select Channels (${selectedChannels.length})`;
        }
    }
};

const saveFilters = async (tableId, filters) => {
    try {
        await window.electronAPI.saveFilters(tableId, filters);
    } catch (error) {
        console.error('Error saving filters:', error);
    }
};

const loadFilters = async (tableId) => {
    try {
        const filters = await window.electronAPI.loadFilters(tableId);
        if (filters) {
            const filterContainer = document.querySelector('.filter-container');
            if (filterContainer) {
                const searchInput = filterContainer.querySelector('.search-input');
                const searchTypeSelect = filterContainer.querySelector('.search-type-select');
                const startDateInput = filterContainer.querySelectorAll('.date-input')[0];
                const endDateInput = filterContainer.querySelectorAll('.date-input')[1];

                if (searchInput) searchInput.value = filters.searchValue || '';
                if (searchTypeSelect) searchTypeSelect.value = filters.searchType || 'all';
                if (startDateInput) startDateInput.value = filters.startDate || '';
                if (endDateInput) endDateInput.value = filters.endDate || '';

                channelSelections[tableId] = filters.selectedChannels || await initializeChannelSelections(tableId);
                updateChannelSelectButtonText(tableId);

                applyUnifiedFilter(tableId, filters.searchValue, filters.searchType, filters.startDate, filters.endDate);
            }
        } else {
            await initializeChannelSelections(tableId);
        }
    } catch (error) {
        console.error('Error loading filters:', error);
        await initializeChannelSelections(tableId);
    }
};


const resetAllCheckboxes = (tableId) => {
    const table = document.getElementById(tableId);
    if (!table) return;

    const headerCheckbox = table.querySelector('thead input[type="checkbox"]');
    if (headerCheckbox) {
        headerCheckbox.checked = false;
    }

    const checkboxes = table.querySelectorAll('tbody input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
};

window.resetFilters = resetFilters;