let currentVideoId;
let originalImageSize;
let onetime = true;

function initMiniaturizator(videoId) {
    onetime = true;
    currentVideoId = videoId;
    const miniaturizator = document.getElementById('miniaturizator');
    const selectThumbnailBtn = document.getElementById('selectThumbnailBtn');
    const thumbnailPathInput = document.getElementById('thumbnailPath');
    const thumbnailTextInput = document.getElementById('thumbnailText');
    const thumbnailPreview = document.getElementById('thumbnailPreviewLarge');
    const closeMiniaturizatorBtn = document.getElementById('closeMiniaturizatorBtn');
    const fontFamilySelect = document.getElementById('fontFamily');
    const seeAllButton = document.getElementById('seeAllButton');
    const saveAllButton = document.getElementById('saveAllButton');
    const saveButton = document.getElementById('saveButton');
    const openFolderBtn = document.getElementById('openFolder');

    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'miniaturizator-loading';
    miniaturizator.appendChild(loadingOverlay);

    openFolderBtn.addEventListener('click', openGlobalVideoFolder);

    selectThumbnailBtn.addEventListener('click', () => {
        window.electronAPI.selectFile().then(path => {
            if (path) {
                thumbnailPathInput.value = path;
                updateThumbnailPreview(path);
                updateThumbnailPath(path);
            }
        });
    });

    thumbnailPathInput.addEventListener('change', async () => {
        const newPath = thumbnailPathInput.value;
        updateThumbnailPreview(newPath);
        await updateThumbnailPath(newPath);
    });

    thumbnailTextInput.addEventListener('input', async () => {
        const newText = thumbnailTextInput.value;
        await updateThumbnailText(newText);
    });

    closeMiniaturizatorBtn.addEventListener('click', () => {
        if (miniaturizator && miniaturizator.parentNode) {
            miniaturizator.parentNode.removeChild(miniaturizator);
        }
        document.body.classList.remove('miniaturizator-active');
        refreshCurrentTab();
    });

    fontFamilySelect.addEventListener('change', () => {
        const selectedFont = fontFamilySelect.value;
        loadGoogleFont(selectedFont);
        updateTextStyle();
    });

    seeAllButton.addEventListener('click', showAllThumbnails);
    saveAllButton.addEventListener('click', saveAllImages);
    saveButton.addEventListener('click', () => saveImage(videoId));

    loadVideoData(videoId).then(() => {
        loadingOverlay.remove();
        document.body.classList.add('miniaturizator-active');
        window.initTextControls();
    });

    populateFontSelect();
}

async function openGlobalVideoFolder() {
    try {
        const config = await window.electronAPI.databaseGet('config');
        const globalVideoPath = config[0]?.global_video_path;

        if (globalVideoPath) {
            const result = await window.electronAPI.openFolder(globalVideoPath);
            if (!result.success) {
                throw new Error(result.error);
            }
        } else {
            alert('The global video path is not configured.');
        }
    } catch (error) {
        console.error('Error opening global video folder:', error);
        alert('Error opening global video folder: ' + error.message);
    }
}

function populateFontSelect() {
    const fontFamilySelect = document.getElementById('fontFamily');
    window.googleFonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font;
        option.textContent = font;
        fontFamilySelect.appendChild(option);
    });
}

function updateThumbnailPreview(path) {
    const thumbnailPreview = document.getElementById('thumbnailPreviewLarge');
    const thumbnailContainer = document.getElementById('thumbnailContainer');

    if (!thumbnailPreview || !thumbnailContainer) {
        console.error('Thumbnail preview or container not found');
        return;
    }

    const img = new Image();
    img.onload = () => {
        originalImageSize = { width: img.naturalWidth, height: img.naturalHeight };
        thumbnailPreview.src = `file://${path}`;
        thumbnailPreview.style.width = `${originalImageSize.width}px`;
        thumbnailPreview.style.height = `${originalImageSize.height}px`;
        thumbnailContainer.style.width = `${originalImageSize.width}px`;
        thumbnailContainer.style.height = `${originalImageSize.height}px`;
        applyZoomOut();
    };
    img.src = `file://${path}`;
}

