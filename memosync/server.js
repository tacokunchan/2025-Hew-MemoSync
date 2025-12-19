// server.js
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log("ユーザーが接続しました");

    // メッセージを受信
    socket.on("message", (msg) => {
      console.log("受信したメッセージ:", msg);
      // 全クライアントにブロードキャスト
      io.emit("message", msg);
    });

    socket.on("disconnect", () => {
      console.log("ユーザーが切断しました");
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});