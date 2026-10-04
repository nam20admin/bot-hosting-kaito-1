const express = require('express');
const multer = require('multer');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.json({ limit: '100mb' }));

const UPLOAD_DIR = path.join(__dirname, 'user_bots');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

let activeBots = {};
let systemLogs = [];

const logMessage = (msg) => {
  const time = new Date().toLocaleTimeString();
  systemLogs.push(`[${time}] ${msg}`);
  if (systemLogs.length > 100) systemLogs.shift();
  console.log(msg);
};

// Tự động kiểm tra và cài đặt thư viện thiếu trước khi chạy
function ensureEnvironment(filePath, language) {
  try {
    logMessage(`⚡ [Auto-Installer] Đang kiểm tra môi trường cho ${language}...`);
    if (language === 'python') {
      execSync('pip3 install discord.py requests aiohttp python-dotenv --break-system-packages || pip install discord.py requests aiohttp python-dotenv');
      logMessage(`✅ [Auto-Installer] Cài đặt thư viện Python hoàn tất!`);
    } else {
      try { require.resolve('discord.js'); } catch (e) {
        execSync('npm install discord.js');
        logMessage(`✅ [Auto-Installer] Cài đặt discord.js hoàn tất!`);
      }
    }
  } catch (err) {
    logMessage(`⚠️ Cảnh báo môi trường: ${err.message}`);
  }
}

// Khởi chạy tiến trình Bot với cơ chế Auto-Restart
function startBotProcess(fileName, language) {
  const filePath = path.join(UPLOAD_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return logMessage(`❌ Lỗi: Không tìm thấy file ${fileName}!`);
  }

  // Tắt tiến trình cũ nếu đang chạy
  if (activeBots[fileName] && activeBots[fileName].process) {
    try { activeBots[fileName].process.kill(); } catch (e) {}
  }

  ensureEnvironment(filePath, language);

  let botProcess = null;
  if (language === 'python') {
    // cờ -u giúp đẩy log ra màn hình realtime
    botProcess = spawn('python3', ['-u', filePath]);
  } else {
    botProcess = spawn('node', [filePath]);
  }

  activeBots[fileName] = {
    name: fileName,
    lang: language.toUpperCase(),
    status: 'ONLINE',
    process: botProcess,
    startTime: new Date().toLocaleTimeString()
  };

  logMessage(`🚀 [${fileName}] Kích hoạt tiến trình Bot ONLINE thành công!`);

  botProcess.stdout.on('data', (data) => logMessage(`[${fileName} LOG]: ${data.toString().trim()}`));
  botProcess.stderr.on('data', (data) => logMessage(`[${fileName} LỖI]: ${data.toString().trim()}`));
  
  botProcess.on('close', (code) => {
    logMessage(`⚠️ [${fileName}] Dừng tiến trình (Exit Code: ${code})`);
    if (activeBots[fileName]) activeBots[fileName].status = 'OFFLINE';
  });
}

// APIs
app.get('/api/file-content', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.query.name);
  if (fs.existsSync(filePath)) {
    res.json({ success: true, content: fs.readFileSync(filePath, 'utf8') });
  } else {
    res.json({ success: false });
  }
});

