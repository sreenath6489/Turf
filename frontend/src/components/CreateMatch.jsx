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
        <div className="min-h-screen bg-[#FAF4EA] text-slate-900 p-6 md:p-10 relative overflow-hidden font-sans">
            {/* BACKGROUND DECOR */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/5 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none"></div>

            {/* BACK BUTTON */}
            <button onClick={() => navigate('/home')} className="absolute top-8 left-8 p-4 bg-white border border-red-900/10 rounded-2xl hover:bg-red-50 transition-all shadow-xl group z-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            <div className="max-w-5xl mx-auto z-10 relative mt-16 md:mt-4">
                <div className="text-center mb-12">
                    <h2 className="text-5xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">Assemble<br /><span className="text-red-600">The Teams</span></h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Match Setup Arena</p>
                </div>

                {/* THE ARENA (VS SECTION) */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center mb-10">
                    <div className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-2xl shadow-red-900/5 border border-red-900/5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                        <label className="text-[10px] font-black text-red-600/40 uppercase tracking-widest mb-2 block">Team A Selection</label>
                        <select 
                            className="w-full bg-transparent text-2xl font-black uppercase italic outline-none text-slate-900 cursor-pointer appearance-none"
                            value={teamA.id || ''}
                            onChange={handleSelectTeamA}
                        >
                            <option value="" disabled>Select Team A</option>
                            {savedTeams.map(t => (
                                <option key={t.id} value={t.id} disabled={t.id === teamB.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-black italic shadow-xl z-10">VS</div>
                        <div className="w-px h-12 bg-slate-200 -mt-6 hidden md:block"></div>
                    </div>

                    <div className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-2xl shadow-red-900/5 border border-red-900/5 relative overflow-hidden text-right">
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-400/20"></div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Team B Selection</label>
                        <select 
                            className="w-full bg-transparent text-2xl font-black uppercase italic outline-none text-slate-900 cursor-pointer appearance-none text-right"
                            value={teamB.id || ''}
                            onChange={handleSelectTeamB}
                            style={{ direction: 'rtl' }}
                        >
                            <option value="" disabled>Select Team B</option>
                            {savedTeams.map(t => (
                                <option key={t.id} value={t.id} disabled={t.id === teamA.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* CURRENT ROSTERS DISPLAY */}
                {teamA.id || teamB.id ? (
                    <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-[3.5rem] border border-white shadow-2xl mb-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] ml-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span> {teamA.name || 'Team A'} Roster
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {teamA.players.map(p => (
                                        <div key={p.tid} className="bg-white border border-red-900/10 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm animate-in zoom-in duration-200">
                                            <span className="text-xs font-black uppercase italic">{p.name}</span>
                                        </div>
                                    ))}
                                    {teamA.players.length === 0 && teamA.id && <p className="text-[10px] text-slate-300 italic font-bold uppercase tracking-widest p-4 border-2 border-dashed border-slate-100 rounded-2xl w-full text-center">Empty Bench</p>}
                                    {!teamA.id && <p className="text-[10px] text-slate-300 italic font-bold uppercase tracking-widest p-4 border-2 border-dashed border-slate-100 rounded-2xl w-full text-center">Select a Team</p>}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span> {teamB.name || 'Team B'} Roster
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {teamB.players.map(p => (
                                        <div key={p.tid} className="bg-white border border-slate-200 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm animate-in zoom-in duration-200">
                                            <span className="text-xs font-black uppercase italic">{p.name}</span>
                                        </div>
                                    ))}
                                    {teamB.players.length === 0 && teamB.id && <p className="text-[10px] text-slate-300 italic font-bold uppercase tracking-widest p-4 border-2 border-dashed border-slate-100 rounded-2xl w-full text-center">Empty Bench</p>}
                                    {!teamB.id && <p className="text-[10px] text-slate-300 italic font-bold uppercase tracking-widest p-4 border-2 border-dashed border-slate-100 rounded-2xl w-full text-center">Select a Team</p>}
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
                            className="px-16 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] italic shadow-2xl hover:scale-[1.02] transition-all active:scale-95 animate-in slide-in-from-bottom duration-500"
                        >
                            Select Team Captains ➔
                        </button>
                    </div>
                )}
            </div>

            {/* CAPTAIN SELECTION VIEW (STEP 2) */}
            {step === 2 && (
                <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-3xl flex items-center justify-center p-6">
                    <div className="w-full max-w-4xl space-y-12 animate-in zoom-in-95 duration-500">
                        <div className="text-center">
                            <h3 className="text-5xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">Choose Your<br /><span className="text-red-600">Leaders</span></h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Finalize Match Command</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-red-900/10">
                                <h4 className="text-xs font-black text-red-600 uppercase tracking-[0.3em] mb-6 text-center underline decoration-red-600/20 underline-offset-8 decoration-4">{teamA.name} Captain</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {teamA.players.map(p => (
                                        <button 
                                            key={p.tid} 
                                            onClick={() => setTeamA({...teamA, captain: p})}
                                            className={`p-4 rounded-2xl border-2 transition-all font-black uppercase italic text-xs ${teamA.captain?.tid === p.tid ? 'border-red-600 bg-red-600 text-white shadow-xl scale-105' : 'border-stone-100 text-slate-400 bg-stone-50 hover:border-red-200'}`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-200">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6 text-center underline decoration-slate-200 underline-offset-8 decoration-4">{teamB.name} Captain</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {teamB.players.map(p => (
                                        <button 
                                            key={p.tid} 
                                            onClick={() => setTeamB({...teamB, captain: p})}
                                            className={`p-4 rounded-2xl border-2 transition-all font-black uppercase italic text-xs ${teamB.captain?.tid === p.tid ? 'border-slate-900 bg-slate-900 text-white shadow-xl scale-105' : 'border-stone-100 text-slate-400 bg-stone-50 hover:border-slate-200'}`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setStep(1)} className="px-10 py-5 bg-stone-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest hover:bg-stone-200 transition-all">Back to Squads</button>
                            {teamA.captain && teamB.captain && (
                                <button
                                    onClick={() => navigate('/squads', { state: { teamA, teamB } })}
                                    className="px-12 py-5 bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-2xl shadow-red-600/30 hover:scale-[1.02] transition-all active:scale-95"
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