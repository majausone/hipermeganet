const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { initDatabase, getAll, get, insert, update, remove, getAccountByGoogleId, updateAccountTokens, getConfigValue, updateChannelStats, updateConfig, getVideoByYoutubeId, getChannelByYoutubeId, getVideoByLocalId, getChannelByName, getLanguageByCode, getVideoByLocalIdAndChannel } = require('./database.js');
const { translateVideo } = require('./translation.js');
const { initializeGoogleAuth, getAuthUrl, getTokensFromCode, refreshAccessToken, checkTokenValidity } = require('./googleAuth.js');
const { getChannelInfo, getVideosForChannel, updateVideoDetails, insertVideo } = require('./youtubeApi.js');
const fetch = require('node-fetch');
const https = require('https');

let mainWindow;
let authWindow;
let uploadQueue = [];
let isUploading = false;
let quotaExceeded = false;


const logToFile = async (...args) => {
    const logPath = path.join(path.dirname(process.execPath), 'app.log');
    await fs.appendFile(logPath, `${new Date().toISOString()} - ${args.join(' ')}\n`);
    console.log(...args);
};

async function createWindow() {
    try {
        await logToFile('Starting createWindow');
        await initDatabase();
        await logToFile('Database initialized');
        await initializeGoogleAuth();
        await logToFile('Google Auth initialized');

        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            show: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
                sandbox: false
            }
        });

        mainWindow.focus();

        mainWindow.webContents.on('did-fail-load', async (event, errorCode, errorDescription) => {
            await logToFile('Failed to load:', errorCode, errorDescription);
        });

        mainWindow.webContents.on('did-finish-load', async () => {
            await logToFile('Page loaded successfully');
            mainWindow.webContents.openDevTools();
        });

        process.on('uncaughtException', async (error) => {
            await logToFile('Uncaught exception:', error);
        });

        process.on('unhandledRejection', async (error) => {
            await logToFile('Unhandled rejection:', error);
        });

        mainWindow.loadFile('index.html');
        await logToFile('index.html loading started');

        await checkLoginStatus();
        await logToFile('Login status checked');
    } catch (error) {
        await logToFile('Error in createWindow:', error);
        throw error;
    }
}

app.whenReady().then(async () => {
    await logToFile('App ready');
    try {
        await createWindow();
    } catch (err) {
        await logToFile('Error:', err);
        app.quit();
    }
});

app.on('window-all-closed', async () => {
    await logToFile('All windows closed');
    app.quit();
});




app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

const ensureSavedByUserDirectory = async () => {
    const savedByUserPath = path.join(app.getPath('userData'), 'saved_by_user');
    try {
        await fs.access(savedByUserPath);
        console.log('Directory saved_by_user exists.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Directory saved_by_user does not exist. Creating it...');
            await fs.mkdir(savedByUserPath);
            console.log('Directory saved_by_user created at: ' + savedByUserPath);
        } else {
            throw error;
        }
    }
};

async function checkLoginStatus() {
    try {
        const accounts = await getAll('accounts');
        for (const account of accounts) {
            if (account.access_token && account.token_expiry) {
                const isValid = await checkTokenValidity(account.access_token, account.token_expiry);
                if (!isValid) {
                    await refreshToken(account.id);
                }
            }
        }
    } catch (error) {
        console.error('Error checking login status:', error);
    }
}

ipcMain.handle('database-get', async (event, table, id) => {
    if (id) {
        return await get(table, id);
    } else {
        return await getAll(table);
    }
});

ipcMain.handle('database-insert', async (event, table, data) => {
    return await insert(table, data);
});

ipcMain.handle('database-update', async (event, table, id, data) => {
    return await update(table, id, data);
});

ipcMain.handle('database-remove', async (event, table, id) => {
    return await remove(table, id);
});

ipcMain.handle('translate-video', async (event, video, targetLanguage) => {
    return translateVideo(video, targetLanguage);
});

