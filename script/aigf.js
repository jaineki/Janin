const axios = require("axios");

module.exports.config = {
  name: "aigf",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "talk to your AI girlfriend who knows your name",
  commandCategory: "fun",
  usages: "gf <your message>",
  cooldowns: 3
};

// Memory per thread for conversation context
const girlfriendMemory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  const message = args.join(" ").trim();

  if (!message) {
    return api.sendMessage(
      "💕 AI GIRLFRIEND\n━━━━━━━━━━━━━━━━\n\n" +
      "Talk to your AI girlfriend! She knows your name 💋\n\n" +
      "Usage: gf <your message>\n\n" +
      "Examples:\n" +
      "• gf hi baby\n" +
      "• gf how are you?\n" +
      "• gf i miss you",
      threadID,
      messageID
    );
  }

  try {
    // Get sender info
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "Baby";

    // Send typing indicator
    api.sendTypingIndicator(threadID, (err) => {
      if (err) console.error("Typing indicator error:", err);
    });

    // Initialize memory for this thread if not exists
    if (!girlfriendMemory[threadID]) {
      girlfriendMemory[threadID] = [];
    }

    // Add user's message to memory
    girlfriendMemory[threadID].push(`${senderName}: ${message}`);

    // Keep only last 8 messages for context
    const history = girlfriendMemory[threadID].slice(-8).join("\n");
    
    // Build prompt with name and conversation history
    const enhancedPrompt = `You are a loving, sweet, and flirty AI girlfriend named Lily. You're talking to ${senderName}. Be romantic, caring, and playful. Use emojis occasionally. Keep responses warm and personal. Call them pet names like baby, darling, or sweetie sometimes.\n\nConversation history:\n${history}\n\nLily:`;

    // Call the API
    const apiUrl = `https://pasayloakomego.onrender.com/api/mistral/girlfriend?prompt=${encodeURIComponent(enhancedPrompt)}&uid=${senderID}`;
    
    const response = await axios.get(apiUrl);
    let reply = response.data;

    // Handle response format
    if (typeof reply === "object") {
      reply = reply.response || reply.reply || reply.message || reply.answer || reply.text || JSON.stringify(reply);
    }

    reply = String(reply).trim();

    // Clean up the reply
    reply = reply.replace(/^Lily:\s*/i, '');
    reply = reply.replace(/\s+/g, ' ').trim();

    if (!reply || reply === "") {
      return api.sendMessage(
        "💔 Sorry baby, I'm feeling shy right now. Can you say that again? 🥺",
        threadID,
        messageID
      );
    }

    // Store AI response in memory
    girlfriendMemory[threadID].push(`Lily: ${reply}`);

    // Keep memory manageable
    if (girlfriendMemory[threadID].length > 20) {
      girlfriendMemory[threadID] = girlfriendMemory[threadID].slice(-10);
    }

    // Send only the AI reply
    api.sendMessage(reply, threadID, messageID);

  } catch (err) {
    console.error(err);
    api.sendMessage(
      `💔 Sorry baby, something went wrong. Try again later. 🥺`,
      threadID,
      messageID
    );
  }
};
