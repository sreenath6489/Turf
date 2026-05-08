const SOUND_MAP = {
    four: ['/sounds/four.mp3'],
    six: ['/sounds/six_1.mp3', '/sounds/six_2.mp3'],
    wide: ['/sounds/wide.mp3'],
    noball: ['/sounds/noball.mp3'],
    wicket: ['/sounds/wicket.mp3'] // Just in case you add one
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
