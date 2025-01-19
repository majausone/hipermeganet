export const editTitle = (id, titleSpan) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = titleSpan.textContent;
    input.onblur = async () => {
        await updateVideo(id, 'title', input.value);
        titleSpan.textContent = input.value;
        titleSpan.style.display = '';
        input.remove();
    };
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    };
    titleSpan.style.display = 'none';
    titleSpan.parentNode.insertBefore(input, titleSpan);
    input.focus();
};

export const editYouTubeId = (id, youtubeIdSpan) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = youtubeIdSpan.textContent;
    input.onblur = async () => {
        await updateVideo(id, 'youtube_video_id', input.value);
        youtubeIdSpan.textContent = input.value;
        youtubeIdSpan.style.display = '';
        input.remove();
    };
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    };
    youtubeIdSpan.style.display = 'none';
    youtubeIdSpan.parentNode.insertBefore(input, youtubeIdSpan);
    input.focus();
};

export const editLocalId = (id, localIdSpan) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = localIdSpan.textContent;
    input.onblur = async () => {
        await updateVideo(id, 'local_id', input.value);
        localIdSpan.textContent = input.value;
        localIdSpan.style.display = '';
        input.remove();
    };
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    };
    localIdSpan.style.display = 'none';
    localIdSpan.parentNode.insertBefore(input, localIdSpan);
    input.focus();
};

export const editItem = (id) => {
    let currentTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
    let returnTab = currentTab;
    if (currentTab === 'video-details' || currentTab === 'video-details-2') {
        currentTab = 'videos';
    }
    window.location.href = `edit.html?type=${currentTab}&id=${id || ''}&returnTab=${returnTab}`;
};

