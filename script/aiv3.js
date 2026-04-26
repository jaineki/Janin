const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "aiv3",
  version: "5.0.0",
  role: 0,
  credits: "selov",
  description: "AI with Tsundere voice TTS (AI response + audio)",
  commandCategory: "ai",
  usages: "/aiv3 <question>",
  cooldowns: 5,
  aliases: ["selov", "voiceai", "aitts"]
};

// Store conversation memory per user
if (!global.aiv3Memory) global.aiv3Memory = {};

// API endpoints
const CHAT_API = "https://pasayloakomego.onrender.com/api/chatgpt"; // Updated Chat API
const TTS_API = "https://pasayloakomego.onrender.com/api/api/ai/tsundere";

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  let prompt = args.join(" ").trim();

  if (!prompt) {
    return; // Silent fail
  }

  // Show typing indicator
  api.sendTypingIndicator(threadID, true);

  try {
    // Step 1: Get AI response from ChatGPT API
    const aiUrl = `${CHAT_API}?prompt=${encodeURIComponent(prompt)}&uid=${senderID}`; // Added uid parameter
    
    const aiResponse = await axios.get(aiUrl, { timeout: 30000 });
    
    let aiText = aiResponse.data?.response || 
                 "Sorry, I couldn't process that request.";
    
    // Store in memory
    if (!global.aiv3Memory[senderID]) {
      global.aiv3Memory[senderID] = [];
    }
    global.aiv3Memory[senderID].push({
      prompt: prompt,
      response: aiText,
      timestamp: Date.now()
    });
    
    // Limit memory to last 10
    if (global.aiv3Memory[senderID].length > 10) {
      global.aiv3Memory[senderID].shift();
    }
    
    // Step 2: Convert AI response to Tsundere voice
    const ttsUrl = `${TTS_API}?text=${encodeURIComponent(aiText)}`;
    
    const ttsResponse = await axios.get(ttsUrl, { timeout: 30000 });
    
    // Get audio URL from response
    const audioUrl = ttsResponse.data?.result?.audio || 
                     ttsResponse.data?.audio;
    
    if (!audioUrl) {
      console.log("TTS Response:", JSON.stringify(ttsResponse.data, null, 2));
      throw new Error("No audio URL received");
    }
    
    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "aiv3");
    await fs.ensureDir(cacheDir);
    
    // Determine file extension from URL or default to mp3
    const fileExt = audioUrl.split('.').pop() || 'mp3';
    const audioPath = path.join(cacheDir, `aiv3_${Date.now()}.${fileExt}`);
    
    // Download audio
    const audioResponse = await axios.get(audioUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    fs.writeFileSync(audioPath, audioResponse.data);
    
    // Check file size
    const stats = fs.statSync(audioPath);
    if (stats.size === 0) {
      throw new Error("Downloaded audio file is empty");
    }
    
    // Send ONLY audio
    api.sendMessage({
      attachment: fs.createReadStream(audioPath)
    }, threadID, () => {
      setTimeout(() => {
        try {
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
          }
        } catch (e) {}
      }, 10000);
    }, messageID);
    
  } catch (err) {
    console.error("AIv3 Error:", err);
    // Silent fail - no error message
  }
};
