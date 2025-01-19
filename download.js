let videos = [];
let isDownloading = false;
let currentDownloadIndex = -1;

function initDownloader() {
    const closeBtn = document.getElementById('closeDownloaderBtn');
    const loadJsonBtn = document.getElementById('loadJsonBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const cancelAllBtn = document.getElementById('cancelAllBtn');

    closeBtn.addEventListener('click', closeDownloader);
    loadJsonBtn.addEventListener('click', loadJsonFile);
    downloadAllBtn.addEventListener('click', downloadAll);
    cancelAllBtn.addEventListener('click', cancelAll);

    document.getElementById('jsonFileInput').addEventListener('change', handleFileSelect);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const jsonData = JSON.parse(e.target.result);
                videos = jsonData;
                displayVideoList(videos);
                document.getElementById('jsonFileName').textContent = file.name;
            } catch (error) {
                console.error('Error parsing JSON:', error);
            }
        };
        reader.readAsText(file);
    }
}

function loadJsonFile() {
    document.getElementById('jsonFileInput').click();
}

function displayVideoList(videos) {
    const videoList = document.getElementById('videoList');
    videoList.innerHTML = '';
    videos.forEach((video, index) => {
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';
        videoItem.innerHTML = `
            <span class="video-name">${video.title}</span>
            <div class="progress-overlay">
                <div class="progress-bar">
                    <div class="progress-bar-fill"></div>
                </div>
                <span class="progress-text">0%</span>
            </div>
        `;
        videoList.appendChild(videoItem);
    });
}

async function downloadVideo(index) {
    const video = videos[index];
    try {
        console.log('Starting download for video:', video.title);
        const config = await window.electronAPI.databaseGet('config');
        const globalPath = config[0]?.global_video_path;
        console.log('Global path:', globalPath);

        const fileName = video.title.endsWith('.mp4') ? video.title : `${video.title}.mp4`;
        const pathParts = globalPath.split('\\');
        const filePath = [...pathParts, fileName].join('\\');
        console.log('Attempting to save file to:', filePath);

        currentDownloadIndex = index;
        await window.electronAPI.startVideoDownload(video.videoUrl, filePath);
        console.log('Video download completed');
        updateProgress(index, 100);
    } catch (error) {
        console.error('Error downloading video:', error);
        updateProgress(index, 0);
    } finally {
        currentDownloadIndex = -1;
    }
}

async function downloadAll() {
    if (isDownloading) {
        console.log('Download already in progress');
        return;
    }

    isDownloading = true;
    for (let i = 0; i < videos.length; i++) {
        if (!isDownloading) break;
        await downloadVideo(i);
    }
    isDownloading = false;
}

async function cancelAll() {
    if (isDownloading) {
        try {
            isDownloading = false;
            if (currentDownloadIndex !== -1) {
                await window.electronAPI.cancelDownload();
                updateProgress(currentDownloadIndex, 0);
            }
            console.log('All downloads cancelled');
            videos.forEach((_, index) => updateProgress(index, 0));
        } catch (error) {
            console.error('Error cancelling downloads:', error);
        } finally {
            currentDownloadIndex = -1;
        }
    }
}

function updateProgress(index, progress) {
    const videoItems = document.querySelectorAll('.video-item');
    if (videoItems[index]) {
        const progressOverlay = videoItems[index].querySelector('.progress-overlay');
        const progressBarFill = videoItems[index].querySelector('.progress-bar-fill');
        const progressText = videoItems[index].querySelector('.progress-text');
        
        progressOverlay.style.display = progress > 0 && progress < 100 ? 'flex' : 'none';
        progressBarFill.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;
    }
}

function closeDownloader() {
    cancelAll();
    const downloader = document.getElementById('downloader');
    if (downloader && downloader.parentNode) {
        downloader.parentNode.removeChild(downloader);
    }
    document.body.classList.remove('downloader-active');
}

window.electronAPI.onDownloadProgress((event, { filePath, progress }) => {
    if (currentDownloadIndex !== -1) {
        updateProgress(currentDownloadIndex, progress);
    }
});

window.initDownloader = initDownloader;
