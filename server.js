const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Admin credentials (should be in environment variables in production)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '$2b$10$yourhashedpasswordhere'; // Use bcrypt to hash password

// Store data in memory (use a database in production)
let users = new Set();
let chatMessages = [];
let photos = [];
let visitorCount = 0;
let advertisements = [];

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'photo-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Socket.IO connection handling
io.on('connection', (socket) => {
    visitorCount++;
    io.emit('visitor-count', visitorCount);

    // Handle user join
    socket.on('join', (username) => {
        socket.username = username;
        users.add(username);
        io.emit('user-count', users.size);
        io.emit('chat-message', {
            type: 'system',
            content: `${username} joined the chat`
        });
    });

    // Handle chat messages
    socket.on('chat-message', (message) => {
        const messageObj = {
            type: 'user',
            username: socket.username,
            content: message,
            timestamp: new Date()
        };
        chatMessages.push(messageObj);
        io.emit('chat-message', messageObj);
    });

    // Handle photo capture
    socket.on('photo-captured', (photoData) => {
        if (photos.length >= 10) {
            photos.shift(); // Remove oldest photo if limit reached
        }
        photos.push({
            id: Date.now(),
            data: photoData,
            username: socket.username,
            timestamp: new Date()
        });
        io.emit('photos-updated', photos);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.username);
            io.emit('user-count', users.size);
            io.emit('chat-message', {
                type: 'system',
                content: `${socket.username} left the chat`
            });
        }
        visitorCount--;
        io.emit('visitor-count', visitorCount);
    });
});

// Admin routes
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && await bcrypt.compare(password, ADMIN_PASSWORD)) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.get('/admin/stats', (req, res) => {
    res.json({
        visitorCount,
        activeUsers: users.size,
        totalPhotos: photos.length,
        totalMessages: chatMessages.length
    });
});

app.delete('/admin/photos/:id', (req, res) => {
    const photoId = parseInt(req.params.id);
    photos = photos.filter(photo => photo.id !== photoId);
    io.emit('photos-updated', photos);
    res.json({ success: true });
});

app.delete('/admin/messages/:id', (req, res) => {
    const messageId = parseInt(req.params.id);
    chatMessages = chatMessages.filter(msg => msg.id !== messageId);
    io.emit('chat-messages-updated', chatMessages);
    res.json({ success: true });
});

// Advertisement routes
app.post('/admin/ads', upload.single('ad'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    advertisements.push({
        id: Date.now(),
        filename: req.file.filename,
        timestamp: new Date()
    });
    io.emit('ads-updated', advertisements);
    res.json({ success: true });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 
}); 