function applyZoomOut() {
    if (!onetime) {
        return;
    }
    onetime = false;
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    const previewArea = document.querySelector('.thumbnail-preview');
    if (!thumbnailContainer || !previewArea) {
        console.error('Thumbnail container or preview area not found');
        return;
    }
    const containerRect = thumbnailContainer.getBoundingClientRect();
    const previewRect = previewArea.getBoundingClientRect();
    const scale = Math.min(previewRect.width / containerRect.width, previewRect.height / containerRect.height);

    thumbnailContainer.style.transform = `scale(${scale})`;
    thumbnailContainer.style.transformOrigin = 'top left';
    thumbnailContainer.style.position = 'absolute';
    thumbnailContainer.style.left = `${(previewRect.width - containerRect.width * scale) / 2}px`;
    thumbnailContainer.style.top = `${(previewRect.height - containerRect.height * scale) / 2}px`;
}

async function loadVideoData(videoId) {
    try {
        const video = await window.electronAPI.getVideo(videoId);
        if (video) {
            if (video.thumbnail_path) {
                document.getElementById('thumbnailPath').value = video.thumbnail_path;
                updateThumbnailPreview(video.thumbnail_path);
            } else {
                document.getElementById('thumbnailPath').value = '';
                updateThumbnailPreview('');
            }
            document.getElementById('thumbnailText').value = video.thumbnail_text || '';

            updateThumbnailText();
        }
    } catch (error) {
        console.error('Error loading video data:', error);
    }
}

async function updateThumbnailPath(newPath) {
    if (currentVideoId) {
        try {
            await window.electronAPI.updateVideo(currentVideoId, { thumbnail_path: newPath });
        } catch (error) {
            console.error('Error updating thumbnail path:', error);
        }
    }
}

async function updateThumbnailText(newText) {
    if (currentVideoId) {
        try {
            await window.electronAPI.updateVideo(currentVideoId, { thumbnail_text: newText });
        } catch (error) {
            console.error('Error updating thumbnail text:', error);
        }
    }
}

function refreshCurrentTab() {
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab) {
        const tabName = activeTab.getAttribute('data-tab');
        window.loadTabContent(tabName);
    }
}

