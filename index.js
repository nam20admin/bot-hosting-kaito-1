const express = require('express');
const multer = require('multer');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Tự động kiểm tra & cài đặt thư viện Python (discord.py) khi khởi động
try {
  console.log("Đang kiểm tra và cài đặt thư viện Python (discord.py)...");
  execSync('pip3 install discord.py requests --break-system-packages || pip install discord.py requests');
  console.log("Cài đặt thư viện Python hoàn tất!");
} catch (err) {
  console.log("Lưu ý cài đặt Python:", err.message);
}

// Thư mục lưu trữ file bot
const UPLOAD_DIR = path.join(__dirname, 'user_bots');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const upload = multer({ dest: UPLOAD_DIR });

let activeBots = [];
let lastLogs = [];

const logMessage = (msg) => {
  const time = new Date().toLocaleTimeString();
  lastLogs.push(`[${time}] ${msg}`);
  if (lastLogs.length > 35) lastLogs.shift();
  console.log(msg);
};

// Hàm khởi chạy tiến trình Bot độc lập
function launchBotProcess(botId, filePath, language, displayName) {
  const existingIndex = activeBots.findIndex(b => b.id === botId);
  if (existingIndex !== -1) {
    if (activeBots[existingIndex].process) activeBots[existingIndex].process.kill();
    activeBots.splice(existingIndex, 1);
  }

  let botProcess = null;
  if (language === 'python') {
    logMessage(`🚀 Khởi chạy Bot Python: ${displayName}`);
    botProcess = spawn('python3', [filePath]);
  } else {
    logMessage(`🚀 Khởi chạy Bot Node.js: ${displayName}`);
    botProcess = spawn('node', [filePath]);
  }

  const botData = {
    id: botId,
    name: displayName,
    lang: language.toUpperCase(),
    status: '🟢 Online 24/7',
    process: botProcess
  };

  botProcess.stdout.on('data', (data) => {
    logMessage(`[${displayName}]: ${data.toString().trim()}`);
  });

  botProcess.stderr.on('data', (data) => {
    logMessage(`[${displayName} LỖI]: ${data.toString().trim()}`);
  });

  botProcess.on('close', (code) => {
    logMessage(`⚠️ Bot ${displayName} đã dừng (Exit code: ${code})`);
    botData.status = '🔴 Đã tắt';
  });

  activeBots.push(botData);
}

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Đa Năng Bot Hosting Panel 24/7</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: white; padding: 20px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 850px; background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        h1 { text-align: center; color: #38bdf8; margin-top: 0; font-size: 22px; }
        .status-box { background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #334155; }
        .bot-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #1e293b; border-radius: 6px; margin-top: 8px; font-family: monospace; }
        label { font-weight: bold; color: #94a3b8; display: block; margin-top: 12px; margin-bottom: 6px; font-size: 14px; }
        input[type="password"], input[type="text"], input[type="file"], select, textarea { 
          width: 100%; padding: 10px; margin-bottom: 10px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; box-sizing: border-box; 
        }
        textarea { height: 110px; font-family: monospace; color: #38bdf8; }
        button { width: 100%; padding: 12px; background: #22c55e; border: none; color: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 15px; margin-top: 10px; }
        button:hover { background: #16a34a; }
        .btn-danger { background: #ef4444; margin-top: 15px; }
        .btn-danger:hover { background: #dc2626; }
        .logs { background: #020617; padding: 12px; border-radius: 6px; height: 180px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #a3e635; margin-top: 15px; border: 1px solid #334155; }
        .section-title { color: #f59e0b; border-bottom: 1px solid #334155; padding-bottom: 5px; margin-top: 15px; font-size: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚡ Bảng Điều Khiển Web Hosting Bot Đa Ngôn Ngữ</h1>
        
        <div class="status-box">
          <label style="margin-top:0;">Danh Sách Bot Đang Chạy (${activeBots.length}):</label>
          ${
            activeBots.length === 0 
            ? '<div style="color: #64748b; font-size: 13px;">Chưa có bot nào được kích hoạt.</div>'
            : activeBots.map(b => `
                <div class="bot-item">
                  <span>🤖 <strong>${b.name}</strong> [${b.lang}]</span>
                  <span>${b.status}</span>
                </div>
              `).join('')
          }
        </div>
        
        <form action="/launch" method="POST" enctype="multipart/form-data">
          <div class="section-title">1. Chọn Ngôn Ngữ Lập Trình</div>
          <select name="language" required>
            <option value="nodejs">Node.js (JavaScript - .js)</option>
            <option value="python">Python (.py)</option>
          </select>

          <div class="section-title">2. Tùy Chọn Khởi Chạy (Chọn 1 trong 3 cách)</div>
          
          <label>Cách A: Tải File Code Có Sẵn (.js hoặc .py):</label>
          <input type="file" name="botFile" />

          <label>Cách B: Hoặc Nhập Mã Token Trực Tiếp (An toàn / Tự ẩn):</label>
          <input type="password" name="token" placeholder="Dán mã Token Bot Discord vào đây..." autocomplete="off" />

          <label>Cách C: Hoặc Dán Code Tùy Chỉnh Vào Đây:</label>
          <textarea name="customCode" placeholder="// Dán trực tiếp đoạn mã code Bot (Node.js hoặc Python) vào đây..."></textarea>

          <button type="submit">🚀 Khởi Chạy Bot Ngay</button>
        </form>

        <form action="/stop-all" method="POST">
          <button type="submit" class="btn-danger">🛑 Dừng Tất Cả Bot</button>
        </form>

        <label style="margin-top: 20px;">Nhật Ký Thực Thi (Console Logs):</label>
        <div class="logs">
          ${lastLogs.map(l => `<div>${l}</div>`).join('') || '<div>Chưa có dữ liệu log...</div>'}
        </div>
      </div>
    </body>
    </html>
  `);
});

app.post('/launch', upload.single('botFile'), (req, res) => {
  const { language, token, customCode } = req.body;
  const botId = Date.now().toString();
  let filePath = '';
  let displayName = '';

  if (req.file) {
    filePath = req.file.path;
    displayName = req.file.originalname;
  } else if (customCode && customCode.trim() !== '') {
    const ext = language === 'python' ? '.py' : '.js';
    const fileName = `code_${botId}${ext}`;
    filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, customCode);
    displayName = `Code_Custom_${botId}${ext}`;
  } else if (token && token.trim() !== '') {
    const cleanToken = token.trim();
    if (language === 'python') {
      const pyCode = `import discord\nintents = discord.Intents.default()\nintents.message_content = True\nclient = discord.Client(intents=intents)\n@client.event\nasync def on_ready():\n    print(f'Bot Python đã Online: {client.user}')\nclient.run('${cleanToken}')`;
      filePath = path.join(UPLOAD_DIR, `token_${botId}.py`);
      fs.writeFileSync(filePath, pyCode);
    } else {
      const jsCode = `const { Client, GatewayIntentBits } = require('discord.js');\nconst client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });\nclient.on('ready', () => console.log('Bot Node.js đã Online: ' + client.user.tag));\nclient.login('${cleanToken}');`;
      filePath = path.join(UPLOAD_DIR, `token_${botId}.js`);
      fs.writeFileSync(filePath, jsCode);
    }
    displayName = `Bot_Token_${botId.slice(-4)}`;
  } else {
    return res.redirect('/');
  }

  launchBotProcess(botId, filePath, language, displayName);
  res.redirect('/');
});

app.post('/stop-all', (req, res) => {
  activeBots.forEach(b => {
    if (b.process) b.process.kill();
  });
  activeBots = [];
  logMessage("Đã tắt toàn bộ tiến trình Bot.");
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang lắng nghe tại port ${PORT}`));
