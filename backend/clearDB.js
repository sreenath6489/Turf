const mongoose = require('mongoose');
require('dotenv').config();

async function clear() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB...");
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        const names = collections.map(c => c.name);

        if (names.includes('players')) {
            await mongoose.connection.db.dropCollection('players');
            console.log("🗑️ Players cleared.");
        }
        if (names.includes('matches')) {
            await mongoose.connection.db.dropCollection('matches');
            console.log("🗑️ Matches cleared.");
        }
        
        console.log("✅ Database Wiped Clean! Ready for Fresh Start.");
        process.exit();
    } catch (err) {
        console.error("❌ Error wiping DB:", err);
        process.exit(1);
    }
}
clear();
