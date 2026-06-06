import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { toPng } from 'html-to-image';
import { playEventSound, speakCommentary } from '../utils/soundservice.js';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

const MatchDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const scorecardRef = useRef(null);

    // Modals & State
    const [activeModal, setActiveModal] = useState(null);
    const [tempValue, setTempValue] = useState(0);
    const [tempType, setTempType] = useState('Bat');
    const [wicketData, setWicketData] = useState({ type: 'Bowled', fielder: '', runs: 0, nextBatsman: null });
    const [selectedBowler, setSelectedBowler] = useState(null);
    const [viewInnings, setViewInnings] = useState(1); // For the toggle
    const [commentary, setCommentary] = useState("");
    const [momentumPulse, setMomentumPulse] = useState(false);
    const [pollModal, setPollModal] = useState(false);
    const [transferModal, setTransferModal] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        
        // AI Commentary Voice Trigger
        const mode = localStorage.getItem('commentaryMode') || 'AI';
        if (mode === 'AI') {
            speakCommentary(message);
        }

        setTimeout(() => setToast(null), 1500); // Snappier: 1.5s instead of 3s
    };
    const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });

    const handleTransfer = async (newAdminId) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/matches/${id}/transfer`, { newAdminId });
            setTransferModal(false);
            showToast("Control Transferred! 👑", "info");
        } catch (err) { showToast("Transfer failed", "error"); }
    };

    const handleCreatePoll = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/matches/${id}/poll`, { 
                question: newPoll.question, 
                options: newPoll.options.filter(o => o.trim() !== '') 
            });
            setPollModal(false);
            setNewPoll({ question: '', options: ['', ''] });
            showToast("Question Published! 🚀");
        } catch (err) { showToast("Poll creation failed", "error"); }
    };

    const handleVote = async (pollIndex, optionIndex) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/matches/${id}/poll/${pollIndex}/vote`, { optionIndex });
        } catch (err) { console.error("Vote failed"); }
    };
    // AI WIN PROBABILITY & MOMENTUM LOGIC
    const calculateStats = () => {
        if (!match) return { winProb: 50, momentum: 50 };

        const isSecondInnings = match.innings === 2;
        let winProb = 50;
        
        if (isSecondInnings) {
            const target = match.target || (match.firstInningsData?.score + 1);
            const runsNeeded = target - match.score;
            const totalBalls = match.overs * 6;
            const ballsLeft = totalBalls - match.balls;
            const wicketsLeft = (match.battingTeam.players.length - 1) - match.wickets;

            if (ballsLeft > 0) {
                // Required Run Rate
                const rrr = (runsNeeded / ballsLeft) * 6;
                // Current Run Rate
                const crr = match.score / (match.balls / 6 || 1);
                
                // Heuristic Win Prob: Wickets are worth ~7% each, RRR vs CRR delta worth ~5% per unit
                winProb = 50 + (wicketsLeft * 7) - (rrr - crr) * 5 - ((runsNeeded/ballsLeft) * 10);
                
                // Factor in balls left (pressure)
                if (ballsLeft < 12) winProb -= (runsNeeded > ballsLeft ? 10 : 0);
            } else {
                winProb = runsNeeded <= 0 ? 100 : 0;
            }
        }

        // Momentum Logic (Last 6 balls)
        const recentBalls = match.ballHistory?.slice(-6) || [];
        let momentum = 50;
        recentBalls.forEach(ball => {
            if (typeof ball === 'number') {
                if (ball >= 4) momentum += 15;
                else if (ball === 0) momentum -= 5;
                else momentum += 2;
            } else if (typeof ball === 'string') {
                if (ball.startsWith('W')) momentum -= 25;
                if (ball.startsWith('Wd') || ball.startsWith('NB')) momentum -= 5;
            }
        });
        
        // Pulse Effect detection
        const lastTwo = match.ballHistory?.slice(-2) || [];
        const isHot = lastTwo.length === 2 && lastTwo.every(b => typeof b === 'number' && b === 6);

        winProb = Math.max(1, Math.min(99, Math.round(winProb)));
        momentum = Math.max(10, Math.min(90, momentum));

        return { winProb, momentum, isHot };
    };

    const { winProb, momentum, isHot } = calculateStats();

    useEffect(() => {
        if (isHot) {
            setMomentumPulse(true);
            setTimeout(() => setMomentumPulse(false), 3000);
        }
    }, [match?.balls]);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('LIVE');
    const [pinnedIPL, setPinnedIPL] = useState(null);
    const [commentaryMode, setCommentaryMode] = useState(() => localStorage.getItem('commentaryMode') || 'AI');
    const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem('soundMuted') === 'true');
    const [showSummary, setShowSummary] = useState(false);

    // Pre-load voices for macOS/Chrome bug
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }
    }, []);

    useEffect(() => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));
        setUser(loggedUser);

        const fetchMatch = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/matches/${id}`);
                setMatch(res.data);
                setViewInnings(res.data.innings);
                socket.emit('joinMatch', id);
            } catch (err) {
                alert("Match not found");
                navigate('/home');
            } finally {
                setLoading(false);
            }
        };

        const savedPin = localStorage.getItem('pinnedIPLMatch');
        if (savedPin) setPinnedIPL(JSON.parse(savedPin));

        fetchMatch();

        socket.on('scoreUpdated', (updatedMatch) => {
            // SYNC FIX: Only update if the incoming data is newer or same as local
            setMatch(prev => {
                if (!prev || updatedMatch.balls >= prev.balls || updatedMatch.innings > prev.innings || updatedMatch.isCompleted) {
                    return updatedMatch;
                }
                return prev;
            });

            if (updatedMatch.innings > viewInnings && !updatedMatch.isCompleted) {
                setViewInnings(updatedMatch.innings);
            }
        });

        socket.on('newCommentary', (data) => {
            if (!data.text) return;
            setCommentary(data.text);

            // Use the centralized voice engine
            speakCommentary(data.text);

            // Auto-clear text after 8 seconds
            setTimeout(() => setCommentary(""), 8000);
        });

        return () => {
            socket.off('scoreUpdated');
            socket.off('newCommentary');
        };
    }, [id, navigate]);

    const [specialEvent, setSpecialEvent] = useState(null);

    const triggerSpecial = (type) => {
        setSpecialEvent(type);
        setTimeout(() => setSpecialEvent(null), 4000);
    };

    if (loading || !match) return <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center font-black">Loading Pitch...</div>;

    const isAdmin = user && match.adminId === user.tid;
    const formatOvers = (b) => `${Math.floor(b / 6)}.${b % 6}`;
    const getStrikeRate = (r, b) => b > 0 ? ((r / b) * 100).toFixed(1) : '0.0';
    const getEcon = (r, b) => b > 0 ? ((r / (b / 6))).toFixed(1) : '0.0';

    const handleModeToggle = (mode) => {
        setCommentaryMode(mode);
        localStorage.setItem('commentaryMode', mode);
    };

    const isLastWicket = match.wickets >= match.battingTeam.players.length - 1;
    const isSoloMode = match.wickets === match.battingTeam.players.length - 1;

    const syncMatch = (newMatchState, newBallEvent = {}) => {
        setMatch(newMatchState);
        socket.emit('updateBall', { matchId: match._id, newBall: newBallEvent, updatedScorecard: newMatchState });
    };

    const rotateStrike = (currentMatch) => {
        if (!currentMatch.currentBatsmen.striker || !currentMatch.currentBatsmen.nonStriker) return;
        const temp = currentMatch.currentBatsmen.striker;
        currentMatch.currentBatsmen.striker = currentMatch.currentBatsmen.nonStriker;
        currentMatch.currentBatsmen.nonStriker = temp;
    };

    const checkInningsStatus = (newMatch) => {
        const teamSize = newMatch.battingTeam.players.length;
        const isAllOut = newMatch.wickets >= teamSize;
        const isOversDone = newMatch.balls >= newMatch.overs * 6;
        const isTargetReached = newMatch.innings === 2 && newMatch.score >= newMatch.target;

        if (isTargetReached || ((isAllOut || isOversDone) && newMatch.innings === 2)) {
            newMatch.isCompleted = true;
            
            // SAVE FINAL NOT-OUT BATSMEN
            if (newMatch.currentBatsmen.striker) {
                newMatch.batsmanStats.push({ ...newMatch.currentBatsmen.striker, dismissal: 'not out' });
            }
            if (newMatch.currentBatsmen.nonStriker) {
                newMatch.batsmanStats.push({ ...newMatch.currentBatsmen.nonStriker, dismissal: 'not out' });
            }
            // SAVE FINAL BOWLER
            if (newMatch.currentBowler) {
                const existing = newMatch.bowlerStats.findIndex(b => b.tid === newMatch.currentBowler.tid);
                if (existing >= 0) newMatch.bowlerStats[existing] = newMatch.currentBowler;
                else newMatch.bowlerStats.push(newMatch.currentBowler);
            }

            setActiveModal('MATCH_OVER');
        } else if ((isAllOut || isOversDone) && newMatch.innings === 1) {
            // SAVE FINAL NOT-OUT BATSMEN (Innings 1)
            if (newMatch.currentBatsmen.striker) {
                newMatch.batsmanStats.push({ ...newMatch.currentBatsmen.striker, dismissal: 'not out' });
            }
            if (newMatch.currentBatsmen.nonStriker) {
                newMatch.batsmanStats.push({ ...newMatch.currentBatsmen.nonStriker, dismissal: 'not out' });
            }
            // SAVE FINAL BOWLER (Innings 1)
            if (newMatch.currentBowler) {
                const existing = newMatch.bowlerStats.findIndex(b => b.tid === newMatch.currentBowler.tid);
                if (existing >= 0) newMatch.bowlerStats[existing] = newMatch.currentBowler;
                else newMatch.bowlerStats.push(newMatch.currentBowler);
            }
            
            setActiveModal('INNINGS_BREAK');
        } else if (newMatch.balls % 6 === 0 && !isAllOut && !isTargetReached) {
            rotateStrike(newMatch);
            newMatch.currentBowler.overs = Math.floor(newMatch.currentBowler.balls / 6);
            setActiveModal('BOWLER');
        } else {
            setActiveModal(null);
        }
    };

    const handleRun = (run) => {
        setHistory(prev => [...prev, JSON.parse(JSON.stringify(match))]);
        let newMatch = { 
            ...match,
            currentBatsmen: {
                ...match.currentBatsmen,
                striker: match.currentBatsmen.striker ? { ...match.currentBatsmen.striker } : null,
                nonStriker: match.currentBatsmen.nonStriker ? { ...match.currentBatsmen.nonStriker } : null
            },
            currentBowler: match.currentBowler ? { ...match.currentBowler } : null,
            ballHistory: [...match.ballHistory]
        };

        if (!newMatch.currentBatsmen.striker) return; // Guard clause

        newMatch.score += run;
        newMatch.balls += 1;
        newMatch.ballHistory.push(run);

        newMatch.currentBatsmen.striker.runs += run;
        newMatch.currentBatsmen.striker.balls += 1;
        if (run === 4) newMatch.currentBatsmen.striker.fours += 1;
        if (run === 6) newMatch.currentBatsmen.striker.sixes += 1;

        if (newMatch.currentBowler) {
            newMatch.currentBowler.runs += run;
            newMatch.currentBowler.balls += 1;
        }

        if (run % 2 !== 0) rotateStrike(newMatch);
        checkInningsStatus(newMatch);

        let eventDesc = `${run} runs`;

        if (run === 4) {
            eventDesc = `Smashing Boundary! 4 runs!`;
            playEventSound('four');
        }
        if (run === 6) {
            eventDesc = `Massive SIX! Out of the park!`;
            playEventSound('six');
            triggerSpecial('SIX');
        }
        
        if (newMatch.score === 7 || run === 7) {
            triggerSpecial('THALA');
        }

        syncMatch(newMatch, { runs: run, type: run >= 4 ? 'boundary' : 'run', description: eventDesc });
    };

    const handleWideSubmit = (extraRuns) => {
        setHistory(prev => [...prev, JSON.parse(JSON.stringify(match))]);
        let newMatch = { 
            ...match,
            currentBowler: match.currentBowler ? { ...match.currentBowler } : null,
            ballHistory: [...match.ballHistory],
            extras: { ...(match.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 }) },
            currentBatsmen: {
                ...match.currentBatsmen,
                striker: match.currentBatsmen.striker ? { ...match.currentBatsmen.striker } : null,
                nonStriker: match.currentBatsmen.nonStriker ? { ...match.currentBatsmen.nonStriker } : null
            }
        };
        const totalRuns = 1 + extraRuns;

        newMatch.score += totalRuns;
        newMatch.ballHistory.push(`Wd${extraRuns > 0 ? '+' + extraRuns : ''}`);
        newMatch.currentBowler.runs += totalRuns;

        newMatch.extras.wides += totalRuns;

        // Detect consecutive wides
        const lastBall = match.ballHistory[match.ballHistory.length - 1];
        const isConsecutiveWide = typeof lastBall === 'string' && lastBall.startsWith('Wd');

        if (isConsecutiveWide) {
            playEventSound('widedouble');
        } else {
            playEventSound('wide');
        }

        if (extraRuns % 2 !== 0) rotateStrike(newMatch);

        checkInningsStatus(newMatch);
        syncMatch(newMatch, { runs: totalRuns, type: 'wide', description: `Wide ball plus ${extraRuns} extra runs` });
    };

    const handleNoBallSubmit = (runs, type) => {
        setHistory(prev => [...prev, JSON.parse(JSON.stringify(match))]);
        let newMatch = { 
            ...match,
            currentBatsmen: {
                ...match.currentBatsmen,
                striker: match.currentBatsmen.striker ? { ...match.currentBatsmen.striker } : null,
                nonStriker: match.currentBatsmen.nonStriker ? { ...match.currentBatsmen.nonStriker } : null
            },
            currentBowler: match.currentBowler ? { ...match.currentBowler } : null,
            ballHistory: [...match.ballHistory],
            extras: { ...(match.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 }) }
        };
        const totalRuns = 1 + runs;

        newMatch.score += totalRuns;
        newMatch.ballHistory.push(`NB${runs > 0 ? '+' + runs : ''}`);
        newMatch.currentBowler.runs += totalRuns;

        newMatch.extras.noBalls += 1;

        playEventSound('noball');

        if (type === 'Bat') {
            newMatch.currentBatsmen.striker.runs += runs;
            if (runs === 4) newMatch.currentBatsmen.striker.fours += 1;
            if (runs === 6) newMatch.currentBatsmen.striker.sixes += 1;
        } else {
            newMatch.extras.byes += runs;
        }
        newMatch.currentBatsmen.striker.balls += 1;

        if (runs % 2 !== 0) rotateStrike(newMatch);

        checkInningsStatus(newMatch);
        syncMatch(newMatch, { runs: totalRuns, type: 'noball', description: `No ball! And they ran ${runs} extra runs` });
    };

    const handleWicketSubmit = () => {
        if (!isLastWicket && !wicketData.nextBatsman && wicketData.type !== 'AllOut' && match.wickets < match.battingTeam.players.length - 2) {
            alert("Select the next batsman!");
            return;
        }

        setHistory(prev => [...prev, JSON.parse(JSON.stringify(match))]);
        let newMatch = { 
            ...match,
            currentBatsmen: {
                ...match.currentBatsmen,
                striker: match.currentBatsmen.striker ? { ...match.currentBatsmen.striker } : null,
                nonStriker: match.currentBatsmen.nonStriker ? { ...match.currentBatsmen.nonStriker } : null
            },
            currentBowler: match.currentBowler ? { ...match.currentBowler } : null,
            ballHistory: [...match.ballHistory],
            batsmanStats: [...(match.batsmanStats || [])]
        };
        newMatch.wickets += 1;

        if (wicketData.type !== 'Retired') {
            newMatch.balls += 1;
            newMatch.currentBatsmen.striker.balls += 1;
            newMatch.currentBowler.balls += 1;
            if (!['Run Out', 'Retired'].includes(wicketData.type)) {
                newMatch.currentBowler.wickets += 1;
            }
        }

        newMatch.score += wicketData.runs;

        let ballStr = 'W';
        if (wicketData.type === 'Run Out') ballStr = `W(${wicketData.runs}RO)`;
        newMatch.ballHistory.push(ballStr);

        let dismissalStr = wicketData.type;
        if (wicketData.type === 'Run Out' || wicketData.type === 'Caught' || wicketData.type === 'Stumped') {
            dismissalStr = `${wicketData.type === 'Caught' ? 'c' : wicketData.type === 'Stumped' ? 'st' : 'run out'} ${wicketData.fielder ? wicketData.fielder.name : ''} b ${match.currentBowler.name}`;
        } else if (wicketData.type === 'Bowled') {
            dismissalStr = `b ${match.currentBowler.name}`;
        } else if (wicketData.type === 'LBW') {
            dismissalStr = `lbw b ${match.currentBowler.name}`;
        }

        newMatch.batsmanStats.push({
            ...newMatch.currentBatsmen.striker,
            dismissal: dismissalStr
        });

        if (!isLastWicket) {
            if (match.wickets === match.battingTeam.players.length - 2) {
                // This was the 2nd to last wicket. One player is left.
                // Move the non-striker to striker for solo play.
                newMatch.currentBatsmen.striker = { ...newMatch.currentBatsmen.nonStriker };
                newMatch.currentBatsmen.nonStriker = null;
            } else {
                newMatch.currentBatsmen.striker = {
                    ...wicketData.nextBatsman,
                    runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out'
                };
            }
        } else {
            newMatch.currentBatsmen.striker = null;
        }

        if (wicketData.runs % 2 !== 0 && !isLastWicket) {
            rotateStrike(newMatch);
        }

        if (match.currentBatsmen.striker.runs === 0) {
            triggerSpecial('DUCK');
        }

        checkInningsStatus(newMatch);
        playEventSound('wicket');
        syncMatch(newMatch, { runs: wicketData.runs, type: 'wicket', description: `WICKET! ${dismissalStr}` });
    };

    const handleBowlerSubmit = () => {
        if (!selectedBowler) return;
        setHistory(prev => [...prev, JSON.parse(JSON.stringify(match))]);
        let newMatch = { ...match };

        if (!newMatch.bowlerStats) newMatch.bowlerStats = [];
        const existing = newMatch.bowlerStats.findIndex(b => b.tid === newMatch.currentBowler.tid);
        if (existing >= 0) newMatch.bowlerStats[existing] = newMatch.currentBowler;
        else newMatch.bowlerStats.push(newMatch.currentBowler);

        const prevStats = newMatch.bowlerStats.find(b => b.tid === selectedBowler.tid);
        newMatch.currentBowler = prevStats ? { ...prevStats } : {
            ...selectedBowler, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0
        };

        syncMatch(newMatch);
        setActiveModal(null);
    };

    const startSecondInnings = () => {
        navigate('/setup-players', {
            state: {
                existingMatchId: match._id,
                teamA: match.teamA,
                teamB: match.teamB,
                battingTeam: match.bowlingTeam,
                bowlingTeam: match.battingTeam,
                totalOvers: match.overs,
                target: match.score + 1
            }
        });
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const prevState = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        syncMatch(prevState);
    };

    const downloadReport = async () => {
        if (!scorecardRef.current) return;

        try {
            // Hide UI elements not needed in screenshot
            const elementsToHide = document.querySelectorAll('.no-print');
            elementsToHide.forEach(el => el.style.display = 'none');

            const dataUrl = await toPng(scorecardRef.current, { cacheBust: true, backgroundColor: '#020617' });

            const link = document.createElement('a');
            link.download = `Turf_Match_Report_${match.teamA.name}_vs_${match.teamB.name}.png`;
            link.href = dataUrl;
            link.click();

        } catch (err) {
            console.error("Error generating report", err);
            alert("Failed to generate report.");
        } finally {
            const elementsToHide = document.querySelectorAll('.no-print');
            elementsToHide.forEach(el => el.style.display = '');
        }
    };

    const maxOversPerBowler = Math.ceil(match.overs / match.bowlingTeam.players.length); const renderCurrentOverWidget = () => {
        const historyData = (viewInnings === 1 && match.firstInningsData) ? match.firstInningsData.ballHistory : match.ballHistory;
        const history = historyData || [];

        // Find balls of the current over
        const currentOverBalls = [];
        let legalCount = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            const ball = history[i];
            const isWide = typeof ball === 'string' && ball.startsWith('Wd');
            const isNoBall = typeof ball === 'string' && ball.startsWith('NB');

            currentOverBalls.unshift(ball);
            if (!isWide && !isNoBall) {
                legalCount++;
            }
            if (legalCount === (match.balls % 6 || 6) && (i === 0 || legalCount > 0)) {
                // We found the start of the current over
                // But wait, if match.balls % 6 === 0, it means the over just finished or is about to start.
                // The logic should be: balls since the last completed over.
            }
        }

        // Simpler logic: get the last 'n' balls until we hit the start of the over
        const ballsInOver = [];
        let lCount = 0;
        const targetLegalBalls = match.balls % 6 === 0 && match.balls > 0 ? 6 : match.balls % 6;

        for (let i = history.length - 1; i >= 0; i--) {
            const ball = history[i];
            const isWide = typeof ball === 'string' && ball.startsWith('Wd');
            const isNoBall = typeof ball === 'string' && ball.startsWith('NB');

            ballsInOver.unshift(ball);
            if (!isWide && !isNoBall) lCount++;
            if (lCount === targetLegalBalls) break;
        }

        if (ballsInOver.length === 0) return null;

        const overRuns = ballsInOver.reduce((sum, b) => {
            if (typeof b === 'number') return sum + b;
            if (typeof b === 'string') {
                if (b.startsWith('Wd')) return sum + parseInt(b.split('+')[1] || 0) + 1;
                if (b.startsWith('NB')) return sum + parseInt(b.split('+')[1] || 0) + 1;
                if (b.startsWith('W(')) return sum + (parseInt(b.match(/\d+/)?.[0]) || 0);
            }
            return sum;
        }, 0);

        return (
            <div className="bg-[#1e1b4b] rounded-2xl p-4 mb-6 shadow-lg border border-white/10">
                <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
                    <div className="flex gap-2 items-center">
                        {ballsInOver.map((ball, i) => {
                            let bg = "bg-white";
                            let text = "text-slate-900";
                            let display = ball;

                            if (ball === 0) display = "•";
                            if (ball === 4) { bg = "bg-emerald-500"; text = "text-white"; }
                            if (ball === 6) { bg = "bg-emerald-600"; text = "text-white shadow-lg shadow-emerald-500/20"; }
                            if (typeof ball === 'string' && ball.startsWith('W')) { bg = "bg-rose-600"; text = "text-white"; display = "W"; }
                            if (typeof ball === 'string' && (ball.startsWith('Wd') || ball.startsWith('NB'))) { bg = "bg-amber-500"; text = "text-white"; }

                            return (
                                <div key={i} className={`${bg} ${text} w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-transform hover:scale-110`}>
                                    {display}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 text-white/60 font-bold text-xs whitespace-nowrap">
                        <span className="text-white">= {overRuns}</span>
                        <span className="h-4 w-[1px] bg-white/20"></span>
                        <span>Ovr {Math.ceil(match.balls / 6)}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderBallHistory = () => {
        const historyData = (viewInnings === 1 && match.firstInningsData) ? match.firstInningsData.ballHistory : match.ballHistory;
        const history = historyData || [];
        const overs = [];
        let currentOver = [];
        let legalBallCount = 0;

        history.forEach((ball) => {
            currentOver.push(ball);
            const isWide = typeof ball === 'string' && ball.startsWith('Wd');
            const isNoBall = typeof ball === 'string' && ball.startsWith('NB');
            
            if (!isWide && !isNoBall) {
                legalBallCount++;
                if (legalBallCount === 6) {
                    overs.push(currentOver);
                    currentOver = [];
                    legalBallCount = 0;
                }
            }
        });

        if (currentOver.length > 0) {
            overs.push(currentOver);
        }

        if (overs.length === 0) return null;

        return (
            <div className="mt-8 px-4 no-print">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Over History</h3>
                <div className="space-y-3">
                    {overs.slice().reverse().map((over, i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
                            <div className="flex flex-col items-start min-w-[60px]">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Over</span>
                                <span className="text-lg font-black text-slate-900">{overs.length - i}</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                {over.map((ball, bj) => {
                                    let bg = "bg-stone-50";
                                    let text = "text-slate-900";
                                    let display = ball;

                                    if (ball === 0) display = "•";
                                    if (ball === 4) { bg = "bg-emerald-500"; text = "text-white"; }
                                    if (ball === 6) { bg = "bg-emerald-600"; text = "text-white shadow-lg shadow-emerald-500/20"; }
                                    if (typeof ball === 'string' && ball.startsWith('W')) { bg = "bg-rose-600"; text = "text-white"; display = "W"; }
                                    if (typeof ball === 'string' && (ball.startsWith('Wd') || ball.startsWith('NB'))) { bg = "bg-amber-500"; text = "text-white"; }

                                    return (
                                        <div key={bj} className={`${bg} ${text} w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 border border-white/20`}>
                                            {display}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderSquads = () => {
        return (
            <div className="space-y-8 mt-8 px-2">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="bg-purple-900 p-4 text-white">
                            <h3 className="font-black uppercase tracking-widest text-sm">{match.teamA.name}</h3>
                        </div>
                        <div className="p-4 space-y-2">
                            {match.teamA.players.map((p, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                    <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xs">{i+1}</div>
                                    <span className="font-bold text-slate-700">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="bg-emerald-900 p-4 text-white">
                            <h3 className="font-black uppercase tracking-widest text-sm">{match.teamB.name}</h3>
                        </div>
                        <div className="p-4 space-y-2">
                            {match.teamB.players.map((p, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs">{i+1}</div>
                                    <span className="font-bold text-slate-700">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPinnedScore = () => {
        if (!pinnedIPL) return null;
        return (
            <div className="fixed bottom-6 right-6 z-[100] no-print animate-in slide-in-from-right duration-500">
                <div className="bg-[#1a1a1a] text-white p-4 rounded-3xl shadow-2xl border border-white/10 w-56 relative group">
                    <button 
                        onClick={() => { setPinnedIPL(null); localStorage.removeItem('pinnedIPLMatch'); }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[8px] font-black tracking-widest text-white/40 uppercase">IPL Live</span>
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black italic">{pinnedIPL.teamA}</span>
                            <span className="text-xs font-black text-white/50">{pinnedIPL.scoreA}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black italic">{pinnedIPL.teamB}</span>
                            <span className="text-xs font-black">{pinnedIPL.scoreB}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCrazyQuestions = () => {
        const polls = match.polls || [];
        return (
            <div className="space-y-6 mt-8">
                {polls.length === 0 ? (
                    <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-[2.5rem] p-20 text-center">
                        <span className="text-6xl mb-4 block">🤫</span>
                        <p className="text-white/40 font-bold italic">No crazy questions yet. Admin is thinking...</p>
                    </div>
                ) : (
                    polls.slice().reverse().map((poll, pIdx) => {
                        const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
                        return (
                            <div key={pIdx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500">
                                <h3 className="text-xl font-black italic text-white mb-6">"{poll.question}"</h3>
                                <div className="space-y-4">
                                    {poll.options.map((opt, oIdx) => {
                                        const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                        return (
                                            <button 
                                                key={oIdx}
                                                onClick={() => handleVote(polls.length - 1 - pIdx, oIdx)}
                                                className="w-full relative group overflow-hidden rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left"
                                            >
                                                <div 
                                                    className="absolute inset-y-0 left-0 bg-emerald-500/20 transition-all duration-1000" 
                                                    style={{ width: `${pct}%` }}
                                                ></div>
                                                <div className="relative p-4 flex justify-between items-center">
                                                    <span className="font-bold text-white group-hover:translate-x-1 transition-transform">{opt.text}</span>
                                                    <span className="text-emerald-400 font-black">{pct}%</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="mt-4 text-[10px] font-black text-white/20 uppercase tracking-widest">{totalVotes} Total Votes</p>
                                {/* NEW ADMIN TOOLS */}
                                <div className="grid grid-cols-2 gap-4 mt-6 no-print">
                                    <button 
                                        onClick={() => setTransferModal(true)}
                                        className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/10 transition-all group"
                                    >
                                        <span className="text-xl group-hover:scale-110 transition-transform">👑</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Transfer Access</span>
                                    </button>
                                    <button 
                                        onClick={() => setPollModal(true)}
                                        className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/10 transition-all group"
                                    >
                                        <span className="text-xl group-hover:scale-110 transition-transform">🤔</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Crazy Question</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        );
    };

    const renderFullScorecard = () => {
        let dataToRender = viewInnings === 1 && match.firstInningsData ? match.firstInningsData : match;

            // Combine all batted players + current
            let allBatsmen = [...(dataToRender.batsmanStats || [])];
            if (dataToRender.currentBatsmen?.striker) allBatsmen.push({ ...dataToRender.currentBatsmen.striker, dismissal: 'not out' });
            if (dataToRender.currentBatsmen?.nonStriker) allBatsmen.push({ ...dataToRender.currentBatsmen.nonStriker, dismissal: 'not out' });

            // Yet to bat
            const battedIds = allBatsmen.map(b => b.tid);
            const currentBattingTeam = viewInnings === 1 ? (match.innings === 1 ? match.battingTeam : match.bowlingTeam) : match.battingTeam;
            const yetToBat = currentBattingTeam.players.filter(p => !battedIds.includes(p.tid));

            // Combine all bowlers
            let allBowlers = [...(dataToRender.bowlerStats || [])];
            if (dataToRender.currentBowler && dataToRender.currentBowler.balls > 0) {
                const existing = allBowlers.findIndex(b => b.tid === dataToRender.currentBowler.tid);
                if (existing >= 0) allBowlers[existing] = dataToRender.currentBowler;
                else allBowlers.push(dataToRender.currentBowler);
            }

            const ext = dataToRender.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
            const totalExtras = ext.wides + ext.noBalls + ext.byes + ext.legByes;

            const scorecardContent = (
                <div className="bg-white border border-red-900/10 rounded-3xl overflow-hidden mt-8 shadow-md">
                    {/* Batting Header */}
                    <div className="p-4 border-b border-red-900/10 flex justify-between bg-red-50 items-center">
                        <h3 className="font-black text-sm text-red-600 uppercase tracking-[0.2em]">Batting</h3>
                    </div>

                    {/* Batting Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="text-slate-500 text-[10px] uppercase border-b border-red-900/10 bg-stone-50">
                                    <th className="p-3 font-bold w-1/2">Batter</th>
                                    <th className="p-3 text-right font-black w-10">R</th>
                                    <th className="p-3 text-right font-black w-10">B</th>
                                    <th className="p-3 text-right font-bold w-10">4s</th>
                                    <th className="p-3 text-right font-bold w-10">6s</th>
                                    <th className="p-3 text-right font-bold w-16">SR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-900/10">
                                {allBatsmen.map((b, i) => (
                                    <tr key={i} className="hover:bg-red-50 transition-colors">
                                        <td className="p-3">
                                            <p className={`font-bold ${b.dismissal === 'not out' ? 'text-red-600' : 'text-slate-700'}`}>{b.name}</p>
                                            <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{b.dismissal || 'not out'}</p>
                                        </td>
                                        <td className="p-3 text-right font-black text-slate-900">{b.runs}</td>
                                        <td className="p-3 text-right font-bold text-slate-400">{b.balls}</td>
                                        <td className="p-3 text-right text-slate-400">{b.fours}</td>
                                        <td className="p-3 text-right text-slate-400">{b.sixes}</td>
                                        <td className="p-3 text-right text-slate-400 font-mono">{getStrikeRate(b.runs, b.balls)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Extras & Totals */}
                    <div className="p-4 border-t border-red-900/10 bg-stone-50 flex justify-between items-center">
                        <span className="font-bold text-sm text-slate-500">Extras</span>
                        <span className="font-bold text-sm text-slate-900">{totalExtras} <span className="text-xs font-normal text-slate-500">(W {ext.wides}, NB {ext.noBalls}, B {ext.byes}, LB {ext.legByes})</span></span>
                    </div>
                    <div className="p-4 border-t border-red-900/10 bg-stone-100 flex justify-between items-center">
                        <span className="font-black text-lg text-slate-900">Total</span>
                        <span className="font-black text-lg text-slate-900">{dataToRender.score} <span className="text-xs font-normal text-slate-500">({dataToRender.wickets} wkts, {formatOvers(dataToRender.balls)} ov)</span></span>
                    </div>

                    {/* Yet to Bat */}
                    {yetToBat.length > 0 && (
                        <div className="p-4 border-t border-red-900/10 bg-stone-50">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Yet to bat</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {yetToBat.map(p => p.name).join(' • ')}
                            </p>
                        </div>
                    )}

                    {/* Bowling Header */}
                    <div className="p-4 border-y border-red-900/10 flex justify-between bg-red-50 mt-4 items-center">
                        <h3 className="font-black text-sm text-red-600 uppercase tracking-[0.2em]">Bowling</h3>
                    </div>

                    {/* Bowling Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="text-slate-500 text-[10px] uppercase border-b border-red-900/10 bg-stone-50">
                                    <th className="p-3 font-bold w-1/2">Bowler</th>
                                    <th className="p-3 text-right font-bold w-10">O</th>
                                    <th className="p-3 text-right font-bold w-10">M</th>
                                    <th className="p-3 text-right font-black w-10">R</th>
                                    <th className="p-3 text-right font-black w-10 text-slate-900">W</th>
                                    <th className="p-3 text-right font-bold w-16">Econ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-900/10">
                                {allBowlers.map((b, i) => (
                                    <tr key={i} className="hover:bg-red-50 transition-colors">
                                        <td className="p-3 font-bold text-slate-700">{b.name}</td>
                                        <td className="p-3 text-right text-slate-500">{formatOvers(b.balls)}</td>
                                        <td className="p-3 text-right text-slate-500">{b.maidens || 0}</td>
                                        <td className="p-3 text-right font-black text-slate-900">{b.runs}</td>
                                        <td className="p-3 text-right font-black text-red-600">{b.wickets}</td>
                                        <td className="p-3 text-right text-slate-400 font-mono">{getEcon(b.runs, b.balls)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );

            return (
        <div className="min-h-screen bg-[#FAF4EA] text-slate-900 font-sans flex flex-col items-center p-4 md:p-8">
            <div className="w-full max-w-4xl flex flex-col gap-6">
                
                {/* Top Nav Pill */}
                <div className="bg-white rounded-[2rem] p-2 flex items-center justify-between shadow-xl shadow-red-900/5">
                    <button onClick={() => navigate('/home')} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                        ←
                    </button>
                    <div className="flex-1 flex justify-center gap-2 px-2">
                        <button 
                            onClick={() => setActiveTab('LIVE')}
                            className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'LIVE' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            LIVE
                        </button>
                        <button 
                            onClick={() => setActiveTab('BALL BY BALL')}
                            className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'BALL BY BALL' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            SCORECARD
                        </button>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        👤
                    </div>
                </div>

                <div className="flex-1">
                    {activeTab === 'LIVE' && (
                        <div className="space-y-6">
                            {/* Giant Purple Score Card */}
                            <div className="bg-[#26124B] rounded-[3rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
                                {/* Decorative Blur */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
                                
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl backdrop-blur-sm">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-purple-300 mb-1">Live Match</p>
                                        <p className="text-sm font-black uppercase italic">{dataToRender.battingTeam?.name || 'Team'}, {dataToRender.innings || 1}{dataToRender.innings === 1 ? 'st' : 'nd'} inn</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-1">Overs</p>
                                        <p className="text-2xl font-black italic">{formatOvers(dataToRender.balls)} <span className="text-sm text-purple-300">/ {match.overs}</span></p>
                                    </div>
                                </div>

                                <div className="text-center my-12 relative z-10">
                                    <h1 className="text-8xl md:text-9xl font-black italic tracking-tighter flex items-end justify-center gap-2">
                                        {dataToRender.score} <span className="text-4xl md:text-6xl text-purple-300">/{dataToRender.wickets}</span>
                                    </h1>
                                    <div className="inline-flex mt-6 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                        <span className="text-xs font-black uppercase tracking-widest text-purple-200">CRR: {getEcon(dataToRender.score, dataToRender.balls)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tables & Admin Controls */}
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Batting/Bowling */}
                                <div className="flex-[2] bg-white rounded-[2.5rem] p-6 shadow-xl shadow-red-900/5 border border-slate-100 overflow-x-auto">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Current Action</h3>
                                    <table className="w-full text-xs font-bold text-left mb-6">
                                        <thead className="text-[8px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                            <tr>
                                                <th className="pb-2">Batter</th>
                                                <th className="pb-2 text-center">R</th>
                                                <th className="pb-2 text-center">B</th>
                                                <th className="pb-2 text-center">4s</th>
                                                <th className="pb-2 text-center">6s</th>
                                                <th className="pb-2 text-center">SR</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {match.currentBatsmen?.striker && (
                                                <tr>
                                                    <td className="py-3 text-slate-900 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>{match.currentBatsmen.striker.name}</td>
                                                    <td className="py-3 text-center">{match.currentBatsmen.striker.runs}</td>
                                                    <td className="py-3 text-center text-slate-400">{match.currentBatsmen.striker.balls}</td>
                                                    <td className="py-3 text-center text-slate-400">{match.currentBatsmen.striker.fours}</td>
                                                    <td className="py-3 text-center text-slate-400">{match.currentBatsmen.striker.sixes}</td>
                                                    <td className="py-3 text-center text-slate-400">{getStrikeRate(match.currentBatsmen.striker.runs, match.currentBatsmen.striker.balls)}</td>
                                                </tr>
                                            )}
                                            {match.currentBatsmen?.nonStriker && (
                                                <tr>
                                                    <td className="py-3 text-slate-500">{match.currentBatsmen.nonStriker.name}</td>
                                                    <td className="py-3 text-center">{match.currentBatsmen.nonStriker.runs}</td>
                                                    <td className="py-3 text-center text-slate-300">{match.currentBatsmen.nonStriker.balls}</td>
                                                    <td className="py-3 text-center text-slate-300">{match.currentBatsmen.nonStriker.fours}</td>
                                                    <td className="py-3 text-center text-slate-300">{match.currentBatsmen.nonStriker.sixes}</td>
                                                    <td className="py-3 text-center text-slate-300">{getStrikeRate(match.currentBatsmen.nonStriker.runs, match.currentBatsmen.nonStriker.balls)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <thead className="text-[8px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                            <tr>
                                                <th className="pt-4 pb-2">Bowler</th>
                                                <th className="pt-4 pb-2 text-center">O</th>
                                                <th className="pt-4 pb-2 text-center">M</th>
                                                <th className="pt-4 pb-2 text-center">R</th>
                                                <th className="pt-4 pb-2 text-center">W</th>
                                                <th className="pt-4 pb-2 text-center">ER</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {match.currentBowler && (
                                                <tr>
                                                    <td className="py-3 text-slate-900">{match.currentBowler.name}</td>
                                                    <td className="py-3 text-center text-slate-400">{formatOvers(match.currentBowler.balls)}</td>
                                                    <td className="py-3 text-center text-slate-400">{match.currentBowler.maidens || 0}</td>
                                                    <td className="py-3 text-center text-slate-400">{match.currentBowler.runs}</td>
                                                    <td className="py-3 text-center text-red-600">{match.currentBowler.wickets}</td>
                                                    <td className="py-3 text-center text-slate-400">{getEcon(match.currentBowler.runs, match.currentBowler.balls)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Admin Controls (Now beside table) */}
                                {isAdmin && !match.isCompleted && !activeModal && viewInnings === match.innings ? (
                                    <div className="flex-[1.5] bg-white rounded-[2.5rem] p-6 shadow-xl shadow-red-900/5 border border-slate-100 flex flex-col justify-between min-w-[320px]">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Controls</h4>
                                            <div className="flex gap-2">
                                                <button onClick={handleUndo} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">⎌ Undo</button>
                                                <button onClick={() => { rotateStrike(match); syncMatch(match); }} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">⇄ Swap</button>
                                                <button onClick={() => setActiveModal('BOWLER')} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">⏏ Over</button>
                                            </div>
                                        </div>
                                        
                                        {/* Run Buttons Row */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {[0, 1, 2, 3, 4, 6].map(r => (
                                                <button key={r} onClick={() => handleRun(r)} className="flex-1 min-w-[2.5rem] py-4 bg-white border-2 border-slate-100 rounded-xl text-lg font-black text-slate-900 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
                                                    {r}
                                                </button>
                                            ))}
                                            <button onClick={() => handleRun(5)} className="flex-1 min-w-[2.5rem] py-4 bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-slate-400 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all shadow-sm">5</button>
                                            <button onClick={() => handleRun(7)} className="flex-1 min-w-[2.5rem] py-4 bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-slate-400 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all shadow-sm">7</button>
                                        </div>
                                        
                                        {/* Extras & Wicket Row */}
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => setActiveModal('WIDE')} className="flex-1 min-w-[4rem] py-3 bg-orange-50 border-2 border-orange-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-orange-600 hover:bg-orange-100 active:scale-95 transition-all">Wide</button>
                                            <button onClick={() => setActiveModal('NOBALL')} className="flex-1 min-w-[4rem] py-3 bg-orange-50 border-2 border-orange-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-orange-600 hover:bg-orange-100 active:scale-95 transition-all">NB</button>
                                            <button onClick={() => setActiveModal('NOBALL')} className="flex-1 min-w-[3rem] py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-stone-100 active:scale-95 transition-all">Bye</button>
                                            <button onClick={() => setActiveModal('NOBALL')} className="flex-1 min-w-[3rem] py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-stone-100 active:scale-95 transition-all">LB</button>
                                            <button onClick={() => setActiveModal('WICKET')} className="w-full mt-2 py-4 bg-red-600 rounded-xl text-sm font-black uppercase tracking-widest text-white hover:bg-red-700 shadow-lg shadow-red-600/30 active:scale-95 transition-all">Wicket</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-[1] bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-slate-300 min-h-[300px]">
                                        <p className="text-xs font-black uppercase tracking-widest">Waiting for Admin</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'BALL BY BALL' && (
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-red-900/5 mt-6">
                            {renderBallHistory()}
                        </div>
                    )}
                </div>
            </div>

            {/* This Over Fixed Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-slate-100 p-4 rounded-t-[2.5rem] z-40">
                <div className="max-w-4xl mx-auto flex items-center gap-6 overflow-x-auto no-scrollbar">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap hidden md:block">This Over</h4>
                    <div className="flex gap-2 min-w-max">
                        {(()=>{
                            const historyData = (viewInnings === 1 && match.firstInningsData) ? match.firstInningsData.ballHistory : match.ballHistory;
                            const history = historyData || [];
                            const ballsInOver = [];
                            let lCount = 0;
                            const targetLegalBalls = match.balls % 6 === 0 && match.balls > 0 ? 6 : match.balls % 6;
                            for (let i = history.length - 1; i >= 0; i--) {
                                const ball = history[i];
                                const isWide = typeof ball === 'string' && ball.startsWith('Wd');
                                const isNoBall = typeof ball === 'string' && ball.startsWith('NB');
                                ballsInOver.unshift(ball);
                                if (!isWide && !isNoBall) lCount++;
                                if (lCount === targetLegalBalls) break;
                            }
                            if (ballsInOver.length === 0) return <div className="text-xs text-slate-300 italic font-bold">No balls bowled in this over yet.</div>;
                            return ballsInOver.map((b, i) => {
                                let bg = "bg-stone-50 text-slate-600 border-slate-200";
                                let txt = b === 0 ? '0' : b;
                                if (b === 4 || b === 6) bg = "bg-green-100 text-green-700 border-green-200";
                                if (typeof b === 'string' && b.startsWith('W(')) { bg = "bg-red-100 text-red-600 border-red-200"; txt = "W"; }
                                if (typeof b === 'string' && b === 'W') { bg = "bg-red-100 text-red-600 border-red-200"; txt = "W"; }
                                if (typeof b === 'string' && (b.startsWith('NB') || b.startsWith('Wd'))) { bg = "bg-orange-100 text-orange-600 border-orange-200"; txt = b.replace('+', ' '); }
                                return (
                                    <div key={i} className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black border shadow-sm shrink-0 ${bg}`}>
                                        {txt}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            {/* Modals from old code (restyled slightly for light theme) */}
            {activeModal === 'MATCH_OVER' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-center">
                        <h2 className="text-4xl font-black italic text-slate-900 mb-6 uppercase">Match Over</h2>
                        <button onClick={() => navigate('/home')} className="w-full p-5 bg-red-600 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all">Back To Home</button>
                    </div>
                </div>
            )}
            {activeModal === 'INNINGS_BREAK' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-center">
                        <h2 className="text-4xl font-black italic text-slate-900 mb-6 uppercase">Innings Complete</h2>
                        <button onClick={startSecondInnings} className="w-full p-5 bg-red-600 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all">Start 2nd Innings</button>
                    </div>
                </div>
            )}
            {activeModal === 'WIDE' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-sm text-center">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Wide Ball Extras</h2>
                        <div className="flex gap-2 justify-center mb-8">
                            {[0, 1, 2, 3, 4].map(r => (
                                <button key={r} onClick={() => handleWideSubmit(r)} className="w-14 h-14 rounded-2xl border-2 border-slate-100 hover:border-red-600 hover:bg-red-50 hover:text-red-600 text-slate-900 font-black text-xl active:scale-90 transition-all">{r}</button>
                            ))}
                        </div>
                        <button onClick={() => setActiveModal(null)} className="w-full p-4 rounded-2xl bg-stone-100 text-slate-400 font-black uppercase tracking-widest text-xs">Cancel</button>
                    </div>
                </div>
            )}
            {activeModal === 'NOBALL' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-sm text-center">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6">No Ball / Bye Extras</h2>
                        <div className="flex gap-2 justify-center mb-8">
                            {[0, 1, 2, 3, 4, 6].map(r => (
                                <button key={r} onClick={() => handleNoBallSubmit(r, 'Bat')} className="w-12 h-12 rounded-2xl border-2 border-slate-100 hover:border-red-600 hover:bg-red-50 hover:text-red-600 text-slate-900 font-black text-lg active:scale-90 transition-all">{r}</button>
                            ))}
                        </div>
                        <button onClick={() => setActiveModal(null)} className="w-full p-4 rounded-2xl bg-stone-100 text-slate-400 font-black uppercase tracking-widest text-xs">Cancel</button>
                    </div>
                </div>
            )}
            {activeModal === 'WICKET' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-md text-center max-h-[90vh] overflow-y-auto">
                        <h2 className="text-3xl font-black italic text-red-600 uppercase mb-8">Wicket</h2>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Retired'].map(type => (
                                <button key={type} onClick={() => setWicketData({...wicketData, type, runs: 0, fielder: null})} className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${wicketData.type === type ? 'border-red-600 bg-red-600 text-white shadow-lg' : 'border-slate-100 text-slate-500 hover:border-red-200'}`}>{type}</button>
                            ))}
                        </div>
                        {['Caught', 'Stumped', 'Run Out'].includes(wicketData.type) && (
                            <div className="mb-6 bg-stone-50 p-4 rounded-2xl">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Select Fielder</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {match.bowlingTeam.players.map(p => (
                                        <button key={p.tid} onClick={() => setWicketData({...wicketData, fielder: p})} className={`p-3 rounded-xl border-2 text-xs font-black transition-all ${wicketData.fielder?.tid === p.tid ? 'border-red-600 bg-red-50 text-red-600' : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'}`}>{p.name}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {wicketData.type === 'Run Out' && (
                            <div className="mb-6 bg-stone-50 p-4 rounded-2xl">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Runs Completed</label>
                                <div className="flex gap-2 justify-center">
                                    {[0, 1, 2, 3].map(r => (
                                        <button key={r} onClick={() => setWicketData({...wicketData, runs: r})} className={`w-12 h-12 rounded-xl border-2 text-lg font-black transition-all ${wicketData.runs === r ? 'border-red-600 bg-red-50 text-red-600' : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'}`}>{r}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!isLastWicket && (
                            <div className="mb-8">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Next Batsman</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {match.battingTeam.players.filter(p => p.tid !== match.currentBatsmen.striker?.tid && p.tid !== match.currentBatsmen.nonStriker?.tid && !(match.batsmanStats || []).some(s => s.tid === p.tid)).map(p => (
                                        <button key={p.tid} onClick={() => setWicketData({...wicketData, nextBatsman: p})} className={`p-3 rounded-xl border-2 text-xs font-black transition-all ${wicketData.nextBatsman?.tid === p.tid ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'}`}>{p.name}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setActiveModal(null)} className="flex-1 p-4 rounded-2xl bg-stone-100 text-slate-400 font-black uppercase tracking-widest text-xs">Cancel</button>
                            <button onClick={handleWicketSubmit} className="flex-1 p-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest shadow-xl shadow-red-600/30">Confirm Out</button>
                        </div>
                    </div>
                </div>
            )}
            {activeModal === 'BOWLER' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-md text-center max-h-[80vh] overflow-y-auto">
                        <h2 className="text-2xl font-black italic text-slate-900 uppercase mb-8">Select Bowler</h2>
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            {match.bowlingTeam.players.map(p => (
                                <button key={p.tid} onClick={() => {if (match.currentBowler?.tid !== p.tid) setSelectedBowler(p)}} className={`p-4 rounded-2xl border-2 text-xs font-black transition-all ${selectedBowler?.tid === p.tid ? 'border-red-600 bg-red-50 text-red-600' : (match.currentBowler?.tid === p.tid ? 'border-slate-100 text-slate-300 bg-stone-50' : 'border-slate-200 text-slate-600 hover:border-slate-300')}`}>{p.name}</button>
                            ))}
                        </div>
                        <button onClick={handleBowlerSubmit} disabled={!selectedBowler} className="w-full p-5 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest shadow-xl shadow-red-600/30 disabled:opacity-50">Start Over</button>
                    </div>
                </div>
            )}

            {/* Give some padding at the bottom so the fixed admin controls don't overlap content */}
            <div className="h-64 md:h-48 w-full shrink-0"></div>
        </div>
    );
    };

    return (
        <div className="font-sans">
            {renderFullScorecard()}
        </div>
    );
};

export default MatchDashboard;