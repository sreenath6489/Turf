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
    const [side, setSide] = useState(null); 
    const [tossWinner, setTossWinner] = useState(null);
    const [decision, setDecision] = useState(null);
    const [overs, setOvers] = useState(5);

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

        navigate('/setup-players', {
            state: { ...state, battingTeam, bowlingTeam, totalOvers: overs }
        });
    };

    if (!state) return null;

    return (
        <div className="min-h-screen bg-[#FAF4EA] flex flex-col items-center p-6 md:p-12 text-slate-900 relative overflow-hidden font-sans">
            {/* STADIUM LIGHT DECOR */}
            <div className="absolute top-0 left-1/4 w-px h-full bg-red-600/5 hidden md:block"></div>
            <div className="absolute top-0 right-1/4 w-px h-full bg-red-600/5 hidden md:block"></div>

            {/* BACK BUTTON */}
            <button onClick={() => navigate('/home')} className="absolute top-8 left-8 p-4 bg-white border border-red-900/10 rounded-2xl hover:bg-red-50 transition-all shadow-xl z-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            <div className="max-w-4xl w-full z-10">
                <div className="text-center mb-16">
                    <h2 className="text-5xl font-black italic text-slate-900 uppercase tracking-tighter">The<br /><span className="text-red-600">Official Toss</span></h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Match Official Segment</p>
                </div>

                {/* THE MATCHUP ARENA */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center mb-16">
                    <motion.div 
                        animate={tossWinner?.name === state.teamA.name ? { scale: 1.05, borderColor: 'rgba(220, 38, 38, 0.5)' } : {}}
                        className={`bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 transition-all text-center relative overflow-hidden ${tossWinner?.name === state.teamA.name ? 'border-red-600 ring-4 ring-red-600/5' : 'border-red-900/5'}`}
                    >
                        {tossWinner?.name === state.teamA.name && <div className="absolute top-4 right-4 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-full animate-bounce">WINNER</div>}
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Team A</p>
                        <h3 className="text-3xl font-black uppercase italic truncate">{state.teamA.name}</h3>
                    </motion.div>

                    <div className="flex flex-col items-center gap-8 py-10">
                        {/* 3D COIN FLIP */}
                        <div className="relative" style={{ perspective: '1000px' }}>
                            <motion.div 
                                animate={{ 
                                    rotateY: rotation,
                                    y: isSpinning ? [-20, -150, -20] : 0,
                                    scale: isSpinning ? [1, 1.4, 1] : 1
                                }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className="w-40 h-40 relative preserve-3d"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* HEADS */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500 to-red-800 border-8 border-red-400 flex items-center justify-center text-6xl font-black text-white shadow-2xl backface-hidden">
                                    H
                                    <div className="absolute inset-2 border-2 border-white/20 rounded-full"></div>
                                </div>
                                {/* TAILS */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-8 border-slate-600 flex items-center justify-center text-6xl font-black text-white shadow-2xl backface-hidden [transform:rotateY(180deg)]">
                                    T
                                    <div className="absolute inset-2 border-2 border-white/10 rounded-full"></div>
                                </div>
                            </motion.div>
                        </div>

                        <button 
                            onClick={flipCoin} 
                            disabled={isSpinning}
                            className="px-12 py-5 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest italic shadow-2xl hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSpinning ? "SPINNING..." : "FLIP COIN"}
                        </button>
                    </div>

                    <motion.div 
                        animate={tossWinner?.name === state.teamB.name ? { scale: 1.05, borderColor: 'rgba(220, 38, 38, 0.5)' } : {}}
                        className={`bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 transition-all text-center relative overflow-hidden ${tossWinner?.name === state.teamB.name ? 'border-red-600 ring-4 ring-red-600/5' : 'border-red-900/5'}`}
                    >
                        {tossWinner?.name === state.teamB.name && <div className="absolute top-4 left-4 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-full animate-bounce">WINNER</div>}
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Team B</p>
                        <h3 className="text-3xl font-black uppercase italic truncate">{state.teamB.name}</h3>
                    </motion.div>
                </div>

                {/* POST-TOSS DECISION PANEL */}
                <AnimatePresence>
                    {!isSpinning && side && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/60 backdrop-blur-xl p-10 rounded-[3rem] border border-white shadow-2xl"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block">Match Official Decision</label>
                                    <p className="text-sm font-bold text-slate-600 italic">The coin landed on <span className="text-red-600 font-black">{side === 'H' ? 'HEADS' : 'TAILS'}</span>. Confirm the winner:</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[state.teamA, state.teamB].map(t => (
                                            <button 
                                                key={t.name} 
                                                onClick={() => setTossWinner(t)} 
                                                className={`p-5 rounded-2xl border-2 font-black uppercase italic text-xs transition-all ${tossWinner?.name === t.name ? 'border-red-600 bg-red-600 text-white shadow-xl' : 'border-stone-100 bg-white text-slate-400 hover:border-red-200'}`}
                                            >
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {tossWinner && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block">{tossWinner.name} elected to...</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                onClick={() => setDecision('Bat')} 
                                                className={`p-5 rounded-2xl border-2 font-black uppercase italic text-xs transition-all ${decision === 'Bat' ? 'border-red-600 bg-red-600 text-white shadow-xl' : 'border-stone-100 bg-white text-slate-400'}`}
                                            >
                                                BAT FIRST
                                            </button>
                                            <button 
                                                onClick={() => setDecision('Bowl')} 
                                                className={`p-5 rounded-2xl border-2 font-black uppercase italic text-xs transition-all ${decision === 'Bowl' ? 'border-red-600 bg-red-600 text-white shadow-xl' : 'border-stone-100 bg-white text-slate-400'}`}
                                            >
                                                BOWL FIRST
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="mt-10 pt-10 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                                <div className="flex items-center gap-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Innings Overs</label>
                                    <input 
                                        type="number" 
                                        value={overs} 
                                        onChange={(e) => setOvers(e.target.value)} 
                                        className="w-20 bg-stone-50 p-4 rounded-xl border border-red-900/10 font-black text-center text-red-600" 
                                    />
                                </div>
                                {decision && (
                                    <button 
                                        onClick={startMatch} 
                                        className="w-full py-6 bg-red-600 text-white font-black rounded-2xl shadow-2xl shadow-red-600/30 uppercase tracking-widest italic hover:scale-[1.02] transition-all"
                                    >
                                        Proceed to Squads ➔
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