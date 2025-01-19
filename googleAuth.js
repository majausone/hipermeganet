const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { getConfigValue } = require('./database.js');

let oauth2Client;

async function initializeOAuth2Client() {
    const clientId = await getConfigValue('google_client_id');
    const clientSecret = await getConfigValue('google_client_secret');
    const redirectUri = 'urn:ietf:wg:oauth:2.0:oob';

    if (!clientId || !clientSecret) {
        throw new Error('Google client ID or client secret not found in the configuration');
    }

    return new OAuth2Client(clientId, clientSecret, redirectUri);
}

async function createNewOAuth2Client() {
    return await initializeOAuth2Client();
}

async function initializeGoogleAuth() {
    oauth2Client = await initializeOAuth2Client();
}

async function getAuthUrl() {
    if (!oauth2Client) {
        await initializeGoogleAuth();
    }

    const scopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
}

async function getTokensFromCode(code) {
    if (!oauth2Client) {
        await initializeGoogleAuth();
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
}

async function refreshAccessToken(refreshToken) {
    const client = await createNewOAuth2Client();
    client.setCredentials({
        refresh_token: refreshToken
    });

    const { credentials } = await client.refreshAccessToken();
    return credentials;
}

async function checkTokenValidity(accessToken, expiryDate) {
    if (!expiryDate) return false;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const expiryWithMargin = new Date(expiry.getTime() - (5 * 60 * 1000));
    return now < expiryWithMargin;
}

module.exports = {
    initializeGoogleAuth,
    getAuthUrl,
    getTokensFromCode,
    refreshAccessToken,
    checkTokenValidity,
    createNewOAuth2Client
};