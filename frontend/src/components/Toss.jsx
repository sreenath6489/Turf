import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Toss = () => {
    const { state: navState } = useLocation();
    const navigate = useNavigate();
    
    // PERSISTENCE LOGIC
    const [state, setState] = useState(navState || JSON.parse(localStorage.getItem('tempMatchState')));

    useEffect(() => {
        if (navState) {
            localStorage.setItem('tempMatchState', JSON.stringify(navState));
            setState(navState);
        } else if (!state) {
            navigate('/home');
        }
    }, [navState, state, navigate]);

    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [side, setSide] = useState(() => localStorage.getItem('tossSide')); 
    const [tossWinner, setTossWinner] = useState(() => {
        const saved = localStorage.getItem('tossWinner');
        return saved ? JSON.parse(saved) : null;
    });
    const [decision, setDecision] = useState(() => localStorage.getItem('tossDecision'));
    const [overs, setOvers] = useState(() => localStorage.getItem('tossOvers') || 5);

    useEffect(() => {
        if (side) localStorage.setItem('tossSide', side);
        if (tossWinner) localStorage.setItem('tossWinner', JSON.stringify(tossWinner));
        if (decision) localStorage.setItem('tossDecision', decision);
        localStorage.setItem('tossOvers', overs);
    }, [side, tossWinner, decision, overs]);

    const flipCoin = () => {
        if (isSpinning) return;
        
        setIsSpinning(true);
        setSide(null);
        setTossWinner(null);
        setDecision(null);

        const result = Math.random() > 0.5 ? 'H' : 'T';
        const newRotation = rotation + (Math.floor(Math.random() * 5) + 10) * 360 + (result === 'H' ? 0 : 180);
        
        setRotation(newRotation);

        setTimeout(() => {
            setSide(result);
            setIsSpinning(false);
        }, 1500);
    };

    const startMatch = () => {
        const battingTeam = decision === 'Bat' ? tossWinner : (tossWinner.name === state.teamA.name ? state.teamB : state.teamA);
        const bowlingTeam = battingTeam.name === state.teamA.name ? state.teamB : state.teamA;

        localStorage.removeItem('tempMatchState');
        localStorage.removeItem('tossSide');
        localStorage.removeItem('tossWinner');
        localStorage.removeItem('tossDecision');
        localStorage.removeItem('tossOvers');

        navigate('/setup-players', {
            state: { ...state, battingTeam, bowlingTeam, totalOvers: overs }
        });
    };

    if (!state) return null;

    return (
        <div className="min-h-screen bg-[#080B10] flex flex-col items-center p-6 md:p-12 text-white relative overflow-hidden font-sans selection:bg-red-500/20 pb-24">
            {/* STADIUM LIGHT DECOR */}
            <div className="absolute top-0 left-1/4 w-px h-full bg-white/5 hidden md:block"></div>
            <div className="absolute top-0 right-1/4 w-px h-full bg-white/5 hidden md:block"></div>
            <div className="absolute top-1/4 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            {/* BACK BUTTON */}
            <button onClick={() => navigate('/home')} className="absolute top-8 left-8 p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-slate-300 hover:text-white transition-all shadow-xl z-20 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            <div className="max-w-4xl w-full z-10">
                <div className="text-center mb-16 animate-in fade-in duration-500">
                    <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter font-display">The<br /><span className="text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">Official Toss</span></h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">Match Official Segment</p>
                </div>

                {/* THE MATCHUP ARENA */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center mb-16">
                    <motion.div 
                        animate={tossWinner?.name === state.teamA.name ? { scale: 1.03, borderColor: 'rgba(239, 68, 68, 0.4)' } : {}}
                        className={`bg-white/[0.02] border p-8 rounded-[2.5rem] shadow-2xl transition-all text-center relative overflow-hidden backdrop-blur-xl ${tossWinner?.name === state.teamA.name ? 'border-red-500 glow-red' : 'border-white/10'}`}
                    >
                        {tossWinner?.name === state.teamA.name && <div className="absolute top-4 right-4 bg-red-500 text-white text-[8px] font-black px-2.5 py-1 rounded-full animate-bounce font-display tracking-wider">WINNER</div>}
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 font-display">Team A</p>
                        <h3 className="text-3xl font-black uppercase italic truncate font-display">{state.teamA.name}</h3>
                    </motion.div>

                    <div className="flex flex-col items-center gap-8 py-6">
                        {/* 3D COIN FLIP */}
                        <div className="relative" style={{ perspective: '1000px' }}>
                            <motion.div 
                                animate={{ 
                                    rotateY: rotation,
                                    y: isSpinning ? [-20, -150, -20] : 0,
                                    scale: isSpinning ? [1, 1.3, 1] : 1
                                }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className="w-36 h-36 relative preserve-3d"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* HEADS */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-8 border-amber-300 flex items-center justify-center text-5xl font-black text-slate-900 shadow-2xl backface-hidden font-display">
                                    H
                                    <div className="absolute inset-2 border border-black/10 rounded-full"></div>
                                </div>
                                {/* TAILS */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-8 border-slate-600 flex items-center justify-center text-5xl font-black text-white shadow-2xl backface-hidden [transform:rotateY(180deg)] font-display">
                                    T
                                    <div className="absolute inset-2 border border-white/5 rounded-full"></div>
                                </div>
                            </motion.div>
                        </div>

                        <button 
                            onClick={flipCoin} 
                            disabled={isSpinning}
                            className="px-10 py-4 bg-white/10 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 font-display cursor-pointer"
                        >
                            {isSpinning ? "SPINNING..." : "FLIP COIN"}
                        </button>
                    </div>

                    <motion.div 
                        animate={tossWinner?.name === state.teamB.name ? { scale: 1.03, borderColor: 'rgba(239, 68, 68, 0.4)' } : {}}
                        className={`bg-white/[0.02] border p-8 rounded-[2.5rem] shadow-2xl transition-all text-center relative overflow-hidden backdrop-blur-xl ${tossWinner?.name === state.teamB.name ? 'border-red-500 glow-red' : 'border-white/10'}`}
                    >
                        {tossWinner?.name === state.teamB.name && <div className="absolute top-4 left-4 bg-red-500 text-white text-[8px] font-black px-2.5 py-1 rounded-full animate-bounce font-display tracking-wider">WINNER</div>}
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 font-display">Team B</p>
                        <h3 className="text-3xl font-black uppercase italic truncate font-display">{state.teamB.name}</h3>
                    </motion.div>
                </div>

                {/* POST-TOSS DECISION PANEL */}
                <AnimatePresence>
                    {!isSpinning && side && (
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 md:p-10 rounded-[3rem] shadow-2xl glow-red"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block font-display">Match Official Decision</label>
                                    <p className="text-xs font-bold text-slate-300 italic">The coin landed on <span className="text-red-400 font-black font-display">{side === 'H' ? 'HEADS' : 'TAILS'}</span>. Confirm the winner:</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[state.teamA, state.teamB].map(t => (
                                            <button 
                                                key={t.name} 
                                                onClick={() => setTossWinner(t)} 
                                                className={`p-4.5 rounded-2xl border transition-all font-black uppercase italic text-[11px] cursor-pointer font-display ${tossWinner?.name === t.name ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-white/5 bg-white/[0.01] text-slate-400 hover:border-white/15'}`}
                                            >
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {tossWinner && (
                                    <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block font-display">{tossWinner.name} elected to...</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                onClick={() => setDecision('Bat')} 
                                                className={`p-4.5 rounded-2xl border transition-all font-black uppercase italic text-[11px] cursor-pointer font-display ${decision === 'Bat' ? 'border-red-500 bg-red-500/10 text-red-400 shadow-xl' : 'border-white/5 bg-white/[0.01] text-slate-400'}`}
                                            >
                                                BAT FIRST
                                            </button>
                                            <button 
                                                onClick={() => setDecision('Bowl')} 
                                                className={`p-4.5 rounded-2xl border transition-all font-black uppercase italic text-[11px] cursor-pointer font-display ${decision === 'Bowl' ? 'border-red-500 bg-red-500/10 text-red-400 shadow-xl' : 'border-white/5 bg-white/[0.01] text-slate-400'}`}
                                            >
                                                BOWL FIRST
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="flex items-center gap-4">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-display">Innings Overs</label>
                                    <input 
                                        type="number" 
                                        value={overs} 
                                        onChange={(e) => setOvers(e.target.value)} 
                                        className="w-20 bg-white/5 p-3 rounded-xl border border-white/10 font-black text-center text-red-400 focus:border-red-500/30 outline-none" 
                                    />
                                </div>
                                {decision && (
                                    <button 
                                        onClick={startMatch} 
                                        className="w-full py-5 bg-red-500 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all font-display cursor-pointer"
                                    >
                                        Setup Pitch & Players ➔
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Toss;