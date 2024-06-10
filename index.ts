var jwt = require("jsonwebtoken");

const server = Bun.serve<{ userId: string; channelId: string }>({
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/chat") {
      try {
        // Production store secret in .env file
        const secret = "mySecretKey";
        const roomIdQuery = req.url.split("?")[1];
        const roomId = req.url.split("=")[1];
        console.log("room", roomId);
        const token = req.headers.get("Authorization");
        const tokenString = token?.split(" ")[1];
        const decoded = jwt.verify(tokenString, secret);
        // console.log("userId", decoded.sub);
        const userId = decoded.sub;
        const success = server.upgrade(req, {
          data: { userId: userId, channelId: roomId },
        });
        // console.log(success);
        return success
          ? undefined
          : new Response("WebSocket upgrade error", { status: 400 });
      } catch (error) {
        // console.error(error);
        return new Response("Unauthorized", { status: 401 });
      }
    }

    return new Response("Hello world Mula");
  },
  websocket: {
    open(ws) {
      const msg = `${ws.data.userId} has entered the chat in channel ${ws.data.channelId}`;
      ws.subscribe(ws.data.channelId);
      server.publish(ws.data.channelId, msg);
    },
    message(ws, message) {
      // this is a group chat
      // so the server re-broadcasts incoming message to everyone
      server.publish(ws.data.channelId, `${ws.data.userId}: ${message}`);
    },
    close(ws) {
      const msg = `${ws.data.userId} has left the chat in channel ${ws.data.channelId}`;
      ws.unsubscribe(ws.data.channelId);
      server.publish(ws.data.channelId, msg);
    },
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
