const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "tiktok",
  version: "1.0.0",
  role: 0,
  credits: "selov",
  description: "Get random TikTok videos",
  usages: "[search term or random]",
  cooldown: 3,
  hasPrefix: true,
};

module.exports.run = async ({ api, event, args }) => {
  api.setMessageReaction("⏳", event.messageID, (err) => {}, true);
  
  const { messageID, threadID } = event;
  const query = args.join(" ").trim();

  try {
    // Option A: Random TikTok API (replace with working URL)
    const apiUrl = query 
      ? `https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}` 
      : `https://tikwm.com/api/feed/list?region=US&count=1`; // Example API

    const response = await axios.get(apiUrl);
    
    // Log to see structure (remove after testing)
    console.log("API Response:", JSON.stringify(response.data, null, 2));

    // Extract video URL based on API response structure
    let videoUrl = null;
    
    // TikWM API example structure
    if (response.data.data && response.data.data.videos) {
      const videos = response.data.data.videos;
      if (videos.length > 0) {
        videoUrl = videos[0].play || videos[0].wmplay;
      }
    } else if (response.data.data && response.data.data[0]) {
      videoUrl = response.data.data[0].play;
    }

    if (!videoUrl) {
      return api.sendMessage("❌ No video found.", threadID, messageID);
    }

    // Download and send video
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const videoPath = path.join(cacheDir, `tiktok_${Date.now()}.mp4`);
    const videoRes = await axios.get(videoUrl, { 
      responseType: "arraybuffer",
      timeout: 60000
    });

    fs.writeFileSync(videoPath, videoRes.data);
    
    api.setMessageReaction("✅", event.messageID, (err) => {}, true);
    
    api.sendMessage(
      {
        body: query ? `🎵 TikTok search: "${query}"` : "🎵 Random TikTok video",
        attachment: fs.createReadStream(videoPath)
      },
      threadID,
      () => {
        try { fs.unlinkSync(videoPath); } catch (e) {}
      },
      messageID
    );

  } catch (err) {
    console.error("TikTok Error:", err);
    api.setMessageReaction("❌", event.messageID, (err) => {}, true);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
