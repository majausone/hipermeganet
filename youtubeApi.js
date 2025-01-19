const { google } = require('googleapis');
const fs = require('fs');
const { getAll, get } = require('./database.js');
const { createNewOAuth2Client } = require('./googleAuth.js');

async function getChannelInfo(accessToken) {
    const oauth2Client = await createNewOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
    });

    try {
        const response = await youtube.channels.list({
            part: 'snippet,statistics',
            mine: true
        });
        return response.data.items;
    } catch (error) {
        console.error('Error getting channel info:', error);
        throw error;
    }
}

async function getVideosForChannel(accessToken, channelId) {
    const oauth2Client = await createNewOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
    });

    try {
        const channelResponse = await youtube.channels.list({
            part: 'contentDetails',
            id: channelId
        });

        const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

        const videoResponse = await youtube.playlistItems.list({
            part: 'snippet,contentDetails',
            playlistId: uploadsPlaylistId,
            maxResults: 50
        });

        const videoIds = videoResponse.data.items.map(item => item.contentDetails.videoId);

        const videoDetails = await youtube.videos.list({
            part: 'snippet,statistics,status',
            id: videoIds.join(',')
        });

        return videoDetails.data.items;
    } catch (error) {
        console.error('Error getting videos for channel:', error);
        throw error;
    }
}

async function updateVideoDetails(accessToken, videoData, uploadThumbnail) {
    console.log('youtubeApi.js uploadThumbnail:', uploadThumbnail);
    const oauth2Client = await createNewOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
    });

    const languageCode = await getLanguageCode(videoData.default_language);
    const response = await youtube.videos.update({
        part: 'snippet,status',
        requestBody: {
            id: videoData.youtube_video_id,
            snippet: {
                title: videoData.title.substring(0, 100),
                description: videoData.description,
                tags: videoData.tags ? videoData.tags.split(',').map(tag => tag.trim()) : [],
                categoryId: videoData.category_id.toString(),
                defaultAudioLanguage: languageCode
            },
            status: {
                privacyStatus: getPrivacyStatus(videoData.visibility_id),
                selfDeclaredMadeForKids: (videoData.kids === 1 || videoData.kids === true || videoData.kids === 'true')
            }
        }
    });

    if (uploadThumbnail && videoData.thumbnail_path) {
        await youtube.thumbnails.set({
            videoId: videoData.youtube_video_id,
            media: {
                body: fs.createReadStream(videoData.thumbnail_path)
            }
        });
    }

    return response.data;
}



async function insertVideo(accessToken, videoData) {
    const oauth2Client = await createNewOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
    });

    try {
        const languageCode = await getLanguageCode(videoData.default_language);
        const response = await youtube.videos.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: videoData.title.substring(0, 100),
                    description: videoData.description,
                    tags: videoData.tags ? videoData.tags.split(',').map(tag => tag.trim()) : [],
                    categoryId: videoData.category_id.toString(),
                    defaultAudioLanguage: languageCode
                },
                status: {
                    privacyStatus: getPrivacyStatus(videoData.visibility_id),
                    selfDeclaredMadeForKids: (videoData.kids === 1 || videoData.kids === true || videoData.kids === 'true')
                }
            },
            media: {
                body: fs.createReadStream(videoData.local_path)
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error inserting video:', error);
        throw error;
    }
}

async function getLanguageCode(languageId) {
    try {
        const language = await get('languages', languageId);
        return language ? language.code : 'en';
    } catch (error) {
        console.error('Error getting language code:', error);
        return 'en';
    }
}

function getPrivacyStatus(visibilityId) {
    const visibilityMap = {
        1: 'public',
        2: 'private',
        3: 'unlisted'
    };
    return visibilityMap[visibilityId] || 'private';
}

module.exports = {
    getChannelInfo,
    getVideosForChannel,
    updateVideoDetails,
    insertVideo
};