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

// Auto Resolver: Cài đặt thư viện tự động
function autoInstallModules(filePath, language) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');

    if (language === 'python') {
      const pkgs = [];
      if (content.includes('discord')) pkgs.push('discord.py');
      if (content.includes('requests')) pkgs.push('requests');
      if (content.includes('aiohttp')) pkgs.push('aiohttp');
      if (content.includes('dotenv')) pkgs.push('python-dotenv');

      if (pkgs.length > 0) {
        logMessage(`📦 [Auto-Resolver] Đang tự động quét & cài đặt thư viện Python: ${pkgs.join(', ')}...`);
        execSync(`pip3 install ${pkgs.join(' ')} --break-system-packages || pip install ${pkgs.join(' ')}`);
        logMessage(`✅ [Auto-Resolver] Thư viện Python đã sẵn sàng!`);
      }
    } else if (language === 'nodejs') {
      if (content.includes("require('discord.js')") || content.includes('import { Client }')) {
        try { require.resolve('discord.js'); } catch (e) {
          logMessage(`📦 [Auto-Resolver] Đang cài đặt thư viện Node.js: discord.js...`);
          execSync('npm install discord.js');
          logMessage(`✅ [Auto-Resolver] discord.js đã được cài đặt!`);
        }
      }
    }
  } catch (err) {
    logMessage(`⚠️ Cảnh báo khởi tạo môi trường: ${err.message}`);
  }
}

// Khởi chạy tiến trình Bot
function startBotProcess(fileName, language) {
  const filePath = path.join(UPLOAD_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return logMessage(`❌ Lỗi: Không tìm thấy tệp ${fileName} để khởi chạy!`);
  }

  autoInstallModules(filePath, language);

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

  logMessage(`🚀 [${fileName}] Tiến trình Bot đã kích hoạt ONLINE 24/7 thành công.`);

  botProcess.stdout.on('data', (data) => logMessage(`[${fileName} - LOG]: ${data.toString().trim()}`));
  botProcess.stderr.on('data', (data) => logMessage(`[${fileName} - ERROR]: ${data.toString().trim()}`));
  botProcess.on('close', (code) => {
    logMessage(`⚠️ [${fileName}] Tiến trình dừng (Exit Code: ${code})`);
    if (activeBots[fileName]) activeBots[fileName].status = 'OFFLINE';
  });
}

// APIs quản lý tệp
app.get('/api/files', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => res.json(files || []));
});

app.get('/api/file-content', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.query.name);
  if (fs.existsSync(filePath)) {
    res.json({ success: true, content: fs.readFileSync(filePath, 'utf8') });
  } else {
    res.json({ success: false, message: 'Tệp không tồn tại' });
  }
});