function loadGoogleFont(fontFamily) {
    if (fontFamily === 'Arial') return;
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css?family=${fontFamily.replace(' ', '+')}`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
}

async function saveImage(videoId, _all = false) {
    if (!videoId) {
        console.error('No video ID provided to saveImage function');
        alert('Error: No video ID provided');
        return;
    }

    try {
        const video = await window.electronAPI.getVideo(videoId);

        if (!video) {
            throw new Error('Video not found');
        }
        const thumbnailTextInput = document.getElementById('thumbnailText');
        const originalText = thumbnailTextInput.value;
        thumbnailTextInput.value = video.thumbnail_text || '';
        await updateThumbnailText(video.thumbnail_text || '');

        const thumbnailContainer = document.getElementById('thumbnailContainer');
        const thumbnailImage = document.getElementById('thumbnailPreviewLarge');
        const thumbnailText = document.getElementById('thumbnailTextLarge');

        const originalContainerTransform = thumbnailContainer.style.transform;
        const originalContainerTransformOrigin = thumbnailContainer.style.transformOrigin;
        const originalImageWidth = thumbnailImage.style.width;
        const originalImageHeight = thumbnailImage.style.height;
        const originalTextBorder = thumbnailText.style.border;

        const resizeHandles = thumbnailText.querySelectorAll('.resize-handle');
        const originalHandleDisplay = [];
        resizeHandles.forEach((handle, index) => {
            originalHandleDisplay[index] = handle.style.display;
            handle.style.display = 'none';
        });

        thumbnailText.style.border = 'none';

        thumbnailContainer.style.transform = 'none';
        thumbnailContainer.style.transformOrigin = 'top left';
        thumbnailContainer.style.position = 'relative';
        thumbnailContainer.style.left = '0';
        thumbnailContainer.style.top = '0';

        thumbnailImage.style.width = `${thumbnailImage.naturalWidth}px`;
        thumbnailImage.style.height = `${thumbnailImage.naturalHeight}px`;

        thumbnailContainer.style.width = `${thumbnailImage.naturalWidth}px`;
        thumbnailContainer.style.height = `${thumbnailImage.naturalHeight}px`;

        const canvas = await html2canvas(thumbnailContainer, {
            useCORS: true,
            scale: 1,
        });

        thumbnailContainer.style.transform = originalContainerTransform;
        thumbnailContainer.style.transformOrigin = originalContainerTransformOrigin;
        thumbnailImage.style.width = originalImageWidth;
        thumbnailImage.style.height = originalImageHeight;
        thumbnailText.style.border = originalTextBorder;

        resizeHandles.forEach((handle, index) => {
            handle.style.display = originalHandleDisplay[index];
        });

        thumbnailTextInput.value = originalText;
        await updateThumbnailText(originalText);

        canvas.toBlob(async (blob) => {
            try {
                const arrayBuffer = await blob.arrayBuffer();
                const channel = await window.electronAPI.databaseGet('channels', video.channel_id);
                const config = await window.electronAPI.databaseGet('config');
                const globalVideoPath = config[0]?.global_video_path;
                const newFileName = `${video.local_id}-${channel.name}.png`;
                const newPath = `${globalVideoPath}/${newFileName}`;
                const result = await window.electronAPI.saveImage(arrayBuffer, newPath);
                if (result.success && !_all) {
                    console.log('Image saved successfully');
                    alert('Image saved successfully!');
                } else if (!result.success) {
                    throw new Error(result.error || 'An unknown error occurred while saving');
                }
            } catch (innerError) {
                console.error('Error in blob processing:', innerError);
                alert('Error saving the image: ' + innerError.message);
            }
        }, 'image/png');
    } catch (error) {
        console.error('Error saving the image:', error);
        alert('Error saving the image: ' + error.message);
    }
}

async function saveAllImages() {
    try {
        const currentVideo = await window.electronAPI.getVideo(currentVideoId);
        if (!currentVideo) {
            throw new Error('Current video not found');
        }
        const relatedVideos = await getRelatedVideos(currentVideo.local_id);
        const allVideos = [currentVideo, ...relatedVideos];

        for (const video of allVideos) {
            await saveImage(video.id, true);

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        alert('All images saved successfully!');
    } catch (error) {
        console.error('Error saving all images:', error);
        alert('Error saving all images: ' + error.message);
    }
}


async function showAllThumbnails() {
    try {
        const currentVideo = await window.electronAPI.getVideo(currentVideoId);
        const relatedVideos = await getRelatedVideos(currentVideo.local_id);
        const allVideos = [currentVideo, ...relatedVideos];

        const originalText = document.getElementById('thumbnailText').value;
        const originalPath = document.getElementById('thumbnailPath').value;

        const thumbnailContainer = document.getElementById('thumbnailContainer');
        const thumbnailImage = document.getElementById('thumbnailPreviewLarge');
        const thumbnailText = document.getElementById('thumbnailTextLarge');

        const originalContainerTransform = thumbnailContainer.style.transform;
        const originalContainerTransformOrigin = thumbnailContainer.style.transformOrigin;
        const originalImageWidth = thumbnailImage.style.width;
        const originalImageHeight = thumbnailImage.style.height;
        const originalTextBorder = thumbnailText.style.border;

        const resizeHandles = thumbnailText.querySelectorAll('.resize-handle');
        const originalHandleDisplay = [];
        resizeHandles.forEach((handle, index) => {
            originalHandleDisplay[index] = handle.style.display;
            handle.style.display = 'none';
        });

        thumbnailText.style.border = 'none';

        thumbnailContainer.style.transform = 'none';
        thumbnailContainer.style.transformOrigin = 'top left';
        thumbnailContainer.style.position = 'relative';
        thumbnailContainer.style.left = '0';
        thumbnailContainer.style.top = '0';

        thumbnailImage.style.width = `${thumbnailImage.naturalWidth}px`;
        thumbnailImage.style.height = `${thumbnailImage.naturalHeight}px`;

        thumbnailContainer.style.width = `${thumbnailImage.naturalWidth}px`;
        thumbnailContainer.style.height = `${thumbnailImage.naturalHeight}px`;

        const popup = document.createElement('div');
        popup.className = 'all-thumbnails-popup';

        const header = document.createElement('div');
        header.className = 'all-thumbnails-header';
        header.textContent = 'All Thumbnails';
        popup.appendChild(header);

        const closeButton = document.createElement('button');
        closeButton.textContent = '✖';
        closeButton.className = 'close-button';
        closeButton.onclick = async () => {
            popup.remove();
            thumbnailContainer.style.transformOrigin = originalContainerTransformOrigin;
            thumbnailImage.style.width = originalImageWidth;
            thumbnailImage.style.height = originalImageHeight;
            thumbnailText.style.border = originalTextBorder;
            resizeHandles.forEach((handle, index) => {
                handle.style.display = originalHandleDisplay[index];
            });
            document.getElementById('thumbnailText').value = originalText;
            document.getElementById('thumbnailPath').value = originalPath;
            await updateThumbnailText(originalText);
            updateThumbnailPreview(originalPath);
        };
        header.appendChild(closeButton);

        const thumbnailsContainer = document.createElement('div');
        thumbnailsContainer.className = 'thumbnails-container';
        popup.appendChild(thumbnailsContainer);

        const scale = 0.3;
        for (const video of allVideos) {
            document.getElementById('thumbnailText').value = video.thumbnail_text;
            document.getElementById('thumbnailPath').value = video.thumbnail_path;
            await updateThumbnailText(video.thumbnail_text);
            updateThumbnailPreview(video.thumbnail_path);

            const previewContainer = thumbnailContainer.cloneNode(true);
            previewContainer.style.transform = `scale(${scale})`;
            previewContainer.style.transformOrigin = 'top left';

            previewContainer.querySelector('#thumbnailPreviewLarge').id = '';
            previewContainer.querySelector('#thumbnailTextLarge').id = '';

            const clonedResizeHandles = previewContainer.querySelectorAll('.resize-handle');
            clonedResizeHandles.forEach(handle => {
                handle.style.display = 'none';
            });

            const collidableContainer = document.createElement('div');
            collidableContainer.style.width = `${thumbnailImage.naturalWidth * scale}px`;
            collidableContainer.style.height = `${thumbnailImage.naturalHeight * scale}px`;
            collidableContainer.style.position = 'relative';
            collidableContainer.style.overflow = 'hidden';
            collidableContainer.style.padding = '10px';

            previewContainer.style.position = 'absolute';
            previewContainer.style.top = '0';
            previewContainer.style.left = '0';

            collidableContainer.appendChild(previewContainer);

            thumbnailsContainer.appendChild(collidableContainer);
        }

        document.getElementById('thumbnailText').value = originalText;
        document.getElementById('thumbnailPath').value = originalPath;
        await updateThumbnailText(originalText);
        updateThumbnailPreview(originalPath);

        thumbnailContainer.style.transform = originalContainerTransform;
        thumbnailContainer.style.transformOrigin = originalContainerTransformOrigin;
        thumbnailImage.style.width = originalImageWidth;
        thumbnailImage.style.height = originalImageHeight;
        thumbnailText.style.border = originalTextBorder;
        resizeHandles.forEach((handle, index) => {
            handle.style.display = originalHandleDisplay[index];
        });

        document.body.appendChild(popup);
    } catch (error) {
        console.error('Error showing all thumbnails:', error);
        alert('Error showing all thumbnails: ' + error.message);
    }
}

async function getRelatedVideos(localId) {
    try {
        const allVideos = await window.electronAPI.databaseGet('videos');
        return allVideos.filter(video => video.local_id === localId && video.id !== currentVideoId);
    } catch (error) {
        console.error('Error getting related videos:', error);
        return [];
    }
}

window.initMiniaturizator = initMiniaturizator;