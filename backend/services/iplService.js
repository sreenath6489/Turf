const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize Cache: Data stays for 120 seconds (2 mins)
const iplCache = new NodeCache({ stdTTL: 120 });

const getLiveIPLScore = async () => {
    // Check Cache
    const cachedData = iplCache.get("ipl_live_score");
    if (cachedData) {
        console.log("Serving IPL from Cache...");
        return cachedData;
    }

    console.log("Fetching fresh data from CricketData.org...");
    try {
        const apiKey = process.env.CRICKET_API_KEY;
        const response = await axios.get(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}`);
        
        if (response.data.status !== 'success') {
            throw new Error(response.data.reason || "API Error");
        }

        // Filter for IPL matches
        const iplMatch = response.data.data?.find(m => 
            m.name.includes("Indian Premier League") || 
            m.name.includes("IPL")
        );

        if (iplMatch) {
            // Transform/Normalize if needed, but we'll send it as is for now
            iplCache.set("ipl_live_score", iplMatch);
        }
        
        return iplMatch;
    } catch (error) {
        console.error("CricketData API Error:", error.message);
        return null;
    }
};

module.exports = { getLiveIPLScore };