app.post('/api/delete-file', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.body.fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    logMessage(`🗑️ Đã xóa file: ${req.body.fileName}`);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// Giao diện UI Enterprise
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
      <title>Kaito Cloud Platform - Commercial Bot Panel</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-dark: #080c14;
          --bg-sidebar: #0f172a;
          --bg-card: #1e293b;
          --border: #334155;
          --primary: #38bdf8;
          --primary-hover: #0284c7;
          --success: #22c55e;
          --danger: #ef4444;
          --text-main: #f8fafc;
          --text-sub: #94a3b8;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg-dark); color: var(--text-main); display: flex; height: 100vh; overflow: hidden; }

        /* Sidebar Navigation & File Manager */
        .sidebar { width: 300px; background: var(--bg-sidebar); border-right: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column; gap: 15px; }
        .logo { font-size: 20px; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 10px; }
        .logo i { background: rgba(56, 189, 248, 0.15); padding: 10px; border-radius: 10px; }

        .file-tree { flex: 1; background: #020617; border: 1px solid var(--border); border-radius: 10px; padding: 10px; overflow-y: auto; }
        .file-item { padding: 10px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-sub); cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; margin-bottom: 4px; }
        .file-item:hover, .file-item.active { background: #1e293b; color: #fff; }
        .file-item i.del-btn { color: #64748b; transition: 0.2s; }
        .file-item i.del-btn:hover { color: var(--danger); }

        /* Main Workspace */
        .main { flex: 1; padding: 25px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; }

        /* Metrics Bar */
        .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .metric-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 15px; }
        .metric-icon { width: 45px; height: 45px; border-radius: 10px; background: rgba(56, 189, 248, 0.15); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 20px; }

        /* Code IDE Editor */
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
        textarea { width: 100%; height: 320px; background: #020617; border: 1px solid var(--border); border-radius: 10px; color: #38bdf8; font-family: 'JetBrains Mono', monospace; padding: 15px; font-size: 13px; line-height: 1.6; resize: vertical; outline: none; }
        textarea:focus { border-color: var(--primary); }

        input, select { background: #020617; border: 1px solid var(--border); color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 13px; outline: none; width: 100%; }

        .btn { background: #0284c7; border: none; color: white; padding: 12px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; }
        .btn:hover { background: #0369a1; }
        .btn-danger { background: var(--danger); }
        .btn-danger:hover { opacity: 0.9; }

        /* Terminal Console */
        .terminal { background: #020617; border: 1px solid var(--border); border-radius: 10px; padding: 15px; height: 180px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #a3e635; }
      </style>
    </head>
    <body>

      <div class="sidebar">
        <div class="logo"><i class="fa-solid fa-server"></i> KAITO HOSTING</div>
        
        <div style="font-size: 12px; font-weight: 700; color: var(--text-sub);"><i class="fa-solid fa-folder-tree"></i> TỆP & DỰ ÁN</div>

        <form action="/upload-files" method="POST" enctype="multipart/form-data">
          <input type="file" name="botFiles" multiple required style="font-size:11px; margin-bottom: 8px;" />
          <button type="submit" class="btn" style="width:100%; font-size:12px; padding: 8px;"><i class="fa-solid fa-cloud-arrow-up"></i> Tải Dự Án Lên Web</button>
        </form>

        <div class="file-tree" id="fileTree">
          ${files.length === 0 ? '<div style="color:var(--text-sub); font-size:12px;">Chưa có tệp nào.</div>' : ''}
          ${files.map(f => `
            <div class="file-item" onclick="openFile('${f}')">
              <span><i class="fa-regular ${f.endsWith('.py') ? 'fa-file-code' : 'fa-file-lines'}"></i> ${f}</span>
              <i class="fa-solid fa-trash del-btn" onclick="deleteFile(event, '${f}')" title="Xóa file"></i>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="main">
        <div class="header">
          <div>
            <h2 style="margin:0; font-weight: 800;">Cloud Bot Hosting Dashboard</h2>
            <div style="font-size: 12px; color: var(--text-sub); margin-top:4px;">Nền tảng vận hành Bot Discord Node.js & Python 24/7</div>
          </div>
          <form action="/stop-all" method="POST" style="margin:0;">
            <button class="btn btn-danger"><i class="fa-solid fa-power-off"></i> Tắt Tất Cả Bot</button>
          </form>
        </div>

        <!-- Metric Cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon"><i class="fa-solid fa-microchip"></i></div>
            <div>
              <div style="font-size:12px; color:var(--text-sub);">RAM Máy Chủ</div>
              <div style="font-size:16px; font-weight:700;">${freeMem} MB / ${totalMem} MB</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon"><i class="fa-solid fa-robot"></i></div>
            <div>
              <div style="font-size:12px; color:var(--text-sub);">Bot Đang Chạy</div>
              <div style="font-size:16px; font-weight:700; color: var(--success);">${botList.length} Tiến Trình Online</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon"><i class="fa-solid fa-shield-halved"></i></div>
            <div>
              <div style="font-size:12px; color:var(--text-sub);">Trạng Thái Hệ Thống</div>
              <div style="font-size:16px; font-weight:700; color: var(--primary);">Khởi Chạy 24/7</div>
            </div>
          </div>
        </div>

        <!-- Trình Soạn Thảo IDE -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <h3 style="margin:0;"><i class="fa-solid fa-code"></i> Trình Soạn Thảo Code IDE</h3>
            <span style="font-size:12px; color:var(--text-sub);"><i class="fa-keyboard fa-regular"></i> Nhấn <b>Ctrl + S</b> để lưu nhanh</span>
          </div>

          <form action="/save-and-run" method="POST" id="codeForm">
            <div style="display:flex; gap:12px; margin-bottom: 12px;">
              <div style="flex:1;">
                <label style="font-size:12px; color:var(--text-sub); font-weight:bold;">Tên File Chạy Chính:</label>
                <input type="text" name="fileName" id="currentFileName" value="main.py" required />
              </div>
              <div style="flex:1;">
                <label style="font-size:12px; color:var(--text-sub); font-weight:bold;">Ngôn Ngữ Lập Trình:</label>
                <select name="language" id="langSelect" required>
                  <option value="python">Python 3 (.py)</option>
                  <option value="nodejs">Node.js (.js)</option>
                </select>
              </div>
            </div>

            <textarea name="codeContent" id="codeEditor"></textarea>

            <button type="submit" class="btn" style="width:100%; margin-top:12px;"><i class="fa-solid fa-play"></i> Lưu Mã Nguồn & Kích Hoạt Bot Ngay</button>
          </form>
        </div>

        <!-- Terminal Logs -->
        <div class="card">
          <h3 style="margin-top:0; margin-bottom: 12px;"><i class="fa-solid fa-terminal"></i> Terminal Live Console Logs</h3>
          <div class="terminal">
            ${systemLogs.map(l => `<div>${l}</div>`).join('') || '<div>Hệ thống sẵn sàng...</div>'}
          </div>
        </div>
      </div>

      <script>
        const pyDefault = \`import discord\\n\\nintents = discord.Intents.default()\\nintents.message_content = True\\nclient = discord.Client(intents=intents)\\n\\n@client.event\\nasync def on_ready():\\n    print(f'✅ Bot Python đã ONLINE 100%: {client.user}')\\n\\n@client.event\\nasync def on_message(message):\\n    if message.author == client.user:\\n        return\\n    if message.content == '!ping':\\n        await message.channel.send('Pong! Bot online 24/7 🚀')\\n\\nclient.run('DÁN_TOKEN_BOT_VÀO_ĐÂY')\`;

        document.getElementById('codeEditor').value = pyDefault;

        // Bắt phím tắt Ctrl + S để lưu
        document.addEventListener('keydown', (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('codeForm').submit();
          }
        });

        function openFile(fileName) {
          fetch('/api/file-content?name=' + encodeURIComponent(fileName))
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                document.getElementById('currentFileName').value = fileName;
                document.getElementById('codeEditor').value = data.content;
                if (fileName.endsWith('.js')) {
                  document.getElementById('langSelect').value = 'nodejs';
                } else {
                  document.getElementById('langSelect').value = 'python';
                }
              }
            });
        }

        function deleteFile(event, fileName) {
          event.stopPropagation();
          if (confirm('Bạn có chắc chắn muốn xóa file ' + fileName + '?')) {
            fetch('/api/delete-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName })
            }).then(() => window.location.reload());
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Routes Upload & Save
app.post('/upload-files', upload.array('botFiles', 30), (req, res) => {
  logMessage(`📁 [System] Đã tải lên ${req.files ? req.files.length : 0} tệp dự án.`);
  res.redirect('/');
});

app.post('/save-and-run', (req, res) => {
  const { fileName, language, codeContent } = req.body;
  if (!fileName || !codeContent) return res.redirect('/');

  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, codeContent);

  startBotProcess(fileName, language);
  res.redirect('/');
});

app.post('/stop-all', (req, res) => {
  Object.values(activeBots).forEach(b => {
    if (b.process) {
      try { b.process.kill(); } catch (e) {}
    }
  });
  activeBots = {};
  logMessage("Đã tắt toàn bộ tiến trình Bot.");
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Kaito Cloud Server Online tại cổng ${PORT}`));
