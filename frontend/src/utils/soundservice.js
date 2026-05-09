const SOUND_MAP = {
    four: ['/sounds/four.mp3', '/sounds/four1.mp3'],
    six: ['/sounds/six_1.mp3', '/sounds/six_2.mp3', '/sounds/six2.mp3'],
    wide: ['/sounds/wide.mp3', '/sounds/wide1.mp3', '/sounds/wide2.mp3'],
    widedouble: ['/sounds/widedouble.mp3'],
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

    const mode = localStorage.getItem('commentaryMode') || 'AI';
    if (mode !== 'DIAL') return;

    if (!SOUND_MAP[type]) return;

    // Interrupt previous sound
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    const sounds = SOUND_MAP[type];
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
    // AI Voice is independent of sound effects (DIAL mode), but let's keep it respect the mute too
    const isMuted = localStorage.getItem('soundMuted') === 'true';
    if (isMuted) return;

    const mode = localStorage.getItem('commentaryMode') || 'AI';
    if (mode !== 'AI') return;

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Male'));
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    }
};
