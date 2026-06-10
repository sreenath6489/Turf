require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Player = require('./models/Player');
const Match = require('./models/Match');
const { generateCommentary, generatePlayerCard, generateMatchSummary } = require('./utils/aiEngine');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// --- SOCKET.IO REAL-TIME LOGIC ---
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Join a specific match room
    socket.on('joinMatch', (matchId) => {
        socket.join(matchId);
    });

    // When the host updates a ball
    socket.on('updateBall', async (data) => {
        try {
            const { matchId, newBall, updatedScorecard } = data;
            
            // Update DB in the background
            await Match.findByIdAndUpdate(matchId, updatedScorecard);
            
            // Trigger AI Commentary for big moments
            if (newBall && (newBall.type === 'boundary' || newBall.type === 'wicket' || (updatedScorecard.balls > 0 && updatedScorecard.balls % 6 === 0))) {
                const commentary = await generateCommentary(newBall, updatedScorecard);
                console.log("[AI ENGINE] Generated commentary:", commentary);
                if (commentary) {
                    console.log("[AI ENGINE] Emitting to room:", matchId);
                    io.to(matchId).emit('newCommentary', { 
                        text: commentary, 
                        isBigEvent: true 
                    });
                }
            }

            // Broadcast ONLY to people in this match room
            io.to(matchId).emit('scoreUpdated', updatedScorecard);
            
            if (newBall) {
                io.to(matchId).emit('liveEvent', newBall);
            }
        } catch (err) {
            console.error("Error updating score:", err);
        }
    });

    socket.on('disconnect', () => console.log("User Disconnected"));
});

// --- API ROUTES ---

app.get('/', (req, res) => res.send("Turf API Running"));

// Player Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { name, profilePic, role } = req.body;
        const count = await Player.countDocuments({ name: new RegExp(`^${name}$`, 'i') });
        const tid = `${name}${count + 1}`;
        const newPlayer = new Player({ name, tid, profilePic, role });
        await newPlayer.save();
        res.status(201).json({ success: true, player: newPlayer });
    } catch (error) {
        res.status(400).json({ success: false, message: "Error creating player" });
    }
});

