const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    tid: { type: String, required: true, unique: true }, // This is your unique Turf ID
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', playerSchema);