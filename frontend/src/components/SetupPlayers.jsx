import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const SetupPlayers = () => {
    const { state: navState } = useLocation();
    const navigate = useNavigate();

    // PERSISTENCE LOGIC
    const [state, setState] = useState(navState || JSON.parse(localStorage.getItem('tempSetupState')));

    useEffect(() => {
        if (navState) {
            localStorage.setItem('tempSetupState', JSON.stringify(navState));
            setState(navState);
        } else if (!state) {
            navigate('/home');
        }
    }, [navState, state, navigate]);

    const [striker, setStriker] = useState(() => {
        const saved = localStorage.getItem('setupStriker');
        return saved ? JSON.parse(saved) : null;
    });
    const [nonStriker, setNonStriker] = useState(() => {
        const saved = localStorage.getItem('setupNonStriker');
        return saved ? JSON.parse(saved) : null;
    });
    const [bowler, setBowler] = useState(() => {
        const saved = localStorage.getItem('setupBowler');
        return saved ? JSON.parse(saved) : null;
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (striker) localStorage.setItem('setupStriker', JSON.stringify(striker));
        if (nonStriker) localStorage.setItem('setupNonStriker', JSON.stringify(nonStriker));
        if (bowler) localStorage.setItem('setupBowler', JSON.stringify(bowler));
    }, [striker, nonStriker, bowler]);

    if (!state) return null;

    const handleStartMatch = async () => {
        if (!striker || !nonStriker || !bowler) {
            alert("Please select all 3 starting players!");
            return;
        }
        if (striker.tid === nonStriker.tid) {
            alert("Striker and Non-Striker cannot be the same person!");
            return;
        }

        setLoading(true);
        try {
            const admin = JSON.parse(localStorage.getItem('user'));
            const matchData = {
                teamA: state.teamA,
                teamB: state.teamB,
                battingTeam: state.battingTeam,
                bowlingTeam: state.bowlingTeam,
                overs: state.totalOvers,
                adminId: admin.tid,
                currentBatsmen: { striker, nonStriker },
                currentBowler: bowler,
                score: 0,
                wickets: 0,
                balls: 0,
                isCompleted: false,
                existingMatchId: state.existingMatchId,
                target: state.target
            };

            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/matches/create`, matchData);

            if (res.data.success) {
                // CLEAR TEMP STATES
                localStorage.removeItem('tempMatchState');
                localStorage.removeItem('tempSetupState');
                localStorage.removeItem('setupStriker');
                localStorage.removeItem('setupNonStriker');
                localStorage.removeItem('setupBowler');
                navigate(`/scoreboard/${res.data.match._id}`, { state: res.data.match });
            }
        } catch (err) {
            console.error(err);
            alert("Failed to initialize match in DB");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF4EA] text-slate-900 p-6 md:p-10 font-sans relative overflow-hidden">
            {/* PITCH TEXTURE BACKGROUND */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <rect x="45" y="0" width="10" height="100" fill="currentColor" />
                    <circle cx="50" cy="50" r="10" stroke="currentColor" fill="none" strokeWidth="0.5" />
                </svg>
            </div>

            {/* BACK BUTTON */}
            <button onClick={() => navigate('/home')} className="absolute top-8 left-8 p-4 bg-white border border-red-900/10 rounded-2xl hover:bg-red-50 transition-all shadow-xl z-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            <div className="max-w-6xl mx-auto z-10 relative">
                <div className="text-center mb-12">
                    <h2 className="text-5xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">Match<br /><span className="text-red-600">Briefing</span></h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Final Strategic Setup</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
                    {/* BATTING SQUAD SECTION */}
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-red-900/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-3xl font-black uppercase italic leading-none">{state.battingTeam.name}</h3>
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">Batting First</p>
                            </div>
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19,2L14,7.29V13.71L19,18.71V2M5,2L10,7.29V13.71L5,18.71V2Z" /></svg>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Select Striker</label>
                                <div className="flex flex-wrap gap-2">
                                    {state.battingTeam.players.map(p => (
                                        <button 
                                            key={p.tid} 
                                            onClick={() => setStriker(p)}
                                            className={`px-5 py-3 rounded-2xl border-2 transition-all font-black uppercase italic text-xs ${striker?.tid === p.tid ? 'border-red-600 bg-red-600 text-white shadow-xl scale-105' : 'border-stone-100 bg-stone-50 text-slate-400 hover:border-red-200'}`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Select Non-Striker</label>
                                <div className="flex flex-wrap gap-2">
                                    {state.battingTeam.players.map(p => (
                                        <button 
                                            key={p.tid} 
                                            onClick={() => setNonStriker(p)}
                                            disabled={striker?.tid === p.tid}
                                            className={`px-5 py-3 rounded-2xl border-2 transition-all font-black uppercase italic text-xs ${nonStriker?.tid === p.tid ? 'border-slate-900 bg-slate-900 text-white shadow-xl scale-105' : 'border-stone-100 bg-stone-50 text-slate-400 hover:border-slate-200'} disabled:opacity-30`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOWLING SQUAD SECTION */}
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-400"></div>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-3xl font-black uppercase italic leading-none">{state.bowlingTeam.name}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Bowling First</p>
                            </div>
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Select Opening Bowler</label>
                            <div className="flex flex-wrap gap-2">
                                {state.bowlingTeam.players.map(p => (
                                    <button 
                                        key={p.tid} 
                                        onClick={() => setBowler(p)}
                                        className={`px-5 py-3 rounded-2xl border-2 transition-all font-black uppercase italic text-xs ${bowler?.tid === p.tid ? 'border-slate-900 bg-slate-900 text-white shadow-xl scale-105' : 'border-stone-100 bg-stone-50 text-slate-400 hover:border-slate-200'}`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* FINAL START BUTTON */}
                <div className="flex justify-center pb-20">
                    <button 
                        onClick={handleStartMatch} 
                        disabled={!striker || !nonStriker || !bowler || loading}
                        className="px-20 py-8 bg-red-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] italic shadow-2xl shadow-red-600/30 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-30 disabled:grayscale relative overflow-hidden"
                    >
                        {loading ? "Initializing..." : "Start The Battle 🚀"}
                        <motion.div 
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                        />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetupPlayers;