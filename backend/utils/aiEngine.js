const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyAfD934PWGtAYrrJgojO9sIFlq6krNhag0");

const generateCommentary = async (event, match) => {
    try {
        const batsman = match.currentBatsmen.striker?.name || "The batsman";
        const bowler = match.currentBowler?.name || "The bowler";
        const battingTeam = match.battingTeam?.name || "The batting team";
        const score = match.score;
        const wickets = match.wickets;

        let context = "";
        let promptType = "";

        if (event.type === 'boundary' && event.runs === 4) {
            promptType = "hype";
            context = `${batsman} just hit a fantastic 4 off ${bowler}!`;
        } else if (event.type === 'boundary' && event.runs === 6) {
            promptType = "hype";
            context = `${batsman} just smashed a massive 6 off ${bowler}!`;
        } else if (event.type === 'wicket') {
            promptType = "roast";
            let dismissal = match.batsmanStats[match.batsmanStats.length - 1]?.dismissal || "got out";
            context = `${batsman} just got out (${dismissal}) bowled by ${bowler}.`;
        } else if (match.balls > 0 && match.balls % 6 === 0) {
            promptType = "summary";
            context = `End of the over. ${battingTeam} is at ${score} for ${wickets}.`;
        } else if (event.type === 'noball' || event.type === 'wide') {
            promptType = "roast";
            context = `${bowler} just bowled a ${event.type}!`;
        } else {
            return null; // Don't speak for regular balls
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let systemPrompt = `You are an energetic, slightly unhinged, and modern street-cricket commentator. 
Keep your response short (1-2 sentences maximum, under 15 words if possible so it's punchy). 
Do NOT use hashtags. Use Gen-Z slang occasionally but keep it understandable.`;

        if (promptType === "hype") {
            systemPrompt += ` Hype up the batsman immensely! Make them sound like a god.`;
        } else if (promptType === "roast") {
            systemPrompt += ` Roast the player making the mistake mercilessly! Be sarcastic and funny, but keep it PG-13.`;
        } else {
            systemPrompt += ` Give a quick, dramatic summary of the situation.`;
        }

        const prompt = `${systemPrompt}\n\nEvent: ${context}\n\nGenerate the commentary line now:`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().replace(/['"]+/g, '');
        
        return text;

    } catch (error) {
        console.error("Gemini API Error:", error);
        // Fallback to basic string if API fails or rate limits
        if (event.runs === 6) return `What a shot! ${match.currentBatsmen.striker?.name} hits a massive six!`;
        if (event.runs === 4) return `Beautiful boundary by ${match.currentBatsmen.striker?.name}!`;
        if (event.type === 'wicket') return `Oh dear, ${match.currentBatsmen.striker?.name} is gone!`;
        return "What an incredible moment in this match!";
    }
};

const generatePlayerCard = async (playerStats) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are a hype-man cricket analyst. Given these stats for a player, generate a 2-3 word cool nickname, and a 1-sentence epic quote summarizing their performance. 
Stats:
Name: ${playerStats.name}
Runs: ${playerStats.runs}
Balls: ${playerStats.balls}
Fours: ${playerStats.fours}
Sixes: ${playerStats.sixes}
Wickets: ${playerStats.wickets || 0}

Output Format strictly as JSON: {"nickname": "The Finisher", "quote": "He came, he saw, he smashed it out of the park."}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        // Remove markdown formatting if any
        text = text.replace(/```json\s*/, '').replace(/\s*```/, '');
        
        return JSON.parse(text);
    } catch (err) {
        console.error("Player Card Gen Error:", err);
        return { nickname: "The Star", quote: "A phenomenal performance on the turf!" };
    }
};

module.exports = { generateCommentary, generatePlayerCard };
