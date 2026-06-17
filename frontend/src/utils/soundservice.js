const RAVI_SOUNDS = {
    four: ['/sounds/ravi_four_1.mp3', '/sounds/ravi_four_2.mp3', '/sounds/ravi_four_3.mp3', '/sounds/ravi_four_4.mp3', '/sounds/ravi_four_5.mp3'],
    six: ['/sounds/ravi_six_1.mp3', '/sounds/ravi_six_2.mp3', '/sounds/ravi_six_3.mp3', '/sounds/ravi_six_4.mp3', '/sounds/ravi_six_5.mp3'],
    wide: ['/sounds/ravi_wide_1.mp3', '/sounds/ravi_wide_2.mp3', '/sounds/ravi_wide_3.mp3'],
    widedouble: ['/sounds/ravi_wide_1.mp3', '/sounds/ravi_wide_2.mp3', '/sounds/ravi_wide_3.mp3'], 
    noball: ['/sounds/ravi_noball_1.mp3', '/sounds/ravi_noball_2.mp3'],
    wicket: ['/sounds/ravi_wicket_1.mp3', '/sounds/ravi_wicket_2.mp3', '/sounds/ravi_wicket_3.mp3', '/sounds/ravi_wicket_4.mp3', '/sounds/ravi_wicket_5.mp3']
};

const TELUGU_SOUNDS = {
    four: ['/sounds/four.mp3', '/sounds/four1.mp3'],
    six: ['/sounds/six_1.mp3', '/sounds/six_2.mp3'],
    wide: ['/sounds/wide.mp3', '/sounds/wide1.mp3'],
    widedouble: ['/sounds/wide.mp3'],
    noball: ['/sounds/noball.mp3', '/sounds/nob.mp3'],
    wicket: ['/sounds/wicket.mp3', '/sounds/wicket1.mp3']
};

const COUNTERS = {
    four: 0,
    six: 0,
    wide: 0,
    noball: 0,
    wicket: 0
};

let currentAudio = null;

export const playEventSound = (type) => {
    // Check if global sound is muted
    const isMuted = localStorage.getItem('soundMuted') === 'true';
    if (isMuted) return;

    const mode = localStorage.getItem('commentaryMode') || 'RAVI';
    
    // We only play MP3s for TELUGU and RAVI modes
    if (mode === 'OFF' || mode === 'SYSTEMATIC') return;

    const soundMap = mode === 'TELUGU' ? TELUGU_SOUNDS : RAVI_SOUNDS;
    if (!soundMap[type]) return;

    // Interrupt previous sound
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    const sounds = soundMap[type];
    const currentCounter = COUNTERS[type] || 0;

    const soundPath = sounds[currentCounter % sounds.length];
    if (COUNTERS[type] !== undefined) COUNTERS[type]++;

    if (soundPath) {
        const audio = new Audio(soundPath);
        currentAudio = audio;
        audio.play().catch(e => console.log("Audio play failed:", e));
    }
};

export const speakCommentary = (text) => {
    // Check if global sound is muted
    const isMuted = localStorage.getItem('soundMuted') === 'true';
    if (isMuted) return;

    const mode = localStorage.getItem('commentaryMode') || 'RAVI';
    
    if (mode === 'OFF' || mode === 'TELUGU') return; // Systematic / Ravi use robotic voice for dynamics

    // Prevent robotic voice from talking over our custom Ravi Shastri MP3s for major events
    const skipPhrases = ['4 runs!', 'SIX!', 'WICKET!', 'Wide', 'No ball'];
    if (mode === 'RAVI' && skipPhrases.some(phrase => text.includes(phrase))) {
        return; // Mute the robot, let the ElevenLabs MP3 play!
    }

    if ('speechSynthesis' in window) {
        // Cancel previous speech to keep it real-time
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.15; // Snappier for excitement
        utterance.pitch = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        // Priority voices for a professional cricket feel
        const preferredVoices = ['Google UK English Male', 'Daniel', 'Rishi', 'Alex', 'Samantha', 'Male'];
        let selectedVoice = null;
        
        for (const name of preferredVoices) {
            selectedVoice = voices.find(v => v.name.includes(name));
            if (selectedVoice) break;
        }

        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-IN'));
        }

        if (selectedVoice) utterance.voice = selectedVoice;

        window.speechSynthesis.speak(utterance);
    }
};
