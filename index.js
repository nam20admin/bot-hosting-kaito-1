const express = require('express');
const multer = require('multer');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// Tự động kiểm tra môi trường Python & cài đặt thư viện cần thiết
try {
  console.log("Đang đồng bộ môi trường Python & Node.js...");
  execSync('pip3 install discord.py requests --break-system-packages || pip install discord.py requests');
  console.log("Môi trường đã sẵn sàng!");
} catch (err) {
  console.log("Lưu ý môi trường:", err.message);
}

const UPLOAD_DIR = path.join(__dirname, 'user_bots');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const upload = multer({ dest: UPLOAD_DIR });

let activeBots = {};
let systemLogs = [];

const logMessage = (msg) => {
  const time = new Date().toLocaleTimeString();
  systemLogs.push(`[${time}] ${msg}`);
  if (systemLogs.length > 50) systemLogs.shift();
  console.log(msg);
};

// Hàm điều khiển tiến trình Bot
function startBotProcess(fileName, language, filePath) {
  if (activeBots[fileName] && activeBots[fileName].process) {
    try { activeBots[fileName].process.kill(); } catch (e) {}
  }

  let botProcess = null;
  if (language === 'python') {
    botProcess = spawn('python3', ['-u', filePath]);
  } else {
    botProcess = spawn('node', [filePath]);
  }

  activeBots[fileName] = {
    name: fileName,
    lang: language.toUpperCase(),
    status: 'ONLINE',
    process: botProcess,
    filePath: filePath,
    startTime: new Date().toLocaleTimeString()
  };

  logMessage(`🚀 [${fileName}] Tiến trình đã khởi chạy thành công.`);

  botProcess.stdout.on('data', (data) => {
    logMessage(`[${fileName} - LOG]: ${data.toString().trim()}`);
  });

  botProcess.stderr.on('data', (data) => {
    logMessage(`[${fileName} - LỖI]: ${data.toString().trim()}`);
  });

  botProcess.on('close', (code) => {
    logMessage(`⚠️ [${fileName}] Tiến trình đã dừng (Exit code: ${code})`);
    if (activeBots[fileName]) activeBots[fileName].status = 'OFFLINE';
  });
}

