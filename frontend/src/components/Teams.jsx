import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Teams = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [activeTeamId, setActiveTeamId] = useState(null);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const savedTeams = localStorage.getItem('turf_teams');
        if (savedTeams) {
            const parsed = JSON.parse(savedTeams);
            setTeams(parsed);
            if (parsed.length > 0) setActiveTeamId(parsed[0].id);
        }
    }, []);

    const saveTeams = (updatedTeams) => {
        setTeams(updatedTeams);
        localStorage.setItem('turf_teams', JSON.stringify(updatedTeams));
    };

    const handleCreateTeam = () => {
        if (!newTeamName.trim()) return;
        const newTeam = {
            id: `TEAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: newTeamName.trim(),
            players: [],
            captain: null
        };
        const updated = [...teams, newTeam];
        saveTeams(updated);
        setNewTeamName('');
        setActiveTeamId(newTeam.id);
    };

    const handleDeleteTeam = (id) => {
        const updated = teams.filter(t => t.id !== id);
        saveTeams(updated);
        if (activeTeamId === id) {
            setActiveTeamId(updated.length > 0 ? updated[0].id : null);
        }
    };

    const handleAddPlayer = () => {
        if (!newPlayerName.trim() || !activeTeamId) return;
        const updated = teams.map(t => {
            if (t.id === activeTeamId) {
                const newPlayer = {
                    tid: `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    name: newPlayerName.trim(),
                    role: 'Player',
                    profilePic: ''
                };
                return { ...t, players: [...t.players, newPlayer] };
            }
            return t;
        });
        saveTeams(updated);
        setNewPlayerName('');
        setSearchResults([]);
    };

    const handleSearchChange = async (e) => {
        const query = e.target.value;
        setNewPlayerName(query);
        
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/players/search?query=${query}`);
            const activeTeam = teams.find(t => t.id === activeTeamId);
            const filtered = res.data.filter(p => !activeTeam.players.some(tp => tp.tid === p.tid));
            setSearchResults(filtered);
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddRegisteredPlayer = (dbPlayer) => {
        if (!activeTeamId) return;
        const updated = teams.map(t => {
            if (t.id === activeTeamId) {
                if (t.players.some(p => p.tid === dbPlayer.tid)) return t;
                return { ...t, players: [...t.players, {
                    tid: dbPlayer.tid,
                    name: dbPlayer.name,
                    role: dbPlayer.role || 'Player',
                    profilePic: dbPlayer.profilePic || ''
                }] };
            }
            return t;
        });
        saveTeams(updated);
        setNewPlayerName('');
        setSearchResults([]);
    };

    const handleRemovePlayer = (teamId, playerId) => {
        const updated = teams.map(t => {
            if (t.id === teamId) {
                return { ...t, players: t.players.filter(p => p.tid !== playerId) };
            }
            return t;
        });
        saveTeams(updated);
    };

    const activeTeam = teams.find(t => t.id === activeTeamId);

    return (
        <div className="min-h-screen bg-[#080B10] text-white p-6 md:p-10 relative overflow-hidden font-sans pb-24 selection:bg-red-500/20">
            {/* BACKGROUND DECOR */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-950/5 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none"></div>

            {/* BACK BUTTON */}
            <button onClick={() => navigate('/home')} className="absolute top-8 left-8 p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-slate-300 hover:text-white transition-all shadow-xl group z-20 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            <div className="max-w-5xl mx-auto z-10 relative mt-16 md:mt-4">
                <div className="text-center mb-12 animate-in fade-in duration-500">
                    <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter leading-none font-display">Manage<br /><span className="text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">Your Teams</span></h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">Local Storage Roster</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
                    {/* SIDEBAR: TEAM LIST */}
                    <div className="space-y-6 animate-in slide-in-from-left duration-500">
                        <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden backdrop-blur-xl glow-red">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 font-display">Create Team</h3>
                            <div className="flex flex-col gap-3">
                                <input
                                    placeholder="Enter Team Name"
                                    className="w-full bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none placeholder:text-slate-600 border border-white/10 focus:border-red-500/30 transition-all text-white"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreateTeam()}
                                />
                                <button
                                    onClick={handleCreateTeam}
                                    className="w-full bg-red-500 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl hover:bg-red-600 transition-colors shadow-lg cursor-pointer font-display"
                                >
                                    + Add Team
                                </button>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[2.5rem] shadow-xl flex flex-col gap-2 min-h-[300px] backdrop-blur-xl">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 font-display">Saved Teams</h3>
                            {teams.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-center p-6 border-2 border-dashed border-white/5 rounded-2xl">
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">No teams yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2 overflow-y-auto max-h-[350px] pr-1 no-scrollbar">
                                    {teams.map(t => (
                                        <div 
                                            key={t.id} 
                                            onClick={() => setActiveTeamId(t.id)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${activeTeamId === t.id ? 'border-red-500 bg-red-500/10' : 'border-transparent hover:bg-white/5'}`}
                                        >
                                            <div>
                                                <p className={`font-black italic uppercase font-display ${activeTeamId === t.id ? 'text-red-400' : 'text-slate-200'}`}>{t.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 font-display">{t.players.length} Players</p>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteTeam(t.id); }}
                                                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-lg px-2 cursor-pointer"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MAIN: ACTIVE TEAM ROSTER */}
                    <div className="bg-white/[0.02] border border-white/10 p-8 rounded-[3rem] shadow-2xl min-h-[500px] flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-500">
                        {!activeTeam ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <span className="text-6xl mb-4 grayscale">🏟️</span>
                                <h3 className="text-xl font-black uppercase italic text-slate-400 font-display">Select a team to view</h3>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400 mb-1 font-display">Editing Roster</h3>
                                        <h2 className="text-4xl font-black italic uppercase text-white leading-none font-display">{activeTeam.name}</h2>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-white font-display leading-none">{activeTeam.players.length}</p>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1 font-display">Squad Size</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 mb-8 relative">
                                    <div className="flex-1 relative">
                                        <input
                                            placeholder="Search DB or type guest name..."
                                            className="w-full bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none placeholder:text-slate-600 border border-white/10 focus:border-red-500/30 transition-all text-white"
                                            value={newPlayerName}
                                            onChange={handleSearchChange}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                                        />
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto no-scrollbar">
                                                {searchResults.map(p => (
                                                    <div 
                                                        key={p.tid} 
                                                        onClick={() => handleAddRegisteredPlayer(p)}
                                                        className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                                                    >
                                                        <img src={p.profilePic || 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png'} alt={p.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                                        <div>
                                                            <p className="font-bold text-white text-sm font-display">{p.name}</p>
                                                            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">{p.tid}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleAddPlayer}
                                        className="px-6 bg-white/10 text-white border border-white/10 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/20 transition-colors shadow-lg whitespace-nowrap cursor-pointer font-display"
                                    >
                                        Add Guest
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2 max-h-[450px]">
                                    {activeTeam.players.length === 0 ? (
                                        <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic font-display">No players in this team yet</p>
                                        </div>
                                    ) : (
                                        activeTeam.players.map((p, i) => (
                                            <div key={p.tid} className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:border-white/10 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-red-500/10 group-hover:text-red-400 transition-colors font-display">
                                                        {i + 1}
                                                    </div>
                                                    <span className="font-bold text-slate-100 text-lg italic uppercase font-display">{p.name}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemovePlayer(activeTeam.id, p.tid)}
                                                    className="w-10 h-10 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center font-black opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all scale-90 group-hover:scale-100 cursor-pointer"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Teams;