// Player Login
app.post('/api/login', async (req, res) => {
    try {
        const { identifier } = req.body;
        const player = await Player.findOne({ $or: [{ name: identifier }, { tid: identifier }] });
        if (player) res.json({ success: true, player });
        else res.status(404).json({ success: false, message: "Player not found" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Search Players
app.get('/api/players/search', async (req, res) => {
    try {
        const { query } = req.query;
        const players = await Player.find({
            $or: [{ name: { $regex: query, $options: 'i' } }, { tid: { $regex: query, $options: 'i' } }]
        }).limit(5);
        res.json(players);
    } catch (error) {
        res.status(500).json({ message: "Search failed" });
    }
});

// Create or Update Match
app.post('/api/matches/create', async (req, res) => {
    try {
        if (req.body.existingMatchId) {
            const oldMatch = await Match.findById(req.body.existingMatchId);
            
            // Save exactly how the first innings ended
            let finalBowlerStats = [...oldMatch.bowlerStats];
            if (oldMatch.currentBowler && oldMatch.currentBowler.balls > 0) {
                const existing = finalBowlerStats.findIndex(b => b.tid === oldMatch.currentBowler.tid);
                if (existing >= 0) finalBowlerStats[existing] = oldMatch.currentBowler;
                else finalBowlerStats.push(oldMatch.currentBowler);
            }

            const firstInningsData = {
                score: oldMatch.score,
                wickets: oldMatch.wickets,
                balls: oldMatch.balls,
                extras: oldMatch.extras,
                batsmanStats: [...oldMatch.batsmanStats],
                bowlerStats: finalBowlerStats,
                ballHistory: [...oldMatch.ballHistory],
                currentBatsmen: oldMatch.currentBatsmen,
                currentBowler: oldMatch.currentBowler
            };

            const updatedMatch = await Match.findByIdAndUpdate(req.body.existingMatchId, {
                battingTeam: req.body.battingTeam,
                bowlingTeam: req.body.bowlingTeam,
                currentBatsmen: req.body.currentBatsmen,
                currentBowler: req.body.currentBowler,
                score: 0,
                wickets: 0,
                balls: 0,
                innings: 2,
                target: req.body.target,
                ballHistory: [],
                batsmanStats: [],
                bowlerStats: [],
                extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
                firstInningsData: firstInningsData
            }, { new: true });
            
            // Broadcast to viewers that the innings changed
            io.to(req.body.existingMatchId).emit('scoreUpdated', updatedMatch);
            
            return res.status(200).json({ success: true, match: updatedMatch });
        }

        const newMatch = new Match(req.body);
        await newMatch.save();
        res.status(201).json({ success: true, match: newMatch });
    } catch (error) {
        res.status(400).json({ success: false, message: "Failed to create match" });
    }
});

// Get Live Matches for Home Page
app.get('/api/matches/live', async (req, res) => {
    try {
        const matches = await Match.find({ isCompleted: false });
        res.json(matches);
    } catch (error) {
        res.status(500).json({ message: "Error fetching matches" });
    }
});

// Get Match History (All Completed Matches)
app.get('/api/matches/history/:tid', async (req, res) => {
    try {
        // As per user request, we display all completed matches globally for everyone to see
        const matches = await Match.find({ isCompleted: true }).sort({ _id: -1 }); // Newest first
        res.json(matches);
    } catch (error) {
        res.status(500).json({ message: "Error fetching history" });
    }
});

// Get Match by ID
app.get('/api/matches/:id', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (match) res.json(match);
        else res.status(404).json({ message: "Match not found" });
    } catch (error) {
        res.status(500).json({ message: "Error fetching match" });
    }
});

// GET PLAYER STATS AGGREGATED
app.get('/api/players/stats/:tid', async (req, res) => {
    try {
        const { tid } = req.params;
        const matches = await Match.find({
            isCompleted: true,
            $or: [
                { "batsmanStats.tid": tid },
                { "bowlerStats.tid": tid },
                { "firstInningsData.batsmanStats.tid": tid },
                { "firstInningsData.bowlerStats.tid": tid }
            ]
        });

        let stats = {
            batting: { totalRuns: 0, totalBalls: 0, fours: 0, sixes: 0, innings: 0, highest: 0 },
            bowling: { totalWickets: 0, totalRuns: 0, totalBalls: 0, maidens: 0, innings: 0 },
            recentForm: []
        };

        matches.forEach(m => {
            const dateObj = m._id.getTimestamp();
            const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
            let matchEntry = { date: dateStr, runs: 0, wickets: 0 };
            
            // Batting (Check both innings)
            const bat1 = m.firstInningsData?.batsmanStats?.find(b => b.tid === tid);
            const bat2 = m.batsmanStats?.find(b => b.tid === tid);
            
            if (bat1) {
                stats.batting.totalRuns += bat1.runs;
                stats.batting.totalBalls += bat1.balls;
                stats.batting.fours += bat1.fours;
                stats.batting.sixes += bat1.sixes;
                stats.batting.innings += 1;
                stats.batting.highest = Math.max(stats.batting.highest, bat1.runs);
                matchEntry.runs += bat1.runs;
            }
            if (bat2) {
                stats.batting.totalRuns += bat2.runs;
                stats.batting.totalBalls += bat2.balls;
                stats.batting.fours += bat2.fours;
                stats.batting.sixes += bat2.sixes;
                stats.batting.innings += 1;
                stats.batting.highest = Math.max(stats.batting.highest, bat2.runs);
                matchEntry.runs += bat2.runs;
            }

            // Bowling (Check both innings)
            const bowl1 = m.firstInningsData?.bowlerStats?.find(b => b.tid === tid);
            const bowl2 = m.bowlerStats?.find(b => b.tid === tid);

            if (bowl1) {
                stats.bowling.totalWickets += bowl1.wickets;
                stats.bowling.totalRuns += bowl1.runs;
                stats.bowling.totalBalls += bowl1.balls;
                stats.bowling.innings += 1;
                matchEntry.wickets += bowl1.wickets;
            }
            if (bowl2) {
                stats.bowling.totalWickets += bowl2.wickets;
                stats.bowling.totalRuns += bowl2.runs;
                stats.bowling.totalBalls += bowl2.balls;
                stats.bowling.innings += 1;
                matchEntry.wickets += bowl2.wickets;
            }

            if (bat1 || bat2 || bowl1 || bowl2) {
                stats.recentForm.push(matchEntry);
            }
        });

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to aggregate stats" });
    }
});

const { getLiveIPLScore } = require('./services/iplService');

// GET LIVE IPL SCORE
app.get('/api/ipl/live', async (req, res) => {
    try {
        const data = await getLiveIPLScore();
        if (data) {
            res.json(data);
        } else {
            res.status(404).json({ message: "No live IPL match found" });
        }
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch IPL score" });
    }
});

const PORT = process.env.PORT || 5000;
// Transfer Match Access
app.post('/api/matches/:id/transfer', async (req, res) => {
    try {
        const { newAdminId } = req.body;
        const match = await Match.findByIdAndUpdate(req.params.id, { adminId: newAdminId }, { new: true });
        io.to(req.params.id).emit('scoreUpdated', match);
        res.json({ success: true, match });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Create Crazy Question (Poll)
app.post('/api/matches/:id/poll', async (req, res) => {
    try {
        const { question, options } = req.body;
        const pollOptions = options.map(opt => ({ text: opt, votes: 0 }));
        const match = await Match.findByIdAndUpdate(
            req.params.id, 
            { $push: { polls: { question, options: pollOptions, active: true } } },
            { new: true }
        );
        io.to(req.params.id).emit('scoreUpdated', match);
        res.json({ success: true, match });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Vote on Poll
app.post('/api/matches/:id/poll/:pollIndex/vote', async (req, res) => {
    try {
        const { optionIndex } = req.body;
        const { id, pollIndex } = req.params;
        const match = await Match.findById(id);
        if (!match.polls[pollIndex]) return res.status(404).json({ success: false });
        
        match.polls[pollIndex].options[optionIndex].votes += 1;
        await match.save();
        
        io.to(id).emit('scoreUpdated', match);
        res.json({ success: true, match });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Generate Player Card
app.post('/api/matches/:id/generate-card', async (req, res) => {
    try {
        const { playerStats } = req.body;
        const cardData = await generatePlayerCard(playerStats);
        res.json({ success: true, cardData });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Generate Match Summary
app.post('/api/matches/:id/generate-summary', async (req, res) => {
    try {
        const { matchData } = req.body;
        const summary = await generateMatchSummary(matchData);
        res.json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));