// Giao diện chính chuẩn Web Hosting
app.get('/', (req, res) => {
  const botList = Object.values(activeBots);
  
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kaito Hosting - Cloud Bot Panel 24/7</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        :root { --bg-dark: #090d16; --bg-card: #111827; --border: #1f2937; --primary: #3b82f6; --success: #10b981; --danger: #ef4444; }
        body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: var(--bg-dark); color: #f3f4f6; display: flex; height: 100vh; overflow: hidden; }
        
        /* Sidebar Navigation */
        .sidebar { width: 240px; background: #0f172a; border-right: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column; gap: 20px; }
        .logo { font-size: 18px; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 10px; }
        .nav-btn { background: transparent; border: none; color: #9ca3af; padding: 12px 16px; border-radius: 8px; text-align: left; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; }
        .nav-btn.active, .nav-btn:hover { background: #1e293b; color: white; }
        
        /* Main Content Area */
        .main { flex: 1; padding: 25px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
        
        /* Bot Cards Grid */
        .bot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-top: 10px; }
        .bot-card { background: #1f293d; border: 1px solid var(--border); border-radius: 10px; padding: 15px; }
        .badge { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; }
        .badge-online { background: rgba(16, 185, 129, 0.2); color: var(--success); }
        .badge-offline { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        
        /* Web Code Editor */
        textarea { width: 100%; height: 320px; background: #030712; border: 1px solid var(--border); border-radius: 8px; color: #38bdf8; font-family: 'Fira Code', monospace; padding: 15px; box-sizing: border-box; font-size: 13px; resize: vertical; line-height: 1.5; }
        input, select { background: #030712; border: 1px solid var(--border); color: white; padding: 10px; border-radius: 6px; box-sizing: border-box; width: 100%; margin-bottom: 12px; }
        .btn { background: var(--primary); border: none; color: white; padding: 10px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn:hover { opacity: 0.9; }
        .btn-danger { background: var(--danger); }
        
        /* Console Logs */
        .console { background: #020617; border: 1px solid var(--border); border-radius: 8px; padding: 15px; height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #a3e635; }
      </style>
    </head>
    <body>

      <div class="sidebar">
        <div class="logo"><i class="fa-solid fa-server"></i> KAITO HOSTING</div>
        <button class="nav-btn active"><i class="fa-solid fa-gauge"></i> Dashboard</button>
        <button class="nav-btn"><i class="fa-solid fa-code"></i> Code IDE</button>
        <button class="nav-btn"><i class="fa-solid fa-terminal"></i> Terminal Logs</button>
      </div>

      <div class="main">
        <div class="header">
          <h2><i class="fa-solid fa-sliders"></i> Bảng Điều Khiển Bot Cloud</h2>
          <form action="/stop-all" method="POST" style="margin:0;">
            <button class="btn btn-danger"><i class="fa-solid fa-power-off"></i> Tắt Tất Cả Bot</button>
          </form>
        </div>

        <!-- Trạng Thái Bot -->
        <div class="card">
          <h3><i class="fa-solid fa-robot"></i> Danh Sách Bot Đang Vận Hành (${botList.length})</h3>
          <div class="bot-grid">
            ${botList.length === 0 ? '<div style="color: #6b7280;">Chưa có bot nào được khởi tạo.</div>' : ''}
            ${botList.map(b => `
              <div class="bot-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <strong>${b.name}</strong>
                  <span class="badge ${b.status === 'ONLINE' ? 'badge-online' : 'badge-offline'}">${b.status}</span>
                </div>
                <div style="font-size:12px; color:#9ca3af;">Ngôn ngữ: ${b.lang}</div>
                <div style="font-size:12px; color:#9ca3af; margin-bottom:10px;">Chạy lúc: ${b.startTime}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Trình Soạn Thảo Code IDE -->
        <div class="card">
          <h3><i class="fa-solid fa-code"></i> Trình Lập Trình Web IDE (Python / Node.js)</h3>
          <form action="/save-and-run" method="POST">
            <div style="display:flex; gap:10px;">
              <div style="flex:1;">
                <label>Tên Tệp Code:</label>
                <input type="text" name="fileName" value="main.py" required />
              </div>
              <div style="flex:1;">
                <label>Môi Trường / Ngôn Ngữ:</label>
                <select name="language" id="langSelect" required>
                  <option value="python">Python 3 (.py)</option>
                  <option value="nodejs">Node.js (.js)</option>
                </select>
              </div>
            </div>

            <label>Soạn Thảo Mã Nguồn Bot (Tự động giữ Token & Logic):</label>
            <textarea name="codeContent" id="codeEditor"></textarea>

            <button type="submit" class="btn" style="width:100%; margin-top:10px;"><i class="fa-solid fa-play"></i> Lưu & Khởi Chạy Bot 24/7</button>
          </form>
        </div>

        <!-- Terminal Logs -->
        <div class="card">
          <h3><i class="fa-solid fa-terminal"></i> Console Logs (Thời Gian Thực)</h3>
          <div class="console">
            ${systemLogs.map(l => `<div>${l}</div>`).join('') || '<div>Hệ thống đang chờ lệnh...</div>'}
          </div>
        </div>
      </div>

      <script>
        const pySample = \`import discord\\n\\nintents = discord.Intents.default()\\nintents.message_content = True\\nclient = discord.Client(intents=intents)\\n\\n@client.event\\nasync def on_ready():\\n    print(f'Bot Python đã kết nối thành công: {client.user}')\\n\\n@client.event\\nasync def on_message(message):\\n    if message.author == client.user:\\n        return\\n    if message.content == '!ping':\\n        await message.channel.send('Pong! 🚀')\\n\\nclient.run('DÁN_TOKEN_BOT_VÀO_ĐÂY')\`;

        const jsSample = \`const { Client, GatewayIntentBits } = require('discord.js');\\nconst client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });\\n\\nclient.on('ready', () => {\\n  console.log(\\\`Bot Node.js đã kết nối thành công: \\\${client.user.tag}\\\`);\\n});\\n\\nclient.on('messageCreate', (message) => {\\n  if (message.content === '!ping') message.reply('Pong! 🚀');\\n});\\n\\nclient.login('DÁN_TOKEN_BOT_VÀO_ĐÂY');\`;

        const langSelect = document.getElementById('langSelect');
        const codeEditor = document.getElementById('codeEditor');

        codeEditor.value = pySample;

        langSelect.addEventListener('change', (e) => {
          if (e.target.value === 'python') {
            codeEditor.value = pySample;
          } else {
            codeEditor.value = jsSample;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Xử lý lưu & chạy
app.post('/save-and-run', (req, res) => {
  const { fileName, language, codeContent } = req.body;
  if (!fileName || !codeContent) return res.redirect('/');

  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, codeContent);

  startBotProcess(fileName, language, filePath);
  res.redirect('/');
});

// Xử lý tắt tất cả
app.post('/stop-all', (req, res) => {
  Object.values(activeBots).forEach(b => {
    if (b.process) {
      try { b.process.kill(); } catch (e) {}
    }
  });
  activeBots = {};
  logMessage("Đã tắt toàn bộ bot đang chạy.");
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Kaito Hosting đang hoạt động tại cổng ${PORT}`));
