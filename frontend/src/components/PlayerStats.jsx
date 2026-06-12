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
        <div className="min-h-screen bg-[#020617] text-white p-6 font-sans pb-20">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-10">
                <button onClick={() => navigate(-1)} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div className="text-right">
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-emerald-500">{playerName || tid}</h1>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Career Analytics</p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase text-white/40 mb-2">Runs</p>
                    <h3 className="text-3xl font-black text-white italic">{stats.batting.totalRuns}</h3>
                    <p className="text-[10px] text-emerald-500 font-bold mt-1">SR {batSR}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase text-white/40 mb-2">Wickets</p>
                    <h3 className="text-3xl font-black text-white italic">{stats.bowling.totalWickets}</h3>
                    <p className="text-[10px] text-emerald-500 font-bold mt-1">Econ {bowlEcon}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase text-white/40 mb-2">Highest</p>
                    <h3 className="text-3xl font-black text-white italic">{stats.batting.highest}</h3>
                    <p className="text-[10px] text-white/40 font-bold mt-1">Inns {stats.batting.innings}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase text-white/40 mb-2">4s / 6s</p>
                    <h3 className="text-3xl font-black text-white italic">{stats.batting.fours} / {stats.batting.sixes}</h3>
                    <p className="text-[10px] text-white/40 font-bold mt-1">Total Bounds</p>
                </div>
            </div>

            {/* Charts Section */}
            {stats.recentForm.length > 0 ? (
                <div className="space-y-6">
                    <div className="bg-[#0f172a] border border-white/5 p-8 rounded-[3rem] shadow-2xl">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-8 flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Batting Form (Runs per Match)
                        </h4>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.recentForm}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#ffffff40" fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
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

                    <div className="bg-[#0f172a] border border-white/5 p-8 rounded-[3rem] shadow-2xl">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-8 flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Bowling Impact (Wickets)
                        </h4>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.recentForm}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#ffffff40" fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                                        cursor={{ fill: '#ffffff05' }}
                                    />
                                    <Bar dataKey="wickets" radius={[10, 10, 0, 0]}>
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
                <div className="bg-white/5 border border-white/5 border-dashed p-20 rounded-[3rem] text-center">
                    <p className="text-white/20 italic font-medium">No match data available to visualize yet.</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/10 mt-2">Charts will appear after you complete your first match</p>
                </div>
            )}
        </div>
    );
};

export default PlayerStats;
