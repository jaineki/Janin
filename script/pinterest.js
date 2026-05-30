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
      "Examples:\n" +
      "• pinterest baki\n" +
      "• pinterest anime girl\n" +
      "• pinterest nature wallpaper",
      threadID,
      messageID
    );
  }

  try {
    // Get user info
    let senderName = "User";
    try {
      const user = await api.getUserInfo(senderID);
      senderName = user[senderID]?.name || "User";
    } catch (e) {}

    // Send searching message
    const searchingMsg = await api.sendMessage(
      `🔍 Searching Pinterest for "${query}"... Please wait.`,
      threadID
    );

    // Call the API
    const apiUrl = `https://sagor.nav.bd/sagor/pin?q=${encodeURIComponent(query)}&limit=6&apikey=sagor`;
    
    const response = await axios.get(apiUrl, { 
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    let rawData = response.data;

    // Debug log
    console.log("PINTEREST API TYPE:", typeof rawData);
    console.log("PINTEREST API SAMPLE:", JSON.stringify(rawData).substring(0, 400));

    let imageUrls = [];

    // Handle different response formats
    if (typeof rawData === "string") {
      try {
        rawData = JSON.parse(rawData);
      } catch (parseErr) {
        if (rawData.startsWith("http")) {
          imageUrls = [rawData];
        }
      }
    }

    if (Array.isArray(rawData)) {
      imageUrls = rawData;
    } else if (rawData && typeof rawData === "object") {
      // Try all possible keys
      imageUrls = rawData.data || rawData.result || rawData.results || 
                  rawData.images || rawData.image || rawData.urls || 
                  rawData.url || rawData.pins || rawData.items || rawData.response || [];
      
      // If nested object
      if (imageUrls && typeof imageUrls === "object" && !Array.isArray(imageUrls)) {
        imageUrls = imageUrls.data || imageUrls.result || imageUrls.images || [];
      }
    }

    // Handle array of objects with url property
    if (Array.isArray(imageUrls) && imageUrls.length > 0 && typeof imageUrls[0] === "object") {
      imageUrls = imageUrls.map(item => {
        if (typeof item === "string") return item;
        return item.url || item.image || item.src || item.link || item.pin || item.original || "";
      });
    }

    // Filter valid URLs
    imageUrls = imageUrls.filter(url => 
      typeof url === "string" && 
      (url.startsWith("http://") || url.startsWith("https://"))
    );

    if (imageUrls.length === 0) {
      try {
        await api.unsendMessage(searchingMsg.messageID);
      } catch (e) {}
      
      return api.sendMessage(
        `❌ No images found for "${query}".\n\n` +
        `API Response Type: ${typeof rawData}\n` +
        `Sample: ${JSON.stringify(rawData).substring(0, 200)}\n\n` +
        `Try a different search term.`,
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
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
            'Referer': 'https://www.pinterest.com/'
          }
        });

        fs.writeFileSync(imgPath, imgResponse.data);
        attachments.push(fs.createReadStream(imgPath));
        imgPaths.push(imgPath);
      } catch (downloadErr) {
        console.error(`Failed to download image ${i + 1}:`, downloadErr.message);
      }
    }

    if (attachments.length === 0) {
      try {
        await api.unsendMessage(searchingMsg.messageID);
      } catch (e) {}
      
      return api.sendMessage(
        "❌ Failed to download images. The URLs might be blocked.\nTry again later.",
        threadID,
        messageID
      );
    }

    // Remove searching message
    try {
      await api.unsendMessage(searchingMsg.messageID);
    } catch (e) {}

    // Send images
    api.sendMessage(
      {
        body: `📌 PINTEREST RESULTS\n━━━━━━━━━━━━━━━━\n\n🔍 Query: "${query}"\n👤 Requested by: ${senderName}\n📸 Images: ${attachments.length}/${selectedUrls.length}\n\n✨ Powered by Pinterest`,
        attachment: attachments
      },
      threadID,
      (err) => {
        if (err) console.error("Send error:", err);
        // Clean up files after 5 seconds
        setTimeout(() => {
          imgPaths.forEach(p => {
            try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
          });
        }, 5000);
      },
      messageID
    );

  } catch (err) {
    console.error("Pinterest Error:", err.message);
    
    let errorMsg = `❌ Pinterest Error: ${err.message}`;
    
    if (err.response?.status === 404) {
      errorMsg = "❌ API endpoint not found (404). Check the URL.";
    } else if (err.response?.status === 500) {
      errorMsg = "❌ API server error (500). Try again later.";
    } else if (err.code === "ECONNREFUSED") {
      errorMsg = "❌ API is currently offline.";
    } else if (err.code === "ECONNABORTED") {
      errorMsg = "❌ Request timed out. Try again.";
    } else if (err.code === "ENOTFOUND") {
      errorMsg = "❌ API host not found. Check the URL.";
    }
    
    api.sendMessage(errorMsg, threadID, messageID);
  }
};
