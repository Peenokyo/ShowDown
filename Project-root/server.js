// server.js
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 3000;

app.use(express.static("public")); // serve frontend from /public

let rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join", (name) => {
    // Find or create room with 1 player
    let room = Object.keys(rooms).find((r) => rooms[r].length === 1) || socket.id;
    socket.join(room);

    if (!rooms[room]) rooms[room] = [];

    rooms[room].push({ id: socket.id, name, balance: 100 });

    if (rooms[room].length === 2) {
      io.to(room).emit("start", rooms[room].map((p) => ({
        name: p.name,
        balance: p.balance
      })));
    }
  });

  socket.on("playRound", (room) => {
    const players = rooms[room];
    if (!players || players.length < 2) return;

    players[0].balance -= 10;
    players[1].balance -= 10;

    const roll = Math.floor(Math.random() * 100) + 1;
    let result;
    if (roll <= 40) {
      players[0].balance += 20;
      result = `${players[0].name} wins the round!`;
    } else if (roll <= 80) {
      players[1].balance += 20;
      result = `${players[1].name} wins the round!`;
    } else {
      result = `Banker wins! Nobody gets the pot.`;
    }

    io.to(room).emit("roundResult", {
      result,
      balances: players.map((p) => ({ name: p.name, balance: p.balance }))
    });
  });

  socket.on("disconnect", () => {
    for (let room in rooms) {
      rooms[room] = rooms[room].filter((p) => p.id !== socket.id);
      if (rooms[room].length === 0) delete rooms[room];
    }
    console.log("User disconnected:", socket.id);
  });
});

http.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
