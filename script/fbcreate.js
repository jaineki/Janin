const axios = require("axios");
const fs = require("fs");
const path = require("path");
const HttpsProxyAgent = require("https-proxy-agent");

module.exports.config = {
  name: "fbautocreate",
  version: "2.0.0",
  hasPermssion: 2,
  credits: "selov",
  description: "Auto create Facebook accounts with proxy",
  commandCategory: "admin",
  usages: "fbautocreate <amount> <gender(f/m)> <country(ph)>",
  cooldowns: 10
};

// Proxy list
const proxyList = [
  "101.128.107.36:1111", "102.38.29.36:8080", "103.146.185.139:1111",
  "103.149.42.238:3125", "103.156.249.112:8085", "103.169.38.240:8080",
  "103.175.202.138:8090", "103.181.255.105:8080", "103.188.169.95:8080",
  "103.22.99.95:1111", "103.227.187.23:8080", "103.48.68.66:83",
  "103.56.206.67:4000", "103.78.113.34:8080", "112.198.18.206:8080",
  "120.28.193.225:8080", "121.147.215.213:3124", "138.0.207.246:8082",
  "149.86.144.211:8080", "154.18.255.102:8080", "157.10.97.185:8080",
  "160.191.180.149:8090", "176.117.104.175:8080", "176.88.166.188:8080",
  "188.132.222.169:8080", "196.204.83.232:1981", "210.79.146.107:8090",
  "38.145.218.142:3128", "43.252.238.251:3125", "46.39.105.157:8080",
  "57.128.188.167:9652", "91.228.217.195:8989"
];

// Name databases
const names = {
  female: {
    first: ["Maria", "Angelica", "Andrea", "Alyssa", "Bianca", "Camille", "Claudine", "Danica", "Diana", "Ella", "Erika", "Faith", "Gabriela", "Grace", "Hannah", "Isabel", "Jasmine", "Janine", "Jessica", "Julia"],
    last: ["Santos", "Reyes", "Cruz", "Garcia", "Dela Cruz", "Ramos", "Aquino", "Lopez", "Torres", "Navarro", "Castillo", "Mendoza", "Bautista", "Villanueva", "Flores", "Ortega", "Gonzales", "Delgado", "Ramirez", "Diaz"]
  },
  male: {
    first: ["Juan", "Jose", "Antonio", "Manuel", "Francisco", "Ramon", "Eduardo", "Fernando", "Ricardo", "Roberto", "Luis", "Carlos", "Miguel", "Gabriel", "Daniel", "Adrian", "Christian", "Christopher", "Mark", "John"],
    last: ["Santos", "Reyes", "Cruz", "Garcia", "Dela Cruz", "Ramos", "Aquino", "Lopez", "Torres", "Navarro", "Castillo", "Mendoza", "Bautista", "Villanueva", "Flores", "Ortega", "Gonzales", "Delgado", "Ramirez", "Diaz"]
  }
};

const userAgents = [
  "Mozilla/5.0 (Linux; Android 14; SM-S9080 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; CPH2449 Build/TP1A.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.163 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro Build/UD1A.230803.041; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0.6167.71 Mobile Safari/537.36"
];

function getRandomProxy() {
  return proxyList[Math.floor(Math.random() * proxyList.length)];
}

function getProxyAgent() {
  const proxy = getRandomProxy();
  return {
    agent: new HttpsProxyAgent(`http://${proxy}`),
    proxy: proxy
  };
}

function generatePhone() {
  const prefixes = ["917", "918", "919", "920", "921", "922", "927", "928", "929", "939", "949", "959", "969", "979", "989", "999"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let number = "";
  for (let i = 0; i < 7; i++) number += Math.floor(Math.random() * 10);
  return `+63${prefix}${number}`;
}

function generatePassword(firstname) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const symbols = "!@#$%&*_";
  const digits = "0123456789";
  let pass = firstname.toLowerCase().substring(0, 4);
  pass += chars[Math.floor(Math.random() * chars.length)].toUpperCase();
  pass += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 0; i < 3; i++) pass += digits[Math.floor(Math.random() * digits.length)];
  return pass;
}