ipcMain.handle('google-auth-start', async (event) => {
    const authUrl = await getAuthUrl();
    authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    authWindow.loadURL(authUrl);
    authWindow.show();
});

ipcMain.handle('google-auth-submit-code', async (event, code) => {
    try {
        const tokens = await getTokensFromCode(code);
        const userInfo = await getUserInfo(tokens.access_token);
        const googleId = userInfo.id;
        let account = await getAccountByGoogleId(googleId);

        if (!account) {
            const newAccountId = await insert('accounts', {
                google_id: googleId,
                name: userInfo.name,
                email: userInfo.email
            });
            account = { id: newAccountId };
        }

        const expiryDate = tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : new Date(Date.now() + 3600 * 1000).toISOString();

        await updateAccountTokens(
            account.id,
            tokens.access_token,
            tokens.refresh_token,
            expiryDate
        );

        return { success: true };
    } catch (error) {
        console.error('Error en el callback de autenticación:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('refresh-token', async (event, accountId) => {
    try {
        await refreshToken(accountId);
        return { success: true };
    } catch (error) {
        console.error('Error al refrescar el token:', error);
        return { success: false, error: error.message };
    }
});

async function refreshToken(accountId) {
    try {
        const account = await get('accounts', accountId);
        if (!account || !account.refresh_token) {
            throw new Error('No se encontró la cuenta o el refresh token');
        }

        const newTokens = await refreshAccessToken(account.refresh_token);
        const expiryDate = newTokens.expiry_date
            ? new Date(newTokens.expiry_date).toISOString()
            : new Date(Date.now() + 3600 * 1000).toISOString();

        await updateAccountTokens(
            accountId,
            newTokens.access_token,
            newTokens.refresh_token || account.refresh_token,
            expiryDate
        );
    } catch (error) {
        console.error('Error al refrescar el token:', error);
        throw error;
    }
}

ipcMain.handle('sync-all-channels', async (event) => {
    try {
        const accounts = await getAll('accounts');

        for (const account of accounts) {
            await syncAccount(account.id);
        }

        return { success: true };
    } catch (error) {
        console.error('Error al sincronizar todos los canales:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('sync-account', async (event, accountId) => {
    try {
        await syncAccount(accountId);
        return { success: true };
    } catch (error) {
        console.error('Error al sincronizar la cuenta:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('sync-channel', async (event, channelId) => {
    try {
        await syncChannel(channelId);
        return { success: true };
    } catch (error) {
        console.error('Error al sincronizar el canal:', error);
        return { success: false, error: error.message };
    }
});

async function syncAccount(accountId) {
    const account = await get('accounts', accountId);

    if (!account || !account.access_token) {
        throw new Error('Cuenta no encontrada o no autenticada');
    }

    if (!await checkTokenValidity(account.access_token, account.token_expiry)) {
        await refreshToken(accountId);
    }

    const channelList = await getChannelInfo(account.access_token);

    if (!channelList || channelList.length === 0) {
        throw new Error('No se encontraron canales para esta cuenta');
    }

    for (const channelInfo of channelList) {
        const existingChannel = await getChannelByYoutubeId(channelInfo.id);

        const channelData = {
            youtube_channel_id: channelInfo.id,
            name: channelInfo.snippet.title,
            account_id: accountId,
            subscribers: channelInfo.statistics.subscriberCount,
            views: channelInfo.statistics.viewCount,
            language: channelInfo.snippet.defaultLanguage || 'unknown'
        };

        let channelId;
        if (!existingChannel) {
            channelId = await insert('channels', channelData);
        } else {
            const updatedChannelData = { ...channelData };
            delete updatedChannelData.language; // Esto evitará que se actualice el idioma
            await update('channels', existingChannel.id, updatedChannelData);
            channelId = existingChannel.id;
        }

        await syncChannel(channelId);
    }
}

async function syncChannel(channelId) {
    const channel = await get('channels', channelId);

    if (!channel) {
        throw new Error('Canal no encontrado');
    }

    const account = await get('accounts', channel.account_id);

    if (!account || !account.access_token) {
        throw new Error('Cuenta no encontrada o no autenticada');
    }

    if (!await checkTokenValidity(account.access_token, account.token_expiry)) {
        await refreshToken(account.id);
    }

    const videos = await getVideosForChannel(account.access_token, channel.youtube_channel_id);

    for (const videoInfo of videos) {
        const existingVideo = await getVideoByYoutubeId(videoInfo.id);

        const languageCode = videoInfo.snippet.defaultLanguage || videoInfo.snippet.defaultAudioLanguage || channel.language;
        const language = await getLanguageByCode(languageCode);

        const videoData = {
            youtube_video_id: videoInfo.id,
            title: videoInfo.snippet.title,
            channel_id: channelId,
            views: videoInfo.statistics.viewCount,
            publish_date: videoInfo.snippet.publishedAt,
            description: videoInfo.snippet.description,
            tags: videoInfo.snippet.tags ? videoInfo.snippet.tags.join(',') : '',
            category_id: videoInfo.snippet.categoryId,
            default_language: language ? language.id : null,
            visibility_id: getVisibilityId(videoInfo.status.privacyStatus),
            thumbnail_remote: videoInfo.snippet.thumbnails.default ? videoInfo.snippet.thumbnails.default.url : null,
            kids: videoInfo.status.madeForKids
        };

        if (!existingVideo) {
            const localId = videoInfo.snippet.title.split(/[\s\-_]/)[0]; // Toma la primera palabra del título
            const newVideoData = {
                ...videoData,
                local_id: localId
            };
            const insertedId = await insert('videos', newVideoData);
            await update('videos', insertedId, { local_id: localId.toString() });
        } else {
            await update('videos', existingVideo.id, videoData);
        }
    }
}




function getVisibilityId(privacyStatus) {
    switch (privacyStatus) {
        case 'public':
            return 1;
        case 'private':
            return 2;
        case 'unlisted':
            return 3;
        default:
            return 1;
    }
}

async function getUserInfo(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    if (!response.ok) {
        throw new Error('Failed to fetch user info');
    }
    return response.json();
}

ipcMain.handle('update-config', async (event, newConfig) => {
    try {
        await updateConfig(newConfig);
        await initializeGoogleAuth();
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar la configuración:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('select-file', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile']
    });

    if (result.canceled) {
        return null;
    } else {
        return result.filePaths[0];
    }
});

ipcMain.handle('select-directory', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (result.canceled) {
        return null;
    } else {
        return result.filePaths[0];
    }
});

ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
        await shell.openPath(folderPath);
        return { success: true };
    } catch (error) {
        console.error('Error opening folder:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('auto-assign-files', async (event) => {
    try {
        const config = await getAll('config');
        const globalVideoPath = config[0]?.global_video_path;

        if (!globalVideoPath) {
            throw new Error('Global video path not set');
        }

        const files = await fs.readdir(globalVideoPath);
        const videoFiles = files.filter(file => file.endsWith('.mp4'));

        const channels = await getAll('channels');
        const languages = await getAll('languages');

        for (const file of videoFiles) {
            const match = file.match(/^(.+)-(.+)\.mp4$/);
            if (match) {
                const [, localId, channelName] = match;
                const trimmedLocalId = localId.trim();
                const trimmedChannelName = channelName.trim();

                const channel = channels.find(c => c.name.toLowerCase() === trimmedChannelName.toLowerCase());
                if (!channel) {
                    console.warn(`Channel not found for name: ${trimmedChannelName}`);
                    continue;
                }

                const languageId = languages.find(l => l.code === channel.language)?.id;

                let video = await getVideoByLocalIdAndChannel(trimmedLocalId, channel.id);

                if (!video) {
                    const newVideoData = {
                        local_id: trimmedLocalId,
                        title: file.replace('.mp4', ''),
                        channel_id: channel.id,
                        visibility_id: 2,
                        kids: false,
                        category_id: 20,
                        default_language: languageId,
                        local_path: path.join(globalVideoPath, file)
                    };
                    const newVideoId = await insert('videos', newVideoData);
                    video = { id: newVideoId, ...newVideoData };
                } else {
                    await update('videos', video.id, {
                        channel_id: channel.id,
                        default_language: languageId,
                        local_path: path.join(globalVideoPath, file)
                    });
                }

                const thumbnailPath = await findThumbnail(trimmedLocalId, trimmedChannelName, globalVideoPath);
                if (thumbnailPath) {
                    await update('videos', video.id, { thumbnail_path: thumbnailPath });
                }
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Error auto-assigning files:', error);
        return { success: false, error: error.message };
    }
});

async function findThumbnail(localId, channelName, globalVideoPath) {
    const possibleExtensions = ['.jpg', '.png'];
    const specificThumbnail = possibleExtensions.map(ext => `${localId}-${channelName}${ext}`);

    const allFiles = await fs.readdir(globalVideoPath);

    for (const thumbnail of specificThumbnail) {
        if (allFiles.includes(thumbnail)) {
            return path.join(globalVideoPath, thumbnail);
        }
    }

    return null;
}

ipcMain.handle('update-youtube-video', async (event, videoId, uploadThumbnail) => {
    console.log('main.js uploadThumbnail:', uploadThumbnail);
    try {
        const video = await get('videos', videoId);
        if (!video) {
            throw new Error('Video not found');
        }

        const channel = await get('channels', video.channel_id);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const account = await get('accounts', channel.account_id);
        if (!account || !account.access_token) {
            throw new Error('Account not found or not authenticated');
        }

        if (!await checkTokenValidity(account.access_token, account.token_expiry)) {
            await refreshToken(account.id);
        }

        try {
            await updateVideoDetails(account.access_token, video, uploadThumbnail);
            console.log(`Successfully updated video ${videoId}`);
            return { success: true };
        } catch (updateError) {
            console.error(`Error updating video ${videoId}:`, updateError);
            if (updateError.message.includes('quotaExceeded')) {
                quotaExceeded = true;
                return { success: false, error: 'YouTube API quota exceeded' };
            }
            return {
                success: false,
                error: updateError.message || updateError.errors?.[0]?.message || 'Unknown error occurred'
            };
        }
    } catch (error) {
        console.error(`Fatal error updating video ${videoId}:`, error);
        return { success: false, error: error.message };
    }
});



ipcMain.handle('upload-youtube-video', async (event, videoId, uploadThumbnail) => {
    try {
        const video = await get('videos', videoId);
        if (!video) {
            throw new Error('Video not found');
        }

        const channel = await get('channels', video.channel_id);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const account = await get('accounts', channel.account_id);
        if (!account || !account.access_token) {
            throw new Error('Account not found or not authenticated');
        }

        if (!await checkTokenValidity(account.access_token, account.token_expiry)) {
            await refreshToken(account.id);
        }

        const result = await insertVideo(account.access_token, video);

        await update('videos', videoId, { youtube_video_id: result.id });
        event.sender.send('upload-complete', videoId, result.id);

        return { success: true, youtube_video_id: result.id };
    } catch (error) {
        console.error('Error uploading video:', error);
        event.sender.send('upload-error', videoId, error.message);
        return { success: false, error: error.message };
    }
});

async function processUploadQueue() {
    if (uploadQueue.length === 0) {
        isUploading = false;
        return;
    }

    isUploading = true;
    const { videoId, uploadThumbnail } = uploadQueue[0];

    try {
        const video = await get('videos', videoId);
        const channel = await get('channels', video.channel_id);
        const account = await get('accounts', channel.account_id);

        const result = await insertVideo(account.access_token, video, (progress) => {
            mainWindow.webContents.send('upload-progress', videoId, progress);
        });

        if (uploadThumbnail && video.thumbnail_path) {
            await updateThumbnail(account.access_token, result.id, video.thumbnail_path);
        }

        await update('videos', videoId, { youtube_video_id: result.id });
        mainWindow.webContents.send('upload-complete', videoId);
    } catch (error) {
        console.error('Error uploading video:', error);
        if (error.message.includes('quota') || (error.errors && error.errors[0] && error.errors[0].reason === 'quotaExceeded')) {
            mainWindow.webContents.send('quota-exceeded', videoId);
            isUploading = false;
            return;
        } else {
            mainWindow.webContents.send('upload-error', videoId, error.message);
        }
    }

    uploadQueue.shift();
    processUploadQueue();
}

ipcMain.on('pause-upload', (event, videoId) => {
    const index = uploadQueue.findIndex(item => item.videoId === videoId);
    if (index !== -1) {
        const item = uploadQueue.splice(index, 1)[0];
        uploadQueue.push(item);
    }
});

ipcMain.on('resume-upload', (event, videoId) => {
    const index = uploadQueue.findIndex(item => item.videoId === videoId);
    if (index !== -1) {
        const item = uploadQueue.splice(index, 1)[0];
        uploadQueue.unshift(item);
    }
});

ipcMain.on('cancel-upload', (event, videoId) => {
    const index = uploadQueue.findIndex(item => item.videoId === videoId);
    if (index !== -1) {
        uploadQueue.splice(index, 1);
    }
});

async function updateThumbnail(accessToken, videoId, thumbnailPath) {
    const youtube = google.youtube({ version: 'v3', auth: accessToken });
    await youtube.thumbnails.set({
        videoId: videoId,
        media: {
            body: fs.createReadStream(thumbnailPath)
        }
    });
}

ipcMain.handle('save-filters', async (event, tableId, filters) => {
    try {
        const filtersPath = path.join(app.getPath('userData'), 'saved_by_user', 'filters.json');
        let allFilters = {};
        try {
            const fileContent = await fs.readFile(filtersPath, 'utf-8');
            allFilters = JSON.parse(fileContent);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        allFilters[tableId] = filters;
        await fs.writeFile(filtersPath, JSON.stringify(allFilters, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Error saving filters:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-filters', async (event, tableId) => {
    try {
        const filtersPath = path.join(app.getPath('userData'), 'saved_by_user', 'filters.json');
        const fileContent = await fs.readFile(filtersPath, 'utf-8');
        const allFilters = JSON.parse(fileContent);
        return allFilters[tableId] || null;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        console.error('Error loading filters:', error);
        throw error;
    }
});

ipcMain.handle('save-column-order', async (event, tableId, columnOrder) => {
    try {
        const columnOrderPath = path.join(app.getPath('userData'), 'saved_by_user', 'columnOrder.json');
        let allColumnOrders = {};
        try {
            const fileContent = await fs.readFile(columnOrderPath, 'utf-8');
            allColumnOrders = JSON.parse(fileContent);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        allColumnOrders[tableId] = columnOrder;
        await fs.writeFile(columnOrderPath, JSON.stringify(allColumnOrders, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Error saving column order:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-column-order', async (event, tableId) => {
    try {
        const columnOrderPath = path.join(app.getPath('userData'), 'saved_by_user', 'columnOrder.json');
        const fileContent = await fs.readFile(columnOrderPath, 'utf-8');
        const allColumnOrders = JSON.parse(fileContent);
        return allColumnOrders[tableId] || null;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        console.error('Error loading column order:', error);
        throw error;
    }
});

ipcMain.handle('delete-local-data', async (event) => {
    try {
        const savedByUserPath = path.join(app.getPath('userData'), 'saved_by_user');
        await fs.rm(savedByUserPath, { recursive: true, force: true });
        await ensureSavedByUserDirectory();
        return { success: true };
    } catch (error) {
        console.error('Error deleting local data:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('bulk-upload-videos', async (event, videoIds) => {
    try {
        quotaExceeded = false;
        for (const videoId of videoIds) {
            if (quotaExceeded) {
                break;
            }
            await ipcMain.handle('upload-youtube-video', event, videoId, true);
        }
        return { success: true };
    } catch (error) {
        console.error('Error en la carga masiva de videos:', error);
        return { success: false, error: error.message };
    }
});

function handleQuotaExceeded() {
    isUploading = false;
    quotaExceeded = true;
    mainWindow.webContents.send('quota-exceeded');
}

ipcMain.handle('get-video', async (event, videoId) => {
    return await get('videos', videoId);
});

ipcMain.handle('update-video', async (event, videoId, data) => {
    return await update('videos', videoId, data);
});

ipcMain.handle('save-image', async (event, buffer, filePath) => {
    try {
        await fs.writeFile(filePath, Buffer.from(buffer));
        return { success: true };
    } catch (error) {
        console.error('Error guardando la imagen:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.on('open-downloader', (event, videoId) => {
    const downloaderWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    downloaderWindow.loadFile('download.html');
    downloaderWindow.webContents.on('did-finish-load', () => {
        downloaderWindow.webContents.send('init-downloader', videoId);
    });
});




let activeDownload = null;

ipcMain.handle('start-video-download', async (event, url, filePath) => {
    if (activeDownload) {
        return { success: false, error: 'Download already in progress' };
    }

    return new Promise((resolve, reject) => {
        const fileStream = fsSync.createWriteStream(filePath);
        const request = https.get(url, (response) => {
            const totalBytes = parseInt(response.headers['content-length'], 10);
            let downloadedBytes = 0;

            response.on('data', (chunk) => {
                if (!activeDownload) {
                    fileStream.close();
                    response.destroy();
                    resolve({ success: false, error: 'Download cancelled' });
                    return;
                }

                downloadedBytes += chunk.length;
                fileStream.write(chunk);

                const progress = Math.round((downloadedBytes / totalBytes) * 100);
                event.sender.send('download-progress', { filePath, progress });
            });

            response.on('end', () => {
                fileStream.end();
                activeDownload = null;
                console.log('Download completed');
                resolve({ success: true });
            });
        });

        request.on('error', (err) => {
            console.error('Error during download:', err);
            fileStream.close();
            fsSync.unlink(filePath, () => { });
            activeDownload = null;
            reject(err);
        });

        activeDownload = {
            cancel: () => {
                request.abort();
                fileStream.close();
                fsSync.unlink(filePath, () => { });
                activeDownload = null;
                resolve({ success: false, error: 'Download cancelled' });
            }
        };
    });
});

ipcMain.handle('cancel-download', async (event) => {
    if (activeDownload) {
        activeDownload.cancel();
        return { success: true };
    }
    return { success: false, error: 'No active download' };
});

ipcMain.handle('get-language-by-code', async (event, code) => {
    return await getLanguageByCode(code);
});


ipcMain.handle('select-database-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }]
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('save-database-file', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        defaultPath: 'youtube_manager_backup.db'
    });
    return result.canceled ? null : result.filePath;
});

ipcMain.handle('import-database', async (event, filePath) => {
    try {
        const backupPath = app.getPath('userData') + '/youtube_manager.db.bak';
        await fs.copyFile('youtube_manager.db', backupPath);
        await fs.copyFile(filePath, 'youtube_manager.db');
        return { success: true };
    } catch (error) {
        console.error('Error importing database:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-database', async (event, filePath) => {
    try {
        await fs.copyFile('youtube_manager.db', filePath);
        return { success: true };
    } catch (error) {
        console.error('Error exporting database:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('close-app', () => {
    app.quit();
});


module.exports = { createWindow };