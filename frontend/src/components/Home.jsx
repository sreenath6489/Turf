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
        <div className="min-h-screen bg-[#080B10] text-white p-6 font-sans selection:bg-red-500/25 pb-24 relative overflow-hidden">
            {/* BACKGROUND CRICKET DECOR */}
            <div className="absolute top-1/4 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
            
            {/* STUMP SILHOUETTE */}
            <div className="absolute top-24 right-16 opacity-[0.03] select-none pointer-events-none hidden md:block">
                <svg width="150" height="300" viewBox="0 0 100 200" fill="currentColor">
                    <rect x="20" y="20" width="8" height="160" rx="3" />
                    <rect x="46" y="20" width="8" height="160" rx="3" />
                    <rect x="72" y="20" width="8" height="160" rx="3" />
                    <rect x="15" y="10" width="70" height="6" rx="2" />
                </svg>
            </div>

            <div className="max-w-5xl mx-auto z-10 relative">
                {/* Top Profile Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-white/[0.02] border border-white/10 p-6 rounded-[2.5rem] backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center text-2xl font-black shadow-lg text-white shrink-0 font-display">
                            {user.name[0]}
                        </div>
                        <div onClick={() => navigate(`/player-stats/${user.tid}`)} className="cursor-pointer group">
                            <h1 className="text-xl font-black tracking-tight leading-none uppercase italic group-hover:text-red-400 transition-colors font-display">{user.name}</h1>
                            <p className="text-[9px] text-red-400 font-bold mt-1.5 tracking-[0.2em] uppercase opacity-80 flex items-center gap-1 font-display">View Analytics ➔</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 w-full md:w-auto no-print">
                        {/* Commentary Settings Slider */}
                        <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 hidden lg:block font-display">Commentary</span>
                            <div className="flex gap-1">
                                {['AI', 'DIAL', 'OFF'].map(mode => {
                                    const labels = { AI: 'AI Voice', DIAL: '🎬 Dialogues', OFF: '🔇 OFF' };
                                    const active = commentaryMode === mode;
                                    return (
                                        <button 
                                            key={mode}
                                            onClick={() => handleModeToggle(mode)}
                                            className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer font-display ${active ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            {labels[mode]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setDeleteMode(!deleteMode)}
                                className={`border p-3 rounded-2xl transition-all cursor-pointer ${deleteMode ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/10' : 'bg-white/5 text-red-400 hover:bg-white/10 border-white/10'}`}
                                title="Toggle Delete Mode"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={() => { localStorage.clear(); navigate('/'); }}
                                className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-2xl transition-all cursor-pointer text-slate-400 hover:text-red-400"
                                title="Logout"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                    <div
                        onClick={() => navigate('/create-match')}
                        className="relative overflow-hidden bg-gradient-to-br from-red-500 to-rose-700 group rounded-[2.5rem] p-6 h-36 flex flex-col justify-between cursor-pointer shadow-xl hover:scale-[0.99] transition-all duration-300 border border-white/10 glow-red animate-in slide-in-from-bottom duration-500"
                    >
                        <div className="flex justify-between items-start">
                            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-[8px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider font-display">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Host Arena
                            </div>
                            <span className="text-3xl opacity-40 group-hover:opacity-85 transition-opacity duration-300">🏟️</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight font-display">Start Match</h2>
                            <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest mt-1.5 font-display">Initialize scorekeeping ➔</p>
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/teams')}
                        className="relative overflow-hidden bg-white/[0.02] hover:bg-white/[0.05] group rounded-[2.5rem] p-6 h-36 flex flex-col justify-between cursor-pointer shadow-xl hover:scale-[0.99] transition-all duration-300 border border-white/10 animate-in slide-in-from-bottom duration-500 delay-75"
                    >
                        <div className="flex justify-between items-start">
                            <div className="inline-flex items-center gap-1.5 bg-white/5 backdrop-blur-md text-slate-300 text-[8px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider font-display border border-white/5">
                                Local Roster
                            </div>
                            <span className="text-3xl opacity-40 group-hover:opacity-85 transition-opacity duration-300">👥</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight font-display">Manage Teams</h2>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 font-display">Build your squads ➔</p>
                        </div>
                    </div>
                </div>

                {/* Live Matches Section */}
                <div className="mb-12 animate-in fade-in duration-500">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 font-display">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Live Matches
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {liveMatches.length > 0 ? (
                            liveMatches.map((match) => (
                                <div
                                    key={match._id}
                                    onClick={() => navigate(`/scoreboard/${match._id}`)}
                                    className="bg-white/[0.02] border border-white/10 shadow-lg p-6 rounded-[2.5rem] hover:border-red-500/50 hover:bg-white/[0.04] transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-6 glow-red"
                                >
                                    <div className="flex items-start gap-4">
                                        {deleteMode && (
                                            <button 
                                                onClick={(e) => handleDeleteMatch(e, match._id)}
                                                className="bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mr-2 z-10 shadow-md transition-all shrink-0 cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[9px] font-black text-red-400 uppercase tracking-widest font-display">{match.overs} Overs Match</span>
                                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-display">• {getMatchDate(match._id)}</span>
                                            </div>
                                            <p className="text-xl font-black uppercase italic group-hover:text-red-400 transition-colors text-white font-display leading-tight">{match.battingTeam?.name || 'Unknown'}</p>
                                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">vs {match.bowlingTeam?.name || 'Unknown'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                                        <div className="text-left md:text-right">
                                            <h2 className="text-4xl font-black italic text-white font-display">{match.score} <span className="text-2xl text-red-500">/{match.wickets}</span></h2>
                                            <p className="text-[10px] font-black text-slate-400 tracking-wider mt-1 font-display">({Math.floor(match.balls / 6)}.{match.balls % 6} Overs)</p>
                                        </div>
                                        <span className="bg-red-500/10 text-red-400 text-[8px] font-black px-3 py-1.5 rounded-full uppercase border border-red-500/20 animate-pulse font-display tracking-widest shrink-0">Live</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white/[0.01] border-2 border-dashed border-white/5 p-14 rounded-[3.5rem] text-center">
                                <span className="text-5xl mb-4 block animate-bounce">🏟️</span>
                                <p className="text-white font-black italic uppercase tracking-tighter text-xl font-display">The Pitch is Waiting!</p>
                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-2 font-display">Host your first match to see it live here</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Match History Section */}
                <div className="animate-in fade-in duration-700">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 font-display">
                            📜 Match History
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {history.length > 0 ? (
                            history.map((match) => (
                                <div
                                    key={match._id}
                                    onClick={() => navigate(`/scoreboard/${match._id}`)}
                                    className="bg-white/[0.01] border border-white/5 shadow-md p-6 rounded-[2rem] hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                >
                                    <div className="flex items-start gap-4">
                                        {deleteMode && (
                                            <button 
                                                onClick={(e) => handleDeleteMatch(e, match._id)}
                                                className="bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black z-10 shadow-md shrink-0 cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        )}
                                        <div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-300 uppercase tracking-wider font-display">{match.teamA?.name || 'Team A'} vs {match.teamB?.name || 'Team B'}</span>
                                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 font-display">{getMatchDate(match._id)}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mt-2.5 font-display">Target: {match.target}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                                        <div className="text-left sm:text-right">
                                            <h2 className="text-2xl font-black italic text-slate-300 font-display">{match.score}/{match.wickets}</h2>
                                        </div>
                                        <span className="bg-white/5 text-slate-400 border border-white/10 text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider font-display">Completed</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white/[0.01] border border-white/5 p-10 rounded-[2rem] text-center border-dashed">
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider italic">No history found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;