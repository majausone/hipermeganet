const { translateWithGPT } = require('./gptApi.js');

async function translateVideo(video, targetLanguage) {
    try {
        const translatedContent = await translateWithGPT(video, targetLanguage);
        
        const translatedVideo = { ...video };
        
        const titleMatch = translatedContent.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/);
        const descriptionMatch = translatedContent.match(/\[DESCRIPTION\]([\s\S]*?)\[\/DESCRIPTION\]/);
        const thumbnailTextMatch = translatedContent.match(/\[THUMBNAIL_TEXT\]([\s\S]*?)\[\/THUMBNAIL_TEXT\]/);
        const tagsMatch = translatedContent.match(/\[TAGS\]([\s\S]*?)\[\/TAGS\]/);

        if (titleMatch) translatedVideo.title = titleMatch[1].trim();
        if (descriptionMatch) translatedVideo.description = descriptionMatch[1].trim();
        if (thumbnailTextMatch) translatedVideo.thumbnail_text = thumbnailTextMatch[1].trim();
        if (tagsMatch) translatedVideo.tags = tagsMatch[1].trim();

        return translatedVideo;
    } catch (error) {
        console.error('Error al traducir el video:', error);
        throw error;
    }
}

module.exports = {
    translateVideo
};