// Interface
app.get('/', (req, res) => {
  const botList = Object.values(activeBots);
  const files = fs.readdirSync(UPLOAD_DIR);
  const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
  const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);

  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kaito Cloud Platform - Bot Hosting 24/7</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
      <style>
        :root { --bg-dark: #080c14; --bg-sidebar: #0f172a; --bg-card: #1e293b; --border: #334155; --primary: #38bdf8; --success: #22c55e; --danger: #ef4444; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg-dark); color: #f8fafc; display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 280px; background: var(--bg-sidebar); border-right: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column; gap: 15px; }
        .logo { font-size: 18px; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 10px; }
        .file-tree { flex: 1; background: #020617; border: 1px solid var(--border); border-radius: 10px; padding: 10px; overflow-y: auto; }
        .file-item { padding: 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .file-item:hover { background: #1e293b; color: #fff; }
        .main { flex: 1; padding: 25px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
        textarea { width: 100%; height: 300px; background: #020617; border: 1px solid var(--border); border-radius: 10px; color: #38bdf8; font-family: 'JetBrains Mono', monospace; padding: 15px; font-size: 13px; outline: none; }
        input, select { background: #020617; border: 1px solid var(--border); color: #fff; padding: 10px; border-radius: 8px; font-size: 13px; width: 100%; margin-bottom: 10px; }
        .btn { background: #0284c7; border: none; color: white; padding: 12px; border-radius: 8px; font-weight: 700; cursor: pointer; width: 100%; font-size: 14px; }
        .btn-danger { background: var(--danger); width: auto; }
        .terminal { background: #020617; border: 1px solid var(--border); border-radius: 10px; padding: 15px; height: 180px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #a3e635; }
      </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="logo"><i class="fa-solid fa-server"></i> KAITO HOSTING</div>
        <div style="font-size: 12px; font-weight: bold; color: #94a3b8;">TỆP DỰ ÁN</div>
        <form action="/upload-files" method="POST" enctype="multipart/form-data">
          <input type="file" name="botFiles" multiple required style="font-size:11px;" />
          <button type="submit" class="btn" style="font-size:12px; padding:8px; margin-top:5px;">Upload File</button>
        </form>
        <div class="file-tree">
          ${files.map(f => `<div class="file-item" onclick="openFile('${f}')"><i class="fa-regular fa-file-code"></i> ${f}</div>`).join('')}
        </div>
      </div>

      <div class="main">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0;">Dashboard Quản Lý Bot 24/7</h2>
          <form action="/stop-all" method="POST" style="margin:0;"><button class="btn btn-danger">Tắt Tất Cả Bot</button></form>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">Trình Soạn Thảo & Khởi Chạy IDE</h3>
          <form action="/save-and-run" method="POST">
            <div style="display:flex; gap:10px;">
              <div style="flex:1;">
                <label style="font-size:12px;">Tên File Chạy:</label>
                <input type="text" name="fileName" id="currentFileName" value="chat.py" required />
              </div>
              <div style="flex:1;">
                <label style="font-size:12px;">Ngôn Ngữ:</label>
                <select name="language" id="langSelect" required>
                  <option value="python">Python 3 (.py)</option>
                  <option value="nodejs">Node.js (.js)</option>
                </select>
              </div>
            </div>
            <textarea name="codeContent" id="codeEditor"></textarea>
            <button type="submit" class="btn" style="margin-top:10px;">🚀 KÍCH HOẠT BOT ONLINE NGAY</button>
          </form>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">Console Logs</h3>
          <div class="terminal">${systemLogs.map(l => `<div>${l}</div>`).join('') || 'Chờ kích hoạt...'}</div>
        </div>
      </div>

      <script>
        const pyDefault = \`import discord\\n\\nintents = discord.Intents.default()\\nintents.message_content = True\\nclient = discord.Client(intents=intents)\\n\\n@client.event\\nasync def on_ready():\\n    print(f'✅ BOT ĐÃ CHÍNH THỨC ONLINE 100%: {client.user}')\\n\\n@client.event\\nasync def on_message(message):\\n    if message.author == client.user:\\n        return\\n    if message.content == '!ping':\\n        await message.channel.send('Pong! Bot đang chạy 24/7 🚀')\\n\\nclient.run('DÁN_TOKEN_CỦA_BẠN_VÀO_ĐÂY')\`;

        document.getElementById('codeEditor').value = pyDefault;

        function openFile(fileName) {
          fetch('/api/file-content?name=' + encodeURIComponent(fileName))
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                document.getElementById('currentFileName').value = fileName;
                document.getElementById('codeEditor').value = data.content;
                document.getElementById('langSelect').value = fileName.endsWith('.js') ? 'nodejs' : 'python';
              }
            });
        }
      </script>
    </body>
    </html>
  `);
});

app.post('/upload-files', upload.array('botFiles', 30), (req, res) => res.redirect('/'));

app.post('/save-and-run', (req, res) => {
  const { fileName, language, codeContent } = req.body;
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, codeContent);
  startBotProcess(fileName, language);
  res.redirect('/');
});

app.post('/stop-all', (req, res) => {
  Object.values(activeBots).forEach(b => { if (b.process) b.process.kill(); });
  activeBots = {};
  logMessage("Đã tắt toàn bộ bot.");
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Online tại port ${PORT}`));
