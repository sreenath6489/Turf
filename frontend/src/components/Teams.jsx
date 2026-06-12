import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Teams = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [activeTeamId, setActiveTeamId] = useState(null);
    const [newPlayerName, setNewPlayerName] = useState('');

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
        <div className="min-h-screen bg-[#FAF4EA] text-slate-900 p-6 md:p-10 relative overflow-hidden font-sans pb-20">
            {/* BACKGROUND DECOR */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-900/5 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none"></div>

            {/* BACK BUTTON */}
            <button onClick={() => navigate('/home')} className="absolute top-8 left-8 p-4 bg-white border border-red-900/10 rounded-2xl hover:bg-red-50 transition-all shadow-xl group z-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>

            <div className="max-w-5xl mx-auto z-10 relative mt-16 md:mt-4">
                <div className="text-center mb-12">
                    <h2 className="text-5xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">Manage<br /><span className="text-red-600">Your Teams</span></h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Local Storage Roster</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
                    {/* SIDEBAR: TEAM LIST */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-red-900/5 border border-slate-100 relative overflow-hidden">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Create Team</h3>
                            <div className="flex flex-col gap-3">
                                <input
                                    placeholder="Enter Team Name"
                                    className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none placeholder:text-slate-300 border border-slate-100 focus:border-red-600/30 transition-all"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreateTeam()}
                                />
                                <button
                                    onClick={handleCreateTeam}
                                    className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-red-600 transition-colors shadow-lg shadow-slate-900/20"
                                >
                                    + Add Team
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-red-900/5 border border-slate-100 flex flex-col gap-2 min-h-[300px]">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Saved Teams</h3>
                            {teams.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No teams yet</p>
                                </div>
                            ) : (
                                teams.map(t => (
                                    <div 
                                        key={t.id} 
                                        onClick={() => setActiveTeamId(t.id)}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center group ${activeTeamId === t.id ? 'border-red-600 bg-red-50' : 'border-transparent hover:bg-slate-50'}`}
                                    >
                                        <div>
                                            <p className={`font-black italic uppercase ${activeTeamId === t.id ? 'text-red-600' : 'text-slate-700'}`}>{t.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.players.length} Players</p>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteTeam(t.id); }}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* MAIN: ACTIVE TEAM ROSTER */}
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-red-900/5 border border-slate-100 min-h-[500px] flex flex-col">
                        {!activeTeam ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                <span className="text-6xl mb-4 grayscale">🏟️</span>
                                <h3 className="text-xl font-black uppercase italic text-slate-400">Select a team to view</h3>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="flex justify-between items-end mb-8 border-b border-slate-100 pb-6">
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 mb-1">Editing Roster</h3>
                                        <h2 className="text-4xl font-black italic uppercase text-slate-900 leading-none">{activeTeam.name}</h2>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-slate-900">{activeTeam.players.length}</p>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Squad Size</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 mb-8">
                                    <input
                                        placeholder="Add player name..."
                                        className="flex-1 bg-slate-50 p-5 rounded-2xl text-sm font-bold outline-none placeholder:text-slate-300 border border-slate-100 focus:border-red-600/30 transition-all shadow-inner"
                                        value={newPlayerName}
                                        onChange={(e) => setNewPlayerName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                                    />
                                    <button
                                        onClick={handleAddPlayer}
                                        className="px-8 bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
                                    >
                                        Add Player
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
                                    {activeTeam.players.length === 0 ? (
                                        <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl">
                                            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">No players in this team yet</p>
                                        </div>
                                    ) : (
                                        activeTeam.players.map((p, i) => (
                                            <div key={p.tid} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                                                        {i + 1}
                                                    </div>
                                                    <span className="font-bold text-slate-700 text-lg italic uppercase">{p.name}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemovePlayer(activeTeam.id, p.tid)}
                                                    className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center font-black opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all scale-90 group-hover:scale-100"
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
