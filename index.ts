var jwt = require("jsonwebtoken");
var cookie = require("cookie");

const server = Bun.serve<{ userId: string; channelId: string }>({
  port: 4000,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/chat") {
      try {
        // Production store secret in .env file
        const secret = "mySecretKey";
        const roomIdQuery = req.url.split("?")[1];
        const roomId = req.url.split("=")[1];
        console.log("room", roomId);
        // const token = req.headers.get("Authorization");
        // const token = req.headers.get("authjs.session-token");
        const cookieFromHeaders = req.headers.get("Cookie");
        var parsedCookie = cookie.parse(cookieFromHeaders);
        // console.log("cookie", parsedCookie);
        const token = parsedCookie["Authorization"];
        console.log("token", token);
        // console.log("token", typeof token);
        const decoded = jwt.verify(token, secret);
        console.log("userId", decoded);
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
      // WHEN USER JOINS THE CHANNEL ROOM FOR THE FIRST TIME
      // this gets triggered/run

      // const msg = `${ws.data.userId} has entered the chat in channel ${ws.data.channelId}`;
      const msg = {
        event: "user-join",
        userId: ws.data.userId,
        channelId: ws.data.channelId,
      };

      console.log(ws.data);
      ws.subscribe(ws.data.channelId);
      server.publish(ws.data.channelId, JSON.stringify(msg));
    },
    message(ws, message) {
      // HERE WE ARE RECEIVING THE MESSAGE FROM THE CLIENT(NEXT.JS AUCTION BIDDING AND CHAT ROOM)
      // AS THE MESSAGE IS RECEIVED IS IN STRING || BUFFERS, WE PARSE IT TO STRING AND THEN JSON
      const parsedMessage = JSON.parse(String(message));
      console.log("wsData", ws);
      console.log("message", parsedMessage);
      console.log("accessObj", parsedMessage?.event);
      if (parsedMessage?.event == "chat-message") {
        server.publish(ws.data.channelId, JSON.stringify(parsedMessage));
      }
      // NOW WHEN THE DATA IS CONFIRMED TO BE A JSON

      // MANAGE YOUR EVENTS HERE

      // 1. receive chat message event

      // this is a group chat
      // so the server re-broadcasts incoming message to everyone

      // 2. receive auction bid where user send me productid and bid price
    },
    close(ws) {
      const msg = `${ws.data.userId} has left the chat in channel ${ws.data.channelId}`;
      ws.unsubscribe(ws.data.channelId);
      server.publish(ws.data.channelId, msg);
    },
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
