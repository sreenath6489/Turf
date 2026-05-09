import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { fetchIPLMatches } from '../utils/iplservice.js';
import IPLCard from './IPLCard';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

const Home = () => {
    const [user, setUser] = useState(null);
    const [liveMatches, setLiveMatches] = useState([]);
    const [history, setHistory] = useState([]);
    const [iplMatches, setIplMatches] = useState([]);
    const [pinnedMatch, setPinnedMatch] = useState(null);
    const [commentaryMode, setCommentaryMode] = useState(localStorage.getItem('commentaryMode') || 'AI');
    const navigate = useNavigate();

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            navigate('/');
            return;
        }
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        const fetchLiveMatches = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/matches/live`);
                setLiveMatches(res.data);
            } catch (err) {
                console.error("Error fetching live matches", err);
            }
        };

        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/matches/history/${parsedUser.tid}`);
                setHistory(res.data);
            } catch (err) {
                console.error("Error fetching match history", err);
            }
        };

        const fetchIPL = async () => {
            const data = await fetchIPLMatches();
            setIplMatches(data);
        };

        const savedPin = localStorage.getItem('pinnedIPLMatch');
        if (savedPin) setPinnedMatch(JSON.parse(savedPin));

        fetchLiveMatches();
        fetchHistory();
        fetchIPL();

        socket.on('scoreUpdated', (updatedMatch) => {
            setLiveMatches(prev =>
                prev.map(m => m._id === updatedMatch._id ? updatedMatch : m)
            );
        });

        return () => socket.off('scoreUpdated');
    }, [navigate]);

    const handleModeToggle = (mode) => {
        setCommentaryMode(mode);
        localStorage.setItem('commentaryMode', mode);
    };

    const togglePin = (match) => {
        if (pinnedMatch?.id === match.id) {
            setPinnedMatch(null);
            localStorage.removeItem('pinnedIPLMatch');
        } else {
            setPinnedMatch(match);
            localStorage.setItem('pinnedIPLMatch', JSON.stringify(match));
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#FAF4EA] text-slate-900 p-6 font-sans selection:bg-red-200 selection:text-slate-900 pb-20 relative overflow-hidden">
            {/* BACKGROUND CRICKET DECOR */}
            <div className="absolute top-1/4 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-slate-900/5 rounded-full blur-[100px] pointer-events-none"></div>
            
            {/* STUMP SILHOUETTE */}
            <div className="absolute top-20 right-10 opacity-[0.02] select-none pointer-events-none hidden md:block">
                <svg width="200" height="400" viewBox="0 0 100 200" fill="currentColor"><rect x="20" y="20" width="8" height="160" /><rect x="46" y="20" width="8" height="160" /><rect x="72" y="20" width="8" height="160" /><rect x="15" y="10" width="70" height="5" /></svg>
            </div>

            {/* Top Profile Bar */}
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-700 rounded-full flex items-center justify-center text-xl font-bold shadow-lg shadow-red-500/20 text-white">
                        {user.name[0]}
                    </div>
                    <div onClick={() => navigate(`/player-stats/${user.tid}`)} className="cursor-pointer group">
                        <h1 className="text-xl font-black tracking-tight leading-none uppercase italic group-hover:text-red-600 transition-colors">{user.name}</h1>
                        <p className="text-[10px] text-red-600 font-mono mt-1 tracking-[0.2em] uppercase opacity-70">View Your Stats ➔</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white/70 backdrop-blur-xl p-1.5 rounded-2xl border border-red-900/10 shadow-sm no-print">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 hidden md:block">Commentary</span>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => handleModeToggle('AI')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${commentaryMode === 'AI' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            AI Voice
                        </button>
                        <button 
                            onClick={() => handleModeToggle('DIAL')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${commentaryMode === 'DIAL' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            🎬 Dialogues
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => { localStorage.clear(); navigate('/'); }}
                    className="bg-white hover:bg-red-50 border border-red-900/10 p-2 rounded-xl transition-all shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>

            {/* LIVE IPL SCORECARD (GLASSMORPHISM) */}
            <IPLCard />

            {/* Main Action Card */}
            <div
                onClick={() => navigate('/create-match')}
                className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-rose-900 group rounded-[2.5rem] p-10 h-56 flex flex-col justify-end cursor-pointer shadow-2xl shadow-red-900/40 hover:scale-[0.99] transition-all duration-500 mb-8 border-b-4 border-black/20"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity rotate-12 scale-150">
                    <svg width="200" height="200" viewBox="0 0 100 100" fill="white"><path d="M50 5L95 95H5L50 5Z" /></svg>
                </div>
                <div className="z-10 relative">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.3em] mb-4">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Host Arena
                    </div>
                    <h2 className="text-5xl font-black text-white leading-[0.9] uppercase italic tracking-tighter">Start New<br /><span className="text-white/60">Championship</span></h2>
                    <p className="mt-4 text-[10px] font-bold text-white/50 uppercase tracking-[0.4em]">Initialize digital scorekeeping ➔</p>
                </div>
            </div>

            {/* LIVE IPL SECTION */}
            <div className="mt-4 mb-10 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span> Live IPL Scores
                    </h3>
                </div>
                <div className="flex gap-4 min-w-max">
                    {iplMatches.map((match) => (
                        <div key={match.id} className="w-72 bg-[#1a1a1a] rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); togglePin(match); }}
                                    className={`p-2 rounded-full backdrop-blur-md border ${pinnedMatch?.id === match.id ? 'bg-yellow-500 border-yellow-400' : 'bg-white/10 border-white/20'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={pinnedMatch?.id === match.id ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">IPL 2025</span>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${match.status === 'LIVE' ? 'bg-red-600 border-red-500 animate-pulse' : 'bg-white/10 border-white/20 opacity-50'}`}>
                                    {match.status}
                                </span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-black italic">{match.teamA}</span>
                                    <span className="text-lg font-black text-white/50">{match.scoreA}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-black italic">{match.teamB}</span>
                                    <span className="text-lg font-black">{match.scoreB}</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-bold text-white/40">
                                <span>{match.overs} Overs</span>
                                <span className="truncate max-w-[120px]">{match.venue}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Live Matches Section */}
            <div className="mt-8 mb-10">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Live Matches
                    </h3>
                </div>

                <div className="space-y-4">
                    {liveMatches.length > 0 ? (
                        liveMatches.map((match) => (
                            <div
                                key={match._id}
                                onClick={() => navigate(`/scoreboard/${match._id}`)}
                                className="bg-white border border-red-900/10 shadow-sm p-6 rounded-[2rem] hover:border-red-600/50 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{match.overs} Overs Match</span>
                                    <span className="bg-red-50 text-red-600 text-[8px] font-black px-2 py-0.5 rounded uppercase border border-red-200 animate-pulse">Live</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-lg font-black uppercase italic group-hover:text-red-600 transition-colors">{match.battingTeam.name}</p>
                                        <p className="text-xs text-slate-500">vs {match.bowlingTeam.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-3xl font-black italic text-slate-900">{match.score}/{match.wickets}</h2>
                                        <p className="text-[10px] font-bold text-slate-500">({Math.floor(match.balls / 6)}.{match.balls % 6})</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white/50 border-2 border-dashed border-red-900/10 p-12 rounded-[2.5rem] text-center">
                            <span className="text-5xl mb-4 block animate-bounce">🏟️</span>
                            <p className="text-slate-900 font-black italic uppercase tracking-tighter text-xl">The Pitch is Waiting!</p>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Host your first match to see it live here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Match History Section */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                        📜 Match History
                    </h3>
                </div>

                <div className="space-y-4">
                    {history.length > 0 ? (
                        history.map((match) => {
                            const didTeamAWon = match.score >= match.target && match.battingTeam.name === match.teamA.name; // Simplistic check for winner display
                            return (
                                <div
                                    key={match._id}
                                    onClick={() => navigate(`/scoreboard/${match._id}`)}
                                    className="bg-white border border-red-900/10 shadow-sm p-5 rounded-3xl hover:border-red-600/30 transition-all cursor-pointer"
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{match.teamA.name} vs {match.teamB.name}</span>
                                        <span className="bg-stone-100 text-slate-500 border border-slate-200 text-[8px] font-black px-2 py-0.5 rounded uppercase">Completed</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-bold text-red-600">Target: {match.target}</p>
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-xl font-black italic text-slate-900">{match.score}/{match.wickets}</h2>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="bg-stone-50 border border-red-900/10 p-8 rounded-[2rem] text-center border-dashed">
                            <p className="text-slate-500 text-sm italic">No history found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Home;