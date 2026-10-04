const express = require('express');
const multer = require('multer');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Tự động kiểm tra & cài đặt discord.py nếu máy chủ chưa có
try {
  console.log("Đang kiểm tra và tự động cài đặt thư viện Python (discord.py)...");
  execSync('pip3 install discord.py requests --break-system-packages || pip install discord.py requests');
  console.log("Cài đặt thư viện Python thành công!");
} catch (err) {
  console.log("Lưu ý khi cài thư viện Python:", err.message);
}

const UPLOAD_DIR = path.join(__dirname, 'user_bots');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const upload = multer({ dest: UPLOAD_DIR });

let activeBots = [];
let lastLogs = [];

const logMessage = (msg) => {
  const time = new Date().toLocaleTimeString();
  lastLogs.push(`[${time}] ${msg}`);
  if (lastLogs.length > 30) lastLogs.shift();
  console.log(msg);
};

function runBotFromFile(botId, fileName, language, originalName) {
  const filePath = path.join(UPLOAD_DIR, fileName);

  const existingIndex = activeBots.findIndex(b => b.id === botId);
  if (existingIndex !== -1) {
    if (activeBots[existingIndex].process) activeBots[existingIndex].process.kill();
    activeBots.splice(existingIndex, 1);
  }

  let botProcess = null;

  if (language === 'python') {
    logMessage(`🚀 Khởi chạy Bot Python: ${originalName}`);
    // Chạy bằng python3 hoặc python
    botProcess = spawn('python3', [filePath]);
  } else if (language === 'nodejs') {
    logMessage(`🚀 Khởi chạy Bot Node.js: ${originalName}`);
    botProcess = spawn('node', [filePath]);
  }

  const botData = {
    id: botId,
    name: originalName,
    lang: language.toUpperCase(),
    status: '🟢 Online 24/7',
    process: botProcess
  };

  botProcess.stdout.on('data', (data) => {
    logMessage(`[${originalName}]: ${data.toString().trim()}`);
  });

  botProcess.stderr.on('data', (data) => {
    logMessage(`[${originalName} LỖI]: ${data.toString().trim()}`);
  });

  botProcess.on('close', (code) => {
    logMessage(`⚠️ Bot ${originalName} đã dừng (Exit code: ${code})`);
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
      <title>Multi-Language Bot Hosting Panel</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: white; padding: 20px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 800px; background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        h1 { text-align: center; color: #38bdf8; margin-top: 0; font-size: 22px; }
        .status-box { background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #334155; }
        .bot-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #1e293b; border-radius: 6px; margin-top: 8px; font-family: monospace; }
        label { font-weight: bold; color: #94a3b8; display: block; margin-bottom: 6px; font-size: 14px; }
        input[type="file"], select { width: 100%; padding: 10px; margin-bottom: 15px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #22c55e; border: none; color: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 15px; }
        button:hover { background: #16a34a; }
        .btn-danger { background: #ef4444; margin-top: 10px; }
        .btn-danger:hover { background: #dc2626; }
        .logs { background: #020617; padding: 12px; border-radius: 6px; height: 180px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #a3e635; margin-top: 15px; border: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🌐 Web Hosting Discord Bot Đa Ngôn Ngữ</h1>
        
        <div class="status-box">
          <label>Danh Sách Bot Đang Chạy (${activeBots.length}):</label>
          ${
            activeBots.length === 0 
            ? '<div style="color: #64748b; font-size: 13px;">Chưa có file bot nào được tải lên.</div>'
            : activeBots.map(b => `
                <div class="bot-item">
                  <span>🤖 <strong>${b.name}</strong> [${b.lang}]</span>
                  <span>${b.status}</span>
                </div>
              `).join('')
          }
        </div>
        
        <form action="/upload-bot" method="POST" enctype="multipart/form-data">
          <label>1. Chọn Ngôn Ngữ Lập Trình:</label>
          <select name="language" required>
            <option value="nodejs">Node.js (file .js)</option>
            <option value="python">Python (file .py)</option>
          </select>

          <label>2. Tải File Code Bot Lên (.js hoặc .py):</label>
          <input type="file" name="botFile" required />

          <button type="submit">🚀 Upload & Kích Hoạt Bot Ngay</button>
        </form>

        <form action="/stop-all" method="POST">
          <button type="submit" class="btn-danger">🛑 Dừng Tất Cả Bot</button>
        </form>

        <label style="margin-top: 20px;">Console Logs (Nhật Ký Thực Thi):</label>
        <div class="logs">
          ${lastLogs.map(l => `<div>${l}</div>`).join('') || '<div>Chưa có dữ liệu log...</div>'}
        </div>
      </div>
    </body>
    </html>
  `);
});

app.post('/upload-bot', upload.single('botFile'), (req, res) => {
  if (!req.file) return res.redirect('/');
  
  const botId = Date.now().toString();
  const language = req.body.language;
  const fileName = req.file.filename;
  const originalName = req.file.originalname;

  runBotFromFile(botId, fileName, language, originalName);
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
