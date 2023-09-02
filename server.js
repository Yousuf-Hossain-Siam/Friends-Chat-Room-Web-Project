const express = require("express");
const path = require("path");
const http = require("http");
const app = express();
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const {
  joinUser,
  getCurrentUser,
  userLeaveChat,
  roomUsers,
} = require("./utils/users");

const server = http.createServer(app);

//set up socket.io
const io = socketio(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/chatroom", (req, res) => {
  res.sendFile(path.join(__dirname + "/public" + "/chatroom.html"));
});

//run socket.io when client connects
const botName = "Siam_Bot";
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ userName, room }) => {
    const user = joinUser(socket.id, userName, room);

    socket.join(user.room);
    socket.emit(
      "message",
      formatMessage(botName, `${user.username}, welcome to ${user.room}!`)
    );

    //a user connect
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    //send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: roomUsers(user.room),
    });
  });

  //listen to chatMessage from client
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", formatMessage(`${user.username}`, msg));
  });
  //run when a client disconnect
  socket.on("disconnect", () => {
    const user = userLeaveChat(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      //send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: roomUsers(user.room),
      });
    }
  });
});

server.listen(PORT, () => console.log(`server running at port ${PORT}`));
