const axios = require('axios');
const { getConfigValue, getLanguageByCode } = require('./database.js');

const GPT_API_URL = 'https://api.openai.com/v1/chat/completions';

async function getGPTApiKey() {
    return await getConfigValue('gpt_api_key');
}

async function translateWithGPT(videoData, targetLanguage) {
    const apiKey = await getGPTApiKey();
    const language = await getLanguageByCode(targetLanguage);
    const languageName = language ? language.name : 'English';

    const promptContent = `
    Translate the following video content to ${languageName}. 
    Provide the translation in the same format, keeping the brackets:

    [TITLE]
    ${videoData.title}
    [/TITLE]

    [DESCRIPTION]
    ${videoData.description}
    [/DESCRIPTION]

    [THUMBNAIL_TEXT]
    ${videoData.thumbnail_text || ''}
    [/THUMBNAIL_TEXT]

    [TAGS]
    ${videoData.tags || ''}
    [/TAGS]

    Only include the translation within the corresponding brackets. Do not add any additional text.
    `;

    try {
        const response = await axios.post(GPT_API_URL, {
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a professional translator. Translate the content exactly as requested, without adding any additional text."
                },
                {
                    role: "user",
                    content: promptContent
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error in GPT translation:', error);
        throw error;
    }
}

module.exports = {
    translateWithGPT
};
