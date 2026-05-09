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

            const mode = localStorage.getItem('commentaryMode') || 'AI';
            if (mode !== 'AI') return; // Skip AI Voice if Dialogues are active

            // 🔊 VOICE FEATURE: Speak the commentary
            if ('speechSynthesis' in window) {
                const speech = new SpeechSynthesisUtterance(data.text);
                speech.rate = 1.15; // Slightly faster for excitement
                speech.pitch = 1.1;

                // Try to find a good voice
                const voices = window.speechSynthesis.getVoices();
                // Prefer Indian, UK Male, or energetic voices
                const preferredVoices = ['Google UK English Male', 'Daniel', 'Rishi', 'Alex', 'Samantha'];
                let selectedVoice = voices.find(v => preferredVoices.includes(v.name));
                if (!selectedVoice) {
                    selectedVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-IN'));
                }
                if (selectedVoice) {
                    speech.voice = selectedVoice;
                }

                // Removed .cancel() as it causes silent failures on macOS Safari/Chrome
                window.speechSynthesis.speak(speech);
            }

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

    const isLastWicket = match.wickets >= match.battingTeam.players.length - 2;

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
        const isAllOut = newMatch.wickets >= teamSize - 1;
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
        if (!isLastWicket && !wicketData.nextBatsman && wicketData.type !== 'AllOut') {
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
            newMatch.currentBatsmen.striker = {
                ...wicketData.nextBatsman,
                runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out'
            };
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
                <div className="min-h-screen bg-[#FAF4EA] text-slate-900 p-4 md:p-8 font-sans pb-40">
                {/* PREMIUM TOAST NOTIFICATION */}
                {toast && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top duration-300">
                        <div className={`px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${
                            toast.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : 
                            toast.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : 
                            'bg-emerald-500/90 border-emerald-400 text-white'
                        }`}>
                            <span className="text-lg">
                                {toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✅'}
                            </span>
                            <span className="font-black italic uppercase tracking-tight text-sm">{toast.message}</span>
                        </div>
                    </div>
                )}

                {/* SPECIAL FUNNY EVENTS OVERLAY */}
                {specialEvent && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none overflow-hidden">
                        {specialEvent === 'SIX' && (
                            <div className="animate-in zoom-in duration-500 flex flex-col items-center">
                                <h1 className="text-9xl font-black italic text-emerald-500 drop-shadow-[0_0_50px_rgba(16,185,129,0.8)] animate-bounce">SIXER!</h1>
                                <p className="bg-white/10 backdrop-blur-md px-8 py-2 rounded-full text-white font-bold tracking-widest mt-4">OUT OF THE TURF! 🔥</p>
                            </div>
                        )}
                        {specialEvent === 'DUCK' && (
                            <div className="animate-in slide-in-from-top-10 duration-500 flex flex-col items-center">
                                <span className="text-[12rem] animate-bounce">🦆</span>
                                <h1 className="text-6xl font-black italic text-rose-500 bg-white/90 px-10 py-4 rounded-[3rem] shadow-2xl -mt-10 border-4 border-rose-100">QUACK!</h1>
                                <p className="text-white font-black uppercase tracking-[0.5em] mt-4 drop-shadow-lg">A Golden Duck!</p>
                            </div>
                        )}
                        {specialEvent === 'THALA' && (
                            <div className="animate-in fade-in zoom-in duration-700 flex flex-col items-center">
                                <h1 className="text-8xl font-black italic text-yellow-400 drop-shadow-[0_0_40px_rgba(250,204,21,0.6)]">7</h1>
                                <p className="bg-yellow-400 text-slate-900 px-6 py-2 rounded-full font-black tracking-widest -mt-4 rotate-3 shadow-xl">THALA FOR A REASON</p>
                            </div>
                        )}
                        
                        {/* Confetti Animation (Simulated with random particles if SIX or WIN) */}
                        {(specialEvent === 'SIX' || match.isCompleted) && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                {[...Array(20)].map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`absolute w-3 h-3 rounded-sm animate-ping`}
                                        style={{ 
                                            left: `${Math.random() * 100}%`, 
                                            top: `${Math.random() * 100}%`, 
                                            backgroundColor: ['#ef4444', '#10b981', '#3b82f6', '#eab308'][Math.floor(Math.random() * 4)],
                                            animationDelay: `${Math.random() * 2}s`
                                        }}
                                    ></div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* LIVE COMMENTARY OVERLAY */}
                {commentary && commentaryMode === 'AI' && (
                    <div className="fixed top-24 left-6 right-6 z-[100] animate-bounce max-w-4xl mx-auto no-print">
                        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)] border-2 border-red-900/10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span> Live Commentary 🎙️
                            </p>
                            <p className="font-black italic text-lg leading-tight">"{commentary}"</p>
                        </div>
                    </div>
                )}

                {/* Top Download Button for Viewers/Admins if match complete */}
                {match.isCompleted && (
                    <div className="max-w-4xl mx-auto flex justify-end mb-4 no-print">
                        <button
                            onClick={downloadReport}
                            className="bg-red-50 border border-red-600 text-red-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Report
                        </button>
                    </div>
                )}

                {/* Content to be screenshot */}
                <div ref={scorecardRef} className="max-w-4xl mx-auto bg-stone-50 p-2 rounded-3xl relative">
                    
                    {/* TOP NAVIGATION TABS */}
                    <div className="flex gap-2 p-2 bg-stone-100 rounded-3xl mb-6 no-print items-center">
                        <div className="flex-1 flex gap-1 p-1 bg-white rounded-2xl border border-slate-200">
                             {['LIVE', 'SCORECARD', 'CRAZY QUESTIONS'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tab === 'CRAZY QUESTIONS' ? 'Questions' : tab}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => {
                                const newVal = !soundMuted;
                                setSoundMuted(newVal);
                                localStorage.setItem('soundMuted', newVal);
                            }}
                            className={`p-3 rounded-2xl transition-all ${soundMuted ? 'bg-slate-200 text-slate-400 opacity-50' : 'bg-white text-red-600 shadow-xl border border-red-100'}`}
                        >
                            {soundMuted ? '🔇' : '🔊'}
                        </button>
                    </div>

                    {/* BACK BUTTON */}
                    <button 
                        onClick={() => navigate('/home')} 
                        className="absolute top-6 left-6 z-50 p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl transition-all no-print"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>

                    {/* HEADER WIDGET */}
                    <div className="bg-[#2e1065] rounded-[2.5rem] p-8 shadow-2xl text-white mb-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full -ml-16 -mb-16 blur-3xl"></div>

                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-200">Live Match</span>
                                    <h2 className="font-black italic text-xl mt-1">{match.battingTeam.name}</h2>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-200">Overs</span>
                                <p className="text-2xl font-black italic">{formatOvers(match.balls)}<span className="text-sm font-bold opacity-50 ml-1">/ {match.overs}</span></p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-6 relative z-10">
                            <div className="flex items-baseline gap-1">
                                <h1 className="text-8xl md:text-9xl font-black italic tracking-tighter leading-none">{match.score}</h1>
                                <span className="text-4xl md:text-5xl font-black text-white/30 italic">/{match.wickets}</span>
                            </div>
                            <div className="mt-4 bg-white/10 px-6 py-2 rounded-full backdrop-blur-md border border-white/5">
                                <p className="text-sm font-black tracking-widest uppercase text-purple-100 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                    CRR: {getEcon(match.score, match.balls)}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
                            {/* Win Probability */}
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-200/50 mb-2">AI Win Probability</p>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-black italic">{match.battingTeam.name}</span>
                                    <span className="text-xs font-black text-emerald-400">{winProb}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                                        style={{ width: `${winProb}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Momentum Meter */}
                            <div className={`bg-white/5 backdrop-blur-md rounded-2xl p-4 border transition-all duration-500 ${momentumPulse ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105' : 'border-white/10'}`}>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-200/50 mb-2">Momentum Meter</p>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[8px] font-black text-white/40 italic">BOWLING</span>
                                    {momentumPulse && <span className="text-[8px] font-black text-emerald-400 animate-pulse italic">ON FIRE 🔥</span>}
                                    <span className="text-[8px] font-black text-white/40 italic">BATTING</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
                                    <div 
                                        className={`h-full transition-all duration-700 ease-out ${momentum > 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                        style={{ width: `${momentum}%`, marginLeft: momentum > 50 ? '50%' : `${momentum}%`, transform: momentum > 50 ? 'none' : 'translateX(-100%)' }}
                                    ></div>
                                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 z-10"></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-purple-300/60 relative z-10">
                            <span>{match.teamA.name}</span>
                            <div className="flex-1 mx-4 h-[2px] bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-400" style={{ width: `${Math.min(100, (match.score / (match.target || (match.overs * 10)) * 100))}%` }}></div>
                            </div>
                            <span>{match.teamB.name}</span>
                        </div>
                    </div>


                    {/* Tab Content */}
                    {activeTab === 'LIVE' && (
                        <div className="space-y-6">
                            {/* Current Over Widget */}
                            {renderCurrentOverWidget()}
                            
                            {/* Innings Toggle */}
                            {(match.innings === 2 || match.firstInningsData) && (
                                <div className="flex bg-white border border-slate-200 p-1 rounded-2xl no-print">
                                    <button
                                        onClick={() => setViewInnings(1)}
                                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewInnings === 1 ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-red-600'}`}
                                    >
                                        1st Innings
                                    </button>
                                    <button
                                        onClick={() => setViewInnings(2)}
                                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${viewInnings === 2 ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-red-600'}`}
                                    >
                                        2nd Innings
                                    </button>
                                </div>
                            )}

                            {/* PLAYER WIDGETS ARE BELOW THIS IN THE CODE */}
                        </div>
                    )}

                    {activeTab === 'SCORECARD' && scorecardContent}

                    {activeTab === 'CRAZY QUESTIONS' && (
                        <div id="crazy-questions-section" className="mt-8 mb-20 px-2">
                             <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Crazy <span className="text-red-600">Questions</span></h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Match Engagement Arena</p>
                                </div>
                                {isAdmin && (
                                    <button 
                                        onClick={() => setPollModal(true)}
                                        className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg"
                                    >
                                        <span>➕</span> Post Question
                                    </button>
                                )}
                            </div>

                            <div className="space-y-6">
                                {!match.polls || match.polls.length === 0 ? (
                                    <div className="bg-white border border-dashed border-slate-200 p-12 rounded-[2.5rem] text-center">
                                        <span className="text-4xl mb-4 block opacity-30">🤔</span>
                                        <p className="text-slate-400 font-bold text-sm italic">No active questions. {isAdmin ? "Start one now!" : "Waiting for the admin..."}</p>
                                    </div>
                                ) : (
                                    [...match.polls].reverse().map((poll, pIdx) => {
                                        const actualIdx = match.polls.length - 1 - pIdx;
                                        const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                                        
                                        return (
                                            <div key={actualIdx} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-red-900/5 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                                                <h4 className="text-xl font-black italic text-slate-900 mb-6 leading-tight">"{poll.question}"</h4>
                                                
                                                <div className="space-y-3">
                                                    {poll.options.map((opt, oIdx) => {
                                                        const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                                        return (
                                                            <button 
                                                                key={oIdx}
                                                                onClick={() => handleVote(actualIdx, oIdx)}
                                                                className="w-full relative h-16 bg-stone-50 rounded-2xl border border-slate-100 overflow-hidden group hover:border-red-200 transition-all text-left"
                                                            >
                                                                <div 
                                                                    className="absolute inset-0 bg-red-600/5 transition-all duration-1000"
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                                <div className="absolute inset-0 px-5 flex items-center justify-between z-10">
                                                                    <span className="font-bold text-slate-700 uppercase italic text-xs">{opt.text}</span>
                                                                    <span className="font-black text-red-600 text-sm">{percent}%</span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <p className="mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">{totalVotes} Fans Voted</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'SQUADS' && (
                        <div className="bg-white p-12 rounded-[2.5rem] text-center border border-dashed border-slate-200">
                             <span className="text-4xl mb-4 block opacity-30">👥</span>
                             <p className="text-slate-400 font-bold text-sm italic">Squad lineups are currently being updated.</p>
                        </div>
                    )}

                {/* Pinned IPL Score */}
                {renderPinnedScore()}

                {/* HOST CONTROL PANEL */}
                {isAdmin && !match.isCompleted && !activeModal && viewInnings === match.innings && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-red-900/10 p-4 md:p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-40 no-print">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Admin Controls</span>
                                {history.length > 0 && (
                                    <button onClick={handleUndo} className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 flex items-center gap-1 hover:underline">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                        Undo Last Ball
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2 md:gap-4 mb-4">
                                {[0, 1, 2, 3, 4, 6].map(run => (
                                    <button key={run} onClick={() => handleRun(run)} className="flex-1 h-14 bg-stone-50 border border-red-900/10 rounded-2xl text-xl font-black hover:bg-red-600 hover:text-white text-slate-900 transition-all">
                                        {run}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 md:gap-4">
                                <button onClick={() => setActiveModal('WIDE')} className="flex-1 h-14 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-2xl font-black">WIDE</button>
                                <button onClick={() => setActiveModal('NOBALL')} className="flex-1 h-14 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-2xl font-black">NO BALL</button>
                                <button onClick={() => setActiveModal('WICKET')} className="flex-[2] h-14 bg-red-500 text-white rounded-2xl font-black italic uppercase tracking-widest shadow-lg shadow-red-500/20">WICKET</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODALS (Admin Only) */}
                {activeModal === 'INNINGS_BREAK' && (
                    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
                        <div className="bg-white border border-red-900/10 p-8 rounded-3xl w-full max-w-md text-center shadow-2xl">
                            <h2 className="text-3xl font-black italic text-red-600 mb-2">INNINGS COMPLETE!</h2>
                            <p className="text-sm text-slate-500 mb-6">The first innings has concluded.</p>
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 text-red-600">
                                <p className="text-xs uppercase font-bold tracking-widest mb-1">Target to Win</p>
                                <h3 className="text-5xl font-black italic">{match.score + 1}</h3>
                            </div>
                            <button onClick={startSecondInnings} className="w-full p-5 rounded-xl font-black text-white bg-red-600 shadow-xl shadow-red-600/30 tracking-widest transition-all hover:scale-105">SET UP 2ND INNINGS</button>
                        </div>
                    </div>
                )}

                {activeModal === 'MATCH_OVER' && (
                    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
                        <div className="bg-white border border-red-900/10 p-8 rounded-3xl w-full max-w-md text-center shadow-2xl">
                            <h2 className="text-4xl font-black italic text-red-600 mb-2">MATCH OVER!</h2>
                            <div className="my-8">
                                <p className="text-lg font-bold text-slate-600">Target was {match.target}</p>
                                <h3 className="text-3xl font-black text-slate-900 mt-2 uppercase italic">{match.result}</h3>
                            </div>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => setShowSummary(true)}
                                    className="w-full p-5 rounded-xl font-black text-white bg-slate-900 shadow-xl tracking-widest transition-all hover:scale-105 flex items-center justify-center gap-3"
                                >
                                    <span>📊</span> VIEW MATCH SUMMARY
                                </button>
                                <button 
                                    onClick={() => navigate('/home')} 
                                    className="w-full p-5 rounded-xl font-black text-slate-400 bg-stone-100 tracking-widest transition-all hover:bg-stone-200"
                                >
                                    BACK TO HOME
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeModal === 'WIDE' && (
                    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
                        <div className="bg-white border border-red-900/10 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl">
                            <h2 className="text-2xl font-black italic text-orange-600 mb-6">WIDE BALL</h2>
                            <p className="text-sm text-slate-500 mb-4">Any extra runs completed?</p>
                            <div className="flex gap-2 justify-center mb-8">
                                {[0, 1, 2, 3, 4].map(r => (
                                    <button key={r} onClick={() => setTempValue(r)} className={`w-12 h-12 rounded-xl font-bold border-2 ${tempValue === r ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-red-900/10 text-slate-700'}`}>{r}</button>
                                ))}
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setActiveModal(null)} className="flex-1 p-4 rounded-xl font-bold bg-stone-100 text-slate-700">Cancel</button>
                                <button onClick={() => handleWideSubmit(tempValue)} className="flex-1 p-4 rounded-xl font-black bg-orange-500 text-white">Confirm</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeModal === 'NOBALL' && (
                    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
                        <div className="bg-white border border-red-900/10 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl">
                            <h2 className="text-2xl font-black italic text-orange-600 mb-6">NO BALL</h2>
                            <div className="flex gap-2 justify-center mb-6">
                                <button onClick={() => setTempType('Bat')} className={`flex-1 py-3 rounded-xl border-2 font-bold ${tempType === 'Bat' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-red-900/10 text-slate-700'}`}>Off Bat</button>
                                <button onClick={() => setTempType('Bye')} className={`flex-1 py-3 rounded-xl border-2 font-bold ${tempType === 'Bye' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-red-900/10 text-slate-700'}`}>Byes</button>
                            </div>
                            <p className="text-sm text-slate-500 mb-4">Runs scored?</p>
                            <div className="flex gap-2 justify-center mb-8">
                                {[0, 1, 2, 3, 4, 6].map(r => (
                                    <button key={r} onClick={() => setTempValue(r)} className={`w-10 h-10 rounded-lg font-bold border-2 ${tempValue === r ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-red-900/10 text-slate-700'}`}>{r}</button>
                                ))}
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setActiveModal(null)} className="flex-1 p-4 rounded-xl font-bold bg-stone-100 text-slate-700">Cancel</button>
                                <button onClick={() => handleNoBallSubmit(tempValue, tempType)} className="flex-1 p-4 rounded-xl font-black bg-orange-500 text-white">Confirm</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeModal === 'WICKET' && (
                    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
                        <div className="bg-white border border-red-900/10 p-6 md:p-8 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                            <h2 className="text-3xl font-black italic text-red-600 mb-6 text-center tracking-widest">WICKET</h2>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
                                {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Retired'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setWicketData({ ...wicketData, type })}
                                        className={`py-2 rounded-lg text-sm font-bold border-2 ${wicketData.type === type ? 'border-red-600 bg-red-50 text-red-600' : 'border-red-900/10 text-slate-700'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {['Caught', 'Stumped', 'Run Out'].includes(wicketData.type) && (
                                <div className="mb-6">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Select Fielder</label>
                                    <div className="grid grid-cols-2 gap-2 mt-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                        {match.bowlingTeam.players.map(p => (
                                            <button
                                                key={p.tid}
                                                onClick={() => setWicketData({ ...wicketData, fielder: p })}
                                                className={`py-2 px-3 rounded-lg text-xs font-bold border-2 transition-all ${wicketData.fielder?.tid === p.tid ? 'border-red-600 bg-red-50 text-red-600' : 'border-red-900/10 text-slate-700 hover:border-red-600/30'}`}
                                            >
                                                {p.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {wicketData.type === 'Run Out' && (
                                <div className="mb-6">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Runs Completed</label>
                                    <div className="flex gap-2 mt-1">
                                        {[0, 1, 2, 3].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setWicketData({ ...wicketData, runs: r })}
                                                className={`w-12 h-10 rounded-lg font-bold border-2 ${wicketData.runs === r ? 'border-red-600 bg-red-50 text-red-600' : 'border-red-900/10 text-slate-700'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!isLastWicket && (
                                <div className="mb-8">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Next Batsman</label>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        {match.battingTeam.players
                                            .filter(p =>
                                                p.tid !== match.currentBatsmen.striker?.tid &&
                                                p.tid !== match.currentBatsmen.nonStriker?.tid &&
                                                !(match.batsmanStats || []).some(s => s.tid === p.tid)
                                            )
                                            .map(p => (
                                                <button
                                                    key={p.tid}
                                                    onClick={() => setWicketData({ ...wicketData, nextBatsman: p })}
                                                    className={`py-3 rounded-lg font-bold border-2 text-sm ${wicketData.nextBatsman?.tid === p.tid ? 'border-red-600 bg-red-50 text-red-600' : 'border-red-900/10 text-slate-700'}`}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}
                            {isLastWicket && (
                                <div className="mb-8 text-center bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
                                    <p className="font-bold">ALL OUT!</p>
                                    <p className="text-xs">This is the final wicket.</p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button onClick={() => setActiveModal(null)} className="flex-1 p-4 rounded-xl font-bold bg-stone-100 text-slate-700">Cancel</button>
                                <button onClick={handleWicketSubmit} className="flex-1 p-4 rounded-xl font-black bg-red-600 text-white tracking-widest">OUT</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeModal === 'BOWLER' && (
                    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
                        <div className="bg-white border border-red-900/10 p-8 rounded-3xl w-full max-w-md text-center shadow-2xl">
                            <h2 className="text-3xl font-black italic text-red-600 mb-2">OVER COMPLETE!</h2>
                            <p className="text-sm text-slate-500 mb-8">Select the next bowler</p>

                            <div className="grid grid-cols-2 gap-3 mb-8">
                                {match.bowlingTeam.players.map(p => {
                                    const stats = (match.bowlerStats || []).find(b => b.tid === p.tid);
                                    const oversBowled = stats ? stats.overs : 0;
                                    const isMaxed = oversBowled >= maxOversPerBowler;
                                    const isCurrent = match.currentBowler?.tid === p.tid;

                                    return (
                                        <button
                                            key={p.tid}
                                            onClick={() => {
                                                if (isCurrent) return;
                                                setSelectedBowler(p);
                                            }}
                                            className={`py-4 px-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all
                                            ${selectedBowler?.tid === p.tid ? 'border-red-600 bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105' :
                                                    isCurrent ? 'border-red-600/30 bg-red-50 opacity-50 cursor-not-allowed text-slate-500' :
                                                        isMaxed ? 'border-orange-500/30 bg-orange-50 text-orange-600' : 'border-red-900/10 bg-stone-50 hover:border-red-600/50 text-slate-700'}`}
                                        >
                                            <span className="font-bold">{p.name}</span>
                                            <span className={`text-[10px] uppercase font-black tracking-widest mt-1 ${isMaxed ? 'text-orange-500' : 'opacity-60'}`}>
                                                {oversBowled} Overs {isMaxed && '(MAX)'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedBowler && (match.bowlerStats || []).find(b => b.tid === selectedBowler.tid)?.overs >= maxOversPerBowler && (
                                <div className="mb-6 p-3 bg-orange-50 border border-orange-500 text-orange-600 text-xs rounded-xl font-bold">
                                    ⚠️ WARNING: This bowler has reached the ideal limit ({maxOversPerBowler} overs) to ensure everyone bowls. Proceed if necessary.
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button onClick={handleBowlerSubmit} disabled={!selectedBowler} className={`w-full p-4 rounded-xl font-black text-white tracking-widest transition-all ${selectedBowler ? 'bg-red-600 shadow-xl shadow-red-600/30' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}>START NEW OVER</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PREMIUM IPL MATCH SUMMARY MODAL */}
                {showSummary && (
                    <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto no-print">
                        <div className="max-w-3xl w-full">
                            <div className="flex justify-end mb-4">
                                <button onClick={() => setShowSummary(false)} className="text-white/40 hover:text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all">
                                    <span className="text-lg">✕</span> CLOSE SUMMARY
                                </button>
                            </div>
                            
                            {/* BROADCAST CARD */}
                            <div className="bg-gradient-to-b from-stone-400 via-stone-100 to-stone-400 rounded-xl overflow-hidden shadow-[0_0_150px_rgba(255,255,255,0.15)] border-t border-white/50 relative">
                                {/* CARD HEADER */}
                                <div className="bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#1e293b] p-6 text-center border-b-4 border-stone-400">
                                    <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter drop-shadow-lg">Match Summary</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em] mt-2">Turf Score Pro Broadcast Series</p>
                                </div>

                                <div className="p-1.5 space-y-1.5">
                                    {/* INNINGS 1 BLOCK */}
                                    <div className="bg-stone-200/50">
                                        <div className="flex items-center bg-gradient-to-r from-amber-500 to-yellow-400 p-4 border-b-2 border-stone-400">
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-black italic text-slate-900 uppercase leading-none">{match.teamA.name}</h3>
                                                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Innings 1 Completed</span>
                                            </div>
                                            <div className="bg-slate-950 text-white px-8 py-3 rounded-xl shadow-2xl border border-white/10">
                                                <h4 className="text-4xl font-black italic leading-none">{(match.firstInningsData?.score || match.score)}-{(match.firstInningsData?.wickets || match.wickets)}</h4>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-[3px] bg-stone-400">
                                            <div className="bg-stone-50 p-5 space-y-4">
                                                {/* Top 3 Batsmen Innings 1 */}
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-stone-200 pb-2">Leading Batters</p>
                                                {(match.firstInningsData?.batsmanStats || match.batsmanStats || []).sort((a,b) => b.runs - a.runs).slice(0,3).map((b, idx) => (
                                                    <div key={idx} className="flex justify-between items-center group">
                                                        <span className="text-xs font-black uppercase italic text-slate-800 group-hover:text-amber-600 transition-colors">{b.name}</span>
                                                        <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 px-4 py-1 rounded-lg font-black italic text-xs shadow-sm">{b.runs} ({b.balls})</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-stone-50 p-5 space-y-4">
                                                {/* Top 3 Bowlers Innings 1 */}
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-stone-200 pb-2">Top Wicket Takers</p>
                                                {(match.firstInningsData?.bowlerStats || match.bowlerStats || []).sort((a,b) => b.wickets !== a.wickets ? b.wickets - a.wickets : a.runs - b.runs).slice(0,3).map((b, idx) => (
                                                    <div key={idx} className="flex justify-between items-center group">
                                                        <span className="text-xs font-black uppercase italic text-slate-800 group-hover:text-slate-500 transition-colors">{b.name}</span>
                                                        <span className="bg-slate-900 text-white px-4 py-1 rounded-lg font-black italic text-xs shadow-md">{b.wickets}-{b.runs}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* INNINGS 2 BLOCK */}
                                    {(match.innings === 2 || match.firstInningsData) && (
                                        <div className="bg-stone-200/50">
                                            <div className="flex items-center bg-gradient-to-r from-rose-600 to-red-500 p-4 border-y-2 border-stone-400">
                                                <div className="flex-1">
                                                    <h3 className="text-2xl font-black italic text-white uppercase leading-none">{match.teamB.name}</h3>
                                                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Innings 2 Result</span>
                                                </div>
                                                <div className="bg-slate-950 text-white px-8 py-3 rounded-xl shadow-2xl border border-white/10">
                                                    <h4 className="text-4xl font-black italic leading-none">{match.innings === 2 ? match.score : match.firstInningsData?.score}-{match.innings === 2 ? match.wickets : match.firstInningsData?.wickets}</h4>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-[3px] bg-stone-400">
                                                <div className="bg-stone-50 p-5 space-y-4">
                                                    {/* Top 3 Batsmen Innings 2 */}
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-stone-200 pb-2">Leading Batters</p>
                                                    {(match.innings === 2 ? match.batsmanStats || [] : []).sort((a,b) => b.runs - a.runs).slice(0,3).map((b, idx) => (
                                                        <div key={idx} className="flex justify-between items-center group">
                                                            <span className="text-xs font-black uppercase italic text-slate-800 group-hover:text-red-600 transition-colors">{b.name}</span>
                                                            <span className="bg-gradient-to-r from-red-600 to-rose-500 text-white px-4 py-1 rounded-lg font-black italic text-xs shadow-sm">{b.runs} ({b.balls})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="bg-stone-50 p-5 space-y-4">
                                                    {/* Top 3 Bowlers Innings 2 */}
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-stone-200 pb-2">Top Wicket Takers</p>
                                                    {(match.innings === 2 ? match.bowlerStats || [] : []).sort((a,b) => b.wickets !== a.wickets ? b.wickets - a.wickets : a.runs - b.runs).slice(0,3).map((b, idx) => (
                                                        <div key={idx} className="flex justify-between items-center group">
                                                            <span className="text-xs font-black uppercase italic text-slate-800 group-hover:text-slate-500 transition-colors">{b.name}</span>
                                                            <span className="bg-slate-900 text-white px-4 py-1 rounded-lg font-black italic text-xs shadow-md">{b.wickets}-{b.runs}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* CARD FOOTER (RESULT) */}
                                <div className="bg-gradient-to-r from-stone-200 via-white to-stone-200 p-6 text-center border-t-4 border-stone-400 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-red-600/5 animate-pulse"></div>
                                    <h5 className="text-2xl font-black italic uppercase text-slate-950 tracking-tighter relative z-10">{match.result}</h5>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <button 
                                    onClick={downloadReport}
                                    className="py-5 bg-white/10 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                                >
                                    💾 Save Image
                                </button>
                                <button 
                                    onClick={() => navigate('/home')}
                                    className="py-5 bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-600/20 hover:scale-105 transition-all"
                                >
                                    Next Match ➔
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* POLL & TRANSFER MODALS */}
                {pollModal && (
                    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="bg-[#0f172a] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300">
                            <h3 className="text-xl font-black italic text-white mb-6 uppercase tracking-tighter">New Crazy Question</h3>
                            <input 
                                type="text"
                                placeholder="What's your question?"
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl mb-4 text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                onChange={(e) => setNewPoll({...newPoll, question: e.target.value})}
                            />
                            <div className="space-y-2 mb-6">
                                {newPoll.options.map((opt, i) => (
                                    <input 
                                        key={i}
                                        type="text"
                                        placeholder={`Option ${i+1}`}
                                        className="w-full p-3 bg-white/5 border border-white/5 rounded-xl text-white text-sm outline-none focus:bg-white/10 transition-all"
                                        onChange={(e) => {
                                            const opts = [...newPoll.options];
                                            opts[i] = e.target.value;
                                            setNewPoll({...newPoll, options: opts});
                                        }}
                                    />
                                ))}
                                <button 
                                    onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})}
                                    className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-2 hover:opacity-80"
                                >
                                    + Add Option
                                </button>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setPollModal(false)} className="flex-1 p-4 rounded-2xl bg-white/5 text-white/40 font-bold uppercase text-[10px]">Cancel</button>
                                <button onClick={handleCreatePoll} className="flex-[2] p-4 rounded-2xl bg-emerald-500 text-white font-black uppercase text-[10px] shadow-xl shadow-emerald-500/20">Publish Poll 🚀</button>
                            </div>
                        </div>
                    </div>
                )}

                {transferModal && (
                    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="bg-[#0f172a] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300">
                            <h3 className="text-xl font-black italic text-white mb-6 uppercase tracking-tighter">Handover Control</h3>
                            <p className="text-white/40 text-[10px] font-bold uppercase mb-4 tracking-widest">Select a player from {match.battingTeam.name}</p>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar mb-8">
                                {match.battingTeam.players.map(p => (
                                    <button 
                                        key={p.tid}
                                        onClick={() => handleTransfer(p.tid)}
                                        className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-left flex items-center justify-between group"
                                    >
                                        <span className="font-bold text-white group-hover:translate-x-1 transition-transform">{p.name}</span>
                                        <span className="text-[8px] font-black text-emerald-500 uppercase">Handover 👑</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setTransferModal(false)} className="w-full p-4 rounded-2xl bg-white/5 text-white/40 font-bold uppercase text-[10px]">Cancel</button>
                        </div>
                    </div>
                )}
                {/* CRAZY QUESTIONS SECTION */}
                <div id="crazy-questions-section" className="mt-12 mb-20 px-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Crazy <span className="text-red-600">Questions</span></h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Match Engagement Arena</p>
                        </div>
                        {isAdmin && (
                            <button 
                                onClick={() => setPollModal(true)}
                                className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg"
                            >
                                <span>➕</span> Post Question
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        {!match.polls || match.polls.length === 0 ? (
                            <div className="bg-white border border-dashed border-slate-200 p-12 rounded-[2.5rem] text-center">
                                <span className="text-4xl mb-4 block opacity-30">🤔</span>
                                <p className="text-slate-400 font-bold text-sm italic">No active questions. {isAdmin ? "Start one now!" : "Waiting for the admin..."}</p>
                            </div>
                        ) : (
                            [...match.polls].reverse().map((poll, pIdx) => {
                                const actualIdx = match.polls.length - 1 - pIdx;
                                const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                                
                                return (
                                    <div key={actualIdx} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-red-900/5 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                                        <h4 className="text-xl font-black italic text-slate-900 mb-6 leading-tight">"{poll.question}"</h4>
                                        
                                        <div className="space-y-3">
                                            {poll.options.map((opt, oIdx) => {
                                                const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                                return (
                                                    <button 
                                                        key={oIdx}
                                                        onClick={() => handleVote(actualIdx, oIdx)}
                                                        className="w-full relative h-16 bg-stone-50 rounded-2xl border border-slate-100 overflow-hidden group hover:border-red-200 transition-all text-left"
                                                    >
                                                        <div 
                                                            className="absolute inset-0 bg-red-600/5 transition-all duration-1000"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                        <div className="absolute inset-0 px-5 flex items-center justify-between z-10">
                                                            <span className="font-bold text-slate-700 uppercase italic text-xs">{opt.text}</span>
                                                            <span className="font-black text-red-600 text-sm">{percent}%</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">{totalVotes} Fans Voted</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* POLL MODAL (ADMIN ONLY) */}
                {pollModal && (
                    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/60 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600"></div>
                            <h3 className="text-3xl font-black italic uppercase text-slate-950 mb-8">Post A <span className="text-red-600">Question</span></h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">The Question</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Who will win this match?"
                                        className="w-full p-5 bg-stone-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none text-slate-900 font-bold"
                                        value={newPoll.question}
                                        onChange={(e) => setNewPoll({...newPoll, question: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Options</label>
                                    {newPoll.options.map((opt, i) => (
                                        <input 
                                            key={i}
                                            type="text"
                                            placeholder={`Option ${i+1}`}
                                            className="w-full p-4 bg-stone-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none text-slate-900 font-bold text-sm"
                                            value={opt}
                                            onChange={(e) => {
                                                const updated = [...newPoll.options];
                                                updated[i] = e.target.value;
                                                setNewPoll({...newPoll, options: updated});
                                            }}
                                        />
                                    ))}
                                    <button 
                                        onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})}
                                        className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline"
                                    >
                                        + Add More Options
                                    </button>
                                </div>

                                <div className="flex gap-3 pt-6">
                                    <button 
                                        onClick={() => setPollModal(false)}
                                        className="flex-1 py-4 bg-stone-100 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleCreatePoll}
                                        className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-red-600/30"
                                    >
                                        Publish 🚀
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
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