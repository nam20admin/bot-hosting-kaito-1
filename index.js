const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Tạo web phụ để giữ Render không bị ngủ (Ping 24/7)
const app = express();
app.get('/', (req, res) => res.send('KAITO BOT IS ONLINE 24/7!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[HTTP] Server đang lắng nghe tại cổng ${PORT}`));

// Khởi tạo Discord Bot với đầy đủ Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('ready', () => {
  console.log(`=========================================`);
  console.log(`✅ BOT ĐÃ CHÍNH THỨC ONLINE 100%: ${client.user.tag}`);
  console.log(`=========================================`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.reply('Pong! Bot đang chạy trực tiếp 24/7 🚀');
  }
});

// DÁN CHÍNH XÁC TOKEN BOT CỦA BẠN VÀO GIỮA DẤU NHÁY ĐƠN NÀY:
const TOKEN = 'DÁN_TOKEN_BOT_CỦA_BẠN_VÀO_ĐÂY';

client.login(TOKEN).catch(err => {
  console.error('❌ LỖI ĐĂNG NHẬP BOT (Kiểm tra lại Token hoặc Intents):', err.message);
});
