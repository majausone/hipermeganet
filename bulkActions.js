const getSelectedVideos = (tableId) => {
    const table = document.getElementById(tableId);
    const checkboxes = table.querySelectorAll('tbody input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.closest('tr').dataset.videoId);
};

const uploadAllVideos = async (tableId) => {
    const selectedVideos = getSelectedVideos(tableId);
    if (selectedVideos.length === 0) {
        window.showAlertPopup('No videos selected');
        return;
    }

    const result = await window.showUploadConfirmPopup(
        'Upload selected videos?',
        `Do you want to upload ${selectedVideos.length} selected videos to YouTube?`
    );

    if (result.confirmed) {
        const { popup, confirmButton } = await window.showBulkUploadPopup(selectedVideos);
        await startBulkUpload(selectedVideos, result.uploadThumbnail, popup, confirmButton);
    }
};

const startBulkUpload = async (selectedVideos, uploadThumbnail, popup, confirmButton) => {
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel Bulk Process';
    cancelButton.className = 'cancel-bulk-button';
    popup.querySelector('.popup-buttons').appendChild(cancelButton);

    let isCancelled = false;
    cancelButton.onclick = () => {
        isCancelled = true;
        cancelButton.disabled = true;
        cancelButton.textContent = 'Cancelling...';
    };

    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    for (const videoId of selectedVideos) {
        if (isCancelled) {
            window.showAlertPopup('Bulk process cancelled by user');
            break;
        }

        const video = await window.electronAPI.databaseGet('videos', videoId);
        const uploadType = video.youtube_video_id ? 'Update' : 'Create';

        window.TableRenderer.updateBulkUploadTableRow(videoId, uploadType, 0, video.youtube_video_id, uploadThumbnail, 'Starting...');

        try {
            if (uploadType === 'Create') {
                const uploadResult = await handleNewUpload(videoId, uploadThumbnail);
                if (uploadResult.success) {
                    results.success++;
                    await window.electronAPI.databaseUpdate('videos', videoId, { youtube_video_id: uploadResult.youtube_video_id });
                    window.TableRenderer.updateBulkUploadTableRow(videoId, uploadType, 100, uploadResult.youtube_video_id, uploadThumbnail, 'Success');
                } else {
                    results.failed++;
                    results.errors.push(`Error with video ${video.title}: ${uploadResult.error}`);
                    window.TableRenderer.updateBulkUploadTableRow(videoId, uploadType, 100, video.youtube_video_id, uploadThumbnail, `Error: ${uploadResult.error}`);
                }
            } else {
                window.TableRenderer.updateBulkUploadTableRow(videoId, uploadType, 50, video.youtube_video_id, uploadThumbnail, 'Updating...');

                const updateResult = await window.electronAPI.updateYoutubeVideo(videoId, uploadThumbnail);
                if (updateResult.success) {
                    results.success++;
                    window.TableRenderer.updateBulkUploadTableRow(videoId, uploadType, 100, video.youtube_video_id, uploadThumbnail, 'Success');
                } else {
                    results.failed++;
                    results.errors.push(`Error with video ${video.title}: ${updateResult.error}`);
                    window.TableRenderer.updateBulkUploadTableRow(videoId, uploadType, 100, video.youtube_video_id, uploadThumbnail, `Error: ${updateResult.error}`);
                }
            }
        } catch (error) {
            results.failed++;
            results.errors.push(`Error with video ${video.title}: ${error.message}`);
            window.TableRenderer.updateBulkUploadTableRow(videoId, uploadType, 100, video.youtube_video_id, uploadThumbnail, `Error: ${error.message}`);
        }
    }

    const summary = `Process completed:\n${results.success} successful\n${results.failed} failed${results.errors.length ? '\n\nErrors:\n' + results.errors.join('\n') : ''}`;
    window.showAlertPopup(summary);

    if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = 'Close';
    }
    if (cancelButton) {
        cancelButton.remove();
    }
};

