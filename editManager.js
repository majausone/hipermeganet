async function loadEditForm() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const id = urlParams.get('id');
    const returnTab = urlParams.get('returnTab');

    if (type !== 'accounts' && type !== 'channels' && type !== 'videos' && type !== 'video-details' && type !== 'video-details-2' && type !== 'languages') {
        return;
    }

    let data = {};
    if (id) {
        const tableName = getTableNameForType(type);
        data = await window.electronAPI.databaseGet(tableName, id);
    }

    const form = document.createElement('form');
    form.id = 'editForm';
    form.className = 'edit-form';

    const leftColumn = document.createElement('div');
    leftColumn.className = 'edit-column left-column';
    const rightColumn = document.createElement('div');
    rightColumn.className = 'edit-column right-column';

    const fields = getFieldsForType(type);

    for (const field of fields) {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'field-container';

        const label = document.createElement('label');
        label.textContent = field.label;
        fieldContainer.appendChild(label);

        let input;
        if (field.type === 'select') {
            input = document.createElement('select');
            const options = await getOptionsForField(field.name);
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.id;
                optionElement.textContent = option.name;
                if (data[field.name] == option.id) {
                    optionElement.selected = true;
                }
                input.appendChild(optionElement);
            });
        } else if (field.type === 'textarea' || field.name === 'tags') {
            input = document.createElement('textarea');
        } else if (field.name === 'local_path' || field.name === 'thumbnail_path') {
            const inputContainer = document.createElement('div');
            inputContainer.style.display = 'flex';
            inputContainer.style.alignItems = 'center';

            input = document.createElement('input');
            input.type = 'text';
            input.style.flexGrow = '1';
            input.style.marginRight = '10px';

            const selectButton = document.createElement('button');
            selectButton.textContent = 'Select';
            selectButton.type = 'button';
            selectButton.onclick = async (e) => {
                e.preventDefault();
                const filePath = await window.electronAPI.selectFile();
                if (filePath) {
                    input.value = filePath;
                }
            };

            inputContainer.appendChild(input);
            inputContainer.appendChild(selectButton);
            fieldContainer.appendChild(inputContainer);
        } else {
            input = document.createElement('input');
            input.type = field.type;
        }

        if (input) {
            input.name = field.name;
            input.value = data[field.name] || '';
            if (!fieldContainer.contains(input)) {
                fieldContainer.appendChild(input);
            }
        }

        if (field.name === 'local_id' || field.name === 'local_path' || field.name === 'thumbnail_path' || field.name === 'thumbnail_text' || field.name === 'category_id' || field.name === 'default_language' || field.name === 'visibility_id') {
            rightColumn.appendChild(fieldContainer);
        } else {
            leftColumn.appendChild(fieldContainer);
        }
    }

    if (type === 'videos' || type === 'video-details' || type === 'video-details-2') {
        const channelSelect = document.createElement('select');
        channelSelect.name = 'channel_id';
        const channels = await window.electronAPI.databaseGet('channels');
        channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            if (data.channel_id == channel.id) {
                option.selected = true;
            }
            channelSelect.appendChild(option);
        });
        const channelLabel = document.createElement('label');
        channelLabel.textContent = 'Channel';
        const channelContainer = document.createElement('div');
        channelContainer.className = 'field-container';
        channelContainer.appendChild(channelLabel);
        channelContainer.appendChild(channelSelect);
        rightColumn.insertBefore(channelContainer, rightColumn.firstChild);

        const categoryLanguageVisibility = document.createElement('div');
        categoryLanguageVisibility.className = 'category-language-visibility';
        const categoryField = rightColumn.querySelector('.field-container:nth-child(2)');
        const languageField = rightColumn.querySelector('.field-container:nth-child(3)');
        const visibilityField = rightColumn.querySelector('.field-container:nth-child(4)');
        if (categoryField && languageField && visibilityField) {
            categoryLanguageVisibility.appendChild(categoryField);
            categoryLanguageVisibility.appendChild(languageField);
            categoryLanguageVisibility.appendChild(visibilityField);
            rightColumn.insertBefore(categoryLanguageVisibility, rightColumn.children[1]);
        }

        const fieldsToMove = ['local_id', 'local_path', 'thumbnail_path'];
        fieldsToMove.forEach(fieldName => {
            const field = Array.from(rightColumn.querySelectorAll('.field-container')).find(container => {
                const input = container.querySelector(`input[name="${fieldName}"]`);
                return input !== null;
            });
            if (field) {
                rightColumn.appendChild(field);
            }
        });
    }

    form.appendChild(leftColumn);
    form.appendChild(rightColumn);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = id ? 'Update' : 'Create';
    buttonContainer.appendChild(submitButton);

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => window.location.href = `index.html#${returnTab}`;
    buttonContainer.appendChild(cancelButton);

    form.appendChild(buttonContainer);

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const updatedData = Object.fromEntries(formData.entries());

        if (type === 'videos') {
            const localPathInput = form.querySelector('input[name="local_path"]');
            const thumbnailPathInput = form.querySelector('input[name="thumbnail_path"]');

            if (localPathInput) {
                updatedData.local_path = localPathInput.value;
            }
            if (thumbnailPathInput) {
                updatedData.thumbnail_path = thumbnailPathInput.value;
            }
        }

        if (!validateForm(type, updatedData)) {
            return;
        }

        try {
            const tableName = getTableNameForType(type);
            if (id) {
                await window.electronAPI.databaseUpdate(tableName, id, updatedData);
            } else {
                await window.electronAPI.databaseInsert(tableName, updatedData);
            }
            window.location.href = `index.html#${returnTab}`;
        } catch (error) {
            console.error('Error saving record:', error);
            window.showAlertPopup('Error saving record: ' + error.message);
        }
    };

    document.getElementById('content').appendChild(form);
}

