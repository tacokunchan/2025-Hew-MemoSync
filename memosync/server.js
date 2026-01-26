const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const databaseUrl = process.env.DATABASE_URL;
const connectionUrl = (databaseUrl && !databaseUrl.includes('pgbouncer=true'))
  ? `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}pgbouncer=true`
  : databaseUrl;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl,
    },
  },
});

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // 全体の参加人数をブロードキャストするヘルパー関数
    const broadcastRoomCounts = () => {
      const roomCounts = {};
      const rooms = io.sockets.adapter.rooms;

      rooms.forEach((_, roomId) => {
        // Socket.ioの部屋IDには個別のSocketIDも含まれるため、除外する必要があるか？
        // 通常 io.sockets.adapter.rooms は Map<RoomId, Set<SocketId>>
        // SocketID単体のRoomも含まれるが、 roomId (Memo ID) と一致するものだけ送れば良い。
        // クライアント側でフィルタする、あるいはここでフィルタする。
        // 簡易的に全て送る。
        const count = rooms.get(roomId)?.size || 0;
        if (count > 0) roomCounts[roomId] = count;
      });
      io.emit("room-counts-update", roomCounts);
    };

    // 初回接続時に現状を送る
    broadcastRoomCounts();

    // ルームへの参加リクエスト
    socket.on("join-request", async ({ roomId, password }) => {
      try {
        const memo = await prisma.memo.findUnique({
          where: { id: roomId },
          select: { isShared: true, password: true },
        });

        if (!memo) {
          socket.emit("join-failed", "メモが見つかりません");
          return;
        }

        if (!memo.isShared) {
          socket.emit("join-failed", "このメモは共有されていません");
          return;
        }

        if (memo.password && memo.password !== password) {
          socket.emit("join-failed", "パスワードが間違っています");
          return;
        }

        await socket.join(roomId);
        socket.emit("join-success", roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);

        broadcastRoomCounts();
      } catch (error) {
        console.error("Join error:", error);
        socket.emit("join-failed", "サーバーエラーが発生しました");
      }
    });

    // テキスト更新
    socket.on("text-update", (data) => {
      // { roomId, content, senderId }
      socket.to(data.roomId).emit("text-update", data);
    });

    // ホワイトボード更新
    socket.on("canvas-update", (data) => {
      // { roomId, canvasData, senderId }
      socket.to(data.roomId).emit("canvas-update", data);
    });

    // 色更新
    // 退出処理
    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
      broadcastRoomCounts();
    });

    // 接続時に最新状態を他のクライアント（ホストなど）に要求する
    socket.on("request-sync", (roomId) => {
      // ルーム内の他のクライアントに同期リクエストを転送
      socket.to(roomId).emit("request-sync", { requesterId: socket.id });
    });

    // 他のクライアントからの同期リクエストに応答する
    socket.on("sync-response", (data) => {
      // targetId (要求者) にだけデータを送る
      io.to(data.targetId).emit("sync-response", data);
    });

    socket.on("color-update", (data) => {
      socket.to(data.roomId).emit("color-update", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      broadcastRoomCounts();
    });
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});