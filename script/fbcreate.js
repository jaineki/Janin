const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

module.exports.config = {
  name: "fbcreate",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "selov",
  description: "Auto create Facebook accounts",
  commandCategory: "admin",
  usages: "fbautocreate <amount> <gender(f/m)> <country(ph/np/pk)>",
  cooldowns: 10
};

// Name databases
const names = {
  female: {
    first: [
      "Maria", "Angelica", "Andrea", "Alyssa", "Bianca", "Camille", "Claudine", "Danica", "Diana", "Ella",
      "Erika", "Faith", "Gabriela", "Grace", "Hannah", "Isabel", "Jasmine", "Janine", "Jessica", "Julia",
      "Katherine", "Katrina", "Kayla", "Kyla", "Lara", "Lea", "Lianne", "Liza", "Lorraine", "Mae",
      "Mariel", "Mika", "Monica", "Nadine", "Nicole", "Patricia", "Paula", "Princess", "Rhea", "Rica",
      "Rose", "Samantha", "Sarah", "Shaina", "Sheena", "Stephanie", "Trisha", "Vanessa", "Yna", "Zara"
    ],
    last: [
      "Santos", "Reyes", "Cruz", "Garcia", "Dela Cruz", "Ramos", "Aquino", "Lopez", "Torres", "Navarro",
      "Castillo", "Mendoza", "Bautista", "Villanueva", "Flores", "Ortega", "Gonzales", "Delgado", "Ramirez", "Diaz",
      "Salazar", "Domingo", "Pascual", "Santiago", "Valdez", "Aguilar", "Alvarez", "Cabrera", "Cortez", "De Leon"
    ]
  },
  male: {
    first: [
      "Juan", "Jose", "Antonio", "Manuel", "Francisco", "Ramon", "Eduardo", "Fernando", "Ricardo", "Roberto",
      "Luis", "Carlos", "Miguel", "Gabriel", "Daniel", "Adrian", "Christian", "Christopher", "Mark", "John",
      "Paul", "Peter", "James", "Jerome", "Joseph", "Joshua", "Matthew", "Nathaniel", "Noel", "Patrick",
      "Vincent", "Victor", "Xavier", "Albert", "Alfred", "Allan", "Andrew", "Anthony", "Arnold", "Arthur",
      "Benito", "Benjamin", "Bernardo", "Brandon", "Bryan", "Calvin", "Cedric", "Cesar", "Clarence", "Clifford"
    ],
    last: [
      "Santos", "Reyes", "Cruz", "Garcia", "Dela Cruz", "Ramos", "Aquino", "Lopez", "Torres", "Navarro",
      "Castillo", "Mendoza", "Bautista", "Villanueva", "Flores", "Ortega", "Gonzales", "Delgado", "Ramirez", "Diaz",
      "Salazar", "Domingo", "Pascual", "Santiago", "Valdez", "Aguilar", "Alvarez", "Cabrera", "Cortez", "De Leon"
    ]
  }
};

// Phone number generators by country
function generatePhone(country) {
  const countries = {
    PH: { code: "+63", prefixes: ["917", "918", "919", "920", "921", "922"], length: 7 },
    NP: { code: "+977", prefixes: ["97", "98"], length: 8 },
    PK: { code: "+92", prefixes: ["300", "301", "302", "303", "304", "305"], length: 7 }
  };
  
  const c = countries[country] || countries.PH;
  const prefix = c.prefixes[Math.floor(Math.random() * c.prefixes.length)];
  let number = "";
  for (let i = 0; i < c.length; i++) {
    number += Math.floor(Math.random() * 10);
  }
  return `${c.code}${prefix}${number}`;
}

// Password generator
function generatePassword(firstname, lastname) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const symbols = "!@#$%^&*()_+=";
  const digits = "0123456789";
  
  let pass = "";
  for (let i = 0; i < 5; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  pass = Math.random() > 0.5 ? pass.charAt(0).toUpperCase() + pass.slice(1) : pass.toLowerCase();
  for (let i = 0; i < 2; i++) pass += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 0; i < 3; i++) pass += digits[Math.floor(Math.random() * digits.length)];
  
  return pass;
}

