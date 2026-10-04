const express = require('express');
const multer = require('multer');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.json({ limit: '100mb' }));

const UPLOAD_DIR = path.join(__dirname, 'user_bots');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Cấu hình Multer lưu giữ nguyên tên file upload
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
  if (systemLogs.length > 60) systemLogs.shift();
  console.log(msg);
};

// Hàm tự động quét và cài đặt thư viện thiếu khi khởi chạy
function autoInstallModules(filePath, language) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    if (language === 'python') {
      const modules = [];
      if (code.includes('discord')) modules.push('discord.py');
      if (code.includes('requests')) modules.push('requests');
      if (code.includes('aiohttp')) modules.push('aiohttp');
      if (modules.length > 0) {
        logMessage(`📦 Đang tự động kiểm tra/cài thư viện Python: ${modules.join(', ')}...`);
        execSync(`pip3 install ${modules.join(' ')} --break-system-packages || pip install ${modules.join(' ')}`);
      }
    } else {
      if (code.includes('discord.js')) {
        try { require.resolve('discord.js'); } catch (e) {
          logMessage(`📦 Đang cài đặt thư viện discord.js...`);
          execSync('npm install discord.js');
        }
      }
    }
  } catch (e) {
    logMessage(`⚠️ Cảnh báo chuẩn bị môi trường: ${e.message}`);
  }
}

// Hàm khởi chạy tiến trình Bot
function startBotProcess(fileName, language) {
  const filePath = path.join(UPLOAD_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return logMessage(`❌ Lỗi: Không tìm thấy file ${fileName} để khởi chạy!`);
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
    startTime: new Date().toLocaleTimeString()
  };

  logMessage(`🚀 [${fileName}] Tiến trình Bot đã được kích hoạt Online!`);

  botProcess.stdout.on('data', (data) => logMessage(`[${fileName} LOG]: ${data.toString().trim()}`));
  botProcess.stderr.on('data', (data) => logMessage(`[${fileName} LỖI]: ${data.toString().trim()}`));
  botProcess.on('close', (code) => {
    logMessage(`⚠️ [${fileName}] Tiến trình đã dừng (Exit code: ${code})`);
    if (activeBots[fileName]) activeBots[fileName].status = 'OFFLINE';
  });
}

// API Lấy danh sách file trong dự án
app.get('/api/files', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.json([]);
    res.json(files);
  });
});

// API Đọc nội dung file để sửa trên Web
app.get('/api/file-content', (req, res) => {
  const fileName = req.query.name;
  const filePath = path.join(UPLOAD_DIR, fileName);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ success: true, content });
  } else {
    res.json({ success: false, message: 'File không tồn tại' });
  }
});

