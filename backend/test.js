const { generateCommentary } = require('./utils/aiEngine');

const test = async () => {
    const event = { runs: 6, type: 'boundary', description: 'Massive SIX! Out of the park!' };
    const match = {
        battingTeam: { name: "Team A" },
        score: 45,
        wickets: 2,
        balls: 12,
        currentBatsmen: { striker: { name: "Sreenath" } },
        currentBowler: { name: "Rahul" }
    };
    
    const result = await generateCommentary(event, match);
    console.log("Final Result:", result);
};

test();
