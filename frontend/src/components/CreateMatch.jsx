import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreateMatch = () => {
    const [teamA, setTeamA] = useState({ name: '', players: [], captain: null });
    const [teamB, setTeamB] = useState({ name: '', players: [], captain: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [activeTeam, setActiveTeam] = useState('A'); 
    const [step, setStep] = useState(1); // 1: Setup, 2: Select Captains

    const navigate = useNavigate();

    const handleSearch = async (val) => {
        setSearchQuery(val);
        if (val.length > 2) {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/players/search?query=${val}`);
            setSearchResults(res.data);
        } else {
            setSearchResults([]);
        }
    };

    const addPlayer = (player) => {
        if (activeTeam === 'A') {
            setTeamA({ ...teamA, players: [...teamA.players, player] });
        } else {
            setTeamB({ ...teamB, players: [...teamB.players, player] });
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div className="min-h-screen bg-[#FAF4EA] text-slate-900 p-4 relative">
            {/* BACK BUTTON */}
            <button onClick={() => navigate('/home')} className="absolute top-4 left-4 p-3 bg-white/50 border border-red-900/10 rounded-2xl hover:bg-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>
            <div className="mt-12 text-center mb-8">
                <h2 className="text-3xl font-black italic text-red-600 uppercase">Setup Match</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Assemble your Teams</p>
            </div>

            {/* Team Inputs */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <input
                    placeholder="Team A Name"
                    className="bg-white p-3 rounded-lg border border-red-900/10 focus:ring-2 focus:ring-red-600 outline-none text-slate-900"
                    onChange={(e) => setTeamA({ ...teamA, name: e.target.value })}
                />
                <input
                    placeholder="Team B Name"
                    className="bg-white p-3 rounded-lg border border-red-900/10 focus:ring-2 focus:ring-red-600 outline-none text-slate-900"
                    onChange={(e) => setTeamB({ ...teamB, name: e.target.value })}
                />
            </div>

            {/* Player Searcher */}
            <div className="bg-white p-4 rounded-xl border border-red-900/10 mb-6 shadow-sm">
                <p className="text-sm text-slate-500 mb-2">Adding players to: <span className="text-red-600 font-bold">Team {activeTeam}</span></p>
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setActiveTeam('A')} className={`px-4 py-1 rounded-full ${activeTeam === 'A' ? 'bg-red-600 text-white font-bold' : 'bg-stone-100 text-slate-500'}`}>Team A</button>
                    <button onClick={() => setActiveTeam('B')} className={`px-4 py-1 rounded-full ${activeTeam === 'B' ? 'bg-red-600 text-white font-bold' : 'bg-stone-100 text-slate-500'}`}>Team B</button>
                </div>

                <input
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by Name or TID..."
                    className="w-full bg-stone-50 p-4 rounded-lg outline-none border border-red-900/10 focus:ring-2 focus:ring-red-600 text-slate-900"
                />

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div className="mt-2 bg-white border border-red-900/10 rounded-lg overflow-hidden shadow-sm">
                        {searchResults.map(p => (
                            <div
                                key={p.tid}
                                onClick={() => addPlayer(p)}
                                className="p-3 hover:bg-red-50 hover:text-red-600 cursor-pointer border-b border-red-900/5 last:border-0 text-slate-900 flex items-center gap-3"
                            >
                                <img src={p.profilePic} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                <div>
                                    <p className="font-bold">{p.name}</p>
                                    <p className="text-[8px] opacity-60 uppercase">{p.role} • {p.tid}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Current Rosters */}
            {step === 1 ? (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-red-900/10 p-3 rounded-lg shadow-sm">
                            <h3 className="font-bold border-b border-red-900/10 mb-2 text-red-600">{teamA.name || 'Team A'}</h3>
                            {teamA.players.map(p => <div key={p.tid} className="text-sm mb-1 text-slate-700">● {p.name}</div>)}
                        </div>
                        <div className="bg-white border border-red-900/10 p-3 rounded-lg shadow-sm">
                            <h3 className="font-bold border-b border-red-900/10 mb-2 text-red-600">{teamB.name || 'Team B'}</h3>
                            {teamB.players.map(p => <div key={p.tid} className="text-sm mb-1 text-slate-700">● {p.name}</div>)}
                        </div>
                    </div>

                    {teamA.players.length > 0 && teamB.players.length > 0 && (
                        <button
                            onClick={() => setStep(2)}
                            className="w-full bg-red-600 text-white font-black py-4 rounded-xl mt-8 shadow-lg shadow-red-900/20 uppercase"
                        >
                            Next: Select Captains ➔
                        </button>
                    )}
                </>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-3xl border border-red-900/10 shadow-xl">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-600 rounded-full"></span> Select {teamA.name} Captain
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {teamA.players.map(p => (
                                <button 
                                    key={p.tid} 
                                    onClick={() => setTeamA({...teamA, captain: p})}
                                    className={`p-3 rounded-xl border-2 transition-all font-bold text-sm ${teamA.captain?.tid === p.tid ? 'border-red-600 bg-red-50 text-red-600' : 'border-slate-100 text-slate-500'}`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-red-900/10 shadow-xl">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Select {teamB.name} Captain
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {teamB.players.map(p => (
                                <button 
                                    key={p.tid} 
                                    onClick={() => setTeamB({...teamB, captain: p})}
                                    className={`p-3 rounded-xl border-2 transition-all font-bold text-sm ${teamB.captain?.tid === p.tid ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-500'}`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {teamA.captain && teamB.captain && (
                        <button
                            onClick={() => navigate('/squads', { state: { teamA, teamB } })}
                            className="w-full bg-[#1a1a1a] text-white font-black py-5 rounded-2xl mt-8 shadow-2xl uppercase tracking-widest hover:bg-red-600 transition-all"
                        >
                            View Squad Posters 📸
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default CreateMatch;