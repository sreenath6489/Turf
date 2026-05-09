const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    tid: { type: String, required: true, unique: true },
    profilePic: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png' },
    role: { type: String, default: 'All-Rounder' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', playerSchema);