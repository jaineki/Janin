const axios = require("axios");

// --- GEMINI CONFIGURATION ---
let config = {
    cookie: null,
    snlm0e: null,
    fsid: null,
    bl: "boq_assistant-bard-web-server_20260208.13_p0",
    firebase_url: "https://puru-tools-default-rtdb.firebaseio.com/sessions/google.json",
    conversation_id: "",
    response_id: "",
    choice_id: ""
};

async function syncFirebase(method = 'GET', data = null) {
    try {
        if (method === 'GET') {
            const res = await axios.get(config.firebase_url);
            if (res.data) {
                config.cookie = res.data.cookie_string || res.data.cookie;
                config.snlm0e = res.data.snlm0e;
                config.fsid = res.data.fsid;
                config.conversation_id = res.data.conversation_id || "";
                config.response_id = res.data.response_id || "";
                config.choice_id = res.data.choice_id || "";
            }
        } else {
            await axios.patch(config.firebase_url, {
                ...data,
                last_updated: new Date().toISOString()
            });
        }
    } catch (err) {
        console.error("Firebase Error:", err.message);
    }
}

function parseGeminiResponse(rawData) {
    try {
        const lines = rawData.split("\n");
        let result = { text: "", convId: "", respId: "", choiceId: "" };
        for (let line of lines) {
            line = line.trim();
            if (!line.startsWith("[[")) continue;
            try {
                const parsed = JSON.parse(line);
                for (let part of parsed) {
                    if (part[0] === "wrb.fr") {
                        const innerObj = JSON.parse(part[2]);
                        if (innerObj?.[4]) {
                            for (let c of innerObj[4]) {
                                if (c?.[1]?.[0]) result.text = c[1][0];
                            }
                        }
                        if (innerObj?.[1]) {
                            result.convId = innerObj[1][0];
                            result.respId = innerObj[1][1];
                        }
                        if (innerObj?.[4]?.[0]?.[0]) {
                            result.choiceId = innerObj[4][0][0];
                        }
                    }
                }
            } catch (e) { continue; }
        }
        return result;
    } catch (err) {
        return { text: "" };
    }
}

async function askGemini(prompt, retry = true) {
    if (retry) await syncFirebase('GET');

    const url = `https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate`;
    const reqData = [
        null, 
        JSON.stringify([
            [prompt, 0, null, null, null, null, 0], 
            ["id"], 
            [config.conversation_id, config.response_id, config.choice_id, null, null, null, null, null, null, ""], 
            ""
        ])
    ];

    const params = new URLSearchParams({
        'bl': config.bl,
        '_reqid': Math.floor(Math.random() * 900000),
        'rt': 'c',
        'f.sid': config.fsid
    });

    try {
        const response = await axios.post(`${url}?${params.toString()}`, 
            `f.req=${encodeURIComponent(JSON.stringify(reqData))}&at=${encodeURIComponent(config.snlm0e)}&`, 
            {
                headers: {
                    'Cookie': config.cookie,
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; RMX2185) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
                    'Referer': 'https://gemini.google.com/',
                },
                timeout: 30000
            }
        );

        const parsed = parseGeminiResponse(response.data);

        if (!parsed.text) {
            throw new Error("EmptyResponse");
        }

        let currentCookie = config.cookie;
        if (response.headers['set-cookie']) currentCookie = response.headers['set-cookie'].join('; ');

        await syncFirebase('PATCH', {
            cookie_string: currentCookie,
            conversation_id: parsed.convId,
            response_id: parsed.respId,
            choice_id: parsed.choiceId
        });

        return parsed.text;

    } catch (error) {
        if (retry) {
            config.conversation_id = "";
            config.response_id = "";
            config.choice_id = "";
            await new Promise(r => setTimeout(r, 2000));
            return askGemini(prompt, false); 
        } else {
            throw new Error("Failed after session reset. Check Cookie/Token.");
        }
    }
}

// --- COMMAND CONFIG ---
module.exports.config = {
  name: "ai",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "AI using Gemini - Tagalog response, knows your name and gender",
  commandCategory: "ai",
  usages: "ai <question>",
  cooldowns: 5
};

// --- MEMORY PER THREAD ---
const memory = {};

// --- COMMAND RUN ---
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return api.sendMessage(
      "🤖 AI GEMINI\n━━━━━━━━━━━━━━━━\n" +
      "Usage: ai <question>\n\n" +
      "Example:\n" +
      "• ai kamusta ka?\n" +
      "• ai ano pangalan mo?\n" +
      "• ai gwapo ba ako?",
      threadID,
      messageID
    );
  }

  try {
    // Get Facebook user info
    const userInfo = await api.getUserInfo(senderID);
    const userData = userInfo[senderID];

    const fullName = userData?.name || "Kaibigan";
    const firstName = fullName.split(" ")[0];
    const genderNum = userData?.gender || "0";

    // Convert gender to Tagalog
    let genderTagalog;
    if (genderNum === "2" || genderNum === 2) {
      genderTagalog = "lalaki";
    } else if (genderNum === "1" || genderNum === 1) {
      genderTagalog = "babae";
    } else {
      genderTagalog = "tao";
    }

    // Initialize memory for this thread
    if (!memory[threadID]) memory[threadID] = [];

    // Add user message to memory
    memory[threadID].push(`${firstName}: ${prompt}`);

    // Build conversation history
    const history = memory[threadID].slice(-6).join("\n");

    // Enhanced prompt with user identity and language instructions
    const enhancedPrompt = `Kausap mo si ${fullName} (${firstName}), isang ${genderTagalog}. Tawagin mo siyang "${firstName}".

MGA TAGUBILIN SA WIKA:
- Ang PANGUNAHING wika mo ay TAGALOG
- Maaari kang maghalo ng English at Bisaya nang natural
- Gumamit ng Taglish style (Tagalog + English mix)
- Maging palakaibigan at mainit ang pakikitungo
- Gumamit ng "po" paminsan-minsan bilang paggalang
- Tawagin ang user sa kanilang unang pangalan

Nakaraang usapan:
${history}

Ikaw:`;


    // Call Gemini
    const reply = await askGemini(enhancedPrompt);

    if (!reply || reply.trim() === "") {
      return api.sendMessage("❌ Walang response mula kay Gemini. Subukan muli.", threadID, messageID);
    }

    // Clean up response
    let cleanReply = String(reply).trim();
    cleanReply = cleanReply.replace(/\s+/g, ' ').trim();

    // Store response in memory
    memory[threadID].push(`AI: ${cleanReply}`);

    // Keep memory manageable
    if (memory[threadID].length > 20) {
      memory[threadID] = memory[threadID].slice(-10);
    }

    // Send only the answer
    api.sendMessage(cleanReply, threadID, messageID);

  } catch (err) {
    console.error("AI Error:", err.message);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
