const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let botClient = null;
let botStatus = "Chưa kích hoạt";

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Quản Lý Bot 24/7</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); width: 380px; text-align: center; }
        input[type="text"] { width: 90%; padding: 12px; margin: 15px 0; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: white; font-size: 14px; }
        button { width: 95%; padding: 12px; background: #22c55e; border: none; color: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 15px; }
        button:hover { background: #16a34a; }
        .status { margin-top: 15px; font-size: 14px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🤖 Bật Bot Discord 24/7</h2>
        <p class="status">Trạng thái: <strong>${botStatus}</strong></p>
        <form action="/start-bot" method="POST">
          <input type="text" name="token" placeholder="Dán mã Token Bot vào đây..." required />
          <button type="submit">Bật Bot Ngay</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/start-bot', (req, res) => {
  const token = req.body.token;
  
  if (botClient) {
    botClient.destroy();
  }

  botClient = new Client({ intents: [GatewayIntentBits.Guilds] });

  botClient.once('ready', () => {
    botStatus = `🟢 Đang chạy 24/7 (${botClient.user.tag})`;
    console.log(`Bot đã online: ${botClient.user.tag}`);
  });

  botClient.login(token).then(() => {
    res.redirect('/');
  }).catch(err => {
    botStatus = "🔴 Lỗi: Token không hợp lệ!";
    res.redirect('/');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
