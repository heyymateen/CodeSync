import { io } from 'socket.io-client';

const socket1 = io('http://localhost:5000');
const socket2 = io('http://localhost:5000');

console.log('Testing WebSocket connections...');

// Test user 1
socket1.on('connect', () => {
    console.log('✅ User 1 connected:', socket1.id);
    
    socket1.emit('join', { roomId: 'test-room', userName: 'Alice' });
});

socket1.on('userJoined', (users) => {
    console.log('✅ User 1 received userJoined event:', users);
});

// Test user 2
socket2.on('connect', () => {
    console.log('✅ User 2 connected:', socket2.id);
    
    setTimeout(() => {
        socket2.emit('join', { roomId: 'test-room', userName: 'Bob' });
    }, 1000);
});

socket2.on('userJoined', (users) => {
    console.log('✅ User 2 received userJoined event:', users);
});

socket2.on('codeUpdate', (code) => {
    console.log('✅ User 2 received codeUpdate:', code);
});

// Test code change
setTimeout(() => {
    console.log('🔄 Testing code change...');
    socket1.emit('codeChange', { roomId: 'test-room', code: 'console.log("Hello World!");' });
}, 2000);

// Test typing indicator
setTimeout(() => {
    console.log('🔄 Testing typing indicator...');
    socket1.emit('typing', { roomId: 'test-room', userName: 'Alice' });
}, 3000);

socket2.on('userTyping', (user) => {
    console.log('✅ User 2 received typing indicator:', user);
});

// Test language change
setTimeout(() => {
    console.log('🔄 Testing language change...');
    socket1.emit('languageChange', { roomId: 'test-room', language: 'python' });
}, 4000);

socket2.on('languageUpdate', (language) => {
    console.log('✅ User 2 received language update:', language);
});

// Cleanup after 6 seconds
setTimeout(() => {
    console.log('🧹 Cleaning up...');
    socket1.emit('leaveRoom');
    socket2.emit('leaveRoom');
    socket1.disconnect();
    socket2.disconnect();
    process.exit(0);
}, 6000);

console.log('Test running... Check the output above.'); 