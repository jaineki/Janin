const axios = require("axios");

module.exports.config = {
  name: "fbcreate",
  version: "1.0.0",
  hasPermission: 0,
  credits: "Selov",
  description: "Create a Facebook account via Haji-Mix API",
  commandCategory: "utilities",
  usages: "fbcreate [email]",
  cooldowns: 1800,
  role: 0,
  hasPrefix: true
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const email = args[0] || "badingako@gmail.com";
  const amount = 1;
  const apiKey = "f810244328efffe65edb02e899789cdc1b5303156dd950a644a6f2637ce564f0";

  const loadingMsg = `🔄 Creating ${amount} Facebook account(s) for email: ${email}...`;
  api.sendMessage(loadingMsg, threadID, async (err, info) => {
    try {
      const url = `https://haji-mix.up.railway.app/api/fbcreate?amount=${amount}&email=${encodeURIComponent(email)}&api_key=${apiKey}`;
      const res = await axios.get(url);
      if (!res.data?.success || !Array.isArray(res.data.data) || res.data.data.length === 0) {
        throw new Error(res.data?.message || "Unexpected API response");
      }

      const account = res.data.data[0]?.account;
      if (!account) throw new Error("No account data received");

      const reply =
`✅ Facebook Account Created!

📧 Email: ${account.email}
🔑 Password: ${account.password}
👤 Name: ${account.name}
🎂 Birthday: ${account.birthday}
⚧ Gender: ${account.gender === "M" ? "Male" : "Female"}
✉️ Verification: ${account.verificationRequired ? "Required" : "Not Required"}

ℹ️ ${account.message}`;

      return api.sendMessage(reply, threadID, messageID);
    } catch (error) {
      console.error("[fbcreate.js] API Error:", error.message || error);
      return api.sendMessage(
        `❌ Failed to create account.
Reason: ${error.response?.data?.message || error.message}`,
        threadID,
        messageID
      );
    }
  });
};