// User agents
const userAgents = [
  "Mozilla/5.0 (Linux; Android 14; SM-S9080 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; CPH2449 Build/TP1A.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.163 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; V2350 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0.6167.71 Mobile Safari/537.36"
];

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  
  const amount = parseInt(args[0]) || 1;
  const gender = (args[1] || "f").toLowerCase();
  const country = (args[2] || "PH").toUpperCase();

  if (amount > 10) {
    return api.sendMessage("❌ Max 10 accounts at a time.", threadID, messageID);
  }

  if (!["f", "m"].includes(gender)) {
    return api.sendMessage("❌ Gender must be 'f' (female) or 'm' (male)", threadID, messageID);
  }

  const genderType = gender === "f" ? "female" : "male";
  const genderNum = gender === "f" ? "1" : "2";
  const genderText = gender === "f" ? "Female" : "Male";

  try {
    const statusMsg = await api.sendMessage(
      `🔧 CREATING ${amount} FACEBOOK ACCOUNT(S)\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 Gender: ${genderText}\n` +
      `🌍 Country: ${country}\n\n` +
      `⏳ Processing... Please wait.`,
      threadID
    );

    const results = [];
    let oks = [];
    let cps = [];

    for (let i = 0; i < amount; i++) {
      try {
        // Generate random identity
        const nameList = names[genderType];
        const firstname = nameList.first[Math.floor(Math.random() * nameList.first.length)];
        const lastname = nameList.last[Math.floor(Math.random() * nameList.last.length)];
        const phone = generatePhone(country);
        const password = generatePassword(firstname, lastname);
        const birthday = {
          day: String(Math.floor(Math.random() * 10) + 15),
          month: String(Math.floor(Math.random() * 6) + 5),
          year: String(Math.floor(Math.random() * 10) + 1985)
        };

        const session = axios.create({
          headers: {
            "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
          }
        });

        // Get registration form
        const regPage = await session.get("https://m.facebook.com/reg", { timeout: 15000 });
        const formData = extractFormData(regPage.data);

        // Submit registration
        const payload = {
          ccp: "2",
          reg_instance: formData.reg_instance || "",
          submission_request: "true",
          reg_impression_id: formData.reg_impression_id || "",
          ns: "1",
          logger_id: formData.logger_id || "",
          firstname: firstname,
          lastname: lastname,
          birthday_day: birthday.day,
          birthday_month: birthday.month,
          birthday_year: birthday.year,
          reg_email__: phone,
          sex: genderNum,
          encpass: `#PWD_BROWSER:0:${Math.floor(Date.now() / 1000)}:${password}`,
          submit: "Sign Up",
          fb_dtsg: formData.fb_dtsg || "",
          jazoest: formData.jazoest || "",
          lsd: formData.lsd || ""
        };

        const regResponse = await session.post(
          "https://www.facebook.com/reg/submit/",
          new URLSearchParams(payload).toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Origin": "https://www.facebook.com",
              "Referer": "https://m.facebook.com/reg/"
            },
            timeout: 20000
          }
        );

        const cookies = session.defaults.headers.Cookie || "";
        const uidMatch = cookies.match(/c_user=(\d+)/);
        
        if (uidMatch) {
          const uid = uidMatch[1];
          oks.push(uid);
          results.push({
            status: "OK",
            name: `${firstname} ${lastname}`,
            phone: phone,
            password: password,
            uid: uid,
            birthday: `${birthday.month}/${birthday.day}/${birthday.year}`,
            gender: genderText,
            cookie: cookies
          });
        } else if (regResponse.data.includes("checkpoint")) {
          cps.push("cp");
          results.push({
            status: "CP",
            name: `${firstname} ${lastname}`,
            phone: phone,
            password: password
          });
        }

        // Delay between accounts
        await new Promise(r => setTimeout(r, 2000));

      } catch (accErr) {
        console.error(`Account ${i + 1} error:`, accErr.message);
      }
    }

    // Save results
    const saveDir = path.join(__dirname, "..", "data");
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    
    const timestamp = Date.now();
    const saveFile = path.join(saveDir, `fbauto_${timestamp}.json`);
    fs.writeFileSync(saveFile, JSON.stringify(results, null, 2));

    // Build result message
    let resultMsg = `✅ FACEBOOK AUTO CREATE\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    resultMsg += `📊 Results: ${oks.length} OK, ${cps.length} CP\n`;
    resultMsg += `👤 Gender: ${genderText}\n`;
    resultMsg += `🌍 Country: ${country}\n\n`;

    if (results.length > 0) {
      resultMsg += `📋 DETAILS:\n`;
      for (const r of results.slice(0, 5)) {
        resultMsg += `\n${r.status === "OK" ? "✅" : "⚠️"} ${r.name}\n`;
        resultMsg += `   📱 ${r.phone}\n`;
        resultMsg += `   🔑 ${r.password}\n`;
        if (r.uid) resultMsg += `   🆔 ${r.uid}\n`;
      }
      if (results.length > 5) {
        resultMsg += `\n...and ${results.length - 5} more\n`;
      }
    }

    resultMsg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    resultMsg += `💾 Saved: data/fbauto_${timestamp}.json`;

    await api.editMessage(resultMsg, statusMsg.messageID, threadID);

  } catch (err) {
    console.error("FBAutoCreate Error:", err.message);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};

// Helper to extract form data from HTML
function extractFormData(html) {
  const data = {};
  const inputRegex = /<input[^>]*name="([^"]*)"[^>]*value="([^"]*)"[^>]*>/g;
  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    data[match[1]] = match[2];
  }
  return data;
                           }
