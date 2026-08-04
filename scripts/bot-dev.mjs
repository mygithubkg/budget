import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

// Simple .env parser
function loadEnv() {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = { ...process.env, ...loadEnv() };
const token = env.TELEGRAM_BOT_TOKEN;
const secret = env.TELEGRAM_WEBHOOK_SECRET || "finchat_tele_secret_98a76f54c321";
const localWebhookUrl = process.env.LOCAL_WEBHOOK_URL || "http://localhost:3000/api/telegram/webhook";

if (!token) {
  console.error("❌ Error: TELEGRAM_BOT_TOKEN not found in .env");
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${token}`;

async function deleteWebhook() {
  try {
    const res = await fetch(`${TELEGRAM_API}/deleteWebhook?drop_pending_updates=false`);
    const data = await res.json();
    console.log("🧹 Webhook cleared for local polling mode:", data.description || "OK");
  } catch (err) {
    console.warn("⚠️ Could not clear webhook:", err.message);
  }
}

async function forwardUpdate(update) {
  try {
    const res = await fetch(localWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": secret,
      },
      body: JSON.stringify(update),
    });

    if (!res.ok) {
      console.error(`⚠️ Webhook responded with status ${res.status} ${res.statusText}`);
    } else {
      console.log(`✅ Processed update #${update.update_id}`);
    }
  } catch (err) {
    console.error("❌ Failed to forward update to local server:", err.message);
    console.log("👉 Make sure your Next.js dev server is running on http://localhost:3000 (npm run dev)");
  }
}

async function pollLoop() {
  await deleteWebhook();
  console.log(`🤖 Telegram Bot Dev Runner started for bot token: ${token.slice(0, 10)}...`);
  console.log(`📡 Forwarding Telegram updates to: ${localWebhookUrl}`);
  console.log(`✨ You can now message your Telegram Bot! Press Ctrl+C to stop.`);

  let offset = 0;

  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=20`);
      if (!res.ok) {
        console.error(`HTTP error polling updates: ${res.status}`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      const data = await res.json();
      if (!data.ok) {
        console.error("Telegram API Error:", data.description);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      for (const update of data.result || []) {
        offset = Math.max(offset, update.update_id + 1);
        const msg = update.message || update.callback_query?.message;
        const from = update.message?.from || update.callback_query?.from;
        const text = update.message?.text || update.callback_query?.data;

        console.log(`📩 Incoming update #${update.update_id} from ${from?.first_name || "User"} (@${from?.username || "anon"}): "${text || "[media/callback]"}"`);
        await forwardUpdate(update);
      }
    } catch (err) {
      console.error("Polling error:", err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

pollLoop();
