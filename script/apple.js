const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "apple",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Download Apple Music previews (silent mode)",
  commandCategory: "music",
  usages: "apple <song name>",
  cooldowns: 2
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const query = args.join(" ").trim();

  try {
    // Get sender name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} requested: ${query}`);

    if (!query) {
      return; // Silent fail - no message
    }

    // Show typing indicator instead of messages
    api.sendTypingIndicator(threadID, true);

    // Your working API with limit 1 for first result only
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/shazam?title=${encodeURIComponent(query)}&limit=1`;
    
    const res = await axios.get(apiUrl);
    const tracks = res.data.results;

    if (!tracks || tracks.length === 0) {
      return; // Silent fail - no message
    }

    // Get the first track
    const track = tracks[0];
    
    // Check if preview URL exists
    if (!track.previewUrl) {
      return; // Silent fail - no message
    }

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download the preview audio
    const audioPath = path.join(cacheDir, `apple_${Date.now()}.m4a`);
    const audioRes = await axios.get(track.previewUrl, { 
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    fs.writeFileSync(audioPath, audioRes.data);

    // Send ONLY the audio - no text, no info
    api.sendMessage({
      attachment: fs.createReadStream(audioPath)
    }, threadID, (err) => {
      if (err) console.error("Error sending audio:", err);
      // Clean up file
      try {
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
      } catch (e) {
        console.error("Error deleting file:", e);
      }
    }, messageID);

    // Store in memory (silent)
    memory[threadID].push(`Downloaded: ${track.title} by ${track.artistName}`);

  } catch (err) {
    console.error("Apple Music Error:", err);
    // Silent fail - no message to user
  }
};
