const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const express = require('express');
const ytdl = require('@distube/ytdl-core');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require('discord.js');

const PORT = 2321;
const tempDir = path.join(__dirname, 'temp');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const app = express();
app.use('/downloads', express.static(tempDir));
app.listen(PORT, () => console.log(`?? File server running on port ${PORT}`));

module.exports = {
  name: 'yt',
  description: 'Download YouTube video as MP4 with audio (5 min expiry)',
  async execute(message, args) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents([text]);
      return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    const url = args[0];
    if (!url || !ytdl.validateURL(url)) {
      return sendReply('Please provide a valid YouTube video link.', true);
    }

    try {
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title
        .replace(/[^\w\s-]/gi, '')
        .replace(/\s+/g, '_');
      const timestamp = Date.now();
      const videoPath = path.join(tempDir, `${timestamp}_${title}_video.mp4`);
      const audioPath = path.join(tempDir, `${timestamp}_${title}_audio.mp3`);
      const outputPath = path.join(tempDir, `${timestamp}_${title}.mp4`);

      await sendReply('⬇️ Downloading YouTube video... Please wait.');

      await new Promise((resolve, reject) => {
        const videoStream = ytdl(url, { quality: 'highestvideo' });
        const videoWrite = fs.createWriteStream(videoPath);
        videoStream.pipe(videoWrite);
        videoWrite.on('finish', resolve);
        videoWrite.on('error', reject);
        videoStream.on('error', reject);
      });

      await new Promise((resolve, reject) => {
        const audioStream = ytdl(url, { quality: 'highestaudio' });
        const audioWrite = fs.createWriteStream(audioPath);
        audioStream.pipe(audioWrite);
        audioWrite.on('finish', resolve);
        audioWrite.on('error', reject);
        audioStream.on('error', reject);
      });

      await new Promise((resolve, reject) => {
        const ffmpegCmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac "${outputPath}"`;
        exec(ffmpegCmd, (error) => {
          if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
          if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
          if (error) return reject(error);
          resolve();
        });
      });

      const downloadURL = `http://Nextdownloader.kozow.com:${PORT}/downloads/${path.basename(outputPath)}`;

      const linkText = new TextDisplayBuilder().setContent(
        `?? Your YouTube video is ready!\n\n[Click here to download your video](${downloadURL})\n\n⏳ This link expires in 5 minutes.`
      );
      const container = new ContainerBuilder().addTextDisplayComponents([linkText]);
      const sentMsg = await message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

      setTimeout(async () => {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        const expiredText = new TextDisplayBuilder().setContent(
          '⏳ Link Expired\n\nThe download link has expired. Please run the command again to get a new link.'
        );
        const expiredContainer = new ContainerBuilder().addTextDisplayComponents([expiredText]);

        try {
          await sentMsg.edit({ flags: MessageFlags.IsComponentsV2, components: [expiredContainer] });
        } catch {
          // ignore if already deleted
        }
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Error:', error);
      return sendReply('Failed to download or process the video. Please try again later.', true);
    }
  },
};
