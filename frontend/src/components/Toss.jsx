import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Toss = () => {
    const { state } = useLocation(); // teamA, teamB
    const navigate = useNavigate();
    const [isSpinning, setIsSpinning] = useState(false);
    const [side, setSide] = useState('H'); // H or T
    const [tossWinner, setTossWinner] = useState(null);
    const [decision, setDecision] = useState(null);
    const [overs, setOvers] = useState(5);

    const flipCoin = () => {
        setIsSpinning(true);
        setTimeout(() => {
            setSide(Math.random() > 0.5 ? 'H' : 'T');
            setIsSpinning(false);
        }, 2000);
    };

    const startMatch = () => {
        const battingTeam = decision === 'Bat' ? tossWinner : (tossWinner === state.teamA.name ? state.teamB : state.teamA);
        const bowlingTeam = battingTeam.name === state.teamA.name ? state.teamB : state.teamA;

        navigate('/setup-players', {
            state: { ...state, battingTeam, bowlingTeam, totalOvers: overs }
        });
    };

    return (
        <div className="min-h-screen bg-[#FAF4EA] flex flex-col items-center p-8 text-slate-900">
            <h2 className="text-3xl font-black italic text-red-600 mb-12">THE TOSS</h2>

            {/* 3D Flip Animation */}
            <div className={`w-32 h-32 relative preserve-3d transition-all duration-1000 ${isSpinning ? 'animate-bounce' : ''}`}
                style={{ transform: side === 'T' ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                <div className="absolute w-full h-full backface-hidden rounded-full border-4 border-yellow-500 bg-yellow-600 flex items-center justify-center text-5xl font-black text-yellow-200 shadow-2xl shadow-yellow-500/20">H</div>
                <div className="absolute w-full h-full backface-hidden rounded-full border-4 border-yellow-500 bg-yellow-700 flex items-center justify-center text-5xl font-black text-yellow-100 rotate-y-180">T</div>
            </div>

            <button onClick={flipCoin} className="mt-8 bg-white text-black px-8 py-3 rounded-xl font-black italic">FLIP</button>

            {/* Manual Selection after Flip */}
            <div className="mt-12 w-full max-w-md space-y-6">
                <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500">Who won the toss?</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {[state.teamA, state.teamB].map(t => (
                            <button key={t.name} onClick={() => setTossWinner(t)} className={`p-4 rounded-xl border-2 ${tossWinner?.name === t.name ? 'border-red-600 bg-red-50 text-red-600 font-bold' : 'border-red-900/10 bg-white'}`}>{t.name}</button>
                        ))}
                    </div>
                </div>

                {tossWinner && (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setDecision('Bat')} className={`p-4 rounded-xl border-2 ${decision === 'Bat' ? 'border-red-600 bg-red-50 text-red-600 font-bold' : 'border-red-900/10 bg-white'}`}>BAT FIRST</button>
                        <button onClick={() => setDecision('Bowl')} className={`p-4 rounded-xl border-2 ${decision === 'Bowl' ? 'border-red-600 bg-red-50 text-red-600 font-bold' : 'border-red-900/10 bg-white'}`}>BOWL FIRST</button>
                    </div>
                )}

                <div className="pt-4">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500">Match Overs</label>
                    <input type="number" value={overs} onChange={(e) => setOvers(e.target.value)} className="w-full bg-white p-4 mt-2 rounded-xl border border-red-900/10 outline-none focus:ring-2 focus:ring-red-600 text-slate-900" />
                </div>

                {decision && <button onClick={startMatch} className="w-full py-5 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-900/20">SELECT SQUADS</button>}
            </div>
        </div>
    );
};

export default Toss;