const handleNewUpload = async (videoId, uploadThumbnail) => {
    return new Promise((resolve) => {
        const handleUploadComplete = (event, uploadedVideoId, youtubeVideoId) => {
            if (uploadedVideoId === videoId) {
                cleanup();
                resolve({ success: true, youtube_video_id: youtubeVideoId });
            }
        };

        const handleQuotaExceeded = (event, quotaExceededVideoId) => {
            if (quotaExceededVideoId === videoId) {
                cleanup();
                resolve({ success: false, error: 'YouTube API quota exceeded. Please try again later.' });
            }
        };

        const handleUploadError = (event, errorVideoId, errorMessage) => {
            if (errorVideoId === videoId) {
                cleanup();
                resolve({ success: false, error: errorMessage });
            }
        };

        const cleanup = () => {
            window.electronAPI.removeListener('upload-complete', handleUploadComplete);
            window.electronAPI.removeListener('quota-exceeded', handleQuotaExceeded);
            window.electronAPI.removeListener('upload-error', handleUploadError);
        };

        window.electronAPI.onUploadComplete(handleUploadComplete);
        window.electronAPI.onQuotaExceeded(handleQuotaExceeded);
        window.electronAPI.onUploadError(handleUploadError);

        window.electronAPI.uploadYoutubeVideo(videoId, uploadThumbnail);
    });
};

const deleteVideos = async (tableId) => {
    const selectedVideos = getSelectedVideos(tableId);
    if (selectedVideos.length === 0) {
        window.showAlertPopup('No videos selected');
        return;
    }

    const result = await window.showConfirmPopup('Are you sure you want to delete the selected videos?', 'This action cannot be undone');
    if (result.confirmed === true) {
        for (const videoId of selectedVideos) {
            await window.electronAPI.databaseRemove('videos', videoId);
        }
        window.showAlertPopup('Selected videos have been deleted');
        refreshCurrentTab();
    }
};

const setVideoVisibility = async (tableId) => {
    const selectedVideos = getSelectedVideos(tableId);
    if (selectedVideos.length === 0) {
        window.showAlertPopup('No videos selected');
        return;
    }

    const visibilities = await window.electronAPI.databaseGet('visibility');
    const options = visibilities.map(v => ({ value: v.id, label: v.name }));
    const selectedVisibility = await window.showSelectPopup('Set Visibility', 'Select the new visibility for the videos:', options);

    if (selectedVisibility) {
        for (const videoId of selectedVideos) {
            await window.electronAPI.databaseUpdate('videos', videoId, { visibility_id: selectedVisibility });
        }
        window.showAlertPopup('Visibility updated for selected videos');
        refreshCurrentTab();
    }
};

const setVideoLanguage = async (tableId) => {
    const selectedVideos = getSelectedVideos(tableId);
    if (selectedVideos.length === 0) {
        window.showAlertPopup('No videos selected');
        return;
    }

    const languages = await window.electronAPI.databaseGet('languages');
    const options = languages.map(l => ({ value: l.id, label: l.name }));
    const selectedLanguage = await window.showSelectPopup('Set Language', 'Select the new language for the videos:', options);

    if (selectedLanguage) {
        for (const videoId of selectedVideos) {
            await window.electronAPI.databaseUpdate('videos', videoId, { default_language: selectedLanguage });
        }
        window.showAlertPopup('Language updated for selected videos');
        refreshCurrentTab();
    }
};

const setVideoCategory = async (tableId) => {
    const selectedVideos = getSelectedVideos(tableId);
    if (selectedVideos.length === 0) {
        window.showAlertPopup('No videos selected');
        return;
    }

    const categories = await window.electronAPI.databaseGet('categories');
    const options = categories.map(c => ({ value: c.id, label: c.name }));
    const selectedCategory = await window.showSelectPopup('Set Category', 'Select the new category for the videos:', options);

    if (selectedCategory) {
        for (const videoId of selectedVideos) {
            await window.electronAPI.databaseUpdate('videos', videoId, { category_id: selectedCategory });
        }
        window.showAlertPopup('Category updated for selected videos');
        refreshCurrentTab();
    }
};

const setVideoKids = async (tableId) => {
    const selectedVideos = getSelectedVideos(tableId);
    if (selectedVideos.length === 0) {
        window.showAlertPopup('No videos selected');
        return;
    }

    const options = [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' }
    ];
    const selectedKids = await window.showSelectPopup('Set Kids', 'Is this content made for kids?', options);

    const kidsValue = (selectedKids === 'true');

    if (selectedKids !== null) {
        for (const videoId of selectedVideos) {
            await window.electronAPI.databaseUpdate('videos', videoId, { kids: kidsValue });
        }
        window.showAlertPopup('Kids setting updated for selected videos');
        refreshCurrentTab();
    }
};

