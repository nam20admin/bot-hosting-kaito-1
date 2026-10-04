const express = require('express');
const multer = require('multer');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// 1. Tự động kiểm tra và cài đặt thư viện cần thiết để bot ON 100%
try {
  console.log("Đang kiểm tra và cài đặt thư viện Python (discord.py)...");
  execSync('pip3 install discord.py requests --break-system-packages || pip install discord.py requests');
  console.log("Cài đặt môi trường Python thành công!");
} catch (err) {
  console.log("Cài đặt Python thông báo:", err.message);
}

const UPLOAD_DIR = path.join(__dirname, 'user_bots');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const upload = multer({ dest: UPLOAD_DIR });

let activeBots = [];
let lastLogs = [];

const logMessage = (msg) => {
  const time = new Date().toLocaleTimeString();
  lastLogs.push(`[${time}] ${msg}`);
  if (lastLogs.length > 40) lastLogs.shift();
  console.log(msg);
};

// Hàm khởi chạy tiến trình Bot
function runBotProcess(botId, filePath, language, originalName) {
  // Tắt tiến trình cũ nếu đang chạy trùng ID
  const existingIndex = activeBots.findIndex(b => b.id === botId);
  if (existingIndex !== -1) {
    if (activeBots[existingIndex].process) {
      try { activeBots[existingIndex].process.kill(); } catch (e) {}
    }
    activeBots.splice(existingIndex, 1);
  }

  let botProcess = null;

  if (language === 'python') {
    logMessage(`🚀 Đang khởi chạy Bot Python: ${originalName}`);
    botProcess = spawn('python3', ['-u', filePath]);
  } else {
    logMessage(`🚀 Đang khởi chạy Bot Node.js: ${originalName}`);
    botProcess = spawn('node', [filePath]);
  }

  const botData = {
    id: botId,
    name: originalName,
    lang: language.toUpperCase(),
    status: '🟢 Online 24/7',
    process: botProcess,
    filePath: filePath
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

// Giao diện Web Hosting & Code Editor
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lập Trình & Hosting Bot Discord 24/7</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: white; padding: 20px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 900px; background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        h1 { text-align: center; color: #38bdf8; margin-top: 0; font-size: 22px; }
        .status-box { background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #334155; }
        .bot-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #1e293b; border-radius: 6px; margin-top: 8px; font-family: monospace; }
        label { font-weight: bold; color: #94a3b8; display: block; margin-top: 12px; margin-bottom: 6px; font-size: 14px; }
        input[type="text"], input[type="file"], select, textarea { 
          width: 100%; padding: 10px; margin-bottom: 10px; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; box-sizing: border-box; 
        }
        textarea { height: 220px; font-family: 'Consolas', 'Courier New', monospace; color: #38bdf8; font-size: 13px; line-height: 1.4; resize: vertical; }
        button { width: 100%; padding: 12px; background: #22c55e; border: none; color: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 15px; margin-top: 8px; }
        button:hover { background: #16a34a; }
        .btn-danger { background: #ef4444; margin-top: 15px; }
        .btn-danger:hover { background: #dc2626; }
        .logs { background: #020617; padding: 12px; border-radius: 6px; height: 180px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #a3e635; margin-top: 15px; border: 1px solid #334155; }
        .section-title { color: #f59e0b; border-bottom: 1px solid #334155; padding-bottom: 5px; margin-top: 20px; font-size: 16px; font-weight: bold; }
        .flex-row { display: flex; gap: 10px; }
        .flex-row > div { flex: 1; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚡ Web Hosting & Trình Soạn Thảo Code Bot Discord</h1>
        
        <!-- Bảng Trạng Thái Bot -->
        <div class="status-box">
          <label style="margin-top:0;">Trạng Thái Bot Đang Chạy (${activeBots.length}):</label>
          ${
            activeBots.length === 0 
            ? '<div style="color: #64748b; font-size: 13px;">Chưa có bot nào đang hoạt động.</div>'
            : activeBots.map(b => `
                <div class="bot-item">
                  <span>🤖 <strong>${b.name}</strong> [${b.lang}]</span>
                  <span>${b.status}</span>
                </div>
              `).join('')
          }
        </div>

        <!-- PHẦN 1: TRÌNH SOẠN THẢO CODE TRỰC TIẾP TRÊN WEB -->
        <div class="section-title">💻 Trình Soạn Thảo Code (Lập Trình Trực Tiếp Trên Web)</div>
        <form action="/save-and-run" method="POST">
          <div class="flex-row">
            <div>
              <label>Tên File (Ví dụ: main.py hoặc bot.js):</label>
              <input type="text" name="fileName" value="main.py" required />
            </div>
            <div>
              <label>Ngôn Ngữ Lập Trình:</label>
              <select name="language" required>
                <option value="python">Python (.py)</option>
                <option value="nodejs">Node.js (.js)</option>
              </select>
            </div>
          </div>

          <label>Viết / Sửa Mã Code Bot Tại Đây:</label>
          <textarea name="codeContent" placeholder="Viết code bot Discord của bạn ở đây..."></textarea>

          <button type="submit">💾 Lưu File & Kích Hoạt Bot Ngay</button>
        </form>

        <!-- PHẦN 2: UPLOAD FILE CÓ SẴN TỪ MÁY TÍNH -->
        <div class="section-title">📁 Hoặc Tải File Code Có Sẵn Từ Máy Tính</div>
        <form action="/upload-bot" method="POST" enctype="multipart/form-data">
          <div class="flex-row">
            <div>
              <label>Chọn Ngôn Ngữ:</label>
              <select name="language" required>
                <option value="python">Python (.py)</option>
                <option value="nodejs">Node.js (.js)</option>
              </select>
            </div>
            <div>
              <label>Chọn File (.py hoặc .js):</label>
              <input type="file" name="botFile" required />
            </div>
          </div>
          <button type="submit">🚀 Upload & Chạy Bot</button>
        </form>

        <form action="/stop-all" method="POST">
          <button type="submit" class="btn-danger">🛑 Dừng Tất Cả Bot</button>
        </form>

        <!-- PHẦN 3: CONSOLE LOGS -->
        <label style="margin-top: 20px;">Nhật Ký Hệ Thống (Console Logs):</label>
        <div class="logs">
          ${lastLogs.map(l => `<div>${l}</div>`).join('') || '<div>Chưa có log thực thi...</div>'}
        </div>
      </div>

      <script>
        // Code mẫu mặc định cho Trình Soạn Thảo khi đổi Ngôn Ngữ
        const pySample = \`import discord\\n\\nintents = discord.Intents.default()\\nintents.message_content = True\\nclient = discord.Client(intents=intents)\\n\\n@client.event\\nasync def on_ready():\\n    print(f'Bot Python đã Online 100%: {client.user}')\\n\\n@client.event\\nasync def on_message(message):\\n    if message.author == client.user:\\n        return\\n    if message.content == '!ping':\\n        await message.channel.send('Pong!')\\n\\nclient.run('ĐÁN_TOKEN_BOT_CỦA_BẠN_VÀO_ĐÂY')\`;

        const jsSample = \`const { Client, GatewayIntentBits } = require('discord.js');\\nconst client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });\\n\\nclient.on('ready', () => {\\n  console.log(\\\`Bot Node.js đã Online 100%: \\\${client.user.tag}\\\`);\\n});\\n\\nclient.on('messageCreate', (message) => {\\n  if (message.content === '!ping') message.reply('Pong!');\\n});\\n\\nclient.login('ĐÁN_TOKEN_BOT_CỦA_BẠN_VÀO_ĐÂY');\`;

        const langSelect = document.querySelector('select[name="language"]');
        const fileInput = document.querySelector('input[name="fileName"]');
        const codeTextarea = document.querySelector('textarea[name="codeContent"]');

        // Tải mẫu code mặc định
        codeTextarea.value = pySample;

        langSelect.addEventListener('change', (e) => {
          if (e.target.value === 'python') {
            fileInput.value = 'main.py';
            codeTextarea.value = pySample;
          } else {
            fileInput.value = 'bot.js';
            codeTextarea.value = jsSample;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Route 1: Lưu File & Chạy trực tiếp từ Trình Soạn Thảo
app.post('/save-and-run', (req, res) => {
  const { fileName, language, codeContent } = req.body;
  if (!fileName || !codeContent) return res.redirect('/');

  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, codeContent);

  const botId = fileName; // Dùng tên file làm ID để đè tiến trình nếu sửa lại code
  runBotProcess(botId, filePath, language, fileName);

  res.redirect('/');
});

// Route 2: Upload File từ máy tính
app.post('/upload-bot', upload.single('botFile'), (req, res) => {
  if (!req.file) return res.redirect('/');

  const language = req.body.language;
  const originalName = req.file.originalname;
  const filePath = req.file.path;
  const botId = originalName;

  runBotProcess(botId, filePath, language, originalName);
  res.redirect('/');
});

// Route 3: Dừng toàn bộ bot
app.post('/stop-all', (req, res) => {
  activeBots.forEach(b => {
    if (b.process) {
      try { b.process.kill(); } catch (e) {}
    }
  });
  activeBots = [];
  logMessage("Đã tắt toàn bộ tiến trình Bot.");
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy tại port ${PORT}`));