export const deleteItem = async (id) => {
    try {
        const result = await showConfirmPopup('Are you sure you want to delete this item?', 'This action cannot be undone.');
        if (result.confirmed === true) {
            const currentTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
            const result = await window.electronAPI.databaseRemove(currentTab, id);
            if (result > 0) {
                loadTabContent(currentTab);
            } else {
                throw new Error('Failed to delete the item');
            }
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showAlertPopup('Error deleting item: ' + error.message);
    }
};

export const deleteVideo = async (id) => {
    try {
        const { confirmed } = await showConfirmPopup('Are you sure you want to delete this video from the local database?', 'This action cannot be undone.');
        if (confirmed) {
            const result = await window.electronAPI.databaseRemove('videos', id);
            if (result > 0) {
                const currentTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
                loadTabContent(currentTab);
            } else {
                throw new Error('Failed to delete the video');
            }
        }
    } catch (error) {
        console.error('Error deleting video:', error);
        showAlertPopup('Error deleting video: ' + error.message);
    }
};

export const applyToAll = async (id, translateEnabled) => {
    try {
        const videos = await window.electronAPI.databaseGet('videos');
        const selectedVideo = videos.find(v => v.id === id);
        if (!selectedVideo) {
            throw new Error('Video not found');
        }

        const channels = await window.electronAPI.databaseGet('channels');
        const updatedVideos = [];

        for (const channel of channels) {
            if (channel.id === selectedVideo.channel_id) {
                continue;
            }

            const existingVideo = videos.find(v => v.local_id === selectedVideo.local_id && v.channel_id === channel.id);

            const channelLanguage = await window.electronAPI.getLanguageByCode(channel.language);
            if (!channelLanguage) {
                console.warn(`Language not found for code: ${channel.language}`);
                continue;
            }

            let videoToUpdate = {
                title: selectedVideo.title,
                description: selectedVideo.description,
                tags: selectedVideo.tags,
                local_id: selectedVideo.local_id,
                channel_id: channel.id,
                publish_date: selectedVideo.publish_date,
                views: existingVideo ? existingVideo.views : 0,
                youtube_video_id: existingVideo ? existingVideo.youtube_video_id : null,
                category_id: selectedVideo.category_id,
                default_language: channelLanguage.id,
                visibility_id: selectedVideo.visibility_id,
                thumbnail_text: selectedVideo.thumbnail_text,
                kids: selectedVideo.kids
            };

            if (existingVideo) {
                videoToUpdate.local_path = existingVideo.local_path;
                videoToUpdate.thumbnail_path = existingVideo.thumbnail_path;
                videoToUpdate.thumbnail_remote = existingVideo.thumbnail_remote;
            }

            if (translateEnabled) {
                videoToUpdate = await window.electronAPI.translateVideo(videoToUpdate, channel.language);
            }

            if (existingVideo) {
                await window.electronAPI.databaseUpdate('videos', existingVideo.id, videoToUpdate);
            } else {
                await window.electronAPI.databaseInsert('videos', videoToUpdate);
            }

            updatedVideos.push(videoToUpdate);
        }

        await loadTabContent('video-details');
        showAlertPopup('Changes applied to all related videos' + (translateEnabled ? ' and translated' : ''));
    } catch (error) {
        console.error('Error applying changes to all videos:', error);
        showAlertPopup('Error applying changes to all videos: ' + error.message);
    }
};

export const syncAccount = async (accountId) => {
    try {
        const result = await window.electronAPI.syncAccount(accountId);
        if (result.success) {
            showAlertPopup('Account synchronized successfully');
        } else {
            showAlertPopup('Error synchronizing account: ' + result.error);
        }
        loadTabContent('accounts');
    } catch (error) {
        console.error('Error syncing account:', error);
        showAlertPopup('Error synchronizing account: ' + error.message);
    }
};

export const syncChannel = async (channelId) => {
    try {
        const result = await window.electronAPI.syncChannel(channelId);
        if (result.success) {
            showAlertPopup('Channel synchronized successfully');
        } else {
            showAlertPopup('Error synchronizing channel: ' + result.error);
        }
        loadTabContent('channels');
    } catch (error) {
        console.error('Error syncing channel:', error);
        showAlertPopup('Error synchronizing channel: ' + error.message);
    }
};

export const syncAllChannels = async () => {
    try {
        const result = await window.electronAPI.syncAllChannels();
        if (result.success) {
            showAlertPopup('All channels synchronized successfully');
        } else {
            showAlertPopup('Error synchronizing all channels: ' + result.error);
        }
        loadTabContent('channels');
    } catch (error) {
        console.error('Error syncing all channels:', error);
        showAlertPopup('Error synchronizing all channels: ' + error.message);
    }
};

export const handleGoogleAuthCallback = async (code) => {
    try {
        const result = await window.electronAPI.handleGoogleAuthCallback(code);
        if (result.success) {
            showAlertPopup('Authentication successful');
            loadTabContent('accounts');
        } else {
            showAlertPopup('Authentication error: ' + result.error);
        }
    } catch (error) {
        console.error('Error handling Google Auth callback:', error);
        showAlertPopup('Authentication error: ' + error.message);
    }
};

export const updateConfig = async (newConfig) => {
    try {
        await window.electronAPI.updateConfig(newConfig);
        showAlertPopup('Configuration saved successfully');
    } catch (error) {
        console.error('Error saving configuration:', error);
        showAlertPopup('Error saving configuration');
    }
};

export const updateChannel = (id, field, value) => {
    window.electronAPI.databaseUpdate('channels', id, { [field]: value })
        .then(() => console.log(`Channel ${id} updated successfully`))
        .catch(error => console.error('Error updating channel:', error));
};

export const updateVideo = (id, field, value) => {
    window.electronAPI.databaseUpdate('videos', id, { [field]: value })
        .then(() => console.log(`Video ${id} updated successfully`))
        .catch(error => console.error('Error updating video:', error));
};

export const uploadVideo = async (id) => {
    try {
        const video = await window.electronAPI.databaseGet('videos', id);
        if (!video) {
            throw new Error('Video not found');
        }

        const channel = await window.electronAPI.databaseGet('channels', video.channel_id);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const account = await window.electronAPI.databaseGet('accounts', channel.account_id);
        if (!account || !account.access_token) {
            throw new Error('Account not found or not authenticated');
        }

        await window.electronAPI.refreshToken(account.id);

        if (video.youtube_video_id) {
            const result = await showUploadConfirmPopup(
                'Update YouTube Video',
                'This video already exists on YouTube. Do you want to update its details?',
                true
            );
            if (result.confirmed) {
                const updateResult = await window.electronAPI.updateYoutubeVideo(id, result.uploadThumbnail);
                if (updateResult.success) {
                    showAlertPopup('Video details updated on YouTube');
                } else {
                    showAlertPopup('Error updating video: ' + updateResult.error);
                }
            }
        } else {
            if (!video.local_path) {
                const filePath = await window.electronAPI.selectFile();
                if (!filePath) {
                    throw new Error('No video file selected');
                }
                await window.electronAPI.databaseUpdate('videos', id, { local_path: filePath });
            }

            const result = await showUploadConfirmPopup(
                'Upload Video to YouTube',
                'Do you want to upload this video to YouTube?'
            );
            if (result.confirmed) {
                const uploadResult = await new Promise((resolve) => {
                    window.electronAPI.uploadYoutubeVideo(id, result.uploadThumbnail);

                    window.electronAPI.onUploadComplete((event, uploadedVideoId, youtubeVideoId) => {
                        if (uploadedVideoId === id) {
                            resolve({ success: true, youtube_video_id: youtubeVideoId });
                        }
                    });

                    window.electronAPI.onQuotaExceeded((event, quotaExceededVideoId) => {
                        if (quotaExceededVideoId === id) {
                            resolve({ success: false, error: 'YouTube API quota exceeded. Please try again later.' });
                        }
                    });

                    window.electronAPI.onUploadError((event, errorVideoId, errorMessage) => {
                        if (errorVideoId === id) {
                            resolve({ success: false, error: errorMessage });
                        }
                    });
                });

                if (uploadResult.success) {
                    await window.electronAPI.databaseUpdate('videos', id, { youtube_video_id: uploadResult.youtube_video_id });
                    showAlertPopup('Video uploaded to YouTube successfully');
                    loadTabContent('videos');
                } else {
                    showAlertPopup('Error uploading video: ' + uploadResult.error);
                }
            }
        }
    } catch (error) {
        console.error('Error in upload process:', error);
        showAlertPopup('Error uploading video: ' + error.message);
    }
};

export const initiateBulkUpload = async (selectedVideoIds) => {
    try {
        const result = await showBulkUploadPopup(selectedVideoIds);
        if (result.confirmed) {
            await window.electronAPI.bulkUploadVideos(selectedVideoIds);
        }
    } catch (error) {
        console.error('Error initiating bulk upload:', error);
        showAlertPopup('Error initiating bulk upload: ' + error.message);
    }
};

export const addNewLanguage = async () => {
    try {
        const newLanguageData = {
            name: 'New Language',
            code: 'SET'
        };
        const newLanguageId = await window.electronAPI.databaseInsert('languages', newLanguageData);
        console.log(`New language added with ID: ${newLanguageId}`);
        window.showAlertPopup('New language added successfully');
        window.loadTabContent('languages');
    } catch (error) {
        console.error('Error adding new language:', error);
        window.showAlertPopup('Error adding new language: ' + error.message);
    }
};

export const translateSingleVideo = async (videoId) => {
    try {
        const video = await window.electronAPI.databaseGet('videos', videoId);
        if (!video) {
            throw new Error('Video not found');
        }

        const channel = await window.electronAPI.databaseGet('channels', video.channel_id);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const translatedVideo = await window.electronAPI.translateVideo(video, channel.language);
        await window.electronAPI.databaseUpdate('videos', videoId, translatedVideo);

        window.showAlertPopup('Video translated successfully');
        refreshCurrentTab();
    } catch (error) {
        console.error('Error translating video:', error);
        window.showAlertPopup('Error translating video: ' + error.message);
    }
};

window.editTitle = editTitle;
window.editYouTubeId = editYouTubeId;
window.editLocalId = editLocalId;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.deleteVideo = deleteVideo;
window.applyToAll = applyToAll;
window.syncAccount = syncAccount;
window.syncChannel = syncChannel;
window.syncAllChannels = syncAllChannels;
window.handleGoogleAuthCallback = handleGoogleAuthCallback;
window.updateConfig = updateConfig;
window.updateChannel = updateChannel;
window.updateVideo = updateVideo;
window.uploadVideo = uploadVideo;
window.initiateBulkUpload = initiateBulkUpload;
window.addNewLanguage = addNewLanguage;
window.translateSingleVideo = translateSingleVideo;