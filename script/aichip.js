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
        prompt = `Please describe what you see in this ${mediaType}. Describe the scene, objects, people, actions, colors, and any text visible. Be detailed and descriptive.`;
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
      mediaUrl ? `🎬 Analyzing ${mediaType}... This may take a moment.` : "🤔 Thinking... Please wait.",
      threadID
    );

    // Get sender name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Build API URL with stronger prompt for media
    const apiKey = "d48ff6e54c518a8ff88fb11b6aa938508e5d4fb65479d8605527a95375ad7faa";
    
    let finalPrompt = prompt;
    
    // If media is present, enhance the prompt to force description
    if (mediaUrl) {
      finalPrompt = `Analyze this ${mediaType} and provide a detailed description. Describe exactly what you see: the setting, objects, people, actions, colors, mood, and any notable details. Do NOT return a URL or link. Give only the description in plain text. Question: ${prompt}`;
    }
    
    let apiUrl;
    
    if (mediaUrl) {
      // With media
      apiUrl = `https://apiremake-production.up.railway.app/api/chipp?ask=${encodeURIComponent(finalPrompt)}&uid=${senderID}&roleplay=&img_url=${encodeURIComponent(mediaUrl)}&api_key=${apiKey}`;
    } else {
      // Text only
      apiUrl = `https://apiremake-production.up.railway.app/api/chipp?ask=${encodeURIComponent(finalPrompt)}&uid=${senderID}&roleplay=&api_key=${apiKey}`;
    }

    // Call the API
    const response = await axios.get(apiUrl);
    
    let reply = response.data;

    // Handle JSON response
    if (typeof reply === "string") {
      try {
        reply = JSON.parse(reply);
      } catch (e) {
        // Not JSON, keep as string
      }
    }

    // Extract the actual answer
    if (reply && typeof reply === "object") {
      reply = reply.answer || reply.response || reply.reply || reply.message || reply.result || reply.text || "";
    }

    reply = String(reply).trim();

    // FIX: Remove any URLs from the response
    reply = reply.replace(/https?:\/\/[^\s]+/g, '');
    reply = reply.replace(/http?:\/\/[^\s]+/g, '');
    
    // Clean up extra spaces from URL removal
    reply = reply.replace(/\s+/g, ' ').trim();

    // Format into paragraphs (split by double newline or period-space)
    if (!reply.includes('\n\n')) {
      // Split long text into paragraphs every 2-3 sentences
      const sentences = reply.split('. ');
      let paragraphs = [];
      let currentPara = [];
      
      for (let i = 0; i < sentences.length; i++) {
        currentPara.push(sentences[i]);
        
        if (currentPara.length >= 3 || i === sentences.length - 1) {
          paragraphs.push(currentPara.join('. ') + (i === sentences.length - 1 ? '' : '.'));
          currentPara = [];
        }
      }
      
      reply = paragraphs.join('\n\n');
    }

    if (!reply || reply === "") {
      return api.editMessage(
        "❌ AI couldn't generate a description. Try again with a different video or question.",
        processingMsg.messageID,
        threadID
      );
    }

    // Build response message
    let responseMessage = `🤖 AI CHIP ANALYSIS\n━━━━━━━━━━━━━━━━\n\n`;
    
    if (mediaUrl) {
      responseMessage += `📹 Video Description:\n\n`;
    }
    
    responseMessage += `${reply}\n\n━━━━━━━━━━━━━━━━`;

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
