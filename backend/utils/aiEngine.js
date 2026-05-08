const fourSentences = [
    "What a shot by {batsman}! That raced to the boundary for four!",
    "Cracking stroke from {batsman}, beats the fielder for a gorgeous boundary!",
    "Short, wide, and {batsman} punishes it! Four runs!",
    "{batsman} finds the gap beautifully! That's four more to the total.",
    "No need to run for those! {batsman} hits a delightful boundary.",
    "Oh, glorious from {batsman}! Pierces the off-side field for four.",
    "{batsman} stands tall and punches it past point for four!",
    "Brilliant timing by {batsman}! Just a flick of the wrists and it's four.",
    "Down the ground by {batsman}! One bounce and over the ropes for four.",
    "What an elegant cover drive from {batsman}, that's a certain boundary!",
    "Smacked away by {batsman}! The bowler {bowler} can only watch it go for four.",
    "{batsman} takes full toll of that delivery! Swept away for four.",
    "A majestic shot by {batsman}, pure timing and it races away for four!",
    "Threaded the needle! {batsman} finds the boundary with precision.",
    "{batsman} uses the pace of {bowler} and guides it for four!"
];

const sixSentences = [
    "He's hit that into the crowd! {batsman} hits a massive six!",
    "Up, up, and away! {batsman} launches it out of the park!",
    "That is huge from {batsman}! A colossal strike for six!",
    "Straight down the ground! {batsman} sends it miles into the stands!",
    "{batsman} takes on {bowler} and clears the boundary with ease. Six runs!",
    "Clean strike! {batsman} deposits it into the second tier!",
    "Oh, that makes a beautiful sound off the bat! Six runs to {batsman}!",
    "He's absolutely tonked that! {batsman} hits a monster six!",
    "What a phenomenal shot! {batsman} lifts it majestically for six.",
    "Maximum! {batsman} frees his arms and sends it flying!",
    "{batsman} goes downtown! A brilliant six under pressure.",
    "No fielder is catching that! {batsman} launches it for six!",
    "That went like a tracer bullet! {batsman} smokes it for six!",
    "{bowler} misses his length and {batsman} makes him pay with a huge six!",
    "Unbelievable power from {batsman}! A mammoth six!"
];

const wicketSentences = [
    "Got him! {bowler} strikes and {batsman} has to walk back!",
    "Edged and taken! A crucial breakthrough by {bowler} to dismiss {batsman}!",
    "{bowler} knocks him over! {batsman} is completely bamboozled!",
    "That's out! {batsman} departs, what a delivery from {bowler}!",
    "In the air... and caught! {bowler} gets the massive wicket of {batsman}!",
    "Clean bowled! {bowler} shatters the stumps, {batsman} is gone!",
    "Plumb in front! {batsman} is given out, {bowler} gets his man!",
    "A terrible mix-up and {batsman} is run out! Huge moment in the match!",
    "He's holed out! {batsman} tried to go big but perishes to {bowler}.",
    "{bowler} provides the magic! {batsman} makes the long walk back.",
    "Stumped! Brilliant glovework and {batsman} is sent packing by {bowler}!",
    "What a spectacular catch to dismiss {batsman}! {bowler} is thrilled!",
    "{batsman} goes for a duck! {bowler} is absolutely fired up!",
    "The pressure pays off! {bowler} gets the vital wicket of {batsman}.",
    "Straight into the hands of the fielder! {batsman} departs, {bowler} strikes!"
];

const overSentences = [
    "And that concludes the over. {battingTeam} is standing at {score} for {wickets}.",
    "End of the over by {bowler}. The pressure is slowly building on {battingTeam}.",
    "A solid over comes to an end. {battingTeam} pushes the score to {score}.",
    "That's the end of the over. The current score is {score} for {wickets}.",
    "Over completed! {battingTeam} needs to keep the momentum going here."
];

const generateCommentary = async (event, match) => {
    try {
        const batsman = match.currentBatsmen.striker?.name || "The batsman";
        const bowler = match.currentBowler?.name || "The bowler";
        const battingTeam = match.battingTeam?.name || "The batting team";
        const score = match.score;
        const wickets = match.wickets;

        let templates = [];
        
        if (event.type === 'boundary' && event.runs === 4) {
            templates = fourSentences;
        } else if (event.type === 'boundary' && event.runs === 6) {
            templates = sixSentences;
        } else if (event.type === 'wicket') {
            templates = wicketSentences;
        } else if (match.balls > 0 && match.balls % 6 === 0) {
            templates = overSentences;
        } else {
            return null; // Fallback so it doesn't speak randomly
        }

        const randomIndex = Math.floor(Math.random() * templates.length);
        let text = templates[randomIndex];

        text = text.replace(/{batsman}/g, batsman);
        text = text.replace(/{bowler}/g, bowler);
        text = text.replace(/{battingTeam}/g, battingTeam);
        text = text.replace(/{score}/g, score);
        text = text.replace(/{wickets}/g, wickets);

        return text;
    } catch (error) {
        console.error("Local Engine Error:", error);
        return "What an incredible moment in this match!";
    }
};

module.exports = { generateCommentary };
