const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.js');
const { handlePlay } = require('./utils/play.js');
const { searchYouTube } = require('./utils/youtube.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase().startsWith('babe play ')) {
    const songTitle = message.content.slice(10);
    const videoUrl = await searchYouTube(songTitle);
    if (videoUrl) {
      await handlePlay(message, videoUrl);
    } else {
      await message.reply('Sorry, I couldn\'t find that song on YouTube.');
    }
  }
});

client.login(token);