function getTableNameForType(type) {
    switch (type) {
        case 'video-details':
        case 'video-details-2':
            return 'videos';
        default:
            return type;
    }
}

function getFieldsForType(type) {
    switch (type) {
        case 'accounts':
            return [
                { label: 'Name', name: 'name', type: 'text' },
                { label: 'Email', name: 'email', type: 'email' }
            ];
        case 'channels':
            return [
                { label: 'Name', name: 'name', type: 'text' },
                { label: 'Language', name: 'language', type: 'select' }
            ];
        case 'videos':
        case 'video-details':
        case 'video-details-2':
            return [
                { label: 'ID', name: 'id', type: 'text', readonly: true },
                { label: 'Title', name: 'title', type: 'text' },
                { label: 'Description', name: 'description', type: 'textarea' },
                { label: 'Tags', name: 'tags', type: 'textarea' },
                { label: 'Local ID', name: 'local_id', type: 'text' },
                { label: 'File Path', name: 'local_path', type: 'file' },
                { label: 'Thumbnail Path', name: 'thumbnail_path', type: 'file' },
                { label: 'Thumbnail Text', name: 'thumbnail_text', type: 'text' },
                { label: 'Category', name: 'category_id', type: 'select' },
                { label: 'Language', name: 'default_language', type: 'select' },
                { label: 'Visibility', name: 'visibility_id', type: 'select' }
            ];
        case 'languages':
            return [
                { label: 'Name', name: 'name', type: 'text' },
                { label: 'Code', name: 'code', type: 'text' }
            ];
        default:
            return [];
    }
}

async function getOptionsForField(fieldName) {
    switch (fieldName) {
        case 'language':
            return await window.electronAPI.databaseGet('languages');
        case 'category_id':
            return await window.electronAPI.databaseGet('categories');
        case 'default_language':
            return await window.electronAPI.databaseGet('languages');
        case 'visibility_id':
            return await window.electronAPI.databaseGet('visibility');
        default:
            return [];
    }
}

function validateForm(type, data) {
    const requiredFields = {
        accounts: ['name', 'email'],
        channels: ['name', 'language'],
        videos: ['title', 'category_id', 'default_language', 'visibility_id'],
        'video-details': ['title', 'category_id', 'default_language', 'visibility_id'],
        'video-details-2': ['title', 'category_id', 'default_language', 'visibility_id'],
        languages: ['name', 'code']
    };

    const missingFields = requiredFields[type].filter(field => !data[field]);

    if (missingFields.length > 0) {
        window.showAlertPopup(`Please fill in the following required fields: ${missingFields.join(', ')}`);
        return false;
    }

    if (type === 'videos' || type === 'video-details' || type === 'video-details-2') {
        if (data.category_id && isNaN(parseInt(data.category_id))) {
            window.showAlertPopup('Category must be a valid number');
            return false;
        }
        if (data.default_language && isNaN(parseInt(data.default_language))) {
            window.showAlertPopup('Language must be a valid number');
            return false;
        }
        if (data.visibility_id && isNaN(parseInt(data.visibility_id))) {
            window.showAlertPopup('Visibility must be a valid number');
            return false;
        }
    }

    return true;
}

document.addEventListener('DOMContentLoaded', loadEditForm);

function handleVideoEdit(videoId, field, value) {
    window.electronAPI.databaseUpdate('videos', videoId, { [field]: value })
        .then(() => {
            console.log(`Video ${videoId} updated successfully`);
            window.showAlertPopup('Video updated successfully');
        })
        .catch(error => {
            console.error('Error updating video:', error);
            window.showAlertPopup('Error updating video: ' + error.message);
        });
}

async function handleFileUpload(videoId, field) {
    try {
        const filePath = await window.electronAPI.selectFile();
        if (filePath) {
            await window.electronAPI.databaseUpdate('videos', videoId, { [field]: filePath });
            window.showAlertPopup(`${field} updated successfully`);
        }
    } catch (error) {
        console.error(`Error updating ${field}:`, error);
        window.showAlertPopup(`Error updating ${field}: ` + error.message);
    }
}

window.handleVideoEdit = handleVideoEdit;
window.handleFileUpload = handleFileUpload;
