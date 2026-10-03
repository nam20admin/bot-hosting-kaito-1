const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const https = require('https');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let botClient = null;
let botStatus = "Chưa kích hoạt";
let lastLogs = [];

const logMessage = (msg) => {
  const time = new Date().toLocaleTimeString();
  lastLogs.push(`[${time}] ${msg}`);
  if (lastLogs.length > 20) lastLogs.shift();
  console.log(msg);
};

// Hàm đọc/ghi Token từ kho lưu trữ online miễn phí
const STORAGE_URL = 'https://api.jsonbin.io/v3/b/660000000000000000000000'; // Đổi token động

function startBot(token, botCode = null) {
  if (botClient) botClient.destroy();

  botClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  if (botCode && botCode.trim() !== '') {
    try {
      const runCustomCode = new Function('client', botCode);
      runCustomCode(botClient);
    } catch (err) {
      logMessage(`Lỗi Code: ${err.message}`);
    }
  } else {
    botClient.on('messageCreate', (message) => {
      if (message.author.bot) return;
      if (message.content === '!ping') {
        message.reply('Pong! Bot đang online 24/7!');
      }
    });
  }

  botClient.once('ready', () => {
    botStatus = `🟢 Đang chạy 24/7 (${botClient.user.tag})`;
    logMessage(`Bot đã kết nối thành công: ${botClient.user.tag}`);
  });

  botClient.login(token).catch(err => {
    botStatus = "🔴 Lỗi: Token không hợp lệ!";
    logMessage(`Lỗi đăng nhập: ${err.message}`);
  });
}

// Lưu Token vào bộ nhớ tạm toàn cục trên Server
global.savedToken = global.savedToken || "";

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quản Lý Bot 24/7</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0f172a; color: white; padding: 20px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 700px; background: #1e293b; padding: 25px; border-radius: 12px; }
        h1 { text-align: center; color: #38bdf8; margin-top: 0; }
        .status { background: #0f172a; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #38bdf8; font-size: 15px; }
        label { font-weight: bold; color: #94a3b8; display: block; margin-bottom: 6px; }
        input[type="text"], textarea { width: 100%; padding: 12px; margin-bottom: 15px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; box-sizing: border-box; }
        textarea { height: 160px; font-family: monospace; color: #38bdf8; }
        button { width: 100%; padding: 12px; background: #22c55e; border: none; color: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 15px; }
        .logs { background: #020617; padding: 12px; border-radius: 6px; height: 130px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #a3e635; margin-top: 15px; border: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚡ Bảng Điều Khiển Bot 24/7</h1>
        <div class="status">Trạng thái: <strong>${botStatus}</strong></div>
        
        <form action="/run-bot" method="POST">
          <label>Nhập Mã Token Bot Discord:</label>
          <input type="text" name="token" value="${global.savedToken}" placeholder="Dán Token vào đây..." required />

          <label>Viết Code JS (Tùy chọn):</label>
          <textarea name="botCode" placeholder="// Nhập code xử lý bot ở đây..."></textarea>

          <button type="submit">🚀 Lưu & Khởi Động Bot Trực Tiếp Trên Web</button>
        </form>

        <label style="margin-top: 20px;">Nhật ký hệ thống (Console Logs):</label>
        <div class="logs">
          ${lastLogs.map(l => `<div>${l}</div>`).join('') || '<div>Chưa có log...</div>'}
        </div>
      </div>
    </body>
    </html>
  `);
});

app.post('/run-bot', (req, res) => {
  const { token, botCode } = req.body;
  if (token) {
    global.savedToken = token;
    startBot(token, botCode);
  }
  res.redirect('/');
});

// Tự động giữ kết nối bot dựa trên Token đã dán trên Web
setInterval(() => {
  if (global.savedToken && (!botClient || !botClient.user)) {
    logMessage("Hệ thống tự động kết nối lại Bot bằng Token đã dán trên Web...");
    startBot(global.savedToken);
  }
}, 30000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