const setVideoLocalId = async (tableId) => {
    const selectedVideos = getSelectedVideos(tableId);
    if (selectedVideos.length === 0) {
        window.showAlertPopup('No videos selected');
        return;
    }

    const newLocalId = await window.showSelectPopup('Set Local ID', 'Enter the new Local ID for the selected videos:');

    if (newLocalId !== null) {
        for (const videoId of selectedVideos) {
            await window.electronAPI.databaseUpdate('videos', videoId, { local_id: newLocalId });
        }
        window.showAlertPopup('Local ID updated for selected videos');
        refreshCurrentTab();
    }
};

const addNewVideo = async () => {
    const channels = await window.electronAPI.databaseGet('channels');
    const options = channels.map(c => ({ value: c.id, label: c.name }));
    const selectedChannel = await window.showSelectPopup('Add New Video', 'Select the channel for the new video:', options);

    if (selectedChannel) {
        const channel = channels.find(c => c.id === parseInt(selectedChannel));
        const languages = await window.electronAPI.databaseGet('languages');
        const languageId = languages.find(l => l.code === channel.language)?.id;

        const newVideoData = {
            title: 'New Video',
            channel_id: channel.id,
            visibility_id: 2,
            kids: false,
            category_id: 20,
            default_language: languageId
        };

        const newVideoId = await window.electronAPI.databaseInsert('videos', newVideoData);
        await window.electronAPI.databaseUpdate('videos', newVideoId, { local_id: newVideoId.toString() });

        window.showAlertPopup('New video created successfully');
        refreshCurrentTab();
    }
};

const refreshCurrentTab = () => {
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab) {
        const tabName = activeTab.getAttribute('data-tab');
        window.TabFilter.loadTabContent(tabName);
    }
};

const setupBulkActions = (tableId) => {
    const existingBulkActions = document.querySelector('.bulk-actions-container');
    if (existingBulkActions) {
        existingBulkActions.remove();
    }

    const createBulkActionsContainer = (tableId) => {
        const bulkActionsContainer = document.createElement('div');
        bulkActionsContainer.className = 'bulk-actions-container';

        const actions = [
            { name: 'Upload All', action: uploadAllVideos },
            { name: 'Delete', action: deleteVideos },
            { name: 'Set Visibility', action: setVideoVisibility },
            { name: 'Set Language', action: setVideoLanguage },
            { name: 'Set Category', action: setVideoCategory },
            { name: 'Set Kids', action: setVideoKids },
            { name: 'Set Local ID', action: setVideoLocalId }
        ];

        actions.forEach(({ name, action }) => {
            const button = document.createElement('button');
            button.textContent = name;
            button.onclick = () => action(tableId);
            bulkActionsContainer.appendChild(button);
        });

        const addVideoButton = document.createElement('button');
        addVideoButton.textContent = 'Add Video';
        addVideoButton.className = 'add-video-button';
        addVideoButton.onclick = addNewVideo;

        const actionsWrapper = document.createElement('div');
        actionsWrapper.appendChild(bulkActionsContainer);
        actionsWrapper.appendChild(addVideoButton);

        return actionsWrapper;
    };

    const videosTable = document.getElementById('videosTable');
    const videoDetailsTable = document.getElementById('videoDetailsTable');
    const videoDetails2Table = document.getElementById('videoDetails2Table');

    if (videosTable && videosTable.parentNode) {
        videosTable.parentNode.insertBefore(createBulkActionsContainer('videosTable'), videosTable);
    }

    if (videoDetailsTable && videoDetailsTable.parentNode) {
        videoDetailsTable.parentNode.insertBefore(createBulkActionsContainer('videoDetailsTable'), videoDetailsTable);
    }

    if (videoDetails2Table && videoDetails2Table.parentNode) {
        videoDetails2Table.parentNode.insertBefore(createBulkActionsContainer('videoDetails2Table'), videoDetails2Table);
    }
};

window.setupBulkActions = setupBulkActions;
export {
    getSelectedVideos,
    uploadAllVideos,
    startBulkUpload,
    handleNewUpload,
    deleteVideos,
    setVideoVisibility,
    setVideoLanguage,
    setVideoCategory,
    setVideoKids,
    setVideoLocalId,
    addNewVideo,
    refreshCurrentTab,
    setupBulkActions
};