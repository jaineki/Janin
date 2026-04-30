const axios = require("axios");

module.exports.config = {
  name: "ai",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "AI chat with memory",
  commandCategory: "ai",
  usages: "ai <question>",
  cooldowns: 3
};

const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return api.sendMessage(
      "📌 AI Usage: ai <question>\nExample: ai what model are you?",
      threadID,
      messageID
    );
  }

  try {
    // Get user name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Initialize memory for this thread
    if (!memory[threadID]) memory[threadID] = [];

    // Add user message to memory
    memory[threadID].push(`${senderName}: ${prompt}`);

    // Build conversation history (last 6 messages)
    const history = memory[threadID].slice(-6).join("\n");
    const fullPrompt = `${history}\nAI:`;

    // Call the Gemini API
    const apiUrl = `https://pasayloakomego.onrender.com/api/gemini?prompt=${encodeURIComponent(fullPrompt)}&uid=${senderID}`;
    const response = await axios.get(apiUrl, { timeout: 20000 });

    let reply = response.data;

    // Extract text from response (handle all formats)
    if (typeof reply === "string") {
      // Already a string
    } else if (reply && typeof reply === "object") {
      reply = reply.result || reply.response || reply.message || 
              reply.answer || reply.text || reply.reply || reply.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      reply = "";
    }

    reply = String(reply).trim();

    // Check for empty or error responses
    if (!reply || reply === "" || reply === "[object Object]" || reply.includes("500") || reply.includes("error")) {
      return api.sendMessage("❌ AI is currently unavailable. Please try again later.", threadID, messageID);
    }

    // Store AI response in memory
    memory[threadID].push(`AI: ${reply}`);

    // Keep memory manageable
    if (memory[threadID].length > 20) {
      memory[threadID] = memory[threadID].slice(-10);
    }

    // Send only the answer
    api.sendMessage(reply, threadID, messageID);

  } catch (err) {
    console.error("AI Error:", err.message);
    
    if (err.response?.status === 500) {
      api.sendMessage("❌ AI server is currently down (Error 500). Please try again later.", threadID, messageID);
    } else {
      api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
    }
  }
};
