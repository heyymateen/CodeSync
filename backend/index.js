import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';

const app = express();

const server = http.createServer(app);

const url = `https://codesync-6n4p.onrender.com`;
const interval = 30000;

function reloadWebsite() {
  axios
    .get(url)
    .then((response) => {
      console.log("website reloded");
    })
    .catch((error) => {
      console.error(`Error : ${error.message}`);
    });
}

setInterval(reloadWebsite, interval);

const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

const rooms = new Map();


io.on('connection', (socket) => {
    console.log('User connected', socket.id);    

    let currentRoom = null;
    let currentUser = null;

    socket.on('join', ({ roomId, userName }) => {
      if (currentRoom) {
        socket.leave(currentRoom);
        rooms.get(currentRoom).users.delete(currentUser);
        io.to(currentRoom).emit(
          "userJoined",
          Array.from(rooms.get(currentRoom).users)
        );
      }

      currentRoom = roomId;
      currentUser = userName;

      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Set(),
          code: "// Write your code here...",
          input: "", // already added
          language: "javascript", 
        });
      }

      rooms.get(roomId).users.add(userName);

      socket.emit("codeUpdate", rooms.get(roomId).code);

      socket.emit("inputUpdate", rooms.get(roomId).input);
        
      socket.emit("languageUpdate", rooms.get(roomId).language);

      io.to(roomId).emit("userJoined", Array.from(rooms.get(currentRoom).users));
    });

    socket.on("leaveRoom", () => {
      if (currentRoom && currentUser) {
        rooms.get(currentRoom).users.delete(currentUser);
        io.to(currentRoom).emit(
          "userJoined",
          Array.from(rooms.get(currentRoom).users)
        );

        socket.leave(currentRoom);
        currentRoom = null;
        currentUser = null;
      }
    });

    socket.on("codeChange", ({ roomId, code }) => {
      if (rooms.has(roomId)) {
        rooms.get(roomId).code = code; 
      }
      socket.to(roomId).emit("codeUpdate", code);
    });

    socket.on("inputChange", ({ roomId, input }) => {
      if (rooms.has(roomId)) {
        rooms.get(roomId).input = input;
      }
      socket.to(roomId).emit("inputUpdate", input);
    });



    socket.on("typing", ({roomId, userName}) =>{
        socket.to(roomId).emit("userTyping", userName);
    });

    socket.on("languageChange", ({ roomId, language }) => {
      if (rooms.has(roomId)) {
        rooms.get(roomId).language = language;
      }
      io.to(roomId).emit("languageUpdate", language);
    });


    socket.on('compileCode', async ({ code, roomId, language, version, input }) => { 
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
                language,
                version,
                files: [{ content: code }],
                stdin : input
            });
            room.output = response.data.run.output;
            io.to(roomId).emit('codeResponse', response.data);
        }
    })

    socket.on('disconnect', () => {
        if(currentRoom && currentUser) {
            rooms.get(currentRoom).users.delete(currentUser);
            io.to(currentRoom).emit('userJoined', Array.from(rooms.get(currentRoom).users));
        }
        console.log('User disconnected', socket.id);
    });
});

const port = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});


server.listen(port, () => {
    console.log(`Server is working on port 5000`);
})
