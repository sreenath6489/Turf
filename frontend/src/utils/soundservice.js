const SOUND_MAP = {
    four: ['/sounds/four.mp3'],
    six: ['/sounds/six_1.mp3', '/sounds/six_2.mp3'],
    wide: ['/sounds/wide.mp3'],
    noball: ['/sounds/noball.mp3'],
    wicket: ['/sounds/wicket.mp3']
};

let sixCounter = 0;

export const playEventSound = (type) => {
    const mode = localStorage.getItem('commentaryMode') || 'AI';
    if (mode !== 'DIAL') return;

    let soundPath = '';
    
    if (type === 'six') {
        soundPath = SOUND_MAP.six[sixCounter % SOUND_MAP.six.length];
        sixCounter++;
    } else if (SOUND_MAP[type]) {
        soundPath = SOUND_MAP[type][0];
    }

    if (soundPath) {
        const audio = new Audio(soundPath);
        audio.play().catch(e => console.log("Audio play failed:", e));
    }
};

export const speakCommentary = (text) => {
    const mode = localStorage.getItem('commentaryMode') || 'AI';
    if (mode !== 'AI') return;

    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1; // Slightly faster for excitement
        utterance.pitch = 1.0;
        
        // Try to find a male/energetic voice if possible
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Male'));
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    }
};
