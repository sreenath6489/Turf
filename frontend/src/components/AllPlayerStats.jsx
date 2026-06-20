import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const AllPlayerStats = () => {
    const navigate = useNavigate();
    const [allStats, setAllStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAllStats = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/players/stats-all`);
                setAllStats(res.data);
            } catch (err) {
                console.error("Error fetching all stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#080B10] text-white flex flex-col items-center justify-center font-sans">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="font-black tracking-widest text-emerald-400 uppercase text-xs">Compiling Roster Analytics...</div>
            </div>
        );
    }

    const filteredStats = allStats.filter(stat => 
        stat.player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stat.player.tid.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#080B10] text-white p-6 font-sans pb-24 relative overflow-hidden selection:bg-emerald-500/20">
            {/* BACKGROUND GLOW DECOR */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-500/[0.02] rounded-full blur-[120px] pointer-events-none"></div>

            {/* HEADER SECTION */}
            <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row items-center justify-between gap-6 z-10 relative">
                <div>
                    <button 
                        onClick={() => navigate('/home')} 
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-3 uppercase tracking-wider group cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Home
                    </button>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-400 font-display">
                        Squad Analytics Hub
                    </h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 font-display">
                        Real-time career stats & performance trends for all active players
                    </p>
                </div>

                {/* SEARCH INPUT */}
                <div className="w-full md:w-80 relative">
                    <input 
                        type="text" 
                        placeholder="Search players..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-3 px-4 pl-10 text-sm outline-none focus:border-emerald-500/50 transition-colors font-semibold"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}.5 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* SQUAD GRID */}
            <div className="max-w-7xl mx-auto z-10 relative">
                {filteredStats.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {filteredStats.map((stat) => {
                            const { player, batting, bowling, recentForm } = stat;
                            const displayName = player.name;
                            const initial = displayName ? displayName[0] : '?';
                            
                            const batSR = batting.totalBalls > 0 ? ((batting.totalRuns / batting.totalBalls) * 100).toFixed(1) : '0.0';
                            const bowlEcon = bowling.totalBalls > 0 ? ((bowling.totalRuns / (bowling.totalBalls / 6))).toFixed(2) : '0.00';

                            return (
                                <div 
                                    key={player.tid} 
                                    className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl hover:border-emerald-500/30 transition-all duration-300 shadow-2xl flex flex-col gap-6 group hover:scale-[1.01]"
                                >
                                    {/* CARD HEADER */}
                                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-xl font-black text-black font-display shadow-lg">
                                                {initial}
                                            </div>
                                            <div>
                                                <h2 
                                                    onClick={() => navigate(`/player-stats/${player.tid}`)}
                                                    className="text-lg font-black uppercase italic tracking-tight text-slate-100 hover:text-emerald-400 transition-colors cursor-pointer font-display"
                                                >
                                                    {displayName}
                                                </h2>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 font-display">
                                                    ID: {player.tid} • {player.role || 'All-Rounder'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => navigate(`/player-stats/${player.tid}`)}
                                            className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-emerald-500 hover:text-black rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                                        >
                                            Full Profile
                                        </button>
                                    </div>

                                    {/* SUMMARY STATS GRID */}
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl text-center">
                                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider font-display">Runs</p>
                                            <p className="text-xl font-black text-white italic font-display mt-0.5">{batting.totalRuns}</p>
                                            <p className="text-[8px] font-bold text-emerald-400/80 font-display mt-0.5">SR: {batSR}</p>
                                        </div>
                                        <div className="bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl text-center">
                                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider font-display">Wickets</p>
                                            <p className="text-xl font-black text-white italic font-display mt-0.5">{bowling.totalWickets}</p>
                                            <p className="text-[8px] font-bold text-emerald-400/80 font-display mt-0.5">Econ: {bowlEcon}</p>
                                        </div>
                                        <div className="bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl text-center">
                                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider font-display">Highest</p>
                                            <p className="text-xl font-black text-white italic font-display mt-0.5">{batting.highest}</p>
                                            <p className="text-[8px] font-bold text-slate-500 font-display mt-0.5">Inn: {batting.innings}</p>
                                        </div>
                                        <div className="bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl text-center">
                                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider font-display">4s / 6s</p>
                                            <p className="text-xl font-black text-white italic font-display mt-0.5">{batting.fours}<span className="text-xs text-slate-600">/</span>{batting.sixes}</p>
                                            <p className="text-[8px] font-bold text-slate-500 font-display mt-0.5">Hits</p>
                                        </div>
                                    </div>

                                    {/* CHARTS CONTAINER */}
                                    <div className="mt-2">
                                        {recentForm.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* BATTING SPARKLINE */}
                                                <div className="bg-black/25 border border-white/[0.03] p-4 rounded-3xl">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5 font-display">
                                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Batting Form
                                                    </p>
                                                    <div className="h-32 w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={recentForm}>
                                                                <XAxis dataKey="date" stroke="#ffffff15" fontSize={8} axisLine={false} tickLine={false} />
                                                                <YAxis stroke="#ffffff15" fontSize={8} axisLine={false} tickLine={false} />
                                                                <Tooltip 
                                                                    contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '9px' }}
                                                                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                                                />
                                                                <Line 
                                                                    type="monotone" 
                                                                    dataKey="runs" 
                                                                    stroke="#10b981" 
                                                                    strokeWidth={2.5} 
                                                                    dot={{ fill: '#10b981', strokeWidth: 1.5, r: 2.5 }} 
                                                                    activeDot={{ r: 4 }}
                                                                />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>

                                                {/* BOWLING SPARKLINE */}
                                                <div className="bg-black/25 border border-white/[0.03] p-4 rounded-3xl">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5 font-display">
                                                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span> Bowling Form
                                                    </p>
                                                    <div className="h-32 w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={recentForm}>
                                                                <XAxis dataKey="date" stroke="#ffffff15" fontSize={8} axisLine={false} tickLine={false} />
                                                                <YAxis stroke="#ffffff15" fontSize={8} axisLine={false} tickLine={false} />
                                                                <Tooltip 
                                                                    contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '9px' }}
                                                                />
                                                                <Bar dataKey="wickets" radius={[4, 4, 0, 0]}>
                                                                    {recentForm.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={entry.wickets > 1 ? '#f43f5e' : '#0ea5e9'} />
                                                                    ))}
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-black/10 border border-white/5 border-dashed py-8 rounded-[1.5rem] text-center flex flex-col items-center justify-center">
                                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-display">No match performance data yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white/[0.01] border border-white/5 border-dashed p-20 rounded-[3rem] text-center max-w-lg mx-auto">
                        <p className="text-slate-500 italic font-bold uppercase tracking-wider text-sm font-display">No matching players found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AllPlayerStats;
