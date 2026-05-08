import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const SetupPlayers = () => {
    const { state } = useLocation(); // battingTeam, bowlingTeam, totalOvers, etc.
    const navigate = useNavigate();

    const [striker, setStriker] = useState(null);
    const [nonStriker, setNonStriker] = useState(null);
    const [bowler, setBowler] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleStartMatch = async () => {
        if (!striker || !nonStriker || !bowler) {
            alert("Please select all 3 starting players!");
            return;
        }
        if (striker.tid === nonStriker.tid) {
            alert("Striker and Non-Striker cannot be the same person!");
            return;
        }

        setLoading(true);
        try {
            const admin = JSON.parse(localStorage.getItem('user'));

            const matchData = {
                teamA: state.teamA,
                teamB: state.teamB,
                battingTeam: state.battingTeam,
                bowlingTeam: state.bowlingTeam,
                overs: state.totalOvers,
                adminId: admin.tid,
                currentBatsmen: { striker, nonStriker },
                currentBowler: bowler,
                score: 0,
                wickets: 0,
                balls: 0,
                isCompleted: false,
                existingMatchId: state.existingMatchId,
                target: state.target
            };

            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/matches/create`, matchData);

            if (res.data.success) {
                navigate(`/scoreboard/${res.data.match._id}`, { state: res.data.match });
            }
        } catch (err) {
            console.error(err);
            alert("Failed to initialize match in DB");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF4EA] text-slate-900 p-6 font-sans">
            <h2 className="text-xs font-black tracking-[0.4em] text-red-600 uppercase mb-8 text-center">Match Initialization</h2>

            <div className="space-y-8">
                {/* Batting Team Selection */}
                <section>
                    <h3 className="text-lg font-bold italic mb-4 flex items-center gap-2">
                        🏏 {state.battingTeam.name} <span className="text-[10px] text-slate-500 not-italic uppercase font-black">Batting</span>
                    </h3>
                    <div className="grid gap-3">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase mb-2 ml-1 font-bold">Select Striker</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {state.battingTeam.players.map(p => (
                                    <button
                                        key={p.tid}
                                        onClick={() => setStriker(p)}
                                        className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap border-2 transition-all ${striker?.tid === p.tid ? 'bg-red-600 border-red-600 text-white font-bold' : 'bg-white border-red-900/10 text-slate-600'}`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] text-slate-500 uppercase mb-2 ml-1 font-bold">Select Non-Striker</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {state.battingTeam.players.map(p => (
                                    <button
                                        key={p.tid}
                                        onClick={() => setNonStriker(p)}
                                        className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap border-2 transition-all ${nonStriker?.tid === p.tid ? 'bg-red-600 border-red-600 text-white font-bold' : 'bg-white border-red-900/10 text-slate-600'}`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <hr className="border-red-900/10" />

                {/* Bowling Team Selection */}
                <section>
                    <h3 className="text-lg font-bold italic mb-4 flex items-center gap-2">
                        ⚾ {state.bowlingTeam.name} <span className="text-[10px] text-slate-500 not-italic uppercase font-black">Bowling</span>
                    </h3>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase mb-2 ml-1 font-bold">Select Opening Bowler</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {state.bowlingTeam.players.map(p => (
                                <button
                                    key={p.tid}
                                    onClick={() => setBowler(p)}
                                    className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap border-2 transition-all ${bowler?.tid === p.tid ? 'bg-red-600 border-red-600 text-white font-bold' : 'bg-white border-red-900/10 text-slate-600'}`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* Sticky Start Button */}
            <div className="fixed bottom-8 left-6 right-6">
                <button
                    onClick={handleStartMatch}
                    disabled={loading}
                    className={`w-full py-5 rounded-[2rem] font-black uppercase italic shadow-2xl transition-all ${loading ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                >
                    {loading ? 'Setting up pitch...' : 'Enter the Turf 🏟️'}
                </button>
            </div>
        </div>
    );
};

export default SetupPlayers;