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
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                users: new Map(),
                code: "// Write your code here...",
                input: "",
                language: "javascript",
            });
        }

        const room = rooms.get(roomId);

        // Check if username already exists in the specific room
        if (room.users.has(userName)) {
            socket.emit("usernameTaken", { userName });
            return;
        }

        // leave previous room if any
        if (currentRoom) {
            const prevRoom = rooms.get(currentRoom);
            if (prevRoom) {
                socket.leave(currentRoom);
                prevRoom.users.delete(currentUser);
                
                // If room is empty, delete it
                if (prevRoom.users.size === 0) {
                    rooms.delete(currentRoom);
                } else {
                    // Update user list for remaining users in previous room
                    socket.to(currentRoom).emit(
                        "userJoined",
                        Array.from(prevRoom.users.keys())
                    );
                }
            }
        }

        currentRoom = roomId;
        currentUser = userName;

        socket.join(roomId);
        room.users.set(userName, socket.id);

        // Send current room state to the joining user
        socket.emit("codeUpdate", room.code);
        socket.emit("inputUpdate", room.input);
        socket.emit("languageUpdate", room.language);
        socket.emit("userJoined", Array.from(room.users.keys()));
      
        // Send updated user list to others in the same room
        socket.to(roomId).emit("userJoined", Array.from(room.users.keys()));

        // Notify everyone else that a new user joined
        socket.to(roomId).emit("userJoinedNotification", userName);
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

    socket.on("typing", ({ roomId, userName }) => {
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

            try {
                const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
                    language,
                    version,
                    files: [{ content: code }],
                    stdin: input
                });

                room.output = response.data.run.output;
                io.to(roomId).emit('codeResponse', response.data);
            } catch (err) {
                console.error("Error compiling code:", err.message);
                io.to(roomId).emit('codeResponse', {
                    run: { output: "⚠️ Error: Failed to execute code. Please try again later." }
                });
            }
        }
    });


    socket.on("leaveRoom", () => {
        if (currentRoom && currentUser) {
            const room = rooms.get(currentRoom);
            if (room) {
                room.users.delete(currentUser);

                // If room is empty, delete it
                if (room.users.size === 0) {
                    rooms.delete(currentRoom);
                } else {
                    // Notify everyone else that this user left
                    socket.to(currentRoom).emit("userLeft", currentUser);

                    // Send updated user list to others
                    socket.to(currentRoom).emit(
                        "userJoined",
                        Array.from(room.users.keys())
                    );
                }
            }

            socket.leave(currentRoom);
            currentRoom = null;
            currentUser = null;
        }
    });

    socket.on("disconnect", () => {
        if (currentRoom && currentUser) {
            const room = rooms.get(currentRoom);
            if (room) {
                room.users.delete(currentUser);

                // If room is empty, delete it
                if (room.users.size === 0) {
                    rooms.delete(currentRoom);
                } else {
                    // Notify everyone else that this user disconnected
                    socket.to(currentRoom).emit("userLeft", currentUser);

                    // Send updated user list to others
                    socket.to(currentRoom).emit(
                        "userJoined",
                        Array.from(room.users.keys())
                    );
                }
            }
        }
        console.log("User disconnected", socket.id);
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
    console.log(`Server is running on port ${port}`);
});
