import React, { useState, useEffect } from 'react';
import axios from 'axios';

const IPLCard = () => {
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchScore = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ipl/live`);
            setMatch(res.data);
        } catch (err) {
            console.error("IPL Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScore();
        const interval = setInterval(fetchScore, 120000); // 2 mins
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] animate-pulse mb-6">
            <div className="h-4 w-24 bg-white/10 rounded mb-4"></div>
            <div className="h-8 w-full bg-white/10 rounded"></div>
        </div>
    );

    if (!match) return null;

    // CricketData.org structure
    const team1 = match.teamInfo?.[0] || { name: 'Team A', shortname: 'T1' };
    const team2 = match.teamInfo?.[1] || { name: 'Team B', shortname: 'T2' };
    const currentScore = match.score?.[0] || { r: 0, w: 0, o: 0, inning: 'Yet to start' };

    return (
        <div className="bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden group mb-6 transition-all hover:scale-[0.99]">
            {/* Animated Glow Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-[50px]"></div>
            
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Live IPL Update
                </h3>
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{match.matchType}</span>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                    <span className="text-xl font-black italic text-white uppercase tracking-tighter">{team1.shortname || team1.name}</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase truncate max-w-[100px]">{team1.name}</span>
                </div>
                <div className="flex flex-col items-center px-4">
                    <span className="text-[10px] font-black text-white/20 italic">VS</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xl font-black italic text-white uppercase tracking-tighter text-right">{team2.shortname || team2.name}</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase text-right truncate max-w-[100px]">{team2.name}</span>
                </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 flex justify-between items-center border border-white/5">
                <div>
                    <p className="text-[8px] font-black text-white/40 uppercase mb-1">{currentScore.inning}</p>
                    <h2 className="text-2xl font-black italic text-red-500 tracking-tighter">
                        {currentScore.r}/{currentScore.w}
                        <span className="text-xs text-white/40 ml-2 font-mono">({currentScore.o} ov)</span>
                    </h2>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black text-white/40 uppercase mb-1">Status</p>
                    <p className="text-[10px] font-black text-white italic truncate max-w-[150px]">{match.status}</p>
                </div>
            </div>

            <button className="mt-6 w-full py-4 bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest hover:bg-white hover:text-black transition-all text-[10px] shadow-lg shadow-red-500/20">
                View Full Scorecard ➔
            </button>
        </div>
    );
};

export default IPLCard;
