import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SquadsPoster = () => {
    const { state } = useLocation(); // teamA, teamB
    const navigate = useNavigate();
    const [viewingTeam, setViewingTeam] = useState('A');

    if (!state) return null;

    const currentTeam = viewingTeam === 'A' ? state.teamA : state.teamB;
    const bgColor = viewingTeam === 'A' ? 'from-red-600 to-red-900' : 'from-blue-600 to-blue-900';
    const accentColor = viewingTeam === 'A' ? 'bg-red-500' : 'bg-blue-500';

    return (
        <div className="min-h-screen bg-[#080B10] p-6 flex flex-col items-center selection:bg-red-500/20 font-sans pb-24">
            {/* PROGRESS INDICATOR */}
            <div className="flex gap-2 mb-8 no-print animate-in fade-in duration-500">
                <div className={`h-1 w-12 rounded-full transition-all duration-300 ${viewingTeam === 'A' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-white/10'}`}></div>
                <div className={`h-1 w-12 rounded-full transition-all duration-300 ${viewingTeam === 'B' ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-white/10'}`}></div>
            </div>

            <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6 font-display animate-in fade-in duration-500">
                Official Squad Announcement
            </h2>

            {/* THE POSTER */}
            <div className={`relative w-full max-w-lg aspect-[3/4] bg-gradient-to-br ${bgColor} rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 group animate-in zoom-in-95 duration-500`}>
                
                {/* Background Text Decor */}
                <div className="absolute top-10 left-10 opacity-[0.08] pointer-events-none">
                    <h1 className="text-[12rem] font-black text-white italic leading-none select-none font-display">{currentTeam.name[0]}</h1>
                </div>

                <div className="relative h-full flex flex-col p-10 z-10">
                    {/* Top Title Section */}
                    <div className="mb-8">
                        <h2 className="text-5xl font-black text-white italic leading-none uppercase tracking-tighter font-display">
                            {currentTeam.name} <br />
                            <span className="text-xl opacity-60">SQUAD</span>
                        </h2>
                        <div className={`h-1.5 w-20 ${accentColor} mt-4 rounded-full`}></div>
                    </div>

                    <div className="flex flex-1 gap-6 items-end pb-4">
                        {/* Left Side: Player List */}
                        <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar max-h-[80%] pr-1">
                            {currentTeam.players.map((p, idx) => (
                                <div key={p.tid} className="flex items-center gap-2 group/item transition-transform hover:translate-x-1 duration-200">
                                    <span className="text-[9px] font-black text-white/30 font-display">{String(idx + 1).padStart(2, '0')}</span>
                                    <span className={`text-sm font-black italic uppercase tracking-tight font-display ${currentTeam.captain?.tid === p.tid ? 'text-amber-400 font-extrabold' : 'text-white/90'}`}>
                                        {p.name} {currentTeam.captain?.tid === p.tid && '★'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Right Side: Captain Photo */}
                        <div className="w-[45%] relative h-[85%] flex flex-col justify-end">
                            <div className="absolute top-0 right-0 w-full aspect-square bg-white/5 rounded-full blur-[40px] opacity-40"></div>
                            <img 
                                src={currentTeam.captain?.profilePic || 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=800&auto=format&fit=crop&q=80'} 
                                alt={currentTeam.captain?.name}
                                className="relative z-20 object-cover object-top w-full h-[85%] rounded-b-3xl drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] scale-110 origin-bottom transition-transform group-hover:scale-115 duration-700"
                            />
                            <div className="absolute bottom-2 right-0 z-30 bg-black/90 backdrop-blur-md px-4 py-2 border border-white/10 rounded-xl max-w-full">
                                <p className="text-[7px] font-black text-amber-400 uppercase tracking-widest mb-0.5 leading-none font-display">Captain</p>
                                <p className="text-xs font-black text-white uppercase italic leading-none font-display truncate">{currentTeam.captain?.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Stats */}
                    <div className="mt-auto flex justify-between items-end border-t border-white/15 pt-6">
                        <div>
                            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest font-display">IPL SEASON</p>
                            <p className="text-xl font-black text-white italic font-display">2026</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest font-display">FORMAT</p>
                            <p className="text-xl font-black text-white italic font-display">TURF-PRO</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="mt-10 flex gap-4 w-full max-w-lg no-print animate-in slide-in-from-bottom duration-500">
                {viewingTeam === 'A' ? (
                    <button 
                        onClick={() => setViewingTeam('B')}
                        className="w-full py-5 bg-white text-black font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs hover:bg-slate-100 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer font-display"
                    >
                        Next: {state.teamB.name} Squad ➔
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={() => setViewingTeam('A')}
                            className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl text-slate-300 hover:text-white font-black uppercase tracking-widest text-[9px] hover:bg-white/10 transition-all cursor-pointer font-display"
                        >
                            Back to {state.teamA.name}
                        </button>
                        <button 
                            onClick={() => navigate('/toss', { state })}
                            className="flex-[2] py-5 bg-red-500 text-white font-black rounded-2xl shadow-xl hover:bg-red-600 transition-all text-[9px] uppercase tracking-widest cursor-pointer font-display"
                        >
                            Continue to Toss 🪙
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default SquadsPoster;
