const showConfirmPopup = (message, details, includeCheckbox = false, checkboxText = '') => {
    return new Promise((resolve) => {
        const popup = createPopupElement(message, details, true, includeCheckbox, checkboxText);
        const confirmButton = popup.querySelector('.confirm-button');
        const cancelButton = popup.querySelector('.cancel-button');
        const checkbox = popup.querySelector('#confirm-checkbox');
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        
        const handleConfirm = () => {
            document.body.removeChild(popup);
            document.body.removeChild(overlay);
            resolve({ confirmed: true, checked: checkbox ? checkbox.checked : false });
        };

        const handleCancel = () => {
            document.body.removeChild(popup);
            document.body.removeChild(overlay);
            resolve({ confirmed: false, checked: false });
        };

        overlay.addEventListener('click', handleCancel);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        }, { once: true });

        confirmButton.addEventListener('click', handleConfirm);
        cancelButton.addEventListener('click', handleCancel);

        document.body.appendChild(overlay);
        document.body.appendChild(popup);
    });
};

const showAlertPopup = (message) => {
    const popup = createPopupElement(message, null, false);
    const confirmButton = popup.querySelector('.confirm-button');
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    const handleClose = () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    };

    confirmButton.addEventListener('click', handleClose);
    overlay.addEventListener('click', handleClose);

    document.body.appendChild(overlay);
    document.body.appendChild(popup);
};

