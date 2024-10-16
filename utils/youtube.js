const { google } = require('googleapis');
const { youtubeApiKey } = require('../config.js');

const youtube = google.youtube({
  version: 'v3',
  auth: youtubeApiKey,
});

async function searchYouTube(query) {
  try {
    const response = await youtube.search.list({
      part: 'id',
      q: query,
      type: 'video',
      maxResults: 1,
    });

    if (response.data.items.length > 0) {
      return `https://www.youtube.com/watch?v=${response.data.items[0].id.videoId}`;
    }
    return null;
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
}

module.exports = { searchYouTube };