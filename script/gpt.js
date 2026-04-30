const axios = require("axios");

module.exports.config = {
  name: "gpt",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Bible study AI that knows your name and gender",
  commandCategory: "religion",
  usages: "gpt <question>",
  cooldowns: 3
};

const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return api.sendMessage(
      "📖 GPT Usage: gpt <question>\nExample: gpt what is faith?",
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
      genderText = "unknown";
    }

    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];

    // Add user message
    memory[threadID].push(`${firstName}: ${prompt}`);

    // Build conversation history
    const history = memory[threadID].slice(-4).join("\n");

    // Enhanced prompt with user identity
    const enhancedPrompt = `You are a compassionate Bible study assistant. You're talking to ${fullName} (${firstName}), a ${genderText} person. Use Taglish naturally. Be empathetic and biblical. Conversation:\n${history}\nAI:`;

    // Call Bible GPT API
    const apiUrl = `https://pasayloakomego.onrender.com/api/biblegpt?q=${encodeURIComponent(enhancedPrompt)}`;
    const response = await axios.get(apiUrl, { timeout: 20000 });

    let reply = response.data;

    // Extract text
    if (typeof reply === "string") {
      // Good
    } else if (reply && typeof reply === "object") {
      reply = reply.result || reply.response || reply.message || 
              reply.answer || reply.text || reply.reply || "";
    } else {
      reply = "";
    }

    reply = String(reply).trim();

    // Clean up
    if ((reply.startsWith('"') && reply.endsWith('"')) || 
        (reply.startsWith("'") && reply.endsWith("'"))) {
      reply = reply.slice(1, -1);
    }

    if (!reply || reply === "[object Object]") {
      return api.sendMessage("❌ No response. Try again.", threadID, messageID);
    }

    // Store response
    memory[threadID].push(`AI: ${reply}`);

    if (memory[threadID].length > 20) {
      memory[threadID] = memory[threadID].slice(-10);
    }

    // Send answer only
    api.sendMessage(reply, threadID, messageID);

  } catch (err) {
    console.error("GPT Error:", err.message);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