const createPopupElement = (message, details, isConfirm, includeCheckbox = false, checkboxText = '') => {
    const popup = document.createElement('div');
    popup.className = 'custom-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <p>${message}</p>
            ${details ? `<p>${details}</p>` : ''}
            ${includeCheckbox ? `
                <div class="checkbox-container">
                    <input type="checkbox" id="confirm-checkbox" checked>
                    <label for="confirm-checkbox">${checkboxText}</label>
                </div>
            ` : ''}
            <div class="popup-buttons">
                <button class="confirm-button">${isConfirm ? 'Confirm' : 'OK'}</button>
                ${isConfirm ? '<button class="cancel-button">Cancel</button>' : ''}
            </div>
        </div>
    `;

    return popup;
};

const showGoogleAuthPopup = () => {
    window.electronAPI.googleAuthStart();
    const popup = document.createElement('div');
    popup.className = 'custom-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Google Authentication</h2>
            <p>A Google authentication window has been opened. Please follow the instructions in that window and then enter the authorization code here:</p>
            <input type="text" id="auth-code-input" placeholder="Authorization code">
            <div class="popup-buttons">
                <button class="confirm-button">Submit</button>
                <button class="cancel-button">Cancel</button>
            </div>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);

    const confirmButton = popup.querySelector('.confirm-button');
    const cancelButton = popup.querySelector('.cancel-button');
    const codeInput = popup.querySelector('#auth-code-input');

    confirmButton.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        if (code) {
            const result = await window.electronAPI.googleAuthSubmitCode(code);
            if (result.success) {
                showAlertPopup('Authentication successful');
                window.loadTabContent('accounts');
            } else {
                showAlertPopup('Authentication error: ' + result.error);
            }
        } else {
            showAlertPopup('Please enter the authorization code');
        }
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    });

    cancelButton.addEventListener('click', () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    });

    document.body.appendChild(popup);
};

const showSelectPopup = (title, message, options) => {
    return new Promise((resolve) => {
        const popup = document.createElement('div');
        popup.className = 'custom-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <h2>${title}</h2>
                <p>${message}</p>
                ${Array.isArray(options) ? `
                    <select id="select-popup-options">
                        ${options.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}
                    </select>
                ` : `
                    <input type="text" id="select-popup-input" placeholder="Enter value">
                `}
                <div class="popup-buttons">
                    <button class="confirm-button">Confirm</button>
                    <button class="cancel-button">Cancel</button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';

        const handleConfirm = () => {
            const selectedValue = select ? select.value : input.value;
            document.body.removeChild(popup);
            document.body.removeChild(overlay);
            resolve(selectedValue);
        };

        const handleCancel = () => {
            document.body.removeChild(popup);
            document.body.removeChild(overlay);
            resolve(null);
        };

        const confirmButton = popup.querySelector('.confirm-button');
        const cancelButton = popup.querySelector('.cancel-button');
        const select = popup.querySelector('#select-popup-options');
        const input = popup.querySelector('#select-popup-input');

        confirmButton.addEventListener('click', handleConfirm);
        cancelButton.addEventListener('click', handleCancel);
        overlay.addEventListener('click', handleCancel);

        document.body.appendChild(overlay);
        document.body.appendChild(popup);
    });
};

const showUploadConfirmPopup = (message, details, isUpdate = false) => {
    return new Promise((resolve) => {
        const popup = document.createElement('div');
        popup.className = 'custom-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <h2>${isUpdate ? 'Update Video Details' : 'Upload Videos'}</h2>
                <p>${message}</p>
                <p>${details}</p>
                <div class="checkbox-container">
                    <input type="checkbox" id="upload-thumbnail">
                    <label for="upload-thumbnail">Upload thumbnail</label>
                </div>
                <div class="popup-buttons">
                    <button class="confirm-button">${isUpdate ? 'Update' : 'Upload'}</button>
                    <button class="cancel-button">Cancel</button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';

        const handleConfirm = () => {
            document.body.removeChild(popup);
            document.body.removeChild(overlay);
            resolve({ confirmed: true, uploadThumbnail: thumbnailCheckbox.checked });
        };

        const handleCancel = () => {
            document.body.removeChild(popup);
            document.body.removeChild(overlay);
            resolve({ confirmed: false, uploadThumbnail: false });
        };

        const confirmButton = popup.querySelector('.confirm-button');
        const cancelButton = popup.querySelector('.cancel-button');
        const thumbnailCheckbox = popup.querySelector('#upload-thumbnail');

        confirmButton.addEventListener('click', handleConfirm);
        cancelButton.addEventListener('click', handleCancel);
        overlay.addEventListener('click', handleCancel);

        document.body.appendChild(overlay);
        document.body.appendChild(popup);
    });
};

const showBulkUploadPopup = (videoIds) => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'bulk-upload-overlay';

        const popup = document.createElement('div');
        popup.className = 'bulk-upload-popup';

        popup.innerHTML = `
            <h2>Bulk Upload Videos</h2>
            <div id="bulk-upload-table-container" class="bulk-upload-table-container"></div>
            <div class="popup-buttons" style="margin-top: 20px;">
                <button class="confirm-button" disabled>Accept</button>
            </div>
        `;

        overlay.appendChild(popup);

        const confirmButton = popup.querySelector('.confirm-button');
        const tableContainer = popup.querySelector('#bulk-upload-table-container');

        const handleConfirm = () => {
            document.body.removeChild(overlay);
            resolve({ confirmed: true });
        };

        const table = window.TableRenderer.createBulkUploadTable(videoIds);
        tableContainer.appendChild(table);

        confirmButton.addEventListener('click', handleConfirm);

        document.body.appendChild(overlay);

        resolve({ popup: overlay, confirmButton });
    });
};

const updateBulkUploadProgress = (videoId, progress) => {
    window.TableRenderer.updateBulkUploadTableRow(videoId, null, progress);
};

const showQuotaExceededPopup = () => {
    showAlertPopup('YouTube API quota exceeded. Please try again later.');
};

const enableAcceptButton = (confirmButton) => {
    if (confirmButton) {
        confirmButton.disabled = false;
    }
};

const showTranslateConfirmation = async (videoId) => {
    const result = await showConfirmPopup(
        'Translate Video',
        'Do you want to translate this video to the channel\'s language?'
    );

    if (result.confirmed) {
        await window.translateSingleVideo(videoId);
    }
};

window.showConfirmPopup = showConfirmPopup;
window.showAlertPopup = showAlertPopup;
window.showGoogleAuthPopup = showGoogleAuthPopup;
window.showSelectPopup = showSelectPopup;
window.showUploadConfirmPopup = showUploadConfirmPopup;
window.showBulkUploadPopup = showBulkUploadPopup;
window.updateBulkUploadProgress = updateBulkUploadProgress;
window.showQuotaExceededPopup = showQuotaExceededPopup;
window.enableAcceptButton = enableAcceptButton;
window.showTranslateConfirmation = showTranslateConfirmation;
