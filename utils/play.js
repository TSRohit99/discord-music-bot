const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const ytdl= require("@distube/ytdl-core");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

let isPlaying = false;
let currentPlayer = null;
let currentMessage = null;

module.exports = {
  async handlePlay(message, videoUrl) {
    if (isPlaying) {
      return message.channel.send('A song is already playing. Please wait for it to finish.');
    }
    const channel = message.member.voice.channel;
    if (!channel) {
      return message.channel.send('You need to be in a voice channel to use this command!');
    }
    try {
      isPlaying = true;
      console.log('Joining voice channel...');
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      // Create buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('pause')
            .setLabel('Pause')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('resume')
            .setLabel('Resume')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('terminate')
            .setLabel('Terminate')
            .setStyle(ButtonStyle.Danger)
        );

      // Send message with buttons
      currentMessage = await message.channel.send({
        content: `Now playing: ${videoUrl}`,
        components: [row]
      });

      console.log('Fetching the stream...');
      const stream = await ytdl(videoUrl, { filter: 'audioonly' });
      if (stream) {
        console.log('Stream fetched successfully');
      } else {
        console.log('Failed to fetch stream');
      }

      const resource = createAudioResource(stream);
      const player = createAudioPlayer();
      currentPlayer = player;
      player.play(resource);
      connection.subscribe(player);

      connection.on(VoiceConnectionStatus.Ready, () => {
        console.log('Bot connected to the voice channel successfully!');
        connection.subscribe(player);
      });

      player.on(AudioPlayerStatus.Playing, () => {
        console.log('The audio player has started playing!');
      });

      player.on(AudioPlayerStatus.Idle, () => {
        console.log('The audio player has finished playing!');
        connection.destroy();
        isPlaying = false;
        if (currentMessage) {
          currentMessage.edit({ components: [] });
        }
      });

      player.on('error', error => {
        console.error('Error occurred during playback:', error);
        message.channel.send(`An error occurred while playing the audio: ${error.message}`);
        isPlaying = false;
        if (currentMessage) {
          currentMessage.edit({ components: [] });
        }
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          console.log('Bot disconnected from the voice channel, trying to reconnect...');
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          console.log('Failed to reconnect, destroying the connection.');
          connection.destroy();
          isPlaying = false;
          if (currentMessage) {
            currentMessage.edit({ components: [] });
          }
        }
      });

      // Handle button interactions
      const filter = i => ['pause', 'resume', 'terminate'].includes(i.customId) && i.user.id === message.author.id;
      const collector = currentMessage.createMessageComponentCollector({ filter, time: 3600000 }); // 1 hour

      collector.on('collect', async i => {
        if (i.customId === 'pause') {
          player.pause();
          await i.reply('Paused the music.');
        } else if (i.customId === 'resume') {
          player.unpause();
          await i.reply('Resumed the music.');
        } else if (i.customId === 'terminate') {
          player.stop();
          connection.destroy();
          isPlaying = false;
          await i.reply('Terminated the music playback.');
          currentMessage.edit({ components: [] });
        }
      });

    } catch (error) {
      console.error('Error in handlePlay:', error.message);
      await message.channel.send(`An error occurred: ${error.message}`);
      isPlaying = false;
    }
  }
};