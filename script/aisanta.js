const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "aisanta",
  version: "1.0.1", // Updated version to reflect changes
  role: 0,
  credits: "selov",
  description: "AI with voice response (audio only)",
  commandCategory: "ai",
  usages: "/aisanta <question>", // Changed usage to aisanta
  cooldowns: 5,
  aliases: ["santa", "santaai"]
};

// Store user sessions
if (!global.aiv3Memory) global.aiv3Memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  let prompt = args.join(" ").trim();

  if (!prompt) {
    return api.sendMessage("Please provide a question for Santa! Usage: /aisanta <your question>", threadID, messageID);
  }

  // Show typing indicator
  api.sendTypingIndicator(threadID, true);

  let audioPath = null; // Initialize audioPath to null

  try {
    // Step 1: Get AI response from ChatGPT API
    const aiUrl = `https://pasayloakomego.onrender.com/api/Chatgpt?prompt=${encodeURIComponent(prompt)}&uid=${senderID}`;
    
    const aiResponse = await axios.get(aiUrl, { timeout: 20000 });
    
    let aiText = aiResponse.data?.response || 
                 aiResponse.data?.answer || 
                 "Sorry, I couldn't process that request from the AI.";
    
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
    
    // Step 2: Convert AI response to TTS
    const ttsUrl = `https://pasayloakomego.onrender.com/api/svara/tts?text=${encodeURIComponent(aiText)}&voice=Santa`;
    
    const ttsResponse = await axios.get(ttsUrl, { timeout: 30000 });
    
    const audioUrl = ttsResponse.data?.audio_url;
    
    if (!audioUrl) {
      throw new Error("No audio URL received from TTS API.");
    }
    
    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "aisanta"); // Changed directory name to aisanta
    await fs.ensureDir(cacheDir);
    
    audioPath = path.join(cacheDir, `aisanta_${Date.now()}.wav`); // Changed file name to aisanta
    
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
      throw new Error("Downloaded audio file is empty.");
    }
    
    // Send ONLY audio (no text message)
    api.sendMessage({
      attachment: fs.createReadStream(audioPath)
    }, threadID, (err) => {
      if (err) {
        console.error("Error sending audio message:", err);
        api.sendMessage("Sorry, I encountered an error while sending the audio.", threadID, messageID);
      }
      // Clean up file after sending or if there was an error sending
      if (audioPath && fs.existsSync(audioPath)) {
        fs.unlink(audioPath, (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting audio file:", unlinkErr);
        });
      }
    }, messageID);
    
  } catch (err) {
    console.error("AI Santa Error:", err);
    api.sendMessage(`Oops! Santa encountered an issue: ${err.message}. Please try again later.`, threadID, messageID);
    
    // Ensure cleanup even if an error occurs before sending the message
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlink(audioPath, (unlinkErr) => {
        if (unlinkErr) console.error("Error deleting audio file after error:", unlinkErr);
      });
    }
  }
};
