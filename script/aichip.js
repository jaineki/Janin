const axios = require("axios");

module.exports.config = {
  name: "aichip",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "AI chat with video/image analysis support",
  commandCategory: "ai",
  usages: "/aichip <question> or reply to video/image with /aichip <question>",
  cooldowns: 5
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, messageReply, attachments } = event;

  try {
    let prompt = args.join(" ").trim();
    let mediaUrl = null;
    let mediaType = null;

    // CASE 1: Check if replied to a message with media
    if (messageReply) {
      const repliedAttachment = messageReply.attachments?.[0];
      
      if (repliedAttachment) {
        if (repliedAttachment.type === "video") {
          mediaUrl = repliedAttachment.url;
          mediaType = "video";
        } else if (repliedAttachment.type === "photo") {
          mediaUrl = repliedAttachment.url;
          mediaType = "image";
        } else if (repliedAttachment.type === "animated_image") {
          mediaUrl = repliedAttachment.url;
          mediaType = "gif";
        }
      }
    }

    // CASE 2: Check if the command message itself has media
    if (!mediaUrl && attachments && attachments.length > 0) {
      const firstAttachment = attachments[0];
      
      if (firstAttachment.type === "video") {
        mediaUrl = firstAttachment.url;
        mediaType = "video";
      } else if (firstAttachment.type === "photo") {
        mediaUrl = firstAttachment.url;
        mediaType = "image";
      } else if (firstAttachment.type === "animated_image") {
        mediaUrl = firstAttachment.url;
        mediaType = "gif";
      }
    }

    // If no prompt provided
    if (!prompt) {
      if (mediaUrl) {
        prompt = `Describe this ${mediaType} in detail`;
      } else {
        return api.sendMessage(
          "🤖 AI CHIP - MULTI MODE\n━━━━━━━━━━━━━━━━\n\n" +
          "📝 TEXT CHAT:\n" +
          "/aichip <your question>\n" +
          "Example: /aichip what model are you?\n\n" +
          "📹 VIDEO/IMAGE ANALYSIS:\n" +
          "1. Reply to a video/image\n" +
          "2. Type: /aichip describe this\n\n" +
          "📎 OR send media with caption:\n" +
          "Send video/image with /aichip in caption",
          threadID,
          messageID
        );
      }
    }

    // Send processing message
    const processingMsg = await api.sendMessage(
      mediaUrl ? `🎬 Analyzing ${mediaType}... Please wait.` : "🤔 Thinking... Please wait.",
      threadID
    );

    // Get sender name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Memory system
    if (!memory[threadID]) memory[threadID] = [];
    
    memory[threadID].push(`${senderName}: ${prompt}`);
    const history = memory[threadID].slice(-6).join("\n");
    const fullPrompt = `${history}\nAI:`;

    // Build API URL
    const apiKey = "d48ff6e54c518a8ff88fb11b6aa938508e5d4fb65479d8605527a95375ad7faa";
    
    let apiUrl;
    
    if (mediaUrl) {
      // With media
      apiUrl = `https://apiremake-production.up.railway.app/api/chipp?ask=${encodeURIComponent(fullPrompt)}&uid=${senderID}&roleplay=&img_url=${encodeURIComponent(mediaUrl)}&api_key=${apiKey}`;
    } else {
      // Text only
      apiUrl = `https://apiremake-production.up.railway.app/api/chipp?ask=${encodeURIComponent(fullPrompt)}&uid=${senderID}&roleplay=&api_key=${apiKey}`;
    }

    // Call the API
    const response = await axios.get(apiUrl);
    
    let reply = response.data;

    // Handle different response formats
    if (typeof reply === "object") {
      reply = reply.response || reply.reply || reply.message || reply.result || JSON.stringify(reply);
    }

    if (!reply || reply.trim() === "") {
      return api.editMessage(
        "❌ AI returned empty response. Try again.",
        processingMsg.messageID,
        threadID
      );
    }

    // Store AI response in memory
    memory[threadID].push(`AI: ${reply}`);

    // Keep memory manageable
    if (memory[threadID].length > 20) {
      memory[threadID] = memory[threadID].slice(-10);
    }

    // Build response message
    let responseMessage = `🤖 AI CHIP\n━━━━━━━━━━━━━━━━\n`;
    
    if (mediaUrl) {
      responseMessage += `📹 Analyzing ${mediaType}...\n\n`;
    }
    
    responseMessage += `${reply}\n\n━━━━━━━━━━━━━━━━`;
    
    if (!mediaUrl) {
      responseMessage += `\n💬 Chat memory: ${memory[threadID].length/2} messages`;
    }

    // Edit the processing message with the result
    await api.editMessage(
      responseMessage,
      processingMsg.messageID,
      threadID
    );

  } catch (err) {
    console.error(err);
    api.sendMessage(
      `❌ Error:\n${err.message}`,
      threadID,
      messageID
    );
  }
};
