const axios = require('axios');

module.exports.config = {
  name: "aria",
  version: "2.0.0",
  role: 0,
  credits: "selov",
  description: "Chat with Aria AI assistant",
  commandCategory: "ai",
  usages: "/aria <question>",
  cooldowns: 5,
  aliases: ["askaria", "ariaai"]
};

// Store user sessions for conversation continuity
if (!global.ariaMemory) global.ariaMemory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  let prompt = args.join(" ").trim();

  if (!prompt) return; // Silent fail - no message

  // Show typing indicator
  api.sendTypingIndicator(threadID, true);

  // Get or create session UID for this user
  let uid = global.ariaMemory[senderID] || senderID;

  try {
    // Call the Aria API
    const apiUrl = `https://restapijay.up.railway.app/api/aria?ask=${encodeURIComponent(prompt)}&uid=${uid}`;
    
    const response = await axios.get(apiUrl, { 
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (!response.data?.status) {
      return; // Silent fail
    }
    
    // Extract answer from response
    const answer = response.data.result?.answer || "No response from Aria.";
    const newUid = response.data.result?.uid || uid;
    
    // Store the UID for conversation continuity
    global.ariaMemory[senderID] = newUid;
    
    // Clean up answer (remove markdown)
    const cleanAnswer = answer.replace(/```/g, '').trim();
    
    // Send ONLY the answer
    return api.sendMessage(cleanAnswer, threadID, messageID);
    
  } catch (err) {
    console.error("Aria Error:", err);
    // Silent fail - no error message to user
  }
};
