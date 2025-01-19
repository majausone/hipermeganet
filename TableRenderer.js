import * as DataManager from './DataManager.js';


export const createTable = (data, headers, cellRenderer = null, tabName) => {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    const table = document.createElement('table');
    const headerRow = table.createTHead().insertRow();

    headers.forEach((header, index) => {
        const th = document.createElement('th');
        if (header === 'Checkbox') {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.onclick = (e) => toggleAllCheckboxes(table, e.target.checked);
            th.appendChild(checkbox);
        } else {
            th.textContent = header;
            if (header !== 'Actions' && header !== 'Thu. R') {
                th.classList.add('sortable');
                th.onclick = () => sortTable(table, index, tabName, false);
            }
            if (header.toLowerCase() === 'title') {
                th.classList.add('title-column');
            }
        }
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    data.forEach(item => {
        const row = tbody.insertRow();
        row.dataset.videoId = item.id;
        headers.forEach((header, index) => {
            const cell = row.insertCell();
            const lowerHeader = header.toLowerCase().replace(' ', '_');
            if (header === 'Checkbox') {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'row-checkbox';
                cell.appendChild(checkbox);
            } else if (cellRenderer) {
                const customElement = cellRenderer(item, header);
                if (customElement) {
                    cell.appendChild(customElement);
                } else {
                    cell.textContent = item[lowerHeader] || '';
                }
                if (lowerHeader === 'local_id' || lowerHeader === 'youtube_id' ||
                    lowerHeader === 'title' || lowerHeader === 'description') {
                    cell.setAttribute('data-column-type', lowerHeader);
                }
            } else {
                cell.textContent = item[lowerHeader] || '';
            }
            if (header.toLowerCase() === 'channel') {
                cell.setAttribute('data-channel-id', item.channel_id);
            }
        });
    });

    tableContainer.appendChild(table);
    return tableContainer;
};



const createActionIcons = (itemId, tabName) => {
    const iconContainer = document.createElement('div');
    iconContainer.className = 'action-icons';

    const editIcon = createIcon('✏️', () => window.editItem(itemId), 'Edit');
    const deleteIcon = createIcon('🗑️', () => window.deleteVideo(itemId), 'Delete');
    const uploadIcon = createIcon('⬆️', () => window.uploadVideo(itemId), 'Upload');
    const translateIcon = createIcon('🌐', () => window.showTranslateConfirmation(itemId), 'Translate');
    const applyAllIcon = createIcon('🔄', () => showApplyAllConfirmation(itemId), 'Apply to All');
    const miniaturizatorIcon = createIcon('🖼️', () => openMiniaturizator(itemId), 'Miniaturizator');

    iconContainer.appendChild(editIcon);
    iconContainer.appendChild(deleteIcon);
    iconContainer.appendChild(uploadIcon);
    iconContainer.appendChild(translateIcon);
    iconContainer.appendChild(miniaturizatorIcon);

    if (tabName === 'videoDetails' || tabName === 'videoDetails2') {
        iconContainer.appendChild(applyAllIcon);
    }

    return iconContainer;
};

const openMiniaturizator = (videoId) => {
    const miniaturizator = document.createElement('div');
    miniaturizator.id = 'miniaturizator';
    document.body.appendChild(miniaturizator);

    fetch('miniaturizator.html')
        .then(response => response.text())
        .then(html => {
            miniaturizator.innerHTML = html;
            window.initMiniaturizator(videoId);
        });
};

const closeMiniaturizator = () => {
    const miniaturizator = document.getElementById('miniaturizator');
    if (miniaturizator) {
        document.body.removeChild(miniaturizator);
    }
};

const createIcon = (emoji, onClick, tooltipText) => {
    const icon = document.createElement('span');
    icon.textContent = emoji;
    icon.style.cursor = 'pointer';
    icon.style.marginRight = '5px';
    icon.onclick = onClick;
    icon.title = tooltipText;
    return icon;
};

const showApplyAllConfirmation = async (itemId) => {
    console.log('Iniciando showApplyAllConfirmation para itemId:', itemId);
    const result = await window.showConfirmPopup(
        'Apply changes to all related videos?',
        'This action will update all videos with the same Local ID across all channels.',
        true, // Añade este parámetro para incluir el checkbox
        'Also translate' // Texto para el checkbox
    );

    if (result.confirmed) {
        await window.applyToAll(itemId, result.checked);
    }
};

const toggleAllCheckboxes = (table, checked) => {
    const visibleRows = table.querySelectorAll('tr:not([style*="display: none"])');
    const checkboxes = visibleRows.forEach(row => {
        const checkbox = row.querySelector('.row-checkbox');
        if (checkbox) {
            checkbox.checked = checked;
        }
    });
};

export const sortTable = (table, column, tableId, isApplyingStoredOrder = false, orderTrue) => {
    const actualTable = table.querySelector('table') || table;
    if (!actualTable) {
        console.error('No se encontró la tabla');
        return;
    }

    const tbody = actualTable.tBodies[0];
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    const rows = Array.from(tbody.querySelectorAll("tr"));
    if (rows.length === 0) {
        console.error('No rows found in table');
        return;
    }

    let newOrder;
    if (isApplyingStoredOrder) {
        newOrder = orderTrue;
    } else {
        const currentOrder = actualTable.getAttribute('data-order') || 'asc';
        newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    }

    actualTable.setAttribute('data-order', newOrder);

    const sortedRows = rows.sort((a, b) => {
        const aCell = a.cells[column];
        const bCell = b.cells[column];
        if (!aCell || !bCell) {
            console.error('Cell not found for column:', column);
            return 0;
        }
        const aColText = aCell.textContent.trim();
        const bColText = bCell.textContent.trim();

        if (aColText === '' && bColText === '') return 0;
        if (aColText === '') return newOrder === 'asc' ? 1 : -1;
        if (bColText === '') return newOrder === 'asc' ? -1 : 1;

        if (!isNaN(aColText) && !isNaN(bColText)) {
            return newOrder === 'asc' ? aColText - bColText : bColText - aColText;
        } else {
            return newOrder === 'asc' ? aColText.localeCompare(bColText) : bColText.localeCompare(aColText);
        }
    });

    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }

    tbody.append(...sortedRows);

    const headers = actualTable.querySelectorAll('th');
    headers.forEach((th, index) => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (index === column) {
            th.classList.add(newOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });

    if (!isApplyingStoredOrder) {
        saveColumnOrder(tableId, column, newOrder);
    }
};

const saveColumnOrder = async (tableId, column, order) => {
    try {
        await window.electronAPI.saveColumnOrder(tableId, { column, order });
    } catch (error) {
        console.error('Error saving column order:', error);
    }
};

export const applyColumnOrder = (table, columnOrder) => {
    if (columnOrder) {
        const { column, order } = columnOrder;
        sortTable(table, column, table.id, true, order);
        table.setAttribute('data-order', order);
    } else {

    }
};

const loadTable = async (type, data, headers, cellRenderer, additionalSetup = null) => {
    const table = createTable(data, headers, cellRenderer, type);
    table.id = `${type}Table`;
    document.getElementById('content').innerHTML = '';

    if (additionalSetup) {
        await additionalSetup();
    }

    document.getElementById('content').appendChild(table);

    if (type === 'videos' || type === 'videoDetails' || type === 'videoDetails2') {
        window.setupUnifiedFilter(`${type}Table`);
    }

    const columnOrder = await window.electronAPI.loadColumnOrder(type);
    applyColumnOrder(table, columnOrder);
};

export const loadAccounts = async (data) => {
    const headers = ['ID', 'Name', 'Email', 'Logged In', 'Actions'];
    await loadTable('accounts', data, headers, (row, header) => {
        if (header === 'Logged In') {
            const span = document.createElement('span');
            span.textContent = row.access_token ? 'Yes' : 'No';
            return span;
        }
        if (header === 'Actions') {
            const actionsContainer = document.createElement('div');
            const syncButton = document.createElement('button');
            syncButton.textContent = 'Sync';
            syncButton.className = 'sync-button';
            syncButton.onclick = () => window.syncAccount(row.id);
            actionsContainer.appendChild(syncButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => window.deleteItem(row.id);
            actionsContainer.appendChild(deleteButton);
            return actionsContainer;
        }
        return null;
    }, () => {
        const addButton = document.createElement('button');
        addButton.textContent = 'Add Account';
        addButton.onclick = () => window.showGoogleAuthPopup();
        document.getElementById('content').appendChild(addButton);
    });
};

export const loadChannels = async (data) => {
    const accounts = await window.electronAPI.databaseGet('accounts');
    const languages = await window.electronAPI.databaseGet('languages');
    const headers = ['ID', 'Name', 'Account', 'Subscribers', 'Views', 'Language', 'Actions'];
    await loadTable('channels', data, headers, (row, header) => {
        if (header === 'Account') {
            const span = document.createElement('span');
            const account = accounts.find(a => a.id === row.account_id);
            span.textContent = account ? account.name : 'Unknown';
            return span;
        }
        if (header === 'Language') {
            const select = document.createElement('select');
            languages.forEach(language => {
                const option = document.createElement('option');
                option.value = language.code;
                option.textContent = language.name;
                if (language.code === row.language) option.selected = true;
                select.appendChild(option);
            });
            select.onchange = () => window.updateChannel(row.id, 'language', select.value);
            return select;
        }
        if (header === 'Actions') {
            const actionsContainer = document.createElement('div');
            const channelSyncButton = document.createElement('button');
            channelSyncButton.textContent = 'Sync';
            channelSyncButton.className = 'sync-button';
            channelSyncButton.onclick = () => window.syncChannel(row.id);
            actionsContainer.appendChild(channelSyncButton);
            return actionsContainer;
        }
        return null;
    }, () => {
        const syncAllButton = document.createElement('button');
        syncAllButton.textContent = 'Sync All Channels';
        syncAllButton.className = 'sync-all-button';
        syncAllButton.onclick = () => window.syncAllChannels();
        document.getElementById('content').appendChild(syncAllButton);
    });
};

export const loadVideos = async (data) => {
    const channels = await window.electronAPI.databaseGet('channels');
    const headers = ['Checkbox', 'Thu. R', 'ID', 'YouTube ID', 'Title', 'Channel', 'Views', 'Publish Date'];
    await loadTable('videos', data, headers, (row, header) => {
        if (header === 'Thu. R') {
            if (row.thumbnail_remote) {
                const img = document.createElement('img');
                img.src = row.thumbnail_remote;
                img.alt = 'Thumbnail';
                img.style.maxWidth = '200px';
                img.style.height = 'auto';
                img.onerror = () => {
                    img.style.display = 'none';
                };
                return img;
            }
            return null;
        }
        if (header === 'YouTube ID') {
            const span = document.createElement('span');
            span.textContent = row['youtube_video_id'] || 'No ID';
            span.className = 'editable';
            span.onclick = () => window.editYouTubeId(row.id, span);
            return span;
        }
        if (header === 'Channel') {
            const span = document.createElement('span');
            const channel = channels.find(c => c.id === row.channel_id);
            span.textContent = channel ? channel.name : 'Unknown';
            span.setAttribute('data-channel-id', row.channel_id);
            return span;
        }
        if (header === 'Title') {
            const titleSpan = document.createElement('span');
            titleSpan.textContent = row.title;
            titleSpan.className = 'editable title-column';
            titleSpan.onclick = () => window.editTitle(row.id, titleSpan);
            const actionIcons = createActionIcons(row.id, 'videos');
            const container = document.createElement('div');
            container.appendChild(titleSpan);
            container.appendChild(actionIcons);
            return container;
        }
        return null;
    });
};

export const loadVideoDetails = async (data) => {
    const channels = await window.electronAPI.databaseGet('channels');
    const headers = ['Checkbox', 'Thu. R', 'Thu. L', 'ID', 'Local ID', 'Title', 'Channel', 'Description', 'Tags', 'Thumbnail Text'];
    await loadTable('videoDetails', data, headers, (row, header) => {
        if (header === 'Thu. R') {
            if (row.thumbnail_remote) {
                const img = document.createElement('img');
                img.src = row.thumbnail_remote;
                img.alt = 'Remote Thumbnail';
                img.style.maxWidth = '200px';
                img.style.height = 'auto';
                img.onerror = () => {
                    img.style.display = 'none';
                };
                return img;
            }
            return null;
        }
        if (header === 'Thu. L') {
            if (row.thumbnail_path) {
                const img = document.createElement('img');
                img.src = row.thumbnail_path;
                img.alt = 'Local Thumbnail';
                img.style.maxWidth = '200px';
                img.style.height = 'auto';
                img.onerror = () => {
                    img.style.display = 'none';
                };
                return img;
            }
            return null;
        }
        if (header === 'Channel') {
            const span = document.createElement('span');
            const channel = channels.find(c => c.id === row.channel_id);
            span.textContent = channel ? channel.name : 'Unknown';
            span.setAttribute('data-channel-id', row.channel_id);
            return span;
        }
        if (header === 'Title') {
            const titleSpan = document.createElement('span');
            titleSpan.textContent = row.title;
            titleSpan.className = 'editable title-column';
            titleSpan.onclick = () => window.editTitle(row.id, titleSpan);
            const actionIcons = createActionIcons(row.id, 'videoDetails');
            const container = document.createElement('div');
            container.appendChild(titleSpan);
            container.appendChild(actionIcons);
            return container;
        }
        if (header === 'Local ID') {
            const span = document.createElement('span');
            span.textContent = row.local_id || 'No ID';
            span.className = 'editable local_id';
            span.onclick = () => window.editLocalId(row.id, span);
            return span;
        }
        if (header === 'Description' || header === 'Tags') {
            const textarea = document.createElement('textarea');
            textarea.value = row[header.toLowerCase()];
            textarea.onblur = () => window.updateVideo(row.id, header.toLowerCase(), textarea.value);
            return textarea;
        }
        if (header === 'Thumbnail Text') {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = row.thumbnail_text || '';
            input.onblur = () => window.updateVideo(row.id, 'thumbnail_text', input.value);
            return input;
        }
        return null;
    });
};

export const loadVideoDetails2 = async (data) => {
    const channels = await window.electronAPI.databaseGet('channels');
    const categories = await window.electronAPI.databaseGet('categories');
    const languages = await window.electronAPI.databaseGet('languages');
    const visibilities = await window.electronAPI.databaseGet('visibility');
    const headers = ['Checkbox', 'Thu. R', 'ID', 'Local ID', 'Title', 'Channel', 'Category', 'Language', 'Visibility', 'Kids'];
    await loadTable('videoDetails2', data, headers, (row, header) => {
        if (header === 'Thu. R') {
            if (row.thumbnail_remote) {
                const img = document.createElement('img');
                img.src = row.thumbnail_remote;
                img.alt = 'Remote Thumbnail';
                img.style.maxWidth = '200px';
                img.style.height = 'auto';
                img.onerror = () => {
                    img.style.display = 'none';
                };
                return img;
            }
            return null;
        }
        if (header === 'Channel') {
            const span = document.createElement('span');
            const channel = channels.find(c => c.id === row.channel_id);
            span.textContent = channel ? channel.name : 'Unknown';
            span.setAttribute('data-channel-id', row.channel_id);
            return span;
        }
        if (header === 'Title') {
            const titleSpan = document.createElement('span');
            titleSpan.textContent = row.title;
            titleSpan.className = 'editable title-column';
            titleSpan.onclick = () => window.editTitle(row.id, titleSpan);
            const actionIcons = createActionIcons(row.id, 'videoDetails2');
            const container = document.createElement('div');
            container.appendChild(titleSpan);
            container.appendChild(actionIcons);
            return container;
        }
        if (header === 'Local ID') {
            const span = document.createElement('span');
            span.textContent = row.local_id || 'No ID';
            span.className = 'editable local_id';
            span.onclick = () => window.editLocalId(row.id, span);
            return span;
        }
        if (header === 'Category') {
            const select = document.createElement('select');
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                if (category.id === row.category_id) option.selected = true;
                select.appendChild(option);
            });
            select.onchange = () => window.updateVideo(row.id, 'category_id', select.value);
            return select;
        }
        if (header === 'Language') {
            const select = document.createElement('select');
            const notDetectedOption = document.createElement('option');
            notDetectedOption.value = '';
            notDetectedOption.textContent = 'Not Detected';
            select.appendChild(notDetectedOption);
            languages.forEach(language => {
                const option = document.createElement('option');
                option.value = language.id;
                option.textContent = language.name;
                if (language.id === row.default_language) option.selected = true;
                select.appendChild(option);
            });
            if (row.default_language === null) {
                notDetectedOption.selected = true;
            }
            select.onchange = () => window.updateVideo(row.id, 'default_language', select.value);
            return select;
        }
        if (header === 'Visibility') {
            const select = document.createElement('select');
            visibilities.forEach(visibility => {
                const option = document.createElement('option');
                option.value = visibility.id;
                option.textContent = visibility.name;
                if (visibility.id === row.visibility_id) option.selected = true;
                select.appendChild(option);
            });
            select.onchange = () => window.updateVideo(row.id, 'visibility_id', select.value);
            return select;
        }
        if (header === 'Kids') {
            const select = document.createElement('select');
            const yesOption = document.createElement('option');
            yesOption.value = "1";
            yesOption.textContent = "Yes";
            const noOption = document.createElement('option');
            noOption.value = "0";
            noOption.textContent = "No";
            select.appendChild(yesOption);
            select.appendChild(noOption);
            select.value = row.kids ? "1" : "0";
            select.onchange = () => window.updateVideo(row.id, 'kids', select.value === "1");
            return select;
        }
        return null;
    });
};


export const loadLanguages = (data) => {
    const headers = ['ID', 'Name', 'Code', 'Actions'];
    loadTable('languages', data, headers, (row, header) => {
        if (header === 'Actions') {
            const actionsContainer = document.createElement('div');
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.onclick = () => window.editItem(row.id);
            actionsContainer.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => window.deleteItem(row.id);
            actionsContainer.appendChild(deleteButton);
            return actionsContainer;
        }
        return null;
    }, () => {
        const addButton = document.createElement('button');
        addButton.textContent = 'Add Language';
        addButton.onclick = () => window.addNewLanguage();
        document.getElementById('content').appendChild(addButton);
    });
};




export const loadConfig = async (data) => {
    const form = document.createElement('form');
    form.innerHTML = `
        <div class="config-container">
            <div class="form-group">
                <label for="gpt_api_key">GPT API Key:</label>
                <input type="password" id="gpt_api_key" name="gpt_api_key" value="${data[0]?.gpt_api_key || ''}" style="width: 300px;">
                <button type="button" class="toggle-visibility">👁️</button>
            </div>
            <div class="form-group">
                <label for="google_client_id">Google Client ID:</label>
                <input type="password" id="google_client_id" name="google_client_id" value="${data[0]?.google_client_id || ''}" style="width: 300px;">
                <button type="button" class="toggle-visibility">👁️</button>
            </div>
            <div class="form-group">
                <label for="google_client_secret">Google Client Secret:</label>
                <input type="password" id="google_client_secret" name="google_client_secret" value="${data[0]?.google_client_secret || ''}" style="width: 300px;">
                <button type="button" class="toggle-visibility">👁️</button>
            </div>
            <div class="form-group">
                <label for="global_video_path">Global Video Path:</label>
                <div style="display: flex; align-items: center;">
                    <input type="text" id="global_video_path" name="global_video_path" value="${data[0]?.global_video_path || ''}" readonly style="width: 300px;">
                    <button type="button" id="select_global_path" style="margin-left: 10px;">Select Global Path</button>
                    <button type="button" id="auto_assign" style="margin-left: 10px;">Auto-assign Files</button>
                </div>
            </div>
            <div class="button-group" style="margin-top: 20px;">
                <button type="button" id="import_database">Import Database</button>
                <button type="button" id="export_database">Export Database</button>
                <button type="button" id="delete_local_data">Delete Local Data</button>
            </div>
        </div>
        <button type="submit" style="margin-top: 20px;">Save Configuration</button>
    `;

    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = '';
    contentDiv.style.position = 'relative';
    contentDiv.appendChild(form);

    const toggleVisibilityButtons = form.querySelectorAll('.toggle-visibility');
    toggleVisibilityButtons.forEach(button => {
        button.addEventListener('click', () => {
            const input = button.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '🙈';
            } else {
                input.type = 'password';
                button.textContent = '👁️';
            }
        });
    });

    const selectGlobalPathButton = form.querySelector('#select_global_path');
    selectGlobalPathButton.onclick = async () => {
        const path = await window.electronAPI.selectDirectory();
        if (path) {
            form.querySelector('#global_video_path').value = path;
        }
    };

    const autoAssignButton = form.querySelector('#auto_assign');
    autoAssignButton.onclick = async () => {
        try {
            const result = await window.electronAPI.autoAssignFiles();
            if (result.success) {
                window.showAlertPopup('Files auto-assigned successfully');
            } else {
                window.showAlertPopup('Error auto-assigning files: ' + result.error);
            }
        } catch (error) {
            console.error('Error auto-assigning files:', error);
            window.showAlertPopup('Error auto-assigning files: ' + error.message);
        }
    };

    const importDatabaseBtn = form.querySelector('#import_database');
    importDatabaseBtn.onclick = async () => {
        const filePath = await window.electronAPI.selectDatabaseFile();
        if (filePath) {
            try {
                await window.electronAPI.importDatabase(filePath);
                window.showAlertPopup('Database imported successfully. The application will now close.');
                setTimeout(() => window.electronAPI.closeApp(), 2000);
            } catch (error) {
                window.showAlertPopup('Error importing database: ' + error.message);
            }
        }
    };

    const exportDatabaseBtn = form.querySelector('#export_database');
    exportDatabaseBtn.onclick = async () => {
        const filePath = await window.electronAPI.saveDatabaseFile();
        if (filePath) {
            try {
                await window.electronAPI.exportDatabase(filePath);
                window.showAlertPopup('Database exported successfully');
            } catch (error) {
                window.showAlertPopup('Error exporting database: ' + error.message);
            }
        }
    };

    const deleteLocalDataButton = form.querySelector('#delete_local_data');
    deleteLocalDataButton.onclick = async () => {
        const result = await window.showConfirmPopup(
            'Are you sure you want to delete all local data?',
            'This action will delete all saved filters, column orders, and other local settings. This cannot be undone.'
        );
        if (result.confirmed === true) {
            try {
                const deleteResult = await window.electronAPI.deleteLocalData();
                if (deleteResult.success) {
                    window.showAlertPopup('Local data deleted successfully');
                } else {
                    window.showAlertPopup('Error deleting local data: ' + deleteResult.error);
                }
            } catch (error) {
                console.error('Error deleting local data:', error);
                window.showAlertPopup('Error deleting local data: ' + error.message);
            }
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const config = Object.fromEntries(formData.entries());
        try {
            await window.updateConfig(config);
            window.showAlertPopup('Configuration saved successfully');
        } catch (error) {
            console.error('Error saving configuration:', error);
            window.showAlertPopup('Error saving configuration: ' + error.message);
        }
    };
};


const maskValue = (value) => {
    if (!value) return '';
    return value.slice(0, 3) + '*'.repeat(value.length - 3);
};


export const createBulkUploadTable = (videoIds) => {
    const table = document.createElement('table');
    table.className = 'bulk-upload-table';
    const headers = ['Thu. R', 'Local ID', 'YouTube ID', 'Title', 'Channel', 'Type', 'Update Thumbnail', 'Progress'];
    const headerRow = table.createTHead().insertRow();

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    videoIds.forEach(videoId => {
        const row = tbody.insertRow();
        row.dataset.videoId = videoId;

        headers.forEach(header => {
            const cell = row.insertCell();
            cell.className = header.toLowerCase().replace(' ', '-');

            if (header === 'Progress') {
                const progressContainer = document.createElement('div');
                progressContainer.className = 'progress-container';

                const progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';

                const progressText = document.createElement('span');
                progressText.className = 'progress-text';

                progressContainer.appendChild(progressBar);
                progressContainer.appendChild(progressText);
                cell.appendChild(progressContainer);
            }
        });
    });

    return table;
};



export const updateBulkUploadTableRow = async (videoId, uploadType, progress, youtubeId, uploadThumbnail, status = null) => {
    const row = document.querySelector(`.bulk-upload-table tr[data-video-id="${videoId}"]`);
    if (!row) return;

    const video = await window.electronAPI.databaseGet('videos', videoId);
    if (!video) return;

    const progressCell = row.querySelector('.progress');
    if (progressCell) {
        const progressBar = progressCell.querySelector('.progress-bar');
        const progressText = progressCell.querySelector('.progress-text');

        if (progressBar) {
            progressBar.style.width = `${progress}%`;

            if (status && status.includes('Error')) {
                progressBar.style.backgroundColor = '#ff4444';
                progressBar.style.width = '100%';
            } else if (progress === 100) {
                progressBar.style.backgroundColor = '#4CAF50';
            } else {
                progressBar.style.backgroundColor = '#2196F3';
            }
        }

        if (progressText) {
            progressText.textContent = status || `${progress}%`;
        }
    }

    const typeCell = row.querySelector('.type');
    if (typeCell && uploadType) {
        typeCell.textContent = uploadType;
        if (status && status.includes('Error')) {
            typeCell.style.color = '#ff4444';
            typeCell.title = status;
        } else if (progress === 100) {
            typeCell.style.color = '#4CAF50';
        }
    }

    const thumbnailCell = row.querySelector('.thu-r');
    if (thumbnailCell && video.thumbnail_remote) {
        const img = thumbnailCell.querySelector('img') || document.createElement('img');
        img.src = video.thumbnail_remote;
        img.alt = 'Thumbnail';
        img.style.maxWidth = '200px';
        if (!thumbnailCell.contains(img)) {
            thumbnailCell.appendChild(img);
        }
    }

    const localIdCell = row.querySelector('.local-id');
    if (localIdCell) localIdCell.textContent = video.local_id || '';

    const youtubeIdCell = row.querySelector('.youtube-id');
    if (youtubeIdCell) youtubeIdCell.textContent = youtubeId || video.youtube_video_id || 'Not available';

    const titleCell = row.querySelector('.title');
    if (titleCell) titleCell.textContent = video.title || '';

    const channelCell = row.querySelector('.channel');
    if (channelCell) {
        const channel = await window.electronAPI.databaseGet('channels', video.channel_id);
        channelCell.textContent = channel ? channel.name : 'Unknown';
    }

    const thumbnailUpdateCell = row.querySelector('.update-thumbnail');
    if (thumbnailUpdateCell) {
        thumbnailUpdateCell.textContent = uploadThumbnail ? 'Yes' : 'No';
    }
};


function openDownloader() {
    const downloader = document.createElement('div');
    downloader.id = 'downloader';
    document.body.appendChild(downloader);
    fetch('download.html')
        .then(response => response.text())
        .then(html => {
            downloader.innerHTML = html;
            window.initDownloader();
        });
}


export { openMiniaturizator, closeMiniaturizator, openDownloader };