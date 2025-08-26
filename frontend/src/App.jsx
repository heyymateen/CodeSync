import { useEffect, useState } from "react";
import "./App.css";
import Editor from "@monaco-editor/react";
import io from "socket.io-client";
import { v4 as uuid } from "uuid";

import CodeIcon from "./assets/code.svg";
import UserIcon from "./assets/user.svg";
import LeaveIcon from "./assets/leave.svg";
import CopyIcon from "./assets/copy.svg";

const socket = io("https://codesync-6n4p.onrender.com");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// Write your code here...");
  const [users, setUsers] = useState([]);
  const [outPut, setOutPut] = useState("");
  const [version, setVersion] = useState("*");
  const [userInput, setUserInput] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [activeSidebar, setActiveSidebar] = useState(null);

  // Socket listeners
  useEffect(() => {
    const handleUserJoined = (users) => {
      setUsers(users);
      setJoined(true); // Set joined to true only after successful join
    };

    const handleCodeUpdate = (newCode) => setCode(newCode);
    
    const handleLanguageUpdate = (newLanguage) => setLanguage(newLanguage);
    
    const handleCodeResponse = (response) => setOutPut(response.run.output);
    
    const handleInputUpdate = (input) => setUserInput(input);
    
    const handleUsernameTaken = ({ userName }) => {
      setJoined(false); // Prevent joining and stay on join container
      setUserName(""); // Clear the username field
      addNotification(`Username '${userName}' already taken`, "error");
    };

    const handleUserLeft = (user) => {
      addNotification(`${user} left`, "error");
    };

    const handleUserJoinedNotification = (user) => {
      addNotification(`${user} joined`, "success");
    };

    // Add event listeners
    socket.on("userJoined", handleUserJoined);
    socket.on("codeUpdate", handleCodeUpdate);
    socket.on("languageUpdate", handleLanguageUpdate);
    socket.on("codeResponse", handleCodeResponse);
    socket.on("inputUpdate", handleInputUpdate);
    socket.on("usernameTaken", handleUsernameTaken);
    socket.on("userLeft", handleUserLeft);
    socket.on("userJoinedNotification", handleUserJoinedNotification);

    // Cleanup event listeners
    return () => {
      socket.off("userJoined", handleUserJoined);
      socket.off("codeUpdate", handleCodeUpdate);
      socket.off("languageUpdate", handleLanguageUpdate);
      socket.off("codeResponse", handleCodeResponse);
      socket.off("inputUpdate", handleInputUpdate);
      socket.off("usernameTaken", handleUsernameTaken);
      socket.off("userLeft", handleUserLeft);
      socket.off("userJoinedNotification", handleUserJoinedNotification);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => socket.emit("leaveRoom");
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const addNotification = (message, type = "error") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  };

  const joinRoom = () => {
    if (!roomId) return addNotification("Enter Room ID", "error");
    if (!userName) return addNotification("Enter Username", "error");
    if (roomId.length < 5) return addNotification("Room ID must be at least 5 characters", "error");
    if (userName.length < 5) return addNotification("Username must be at least 5 characters", "error");

    const invalidCharRoom = roomId.match(/[^a-zA-Z0-9-_]/);
    if (invalidCharRoom) return addNotification(`Room ID cannot contain '${invalidCharRoom[0]}'`, "error");

    const invalidCharUser = userName.match(/[^a-zA-Z0-9-_]/);
    if (invalidCharUser) return addNotification(`Username cannot contain '${invalidCharUser[0]}'`, "error");

    socket.emit("join", { roomId, userName });
    // setJoined(true) moved to after successful join confirmation
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// Write your code here...");
    setLanguage("javascript");
    setActiveSidebar(null);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    addNotification("Room ID Copied!", "success");
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  };

  const runCode = () => {
    socket.emit("compileCode", { code, roomId, language, version, input: userInput });
  };

  const createRoomId = () => setRoomId(uuid().substring(0, 8));
  const toggleSidebar = (type) => setActiveSidebar(activeSidebar === type ? null : type);

  return (
    <div className="app-container">
      {/* Notifications container */}
      <div className="notifications">
        {notifications.map((n) => (
          <div key={n.id} className={`notification ${n.type === "success" ? "success" : ""}`}>
            {n.message}
          </div>
        ))}
      </div>

      {!joined ? (
        <div className="join-container">
          <div className="join-content">
            <div className="left-column">
              <div className="floating-computer">
                <img src="/computer.svg" alt="Computer" />
              </div>
            </div>
            <div className="right-column">
              <div className="join-form">
                <div className="logo-container">
                  <img src="/logo.svg" alt="CodeSync Logo" />
                </div>
                <div className="form-fields">
                  <input
                    type="text"
                    placeholder="Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                  <button onClick={joinRoom} className="join-button">
                    Join Room
                  </button>
                  <button onClick={createRoomId} className="generate-button">
                    Generate Unique Room ID
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="editor-container">
          <div className="sidebar">
            <div className="sidebar-top">
              <div className="icon" onClick={() => toggleSidebar("code")}>
                <img src={CodeIcon} alt="Code" />
              </div>
              <div className="icon" onClick={() => toggleSidebar("users")}>
                <img src={UserIcon} alt="Users" />
              </div>
            </div>
            <div className="sidebar-bottom-icons">
              <div className="icon" onClick={copyRoomId}>
                <img src={CopyIcon} alt="Copy" />
              </div>
              <div className="icon" onClick={leaveRoom}>
                <img src={LeaveIcon} alt="Leave" />
              </div>
            </div>
          </div>

          <div className={`sidebar-view ${activeSidebar ? "active" : ""}`}>
            {activeSidebar === "code" && (
              <>
                <select
                  className="language-selector"
                  value={language}
                  onChange={handleLanguageChange}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
                <textarea
                  className="input-console"
                  placeholder="Enter Input..."
                  value={userInput}
                  onChange={(e) => {
                    setUserInput(e.target.value);
                    socket.emit("inputChange", { roomId, input: e.target.value });
                  }}
                />
                <button className="run-btn" onClick={runCode}>
                  Run
                </button>
                <textarea
                  className="output-console"
                  value={outPut}
                  readOnly
                  placeholder="Output..."
                />
              </>
            )}
            {activeSidebar === "users" && (
              <>
                <h3>Users in Room</h3>
                <ul className="user-list">
                  {users.map((u, idx) => (
                    <li key={idx} className="user-item">
                      <img src={UserIcon} alt="User Avatar" className="user-avatar" />
                      <span>{u}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className={`editor-wrapper ${activeSidebar ? "shifted" : ""}`}>
            <Editor
              height="100vh"
              language={language}
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
