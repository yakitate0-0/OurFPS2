const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const { setupWebSocket } = require('./websocket');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ポートの設定
const port = process.env.PORT || 3100;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../client')));

// サーバーのルートアクセスでindex.htmlを返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// WebSocketの設定
setupWebSocket(io);

// サーバーの起動
server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
