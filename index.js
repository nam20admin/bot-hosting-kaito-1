const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let botClient = null;
let botStatus = "Chưa kích hoạt";
let lastLogs = [];

// Hàm ghi log ra giao diện web
const logMessage = (msg) => {
  const time = new Date().toLocaleTimeString();
  lastLogs.push(`[${time}] ${msg}`);
  if (lastLogs.length > 20) lastLogs.shift();
  console.log(msg);
};

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>IDE Quản Lý & Chạy Bot 24/7</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 800px; background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { margin-top: 0; color: #38bdf8; font-size: 22px; text-align: center; }
        .status-box { background: #0f172a; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #38bdf8; font-size: 14px; }
        label { font-weight: bold; font-size: 14px; color: #94a3b8; display: block; margin-bottom: 6px; }
        input[type="text"] { width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; box-sizing: border-box; font-family: monospace; }
        textarea { width: 100%; height: 220px; padding: 12px; margin-bottom: 15px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #38bdf8; box-sizing: border-box; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; line-height: 1.4; resize: vertical; }
        .btn-group { display: flex; gap: 10px; }
        button { flex: 1; padding: 12px; border: none; color: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px; transition: 0.2s; }
        .btn-run { background: #22c55e; }
        .btn-run:hover { background: #16a34a; }
        .btn-stop { background: #ef4444; }
        .btn-stop:hover { background: #dc2626; }
        .logs-box { margin-top: 20px; background: #020617; padding: 12px; border-radius: 6px; height: 120px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #a3e635; border: 1px solid #1e293b; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚡ Bảng Điều Khiển Bot Discord 24/7</h1>
        
        <div class="status-box">
          Trạng thái hiện tại: <strong>${botStatus}</strong>
        </div>

        <form action="/run-bot" method="POST">
          <label>1. Nhập Token Bot Discord:</label>
          <input type="text" name="token" placeholder="Dán mã Token vào đây..." required />

          <label>2. Viết / Sửa Code Bot (JavaScript):</label>
          <textarea name="botCode" placeholder="Nhập code xử lý sự kiện bot tại đây...">// Viết code xử lý sự kiện Bot tại đây:
client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (message.content === '!ping') {
    message.reply('Pong! Bot đang online 24/7 trên Render!');
  }
});</textarea>

          <div class="btn-group">
            <button type="submit" class="btn-run">🚀 Chạy Bot Ngay</button>
          </div>
        </form>

        <form action="/stop-bot" method="POST" style="margin-top: 10px;">
          <button type="submit" class="btn-stop">🛑 Dừng Bot</button>
        </form>

        <label style="margin-top: 20px;">Nhật ký hệ thống (Console Logs):</label>
        <div class="logs-box">
          ${lastLogs.map(log => `<div>${log}</div>`).join('') || '<div>Chưa có dữ liệu log...</div>'}
        </div>
      </div>
    </body>
    </html>
  `);
});

app.post('/run-bot', (req, res) => {
  const { token, botCode } = req.body;

  if (botClient) {
    botClient.destroy();
    logMessage("Đã tắt session bot cũ.");
  }

  botClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  try {
    const runCustomCode = new Function('client', botCode);
    runCustomCode(botClient);

    botClient.once('ready', () => {
      botStatus = `🟢 Đang chạy 24/7 (${botClient.user.tag})`;
      logMessage(`Bot đã kết nối thành công: ${botClient.user.tag}`);
    });

    botClient.login(token).then(() => {
      res.redirect('/');
    }).catch(err => {
      botStatus = "🔴 Lỗi: Token không hợp lệ!";
      logMessage(`Lỗi Login: ${err.message}`);
      res.redirect('/');
    });

  } catch (err) {
    botStatus = "🔴 Lỗi: Code JS bị lỗi cú pháp!";
    logMessage(`Lỗi Syntax Code: ${err.message}`);
    res.redirect('/');
  }
});

app.post('/stop-bot', (req, res) => {
  if (botClient) {
    botClient.destroy();
    botClient = null;
    botStatus = "Chưa kích hoạt";
    logMessage("Đã dừng bot thành công.");
  }
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
