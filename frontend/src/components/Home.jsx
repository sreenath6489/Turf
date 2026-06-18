import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`);

const Home = () => {
    const [user, setUser] = useState(null);
    const [liveMatches, setLiveMatches] = useState([]);
    const [history, setHistory] = useState([]);
    const [commentaryMode, setCommentaryMode] = useState(localStorage.getItem('commentaryMode') || 'AI');
    const [deleteMode, setDeleteMode] = useState(false);
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
                const res = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/matches/live`);
                const sorted = res.data.sort((a, b) => b._id.localeCompare(a._id));
                setLiveMatches(sorted);
            } catch (err) {
                console.error("Error fetching live matches", err);
            }
        };

        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/matches/history/${parsedUser.tid}`);
                const sorted = res.data.sort((a, b) => b._id.localeCompare(a._id));
                setHistory(sorted);
            } catch (err) {
                console.error("Error fetching match history", err);
            }
        };

        fetchLiveMatches();
        fetchHistory();

        socket.on('scoreUpdated', (updatedMatch) => {
            setLiveMatches(prev => {
                const exists = prev.some(m => m._id === updatedMatch._id);
                let newList = exists 
                    ? prev.map(m => m._id === updatedMatch._id ? updatedMatch : m)
                    : [updatedMatch, ...prev];
                return newList.sort((a, b) => b._id.localeCompare(a._id));
            });
        });

        return () => socket.off('scoreUpdated');
    }, [navigate]);

    const handleModeToggle = (mode) => {
        setCommentaryMode(mode);
        localStorage.setItem('commentaryMode', mode);
    };

    const handleDeleteMatch = async (e, matchId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to permanently delete this test match?")) return;
        try {
            const res = await axios.delete(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/matches/${matchId}`);
            if (res.data.success) {
                setLiveMatches(prev => prev.filter(m => m._id !== matchId));
                setHistory(prev => prev.filter(m => m._id !== matchId));
            }
        } catch (err) {
            console.error("Failed to delete match", err);
            alert("Failed to delete match");
        }
    };

    if (!user) return null;

    const getMatchDate = (id) => {
        try {
            const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
            return new Date(timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (err) {
            return '';
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0E14] text-white p-6 font-sans selection:bg-red-900 selection:text-white pb-20 relative overflow-hidden">
            {/* BACKGROUND CRICKET DECOR */}
            <div className="absolute top-1/4 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-slate-900/5 rounded-full blur-[100px] pointer-events-none"></div>
            
            {/* STUMP SILHOUETTE */}
            <div className="absolute top-20 right-10 opacity-[0.01] select-none pointer-events-none hidden md:block">
                <svg width="200" height="400" viewBox="0 0 100 200" fill="currentColor"><rect x="20" y="20" width="8" height="160" /><rect x="46" y="20" width="8" height="160" /><rect x="72" y="20" width="8" height="160" /><rect x="15" y="10" width="70" height="5" /></svg>
            </div>

            {/* Top Profile Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-700 rounded-full flex items-center justify-center text-xl font-bold shadow-lg shadow-red-500/20 text-white shrink-0">
                        {user.name[0]}
                    </div>
                    <div onClick={() => navigate(`/player-stats/${user.tid}`)} className="cursor-pointer group">
                        <h1 className="text-xl font-black tracking-tight leading-none uppercase italic group-hover:text-red-500 transition-colors">{user.name}</h1>
                        <p className="text-[10px] text-red-505 font-mono mt-1 tracking-[0.2em] uppercase opacity-70">View Your Stats ➔</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto no-print">
                    <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 hidden md:block">Commentary</span>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => handleModeToggle('AI')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${commentaryMode === 'AI' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                AI Voice
                            </button>
                            <button 
                                onClick={() => handleModeToggle('DIAL')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${commentaryMode === 'DIAL' ? 'bg-white/15 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                🎬 Dialogues
                            </button>
                            <button 
                                onClick={() => handleModeToggle('OFF')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${commentaryMode === 'OFF' ? 'bg-white/15 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                🔇 OFF
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setDeleteMode(!deleteMode)}
                            className={`border p-2 rounded-xl transition-all shadow-sm flex items-center justify-center ${deleteMode ? 'bg-red-600 text-white border-red-700' : 'bg-white/5 text-red-500 hover:bg-white/10 border-white/10'}`}
                            title="Toggle Delete Mode"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <button
                            onClick={() => { localStorage.clear(); navigate('/'); }}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded-xl transition-all shadow-sm text-red-500"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div
                    onClick={() => navigate('/create-match')}
                    className="relative overflow-hidden bg-gradient-to-r from-red-600 to-rose-800 group rounded-3xl p-5 h-32 flex flex-col justify-between cursor-pointer shadow-xl hover:scale-[0.99] transition-all duration-300 border border-white/10"
                >
                    <div className="flex justify-between items-start">
                        <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Host Arena
                        </div>
                        <span className="text-2xl opacity-40 group-hover:opacity-80 transition-opacity">🏟️</span>
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight">Start Match</h2>
                        <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest mt-1">Initialize scorekeeping ➔</p>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/teams')}
                    className="relative overflow-hidden bg-gradient-to-r from-slate-800 to-slate-900 group rounded-3xl p-5 h-32 flex flex-col justify-between cursor-pointer shadow-xl hover:scale-[0.99] transition-all duration-300 border border-white/10"
                >
                    <div className="flex justify-between items-start">
                        <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                            Local Roster
                        </div>
                        <span className="text-2xl opacity-40 group-hover:opacity-80 transition-opacity">👥</span>
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight">Manage Teams</h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Build your squads ➔</p>
                    </div>
                </div>
            </div>

            {/* Live Matches Section */}
            <div className="mt-8 mb-10">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Live Matches
                    </h3>
                </div>

                <div className="space-y-4">
                    {liveMatches.length > 0 ? (
                        liveMatches.map((match) => (
                            <div
                                key={match._id}
                                onClick={() => navigate(`/scoreboard/${match._id}`)}
                                className="bg-slate-900/40 border border-white/10 shadow-lg p-5 rounded-3xl hover:border-red-500/50 hover:bg-slate-900/60 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        {deleteMode && (
                                            <button 
                                                onClick={(e) => handleDeleteMatch(e, match._id)}
                                                className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mr-2 z-10 shadow-md"
                                            >
                                                ✕
                                            </button>
                                        )}
                                        <span className="text-[10px] font-bold text-red-505 uppercase tracking-widest">{match.overs} Overs Match</span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">• {getMatchDate(match._id)}</span>
                                    </div>
                                    <span className="bg-red-500/20 text-red-400 text-[8px] font-black px-2 py-0.5 rounded uppercase border border-red-500/30 animate-pulse">Live</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-lg font-black uppercase italic group-hover:text-red-500 transition-colors text-white">{match.battingTeam.name}</p>
                                        <p className="text-xs text-slate-400">vs {match.bowlingTeam.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-3xl font-black italic text-white">{match.score}/{match.wickets}</h2>
                                        <p className="text-[10px] font-bold text-slate-400">({Math.floor(match.balls / 6)}.{match.balls % 6})</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white/5 border-2 border-dashed border-white/10 p-12 rounded-[2.5rem] text-center">
                            <span className="text-5xl mb-4 block animate-bounce">🏟️</span>
                            <p className="text-white font-black italic uppercase tracking-tighter text-xl">The Pitch is Waiting!</p>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Host your first match to see it live here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Match History Section */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        📜 Match History
                    </h3>
                </div>

                <div className="space-y-4">
                    {history.length > 0 ? (
                        history.map((match) => {
                            return (
                                <div
                                    key={match._id}
                                    onClick={() => navigate(`/scoreboard/${match._id}`)}
                                    className="bg-slate-900/30 border border-white/5 shadow-md p-4 rounded-3xl hover:border-red-500/30 hover:bg-slate-900/50 transition-all cursor-pointer"
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            {deleteMode && (
                                                <button 
                                                    onClick={(e) => handleDeleteMatch(e, match._id)}
                                                    className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black z-10 shadow-md shrink-0"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{match.teamA.name} vs {match.teamB.name}</span>
                                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{getMatchDate(match._id)}</span>
                                            </div>
                                        </div>
                                        <span className="bg-white/5 text-slate-400 border border-white/10 text-[8px] font-black px-2 py-0.5 rounded uppercase">Completed</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-bold text-red-500">Target: {match.target}</p>
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-xl font-black italic text-white">{match.score}/{match.wickets}</h2>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl text-center border-dashed">
                            <p className="text-slate-400 text-sm italic">No history found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Home;