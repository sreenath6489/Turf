const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    teamA: { name: String, players: Array },
    teamB: { name: String, players: Array },
    battingTeam: Object,
    bowlingTeam: Object,
    toss: { winner: String, decision: String },
    overs: Number,
    adminId: String, // Only this person can score
    score: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    innings: { type: Number, default: 1 },
    target: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    ballHistory: [Object], // Stores details for every ball
    currentBatsmen: {
        striker: { tid: String, name: String, runs: { type: Number, default: 0 }, balls: { type: Number, default: 0 }, fours: { type: Number, default: 0 }, sixes: { type: Number, default: 0 } },
        nonStriker: { tid: String, name: String, runs: { type: Number, default: 0 }, balls: { type: Number, default: 0 }, fours: { type: Number, default: 0 }, sixes: { type: Number, default: 0 } }
    },
    currentBowler: { tid: String, name: String, overs: { type: Number, default: 0 }, balls: { type: Number, default: 0 }, runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 }, maidens: { type: Number, default: 0 } },
    batsmanStats: [Object], // All batsmen who have batted
    bowlerStats: [Object],   // All bowlers who have bowled
    extras: { 
        wides: { type: Number, default: 0 }, 
        noBalls: { type: Number, default: 0 }, 
        byes: { type: Number, default: 0 }, 
        legByes: { type: Number, default: 0 } 
    },
    firstInningsData: Object,
    polls: [{
        question: String,
        options: [{ text: String, votes: { type: Number, default: 0 } }],
        active: { type: Boolean, default: true }
    }]
});

module.exports = mongoose.model('Match', matchSchema);