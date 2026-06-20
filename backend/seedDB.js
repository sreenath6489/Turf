const mongoose = require('mongoose');
require('dotenv').config();
const Player = require('./models/Player');

const playerNames = [
    'sreenath',
    'happy',
    'anurag',
    'dimpu',
    'harsha',
    'rishi',
    'harshill',
    'aditya',
    'karthikeyan',
    'varshith',
    'pratheek'
];

async function seed() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB.");

        const collections = await mongoose.connection.db.listCollections().toArray();
        const names = collections.map(c => c.name);

        if (names.includes('players')) {
            await mongoose.connection.db.dropCollection('players');
            console.log("🗑️ Players collection dropped.");
        }
        if (names.includes('matches')) {
            await mongoose.connection.db.dropCollection('matches');
            console.log("🗑️ Matches collection dropped.");
        }

        console.log("Seeding fresh players...");
        const playersToInsert = playerNames.map(name => {
            // Capitalize first letter for display name
            const displayName = name.charAt(0).toUpperCase() + name.slice(1);
            const tid = `${name.toLowerCase()}1`;
            return {
                name: displayName,
                tid: tid,
                profilePic: 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png',
                role: 'All-Rounder'
            };
        });

        const createdPlayers = await Player.insertMany(playersToInsert);
        console.log(`✅ Seeded ${createdPlayers.length} players successfully:`);
        createdPlayers.forEach(p => {
            console.log(` - ${p.name} (ID: ${p.tid})`);
        });

        process.exit(0);
    } catch (err) {
        console.error("❌ Error seeding DB:", err);
        process.exit(1);
    }
}

seed();
