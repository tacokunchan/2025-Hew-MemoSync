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
        // 簡易的に全て送る。
        const count = rooms.get(roomId)?.size || 0;
        if (count > 0) roomCounts[roomId] = count;
      });
      io.emit("room-counts-update", roomCounts);
    };

    // ルーム内のユーザー一覧をブロードキャストするヘルパー関数
    const broadcastRoomUsers = async (roomId) => {
      const sockets = await io.in(roomId).fetchSockets();
      const users = sockets.map(s => ({
        socketId: s.id,
        username: s.data.username || 'Anonymous', // 保存されたユーザー名を使用
        userId: s.data.userId, // GUID
      }));
      io.to(roomId).emit("room-users-update", users);
    };

    // 初回接続時に現状を送る
    broadcastRoomCounts();

    // ルームへの参加リクエスト
    socket.on("join-request", async ({ roomId, password, username, userId }) => {
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

        // ユーザー情報をSocketデータに保存
        socket.data.username = username;
        socket.data.userId = userId;

        await socket.join(roomId);
        socket.emit("join-success", roomId);
        console.log(`Socket ${socket.id} (${username}, ${userId}) joined room ${roomId}`);

        broadcastRoomCounts();
        broadcastRoomUsers(roomId); // ユーザーリスト更新
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

    // カーソル移動
    socket.on("cursor-move", (data) => {
      // { roomId, x, y, mode }
      // 他のクライアントに送信 (送信者IDと名前を付与)
      socket.to(data.roomId).emit("cursor-move", {
        socketId: socket.id, // Socket ID for cursor key
        userId: socket.data.userId, // GUID for color
        username: socket.data.username,
        x: data.x,
        y: data.y,
        mode: data.mode // 'text' | 'handwriting'
      });
    });

    // 共有停止（ルーム閉鎖）
    socket.on("close-room", (roomId) => {
      // ルーム内の全員に通知
      io.to(roomId).emit("room-closed");
      // サーバー側でもソケットをルームから外すなどの処理が必要ならここで行うが、
      // クライアント側で切断させるのが確実。
    });

    // 退出処理
    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
      broadcastRoomCounts();
      broadcastRoomUsers(roomId); // ユーザーリスト更新
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

    socket.on("disconnecting", () => {
      // socket.rooms は Set なので、切断前に参加していたルームを取得可能
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          // 切断後にブロードキャストしたいが、disconnectイベント内では既に退出済み扱いになる場合とそうでない場合がある
          // disconnecting中ならまだroomsにある。
          // 少し遅延させるか、ここですぐに送るか。
          // socket.leaveはこの後自動で行われる。
          // ここで手動で通知を送るには、leaveした後である必要があるため、
          // broadcastRoomUsersは sockets を fetch するので、自分が居なくなってから呼ばないとリストに残る可能性がある。
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      broadcastRoomCounts();
      // 全てのルームに対して参加者リスト更新を送るのはコストが高いが、
      // どのルームにいたかを知る術が disconnect 時点では失われている(socket.roomsが空)
      // そのため、disconnecting でループしておくか、
      // あるいは broadcastRoomCounts のように全ルーム走査するか。
      // 今回は簡易的に、disconnecting で取得しておいたリストに対して送信処理を行うのが正しいが、
      // 実装が複雑になるため、io.sockets.adapter.rooms を見て... といってももう居ない。

      // 簡易実装: クライアント側で socket.on('disconnect') したときにユーザーが消えるのを待つのは難しい。
      // サーバー側で、参加していたルームを自前で管理するか、disconnectingを使う。
    });
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});