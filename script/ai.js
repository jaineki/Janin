const axios = require("axios");

module.exports.config = {
  name: "ai",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "AI that knows your Facebook name and gender",
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
      "🤖 AI Usage: ai <question>\nExample: ai hello",
      threadID,
      messageID
    );
  }

  try {
    // Get Facebook user info
    const userInfo = await api.getUserInfo(senderID);
    const userData = userInfo[senderID];

    const fullName = userData?.name || "User";
    const firstName = fullName.split(" ")[0];
    const genderNum = userData?.gender || "0";

    // Convert gender
    let genderText;
    if (genderNum === "2" || genderNum === 2) {
      genderText = "male";
    } else if (genderNum === "1" || genderNum === 1) {
      genderText = "female";
    } else {
      genderText = "person";
    }

    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];

    // Add user message
    memory[threadID].push(`${firstName}: ${prompt}`);

    // Build conversation history
    const history = memory[threadID].slice(-6).join("\n");

    // Enhanced prompt with English-only instruction
    const enhancedPrompt = `You are talking to ${fullName} (${firstName}), a ${genderText}. Address them as ${firstName}. Reply in English only. ${history}\nAI:`;

    // Call Gemini API (POST request)
    const apiUrl = "https://rest-apins.vercel.app/api/ai/gemini";
    const response = await axios.post(apiUrl, {
      prompt: enhancedPrompt
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000
    });

    let reply = response.data;

    // Handle response format
    if (typeof reply === "string") {
      // Good
    } else if (reply && typeof reply === "object") {
      reply = reply.result || reply.response || reply.message || 
              reply.answer || reply.text || reply.reply || reply.data || "";
    } else {
      reply = "";
    }

    reply = String(reply).trim();

    // Remove quotes if wrapped
    if ((reply.startsWith('"') && reply.endsWith('"')) || 
        (reply.startsWith("'") && reply.endsWith("'"))) {
      reply = reply.slice(1, -1);
    }

    if (!reply || reply === "[object Object]") {
      return api.sendMessage("❌ No response from AI. Try again.", threadID, messageID);
    }

    // Store response
    memory[threadID].push(`AI: ${reply}`);

    if (memory[threadID].length > 20) {
      memory[threadID] = memory[threadID].slice(-10);
    }

    // Send answer only
    api.sendMessage(reply, threadID, messageID);

  } catch (err) {
    console.error("AI Error:", err.message);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