// Giao diện Web Hosting chuẩn 100%
app.get('/', (req, res) => {
  const botList = Object.values(activeBots);
  const existingFiles = fs.readdirSync(UPLOAD_DIR);

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
        
        .sidebar { width: 260px; background: #0f172a; border-right: 1px solid var(--border); padding: 15px; display: flex; flex-direction: column; gap: 15px; }
        .logo { font-size: 18px; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
        
        /* File Manager Tree */
        .file-manager { flex: 1; overflow-y: auto; background: #030712; border: 1px solid var(--border); border-radius: 8px; padding: 10px; }
        .file-item { padding: 8px 10px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #9ca3af; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .file-item:hover, .file-item.active { background: #1e293b; color: white; }
        
        .main { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
        
        .bot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin-top: 8px; }
        .bot-card { background: #1f293d; border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
        .badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .badge-online { background: rgba(16, 185, 129, 0.2); color: var(--success); }
        .badge-offline { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        
        textarea { width: 100%; height: 280px; background: #030712; border: 1px solid var(--border); border-radius: 8px; color: #38bdf8; font-family: 'Consolas', monospace; padding: 12px; box-sizing: border-box; font-size: 13px; resize: vertical; line-height: 1.5; }
        input, select { background: #030712; border: 1px solid var(--border); color: white; padding: 9px; border-radius: 6px; box-sizing: border-box; width: 100%; margin-bottom: 8px; font-size: 13px; }
        .btn { background: var(--primary); border: none; color: white; padding: 10px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; gap: 6px; }
        .btn:hover { opacity: 0.9; }
        .btn-danger { background: var(--danger); }
        
        .console { background: #020617; border: 1px solid var(--border); border-radius: 8px; padding: 12px; height: 160px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #a3e635; }
      </style>
    </head>
    <body>

      <!-- SIDEBAR QUẢN LÝ TỆP CODE (FILE MANAGER) -->
      <div class="sidebar">
        <div class="logo"><i class="fa-solid fa-server"></i> KAITO HOSTING</div>
        
        <div style="font-weight: bold; font-size: 12px; color: #9ca3af;"><i class="fa-solid fa-folder-open"></i> QUẢN LÝ TỆP DỰ ÁN</div>
        
        <!-- Form Upload Tệp/Project -->
        <form action="/upload-files" method="POST" enctype="multipart/form-data">
          <label style="font-size:11px; color:#6b7280;">📁 Tải File/Project Từ Máy Tính:</label>
          <input type="file" name="botFiles" multiple required style="font-size:11px;" />
          <button type="submit" class="btn" style="width:100%; font-size:12px; padding:6px;"><i class="fa-solid fa-cloud-arrow-up"></i> Upload Tệp Vào Web</button>
        </form>

        <!-- Danh Sách Các File Trong Project -->
        <div class="file-manager" id="fileTree">
          ${existingFiles.length === 0 ? '<div style="color:#6b7280; font-size:12px;">Chưa có tệp nào.</div>' : ''}
          ${existingFiles.map(f => `
            <div class="file-item" onclick="openFile('${f}')">
              <i class="fa-regular ${f.endsWith('.py') ? 'fa-file-code' : f.endsWith('.js') ? 'fa-file-lines' : 'fa-file'}"></i> ${f}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- MAIN PANEL -->
      <div class="main">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0;"><i class="fa-solid fa-sliders"></i> Bảng Điều Khiển Bot Hosting 24/7</h2>
          <form action="/stop-all" method="POST" style="margin:0;">
            <button class="btn btn-danger"><i class="fa-solid fa-power-off"></i> Tắt Tất Cả Bot</button>
          </form>
        </div>

        <!-- Trạng Thái Các Bot Đang Chạy -->
        <div class="card">
          <h3 style="margin-top:0;"><i class="fa-solid fa-robot"></i> Trạng Thái Bot (${botList.length})</h3>
          <div class="bot-grid">
            ${botList.length === 0 ? '<div style="color: #6b7280; font-size: 13px;">Chưa có bot nào đang chạy.</div>' : ''}
            ${botList.map(b => `
              <div class="bot-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong>${b.name}</strong>
                  <span class="badge ${b.status === 'ONLINE' ? 'badge-online' : 'badge-offline'}">${b.status}</span>
                </div>
                <div style="font-size:11px; color:#9ca3af; margin-top:5px;">Khởi chạy lúc: ${b.startTime}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Trình Soạn Thảo Code IDE -->
        <div class="card">
          <h3 style="margin-top:0;"><i class="fa-solid fa-code"></i> Trình Soạn Thảo & Khởi Chạy Code IDE</h3>
          <form action="/save-and-run" method="POST">
            <div style="display:flex; gap:10px;">
              <div style="flex:1;">
                <label style="font-size:12px; font-weight:bold;">Tên File Code Chạy Chính:</label>
                <input type="text" name="fileName" id="currentFileName" value="main.py" required />
              </div>
              <div style="flex:1;">
                <label style="font-size:12px; font-weight:bold;">Ngôn Ngữ Lập Trình:</label>
                <select name="language" id="langSelect" required>
                  <option value="python">Python (.py)</option>
                  <option value="nodejs">Node.js (.js)</option>
                </select>
              </div>
            </div>

            <label style="font-size:12px; font-weight:bold;">Mã Nguồn File (Sửa / Viết Code Trực Tiếp Tại Đây):</label>
            <textarea name="codeContent" id="codeEditor"></textarea>

            <button type="submit" class="btn" style="width:100%; margin-top:10px;"><i class="fa-solid fa-play"></i> Lưu File & Chạy Bot Ngay</button>
          </form>
        </div>

        <!-- Terminal Logs -->
        <div class="card">
          <h3 style="margin-top:0;"><i class="fa-solid fa-terminal"></i> Console Logs (Thời Gian Thực)</h3>
          <div class="console">
            ${systemLogs.map(l => `<div>${l}</div>`).join('') || '<div>Hệ thống sẵn sàng...</div>'}
          </div>
        </div>
      </div>

      <script>
        const pyDefault = \`import discord\\n\\nintents = discord.Intents.default()\\nintents.message_content = True\\nclient = discord.Client(intents=intents)\\n\\n@client.event\\nasync def on_ready():\\n    print(f'Bot Python đã kết nối thành công: {client.user}')\\n\\n@client.event\\nasync def on_message(message):\\n    if message.author == client.user:\\n        return\\n    if message.content == '!ping':\\n        await message.channel.send('Pong! 🚀')\\n\\nclient.run('DÁN_TOKEN_BOT_VÀO_ĐÂY')\`;

        document.getElementById('codeEditor').value = pyDefault;

        // Hàm mở và xem nội dung tệp khi click ở Sidebar
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
      </script>
    </body>
    </html>
  `);
});

// Route Upload nhiều file
app.post('/upload-files', upload.array('botFiles', 20), (req, res) => {
  logMessage(`📁 Đã upload thành công ${req.files ? req.files.length : 0} tệp vào dự án.`);
  res.redirect('/');
});

// Route Lưu File & Chạy Bot
app.post('/save-and-run', (req, res) => {
  const { fileName, language, codeContent } = req.body;
  if (!fileName || !codeContent) return res.redirect('/');

  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, codeContent);

  startBotProcess(fileName, language);
  res.redirect('/');
});

// Route Tắt Tất Cả Bot
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
app.listen(PORT, () => console.log(`Kaito Hosting đang lắng nghe tại cổng ${PORT}`));
