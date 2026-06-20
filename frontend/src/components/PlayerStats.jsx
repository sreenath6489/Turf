import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const PlayerStats = () => {
    const { tid } = useParams();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [playerName, setPlayerName] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/players/stats/${tid}`);
                setStats(res.data);
                
                // Also get player name from storage or search if needed
                const user = JSON.parse(localStorage.getItem('user'));
                if (user?.tid === tid) setPlayerName(user.name);
                else {
                    const pRes = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/players/search?query=${tid}`);
                    if (pRes.data.length > 0) setPlayerName(pRes.data[0].name);
                }
            } catch (err) {
                console.error("Error fetching stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [tid]);

    if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-black">ANALYZING PERFORMANCE...</div>;
    if (!stats) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">No stats found.</div>;

    const batSR = stats.batting.totalBalls > 0 ? ((stats.batting.totalRuns / stats.batting.totalBalls) * 100).toFixed(1) : '0.0';
    const bowlEcon = stats.bowling.totalBalls > 0 ? ((stats.bowling.totalRuns / (stats.bowling.totalBalls / 6))).toFixed(2) : '0.00';

    return (
        <div className="min-h-screen bg-[#080B10] text-white p-6 font-sans pb-24 relative overflow-hidden selection:bg-emerald-500/20">
            {/* BACKGROUND DECOR */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-900/5 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-10 max-w-5xl mx-auto z-10 relative">
                <button onClick={() => navigate(-1)} className="p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-slate-300 hover:text-white transition-all group cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div className="text-right">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-emerald-400 font-display">{playerName || tid}</h1>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 font-display">Career Performance Analytics</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto z-10 relative">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl glow-green hover:border-emerald-500/30 transition-colors">
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2 font-display">Total Runs</p>
                        <h3 className="text-4xl font-black text-white italic font-display">{stats.batting.totalRuns}</h3>
                        <p className="text-[9px] text-emerald-400 font-bold mt-1.5 font-display">Strike Rate: {batSR}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl glow-green hover:border-emerald-500/30 transition-colors">
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2 font-display">Total Wickets</p>
                        <h3 className="text-4xl font-black text-white italic font-display">{stats.bowling.totalWickets}</h3>
                        <p className="text-[9px] text-emerald-400 font-bold mt-1.5 font-display">Economy: {bowlEcon}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl hover:border-white/20 transition-colors">
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2 font-display">Highest Score</p>
                        <h3 className="text-4xl font-black text-white italic font-display">{stats.batting.highest}</h3>
                        <p className="text-[9px] text-slate-400 font-bold mt-1.5 font-display">Innings: {stats.batting.innings}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl hover:border-white/20 transition-colors">
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2 font-display">Boundaries (4s/6s)</p>
                        <h3 className="text-4xl font-black text-white italic font-display">{stats.batting.fours} <span className="text-2xl text-slate-500">/</span> {stats.batting.sixes}</h3>
                        <p className="text-[9px] text-slate-400 font-bold mt-1.5 font-display">Total Boundaries</p>
                    </div>
                </div>

                {/* Charts Section */}
                {stats.recentForm.length > 0 ? (
                    <div className="space-y-8">
                        <div className="bg-white/[0.01] border border-white/5 p-6 md:p-8 rounded-[3rem] shadow-2xl backdrop-blur-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2 font-display">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Batting Form (Runs per Match)
                            </h4>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.recentForm}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                        <XAxis dataKey="date" stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} tick={{ fontWeight: 'bold' }} />
                                        <YAxis stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} tick={{ fontWeight: 'bold' }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '11px', color: '#fff' }}
                                            itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="runs" 
                                            stroke="#10b981" 
                                            strokeWidth={4} 
                                            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} 
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white/[0.01] border border-white/5 p-6 md:p-8 rounded-[3rem] shadow-2xl backdrop-blur-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2 font-display">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Bowling Impact (Wickets)
                            </h4>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.recentForm}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                        <XAxis dataKey="date" stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} tick={{ fontWeight: 'bold' }} />
                                        <YAxis stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} tick={{ fontWeight: 'bold' }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '11px', color: '#fff' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                        />
                                        <Bar dataKey="wickets" radius={[8, 8, 0, 0]}>
                                            {stats.recentForm.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.wickets > 2 ? '#ef4444' : '#10b981'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/[0.01] border border-white/5 border-dashed p-20 rounded-[3rem] text-center">
                        <p className="text-slate-500 italic font-bold uppercase tracking-wider text-sm font-display">No match data available to visualize yet.</p>
                        <p className="text-[9px] uppercase tracking-widest text-slate-600 mt-3 font-display">Charts will appear after you complete your first match</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerStats;
