import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateMatch = () => {
    const [savedTeams, setSavedTeams] = useState([]);
    const [teamA, setTeamA] = useState({ name: '', players: [], captain: null, id: null });
    const [teamB, setTeamB] = useState({ name: '', players: [], captain: null, id: null });
    const [step, setStep] = useState(1); // 1: Setup, 2: Select Captains

    const navigate = useNavigate();

    useEffect(() => {
        const teams = localStorage.getItem('turf_teams');
        if (teams) {
            setSavedTeams(JSON.parse(teams));
        }
    }, []);

    const handleSelectTeamA = (e) => {
        const t = savedTeams.find(t => t.id === e.target.value);
        if (t) setTeamA({ ...t, captain: null });
    };

    const handleSelectTeamB = (e) => {
        const t = savedTeams.find(t => t.id === e.target.value);
        if (t) setTeamB({ ...t, captain: null });
    };

    return (
        <div className="min-h-screen bg-[#080B10] text-white p-6 md:p-10 relative overflow-hidden font-sans pb-24 selection:bg-red-500/20">
            {/* BACKGROUND DECOR */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-950/5 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none"></div>

            {/* BACK BUTTON */}
            <button onClick={() => navigate('/home')} className="absolute top-8 left-8 p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-slate-300 hover:text-white transition-all shadow-xl group z-20 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            <div className="max-w-5xl mx-auto z-10 relative mt-16 md:mt-4">
                <div className="text-center mb-12 animate-in fade-in duration-500">
                    <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter leading-none font-display">Assemble<br /><span className="text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">The Teams</span></h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">Match Setup Arena</p>
                </div>

                {/* THE ARENA (VS SECTION) */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center mb-10">
                    <div className="bg-white/[0.02] p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden group backdrop-blur-xl glow-red">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                        <label className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-3 block font-display">Team A Selection</label>
                        <select 
                            className="w-full bg-[#0d1117]/85 text-2xl font-black uppercase italic outline-none text-white cursor-pointer appearance-none border border-white/10 p-3 rounded-2xl focus:border-red-500/50"
                            value={teamA.id || ''}
                            onChange={handleSelectTeamA}
                        >
                            <option value="" disabled className="bg-slate-900 text-white">Select Team A</option>
                            {savedTeams.map(t => (
                                <option key={t.id} value={t.id} disabled={t.id === teamB.id} className="bg-slate-900 text-white">{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic shadow-xl z-10 font-display">VS</div>
                        <div className="w-px h-12 bg-white/15 -mt-6 hidden md:block"></div>
                    </div>

                    <div className="bg-white/[0.02] p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden text-right backdrop-blur-xl">
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-white/20"></div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block font-display">Team B Selection</label>
                        <select 
                            className="w-full bg-[#0d1117]/85 text-2xl font-black uppercase italic outline-none text-white cursor-pointer appearance-none border border-white/10 p-3 rounded-2xl focus:border-white/30 text-right"
                            value={teamB.id || ''}
                            onChange={handleSelectTeamB}
                            style={{ direction: 'rtl' }}
                        >
                            <option value="" disabled className="bg-slate-900 text-white">Select Team B</option>
                            {savedTeams.map(t => (
                                <option key={t.id} value={t.id} disabled={t.id === teamA.id} className="bg-slate-900 text-white">{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* CURRENT ROSTERS DISPLAY */}
                {teamA.id || teamB.id ? (
                    <div className="bg-white/[0.01] backdrop-blur-2xl p-8 rounded-[3.5rem] border border-white/5 shadow-2xl mb-12 animate-in zoom-in-95 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <h4 className="text-[9px] font-black text-red-400 uppercase tracking-[0.4em] ml-2 flex items-center gap-2 font-display">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> {teamA.name || 'Team A'} Roster
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {teamA.players.map(p => (
                                        <div key={p.tid} className="bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-sm hover:bg-white/10 transition-colors">
                                            <span className="text-xs font-black uppercase italic text-slate-200">{p.name}</span>
                                        </div>
                                    ))}
                                    {teamA.players.length === 0 && teamA.id && <p className="text-[9px] text-slate-500 italic font-bold uppercase tracking-widest p-4 border-2 border-dashed border-white/5 rounded-2xl w-full text-center font-display">Empty Bench</p>}
                                    {!teamA.id && <p className="text-[9px] text-slate-600 italic font-bold uppercase tracking-widest p-4 border-2 border-dashed border-white/5 rounded-2xl w-full text-center font-display">Select a Team</p>}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2 flex items-center gap-2 font-display">
                                    <span className="w-1.5 h-1.5 bg-white/20 rounded-full"></span> {teamB.name || 'Team B'} Roster
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {teamB.players.map(p => (
                                        <div key={p.tid} className="bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-sm hover:bg-white/10 transition-colors">
                                            <span className="text-xs font-black uppercase italic text-slate-200">{p.name}</span>
                                        </div>
                                    ))}
                                    {teamB.players.length === 0 && teamB.id && <p className="text-[9px] text-slate-500 italic font-bold uppercase tracking-widest p-4 border-2 border-dashed border-white/5 rounded-2xl w-full text-center font-display">Empty Bench</p>}
                                    {!teamB.id && <p className="text-[9px] text-slate-600 italic font-bold uppercase tracking-widest p-4 border-2 border-dashed border-white/5 rounded-2xl w-full text-center font-display">Select a Team</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* NEXT STEP CTA */}
                {step === 1 && teamA.id && teamB.id && teamA.players.length > 0 && teamB.players.length > 0 && (
                    <div className="flex justify-center pb-20">
                        <button 
                            onClick={() => setStep(2)}
                            className="px-14 py-5 bg-red-50 text-white rounded-3xl font-black uppercase tracking-[0.2em] italic shadow-2xl hover:bg-red-600 active:scale-95 transition-all animate-in slide-in-from-bottom duration-500 font-display cursor-pointer"
                        >
                            Select Team Captains ➔
                        </button>
                    </div>
                )}
            </div>

            {/* CAPTAIN SELECTION VIEW (STEP 2) */}
            {step === 2 && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="w-full max-w-4xl space-y-10 animate-in zoom-in-95 duration-500">
                        <div className="text-center">
                            <h3 className="text-5xl font-black italic text-white uppercase tracking-tighter leading-none font-display">Choose Your<br /><span className="text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">Leaders</span></h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">Finalize Match Command</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white/[0.02] border border-white/10 p-8 rounded-[3rem] shadow-2xl backdrop-blur-xl">
                                <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] mb-6 text-center underline decoration-red-500/20 underline-offset-8 decoration-4 font-display">{teamA.name} Captain</h4>
                                <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
                                    {teamA.players.map(p => (
                                        <button 
                                            key={p.tid} 
                                            onClick={() => setTeamA({...teamA, captain: p})}
                                            className={`p-4.5 rounded-2xl border-2 transition-all font-black uppercase italic text-[11px] cursor-pointer font-display ${teamA.captain?.tid === p.tid ? 'border-red-500 bg-red-500/10 text-red-400 shadow-xl' : 'border-white/5 text-slate-400 bg-white/[0.01] hover:border-white/20'}`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/[0.02] border border-white/10 p-8 rounded-[3rem] shadow-2xl backdrop-blur-xl">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 text-center underline decoration-white/10 underline-offset-8 decoration-4 font-display">{teamB.name} Captain</h4>
                                <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
                                    {teamB.players.map(p => (
                                        <button 
                                            key={p.tid} 
                                            onClick={() => setTeamB({...teamB, captain: p})}
                                            className={`p-4.5 rounded-2xl border-2 transition-all font-black uppercase italic text-[11px] cursor-pointer font-display ${teamB.captain?.tid === p.tid ? 'border-white bg-white text-black shadow-xl' : 'border-white/5 text-slate-400 bg-white/[0.01] hover:border-white/20'}`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setStep(1)} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-slate-300 font-black rounded-2xl uppercase tracking-widest text-[10px] transition-all cursor-pointer font-display">Back to Squads</button>
                            {teamA.captain && teamB.captain && (
                                <button
                                    onClick={() => navigate('/squads', { state: { teamA, teamB } })}
                                    className="px-10 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl shadow-red-500/20 hover:scale-[1.02] transition-all active:scale-95 cursor-pointer font-display"
                                >
                                    Generate Posters 📸
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateMatch;