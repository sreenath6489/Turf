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
        <div className="min-h-screen bg-[#020617] p-4 flex flex-col items-center">
            {/* PROGRESS INDICATOR */}
            <div className="flex gap-2 mb-8 no-print">
                <div className={`h-1 w-12 rounded-full transition-all ${viewingTeam === 'A' ? 'bg-red-600' : 'bg-white/20'}`}></div>
                <div className={`h-1 w-12 rounded-full transition-all ${viewingTeam === 'B' ? 'bg-blue-600' : 'bg-white/20'}`}></div>
            </div>

            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-6">
                Official Squad Announcement
            </h2>

            {/* THE POSTER */}
            <div className={`relative w-full max-w-lg aspect-[3/4] bg-gradient-to-br ${bgColor} rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-white/10 group`}>
                
                {/* Background Text Decor */}
                <div className="absolute top-10 left-10 opacity-10 pointer-events-none">
                    <h1 className="text-[12rem] font-black text-white italic leading-none select-none">{currentTeam.name[0]}</h1>
                </div>

                <div className="relative h-full flex flex-col p-10 z-10">
                    {/* Top Title Section */}
                    <div className="mb-10">
                        <h2 className="text-5xl font-black text-white italic leading-none uppercase tracking-tighter">
                            {currentTeam.name} <br />
                            <span className="text-2xl opacity-60">SQUAD</span>
                        </h2>
                        <div className={`h-1 w-20 ${accentColor} mt-4`}></div>
                    </div>

                    <div className="flex flex-1 gap-6">
                        {/* Left Side: Player List */}
                        <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar max-h-[60%]">
                            {currentTeam.players.map((p, idx) => (
                                <div key={p.tid} className="flex items-center gap-2 group/item">
                                    <span className="text-[10px] font-black text-white/40">{String(idx + 1).padStart(2, '0')}</span>
                                    <span className={`text-sm font-black italic uppercase tracking-tight ${currentTeam.captain?.tid === p.tid ? 'text-yellow-400' : 'text-white'}`}>
                                        {p.name} {currentTeam.captain?.tid === p.tid && '★'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Right Side: Captain Photo */}
                        <div className="w-[45%] relative h-full flex flex-col justify-end">
                            <div className="absolute top-0 right-0 w-full aspect-square bg-white/10 rounded-full blur-[60px] opacity-50"></div>
                            <img 
                                src={currentTeam.captain?.profilePic || 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=800&auto=format&fit=crop&q=80'} 
                                alt={currentTeam.captain?.name}
                                className="relative z-20 object-cover object-top w-full h-[85%] rounded-b-[2rem] drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] scale-110 origin-bottom transition-transform group-hover:scale-125 duration-700"
                            />
                            <div className="absolute bottom-4 right-0 z-30 bg-black/80 backdrop-blur-md px-4 py-2 border border-white/10 rounded-xl">
                                <p className="text-[8px] font-black text-yellow-400 uppercase tracking-widest mb-1 leading-none">Captain</p>
                                <p className="text-sm font-black text-white uppercase italic leading-none">{currentTeam.captain?.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Stats */}
                    <div className="mt-auto flex justify-between items-end border-t border-white/10 pt-6">
                        <div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">IPL SEASON</p>
                            <p className="text-xl font-black text-white italic">2026</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">FORMAT</p>
                            <p className="text-xl font-black text-white italic">TURF-PRO</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="mt-10 flex gap-4 w-full max-w-lg no-print">
                {viewingTeam === 'A' ? (
                    <button 
                        onClick={() => setViewingTeam('B')}
                        className="w-full py-5 bg-white text-black font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                        Next: {state.teamB.name} Squad ➔
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={() => setViewingTeam('A')}
                            className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
                        >
                            Back to {state.teamA.name}
                        </button>
                        <button 
                            onClick={() => navigate('/toss', { state })}
                            className="flex-[2] py-5 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-900/20 uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all"
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
