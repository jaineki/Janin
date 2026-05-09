const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "pinterest",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Search images from Pinterest",
  commandCategory: "search",
  usages: "pinterest <search query>",
  cooldowns: 2
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const query = args.join(" ").trim();

  if (!query) {
    return api.sendMessage(
      "📌 PINTEREST SEARCH\n━━━━━━━━━━━━━━━━\n\n" +
      "Usage: pinterest <search query>\n\n" +
      "Example:\n" +
      "• pinterest baki\n" +
      "• pinterest anime girl\n" +
      "• pinterest landscape",
      threadID,
      messageID
    );
  }

  try {
    // Get user info
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Send searching message
    await api.sendMessage(`🔍 Searching Pinterest for "${query}"... Please wait.`, threadID);

    // Call API
    const apiUrl = `https://api-ownblox.vercel.app/api/pinterest?q=${encodeURIComponent(query)}`;
    const response = await axios.get(apiUrl, { timeout: 20000 });

    let data = response.data;

    // Handle different response formats
    let imageUrls = [];

    if (Array.isArray(data)) {
      imageUrls = data;
    } else if (data && typeof data === "object") {
      imageUrls = data.data || data.result || data.results || 
                  data.images || data.urls || data.image || [];
    }

    // If single URL returned, wrap in array
    if (typeof imageUrls === "string") {
      imageUrls = [imageUrls];
    }

    // Filter valid URLs only
    imageUrls = imageUrls.filter(url => 
      typeof url === "string" && 
      (url.startsWith("http://") || url.startsWith("https://"))
    );

    if (imageUrls.length === 0) {
      return api.sendMessage(
        `❌ No images found for "${query}".\nTry a different search term.`,
        threadID,
        messageID
      );
    }

    // Limit to 6 images
    const selectedUrls = imageUrls.slice(0, 6);

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download images
    const attachments = [];
    const imgPaths = [];

    for (let i = 0; i < selectedUrls.length; i++) {
      try {
        const imgPath = path.join(cacheDir, `pin_${Date.now()}_${i}.jpg`);
        
        const imgResponse = await axios.get(selectedUrls[i], { 
          responseType: "arraybuffer",
          timeout: 15000 
        });

        fs.writeFileSync(imgPath, imgResponse.data);
        attachments.push(fs.createReadStream(imgPath));
        imgPaths.push(imgPath);
      } catch (downloadErr) {
        console.error(`Failed to download image ${i + 1}:`, downloadErr.message);
      }
    }

    if (attachments.length === 0) {
      return api.sendMessage("❌ Failed to download images. Try again later.", threadID, messageID);
    }

    // Send images
    api.sendMessage(
      {
        body: `📌 PINTEREST RESULTS\n━━━━━━━━━━━━━━━━\n\n🔍 Query: "${query}"\n👤 Requested by: ${senderName}\n📸 Images: ${attachments.length}\n\n✨ Powered by Pinterest`,
        attachment: attachments
      },
      threadID,
      (err) => {
        if (err) console.error("Send error:", err);
        // Clean up files
        imgPaths.forEach(p => {
          try {
            if (fs.existsSync(p)) fs.unlinkSync(p);
          } catch (e) {}
        });
      },
      messageID
    );

  } catch (err) {
    console.error("Pinterest Error:", err.message);
    api.sendMessage(
      `❌ Error: ${err.message}\n\nTry again with a different search.`,
      threadID,
      messageID
    );
  }
};
