const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Load authorized users
const authorizedFile = path.join(__dirname, "..", "data", "crack_authorized.json");
let authorizedUIDs = [];
if (fs.existsSync(authorizedFile)) {
  try {
    authorizedUIDs = JSON.parse(fs.readFileSync(authorizedFile, "utf8"));
  } catch (e) {
    authorizedUIDs = [];
  }
}

// Initialize global objects
if (!global.crackPayments) global.crackPayments = {};
if (!global.crackSentData) global.crackSentData = {};

module.exports.config = {
  name: "crack",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Premium crack command - sends 10 unique lines",
  commandCategory: "premium",
  usages: "crack or crack verify <uid> <lifetime/month/week/trial>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  try {
    // Get user info
    const userInfo = await api.getUserInfo(senderID);
    const senderData = userInfo[senderID];
    const userName = senderData?.name || "User";

    // ========== ADMIN VERIFY SUB-COMMAND ==========
    if (args[0] && args[0].toLowerCase() === "verify" && args.length >= 3) {
      const adminUIDs = ["61556388598622", "61561982970881"];
      
      if (!adminUIDs.includes(senderID)) {
        return api.sendMessage("❌ Admin only command.", threadID, messageID);
      }

      const targetUID = args[1];
      const planName = args[2].toLowerCase();

      const plans = {
        lifetime: { days: 99999, price: "₱20", name: "Lifetime" },
        month: { days: 30, price: "₱15", name: "1 Month" },
        week: { days: 7, price: "₱10", name: "7 Days" },
        trial: { days: 3, price: "₱5", name: "3 Days" }
      };

      if (!plans[planName]) {
        return api.sendMessage("❌ Invalid plan. Use: lifetime, month, week, trial", threadID, messageID);
      }

      const selectedPlan = plans[planName];
      const expiryDate = planName === "lifetime" ? "LIFETIME" : new Date(Date.now() + selectedPlan.days * 86400000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Save to authorized list
      if (!authorizedUIDs.includes(targetUID)) {
        authorizedUIDs.push(targetUID);
        try {
          const dir = path.dirname(authorizedFile);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(authorizedFile, JSON.stringify(authorizedUIDs, null, 2));
        } catch (writeErr) {
          console.error("File write error:", writeErr);
        }
      }

      // Store payment record
      global.crackPayments[targetUID] = {
        plan: selectedPlan.name,
        price: selectedPlan.price,
        expiry: expiryDate,
        verifiedBy: senderID,
        date: new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
        verified: true
      };

      // Reset sent data for fresh start
      global.crackSentData[targetUID] = { sentIndexes: [], lastFetch: 0 };

      let verifiedUserName = "Unknown";
      try {
        const vUserInfo = await api.getUserInfo(targetUID);
        verifiedUserName = vUserInfo[targetUID]?.name || "Unknown";
      } catch (e) {}

      return api.sendMessage(
        `✅ PAYMENT VERIFIED\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 User: ${verifiedUserName}\n` +
        `🆔 UID: ${targetUID}\n` +
        `💵 Plan: ${selectedPlan.name}\n` +
        `💰 Amount: ${selectedPlan.price}\n` +
        `📅 Expiry: ${expiryDate}\n\n` +
        `🔓 Access granted! Use /crack now.`,
        threadID,
        messageID
      );
    }

    // ========== UNAUTHORIZED USER ==========
    if (!authorizedUIDs.includes(senderID)) {
      return api.sendMessage(
        `💳 PREMIUM ACCESS REQUIRED\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 User: ${userName}\n` +
        `🆔 Your UID: ${senderID}\n\n` +
        `📋 PLANS:\n` +
        `💎 Lifetime - ₱20 (Unlimited)\n` +
        `🥇 1 Month  - ₱15 (30 Days)\n` +
        `🥈 7 Days   - ₱10 (1 Week)\n` +
        `🥉 3 Days   - ₱5  (Trial)\n\n` +
        `📱 PAY VIA GCASH:\n` +
        `🔢 Number: 09917441567\n` +
        `👤 Name: J••• B\n\n` +
        `📷 AFTER PAYMENT:\n` +
        `Send screenshot + ref number + UID to:\n` +
        `https://facebook.com/quart.hade`,
        threadID,
        messageID
      );
    }

    // ========== AUTHORIZED USER - SEND 10 LINES ==========
    
    // Initialize sent tracking
    if (!global.crackSentData[senderID]) {
      global.crackSentData[senderID] = { sentIndexes: [], lastFetch: 0 };
    }

    const sentTracker = global.crackSentData[senderID];

    // Fetch fresh data
    const rawUrl = "https://raw.githubusercontent.com/pasayloako/B/refs/heads/main/lines_1_1.txt";
    
    let rawText = "";
    try {
      const apiResponse = await axios.get(rawUrl, { timeout: 15000 });
      rawText = String(apiResponse.data);
    } catch (fetchErr) {
      return api.sendMessage(`❌ Failed to fetch data. Try again later.\nError: ${fetchErr.message}`, threadID, messageID);
    }

    // Parse lines
    const allLines = rawText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (allLines.length === 0) {
      return api.sendMessage("❌ No data available in the source file.", threadID, messageID);
    }

    // Get available (unsent) indexes
    const availableIndexes = [];
    for (let i = 0; i < allLines.length; i++) {
      if (!sentTracker.sentIndexes.includes(i)) {
        availableIndexes.push(i);
      }
    }

    // Reset if all lines sent
    if (availableIndexes.length === 0) {
      sentTracker.sentIndexes = [];
      for (let i = 0; i < allLines.length; i++) {
        availableIndexes.push(i);
      }
    }

    // Pick 10 random unique lines
    const count = Math.min(10, availableIndexes.length);
    const selectedIndexes = [];
    
    for (let i = 0; i < count; i++) {
      const randomPos = Math.floor(Math.random() * availableIndexes.length);
      selectedIndexes.push(availableIndexes[randomPos]);
      availableIndexes.splice(randomPos, 1);
    }

    // Mark as sent
    sentTracker.sentIndexes.push(...selectedIndexes);
    sentTracker.lastFetch = Date.now();

    // Build result
    const paymentInfo = global.crackPayments[senderID] || {};
    const sentCount = sentTracker.sentIndexes.length;
    const totalCount = allLines.length;
    const remainingCount = totalCount - sentCount;

    let resultMessage = `🔓 CRACK RESULTS\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    resultMessage += `👤 ${userName}\n`;
    resultMessage += `💵 Plan: ${paymentInfo.plan || "Active"}\n`;
    resultMessage += `📅 Expiry: ${paymentInfo.expiry || "N/A"}\n`;
    resultMessage += `📊 Progress: ${sentCount}/${totalCount} lines used\n`;
    resultMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (let i = 0; i < selectedIndexes.length; i++) {
      resultMessage += `${i + 1}. ${allLines[selectedIndexes[i]]}\n`;
    }

    resultMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    resultMessage += `🔄 Use /crack again for 10 more\n`;
    resultMessage += `📦 ${remainingCount > 0 ? remainingCount : totalCount} lines remaining`;

    // Check message length (Facebook has ~2000 char limit)
    if (resultMessage.length > 2000) {
      resultMessage = resultMessage.substring(0, 1990) + "\n\n...truncated";
    }

    api.sendMessage(resultMessage, threadID, messageID);

  } catch (err) {
    console.error("CRACK ERROR:", err.message, err.stack);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
