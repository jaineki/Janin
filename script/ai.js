const axios = require("axios");

module.exports.config = {
  name: "ai",
  version: "5.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "AI that knows your name",
  commandCategory: "search",
  usages: "ai <ask a question>",
  cooldowns: 3
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, attachments, senderID } = event;

  let prompt = args.join(" ").trim();

  try {
    // Get user info
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";
    const firstName = senderName.split(' ')[0];

    // Initialize memory for this thread
    if (!memory[threadID]) {
      memory[threadID] = [];
    }

    // Check image attachment
    if (attachments && attachments.length > 0) {
      const photo = attachments.find(a => a.type === "photo");
      if (photo) {
        prompt = `Describe this image in detail:\n${photo.url}`;
      }
    }

    if (!prompt) {
      return api.sendMessage(
        `📌 Hello ${firstName}! Ask me anything.\n\nUsage: ai <question>\nExample: ai what is your name?`,
        threadID,
        messageID
      );
    }

    // Show typing indicator
    api.sendTypingIndicator(threadID, true);

    // Memory system
    memory[threadID].push(`${senderName}: ${prompt}`);
    const history = memory[threadID].slice(-6).join("\n");
    const fullPrompt = `${history}\nAI:`;

    // Get AI response
    const aiUrl = `https://pasayloakomego.onrender.com/api/chatgptsearch?prompt=${encodeURIComponent(fullPrompt)}`;
    const aiResponse = await axios.get(aiUrl, { timeout: 20000 });

    let replyText = "Sorry, I couldn't process that.";

    if (aiResponse.data) {
      if (typeof aiResponse.data === "string") {
        replyText = aiResponse.data;
      } else {
        replyText = aiResponse.data.result || aiResponse.data.response || 
                    aiResponse.data.message || aiResponse.data.answer || 
                    aiResponse.data.text || "No response";
      }
    }

    replyText = String(replyText).trim();

    if (!replyText || replyText === "") {
      return api.sendMessage("❌ AI returned empty response.", threadID, messageID);
    }

    // Store in memory
    memory[threadID].push(`AI: ${replyText}`);

    // Keep memory manageable
    if (memory[threadID].length > 20) {
      memory[threadID] = memory[threadID].slice(-10);
    }

    // Send response
    api.sendMessage(
      `${replyText}`,
      threadID,
      messageID
    );

  } catch (err) {
    console.error(err);
    api.sendMessage(
      `❌ Error: ${err.message}`,
      threadID,
      messageID
    );
  }
};