function extractFormData(html) {
  const data = {};
  const inputRegex = /<input[^>]*name="([^"]*)"[^>]*value="([^"]*)"[^>]*>/gi;
  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    if (!data[match[1]]) data[match[1]] = match[2];
  }
  if (!data.lsd) {
    const lsdMatch = html.match(/"lsd":"([^"]*)"/);
    if (lsdMatch) data.lsd = lsdMatch[1];
  }
  if (!data.fb_dtsg) {
    const dtsgMatch = html.match(/name="fb_dtsg" value="([^"]*)"/);
    if (dtsgMatch) data.fb_dtsg = dtsgMatch[1];
  }
  if (!data.jazoest) {
    const jazMatch = html.match(/name="jazoest" value="([^"]*)"/);
    if (jazMatch) data.jazoest = jazMatch[1];
  }
  return data;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  
  const amount = Math.min(parseInt(args[0]) || 1, 3);
  const gender = (args[1] || "f").toLowerCase();
  const country = (args[2] || "PH").toUpperCase();

  if (!["f", "m"].includes(gender)) {
    return api.sendMessage("❌ Gender must be 'f' or 'm'", threadID, messageID);
  }

  const genderType = gender === "f" ? "female" : "male";
  const genderNum = gender === "f" ? "1" : "2";
  const genderText = gender === "f" ? "Female" : "Male";

  try {
    const statusMsg = await api.sendMessage(
      `🔧 CREATING ${amount} FB ACCOUNT(S)\n━━━━━━━━━━━━━━━━━━━━\n👤 Gender: ${genderText}\n🌍 Country: ${country}\n🔒 Using proxies\n\n⏳ Processing...`,
      threadID
    );

    const results = [];
    let oks = 0, cps = 0;

    for (let i = 0; i < amount; i++) {
      try {
        const nameList = names[genderType];
        const firstname = nameList.first[Math.floor(Math.random() * nameList.first.length)];
        const lastname = nameList.last[Math.floor(Math.random() * nameList.last.length)];
        const phone = generatePhone();
        const password = generatePassword(firstname);
        const birthday = {
          day: String(Math.floor(Math.random() * 13) + 15),
          month: String(Math.floor(Math.random() * 5) + 6),
          year: String(Math.floor(Math.random() * 8) + 1990)
        };

        const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
        const { agent, proxy } = getProxyAgent();

        console.log(`[${i + 1}] Using proxy: ${proxy}`);

        // Step 1: Get registration page with proxy
        let regPage;
        try {
          regPage = await axios.get("https://m.facebook.com/reg/", {
            headers: {
              "User-Agent": ua,
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Connection": "keep-alive"
            },
            httpsAgent: agent,
            timeout: 20000
          });
        } catch (proxyErr) {
          console.error(`[${i + 1}] Proxy ${proxy} failed, trying without proxy...`);
          regPage = await axios.get("https://m.facebook.com/reg/", {
            headers: {
              "User-Agent": ua,
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9"
            },
            timeout: 20000
          });
        }

        const cookies = (regPage.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
        const formData = extractFormData(regPage.data);

        if (!formData.lsd || !formData.fb_dtsg) {
          results.push({ status: "FAIL", name: `${firstname} ${lastname}`, error: "Missing form fields" });
          continue;
        }

        // Step 2: Submit registration
        const encpass = `#PWD_BROWSER:0:${Math.floor(Date.now() / 1000)}:${password}`;
        const payload = new URLSearchParams();
        payload.append("lsd", formData.lsd);
        payload.append("fb_dtsg", formData.fb_dtsg);
        payload.append("jazoest", formData.jazoest || "");
        payload.append("ccp", "2");
        payload.append("reg_instance", formData.reg_instance || "");
        payload.append("submission_request", "true");
        payload.append("reg_impression_id", formData.reg_impression_id || "");
        payload.append("ns", "1");
        payload.append("logger_id", formData.logger_id || "");
        payload.append("firstname", firstname);
        payload.append("lastname", lastname);
        payload.append("birthday_day", birthday.day);
        payload.append("birthday_month", birthday.month);
        payload.append("birthday_year", birthday.year);
        payload.append("reg_email__", phone);
        payload.append("sex", genderNum);
        payload.append("encpass", encpass);
        payload.append("submit", "Sign Up");

        let regResponse;
        try {
          regResponse = await axios.post(
            "https://www.facebook.com/reg/submit/",
            payload.toString(),
            {
              headers: {
                "User-Agent": ua,
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://www.facebook.com",
                "Referer": "https://m.facebook.com/reg/",
                "Cookie": cookies
              },
              httpsAgent: agent,
              timeout: 25000
            }
          );
        } catch (postErr) {
          regResponse = await axios.post(
            "https://www.facebook.com/reg/submit/",
            payload.toString(),
            {
              headers: {
                "User-Agent": ua,
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://www.facebook.com",
                "Referer": "https://m.facebook.com/reg/",
                "Cookie": cookies
              },
              timeout: 25000
            }
          );
        }

        const responseCookies = (regResponse.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
        const allCookies = cookies + "; " + responseCookies;
        const uidMatch = allCookies.match(/c_user=(\d+)/);

        if (uidMatch) {
          oks++;
          results.push({
            status: "OK",
            name: `${firstname} ${lastname}`,
            phone, password,
            uid: uidMatch[1],
            birthday: `${birthday.month}/${birthday.day}/${birthday.year}`,
            gender: genderText,
            cookie: allCookies,
            proxy
          });
          console.log(`[${i + 1}] ✅ OK: ${uidMatch[1]} via ${proxy}`);
        } else if (regResponse.data.includes("checkpoint")) {
          cps++;
          results.push({
            status: "CP",
            name: `${firstname} ${lastname}`,
            phone, password,
            cookie: allCookies,
            proxy
          });
          console.log(`[${i + 1}] ⚠️ CP via ${proxy}`);
        } else {
          results.push({
            status: "FAIL",
            name: `${firstname} ${lastname}`,
            phone, password,
            proxy
          });
          console.log(`[${i + 1}] ❌ Failed via ${proxy}`);
        }

        await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));

      } catch (err) {
        console.error(`[${i + 1}] Error:`, err.message);
        results.push({ status: "ERROR", error: err.message });
      }
    }

    // Save results
    const saveDir = path.join(__dirname, "..", "data");
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    
    const timestamp = Date.now();
    const saveFile = path.join(saveDir, `fbauto_${timestamp}.json`);
    fs.writeFileSync(saveFile, JSON.stringify(results, null, 2));

    let resultMsg = `✅ FACEBOOK AUTO CREATE\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    resultMsg += `📊 Results: ${oks} OK, ${cps} CP, ${results.length - oks - cps} Failed\n`;
    resultMsg += `👤 Gender: ${genderText}\n\n`;

    for (const r of results) {
      if (r.status === "OK") {
        resultMsg += `✅ ${r.name}\n   📱 ${r.phone}\n   🔑 ${r.password}\n   🆔 ${r.uid}\n   🔒 ${r.proxy}\n\n`;
      } else if (r.status === "CP") {
        resultMsg += `⚠️ ${r.name} (CP)\n   📱 ${r.phone}\n   🔑 ${r.password}\n   🔒 ${r.proxy}\n\n`;
      }
    }

    resultMsg += `━━━━━━━━━━━━━━━━━━━━\n💾 Saved: data/fbauto_${timestamp}.json`;

    await api.editMessage(resultMsg, statusMsg.messageID, threadID);

  } catch (err) {
    console.error("FBAutoCreate Error:", err.message);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
