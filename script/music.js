const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const yts = require('yt-search');

module.exports.config = {
  name: "music",
  version: "1.0.0",
  role: 0,
  credits: "@lianecagara, @Jonell-Magallanes",
  description: "Play and Download YouTube Music",
  commandCategory: "music",
  usages: "/music <song name>",
  cooldowns: 5,
  aliases: ["song", "play"]
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const query = args.join(" ").trim();

  if (!query) {
    return api.sendMessage("❌ Please provide a song name to search.", threadID, messageID);
  }

  // Send processing message
  const processingMsg = await api.sendMessage("🎧 Processing...", threadID);

  try {
    // Search YouTube
    const search = await yts(query);
    if (!search.videos.length) {
      await api.unsendMessage(processingMsg.messageID);
      return api.sendMessage("❌ No results found.", threadID, messageID);
    }

    // Get first video
    const video = search.videos[0];
    const url = video.url;

    // Get download link from API
    const apiUrl = `https://ccproject.serv00.net/ytdl2.php`;
    const res = await axios.get(apiUrl, {
      params: { url }
    });
    
    const { download } = res.data;
    if (!download) throw new Error("No download URL received");

    // Download audio
    const cacheDir = path.join(__dirname, 'cache', 'music');
    await fs.ensureDir(cacheDir);
    
    const fileName = `music_${Date.now()}.mp3`;
    const filePath = path.join(cacheDir, fileName);
    
    const audioRes = await axios({
      method: 'GET',
      url: download,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const writer = fs.createWriteStream(filePath);
    audioRes.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Send music info and audio
    const musicMessage = await api.sendMessage({
      body: `🎵 **Title:** ${video.title}\n` +
            `👤 **Author:** ${video.author.name}\n` +
            `⏱️ **Duration:** ${video.timestamp}\n` +
            `🔗 **URL:** ${video.url}\n\n` +
            `💡 Type "dl" or "download" in reply to get download link.`,
      attachment: fs.createReadStream(filePath)
    }, threadID);

    // Delete processing message
    await api.unsendMessage(processingMsg.messageID);

    // Store for reply handling
    if (!global.musicReplyHandlers) global.musicReplyHandlers = {};
    global.musicReplyHandlers[musicMessage.messageID] = {
      downloadUrl: download,
      fileName: fileName,
      filePath: filePath,
      author: senderID,
      timeout: setTimeout(() => {
        // Auto-cleanup after 5 minutes
        delete global.musicReplyHandlers[musicMessage.messageID];
        fs.unlinkSync(filePath).catch(() => {});
      }, 5 * 60 * 1000)
    };

  } catch (err) {
    console.error('Music command error:', err);
    await api.unsendMessage(processingMsg.messageID);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};

// Handle replies for download link
module.exports.handleReply = async function ({ api, event }) {
  const { threadID, messageID, senderID, body, messageReply } = event;

  if (!messageReply) return;
  
  const repliedMessageID = messageReply.messageID;
  const handlerData = global.musicReplyHandlers?.[repliedMessageID];

  if (!handlerData || handlerData.author !== senderID) return;

  const message = body.toLowerCase().trim();

  if (message === "dl" || message === "download") {
    // Send download link
    const downloadMsg = await api.sendMessage(
      `📥 **Download URL:**\n${handlerData.downloadUrl}`,
      threadID
    );

    // Auto-delete download link after 50 seconds
    setTimeout(async () => {
      try {
        await api.unsendMessage(downloadMsg.messageID);
      } catch (e) {}
    }, 50000);
  }
};
