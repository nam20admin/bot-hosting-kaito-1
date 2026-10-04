const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Lưu trữ danh sách các Bot đang chạy
let activeBots = []; 
let lastLogs = [];

const logMessage = (msg) => {
  const time = new Date().toLocaleTimeString();
  lastLogs.push(`[${time}] ${msg}`);
  if (lastLogs.length > 25) lastLogs.shift();
  console.log(msg);
};

// Hàm khởi tạo và chạy 1 Bot
function launchBot(token, botCode = null) {
  // Kiểm tra xem Token này đã được chạy chưa
  const existingBot = activeBots.find(b => b.token === token);
  if (existingBot) {
    existingBot.client.destroy();
    activeBots = activeBots.filter(b => b.token !== token);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  const botData = {
    token: token,
    client: client,
    tag: "Đang kết nối...",
    status: "🟡 Đang khởi động..."
  };

  if (botCode && botCode.trim() !== '') {
    try {
      const runCustomCode = new Function('client', botCode);
      runCustomCode(client);
    } catch (err) {
      logMessage(`Lỗi Code JS: ${err.message}`);
    }
  } else {
    client.on('messageCreate', (message) => {
      if (message.author.bot) return;
      if (message.content === '!ping') {
        message.reply('Pong! Bot đang online 24/7!');
      }
    });
  }

  client.once('ready', () => {
    botData.tag = client.user.tag;
    botData.status = "🟢 Online 24/7";
    logMessage(` Bot đã kết nối thành công: ${client.user.tag}`);
  });

  client.login(token).catch(err => {
    botData.status = "🔴 Lỗi Token!";
    logMessage(` Lỗi đăng nhập: ${err.message}`);
  });

  activeBots.push(botData);
}

// Lưu danh sách Token vào bộ nhớ máy chủ
global.savedTokens = global.savedTokens || [];

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quản Lý Khởi Chạy Nhiều Bot 24/7</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: white; padding: 20px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 800px; background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        h1 { text-align: center; color: #38bdf8; margin-top: 0; font-size: 22px; }
        .status-box { background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #334155; }
        .bot-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #1e293b; border-radius: 6px; margin-top: 8px; font-family: monospace; }
        label { font-weight: bold; color: #94a3b8; display: block; margin-bottom: 6px; font-size: 14px; }
        input[type="password"], textarea { width: 100%; padding: 12px; margin-bottom: 15px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; box-sizing: border-box; }
        textarea { height: 120px; font-family: monospace; color: #38bdf8; }
        .btn-group { display: flex; gap: 10px; }
        button { flex: 1; padding: 12px; background: #22c55e; border: none; color: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 15px; }
        button:hover { background: #16a34a; }
        .btn-stop-all { background: #ef4444; }
        .btn-stop-all:hover { background: #dc2626; }
        .logs { background: #020617; padding: 12px; border-radius: 6px; height: 130px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #a3e635; margin-top: 15px; border: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚡ Quản Lý & Chạy Nhiều Bot Discord 24/7</h1>
        
        <div class="status-box">
          <label>Danh sách Bot đang chạy (${activeBots.length}):</label>
          ${
            activeBots.length === 0 
            ? '<div style="color: #64748b; font-size: 13px;">Chưa có Bot nào được bật.</div>'
            : activeBots.map(b => `
                <div class="bot-item">
                  <span>🤖 <strong>${b.tag}</strong></span>
                  <span>${b.status}</span>
                </div>
              `).join('')
          }
        </div>
        
        <form action="/add-bot" method="POST">
          <label>Nhập Token Bot Mới (Mỗi lần nhập 1 Token):</label>
          <input type="password" name="token" placeholder="Dán mã Token Bot Discord vào đây..." required />

          <label>Viết Code JS Tùy Chỉnh Cho Bot Trên (Tùy chọn):</label>
          <textarea name="botCode" placeholder="// Code xử lý riêng cho Bot này (để trống nếu dùng lệnh !ping mặc định)"></textarea>

          <div class="btn-group">
            <button type="submit">🚀 Bật Thêm Bot Này</button>
          </div>
        </form>

        <form action="/stop-all" method="POST" style="margin-top: 10px;">
          <button type="submit" class="btn-stop-all">🛑 Dừng Tất Cả Bot</button>
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

// Route thêm Bot mới
app.post('/add-bot', (req, res) => {
  const { token, botCode } = req.body;
  if (token) {
    if (!global.savedTokens.includes(token)) {
      global.savedTokens.push(token);
    }
    launchBot(token, botCode);
  }
  res.redirect('/');
});

// Route tắt tất cả Bot
app.post('/stop-all', (req, res) => {
  activeBots.forEach(b => b.client.destroy());
  activeBots = [];
  global.savedTokens = [];
  logMessage("Đã dừng tất cả các Bot.");
  res.redirect('/');
});

// Tự động duy trì các Bot đã thêm
setInterval(() => {
  if (global.savedTokens.length > 0) {
    global.savedTokens.forEach(token => {
      const isRunning = activeBots.some(b => b.token === token && b.client.user);
      if (!isRunning) {
        logMessage("Tự động kết nối lại Bot...");
        launchBot(token);
      }
    });
  }
}, 30000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
