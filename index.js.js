const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.BOT_TOKEN || "NHẬP_TOKEN_CỦA_BẠN_VÀO_ĐÂY";

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Trạng Thái Bot 24/7</title>
            <style>
                body { background: #0f172a; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
                .status { color: #22c55e; font-weight: bold; font-size: 20px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🤖 Bot Hosting 24/7</h1>
                <p class="status">● Đang hoạt động liên tục 24/7</p>
                <p>Thời gian hệ thống: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});

function runBotTask() {
    if (!TOKEN || TOKEN === "NHẬP_TOKEN_CỦA_BẠN_VÀO_ĐÂY") {
        console.log("[LỖI] Chưa nhập Token!");
        return;
    }
    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] Bot đang chạy...`);
}

runBotTask();
setInterval(runBotTask, 60000);