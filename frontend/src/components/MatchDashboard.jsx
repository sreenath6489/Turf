import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { toPng } from 'html-to-image';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { playEventSound, speakCommentary } from '../utils/soundservice.js';

const socket = io(import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`);

const MatchDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const scorecardRef = useRef(null);
    const grandReportRef = useRef(null);

    // Modals & State
    const [activeModal, setActiveModal] = useState(null);
    const [playerCardData, setPlayerCardData] = useState(null);
    const [isCardLoading, setIsCardLoading] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('turf_theme') || 'dark');
    const [soundPack, setSoundPack] = useState(localStorage.getItem('turf_sound') || 'classic');
    const [matchSummary, setMatchSummary] = useState(null);
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
        const mode = localStorage.getItem('commentaryMode') || 'RAVI';
        if (mode === 'SYSTEMATIC' || mode === 'RAVI') {
            speakCommentary(message);
        }

        setTimeout(() => setToast(null), 1500); // Snappier: 1.5s instead of 3s
    };
    const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });

    const handleTransfer = async (newAdminId) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/matches/${id}/transfer`, { newAdminId });
            setTransferModal(false);
            showToast("Control Transferred! 👑", "info");
        } catch (err) { showToast("Transfer failed", "error"); }
    };

    const handleCreatePoll = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/matches/${id}/poll`, { 
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
            await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/matches/${id}/poll/${pollIndex}/vote`, { optionIndex });
        } catch (err) { console.error("Vote failed"); }
    };

    const handleGenerateCard = async (player) => {
        setIsCardLoading(true);
        setActiveModal('PLAYER_CARD');
        setPlayerCardData(null); // reset old data
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/matches/${id}/generate-card`, {
                playerStats: player
            });
            if (res.data.success) {
                setPlayerCardData({ ...player, ...res.data.cardData });
            }
        } catch (err) {
            showToast("Card Generation Failed", "error");
            setActiveModal(null);
        } finally {
            setIsCardLoading(false);
        }
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
    const [commentaryMode, setCommentaryMode] = useState(() => localStorage.getItem('commentaryMode') || 'RAVI');
    const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem('soundMuted') === 'true');
    const [showSummary, setShowSummary] = useState(false);

    // Pre-load voices for macOS/Chrome bug
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }
    }, []);

    const [specialEvent, setSpecialEvent] = useState(null);

    const triggerSpecial = useCallback((type) => {
        setSpecialEvent(type);
        setTimeout(() => setSpecialEvent(null), 4000);
    }, []);

    useEffect(() => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));
        setUser(loggedUser);

        const fetchMatch = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/matches/${id}`);
                
                // --- SYNC MID-INNINGS PLAYERS FROM LOCAL STORAGE ---
                let fetchedMatch = res.data;
                const savedTeams = JSON.parse(localStorage.getItem('turf_teams') || '[]');
                let updated = false;

                const syncTeamDirectly = (teamKey) => {
                     const matchTeam = fetchedMatch[teamKey];
                     if (!matchTeam) return;
                     const localTeam = savedTeams.find(t => t.name === matchTeam.name);
                     if (localTeam) {
                         const newPlayers = localTeam.players.filter(lp => 
                            !matchTeam.players.some(mp => mp.tid === lp.tid)
                         );
                         if (newPlayers.length > 0) {
                             updated = true;
                             fetchedMatch[teamKey].players = [...matchTeam.players, ...newPlayers];
                         }
                     }
                }
                
                syncTeamDirectly('teamA');
                syncTeamDirectly('teamB');
                syncTeamDirectly('battingTeam');
                syncTeamDirectly('bowlingTeam');
                // ---------------------------------------------------

                setMatch(fetchedMatch);
                setViewInnings(fetchedMatch.innings);
                if (fetchedMatch.isCompleted) {
                    setActiveTab('GRAND_ANALYTICS');
                }
                socket.emit('joinMatch', id);
                
                if (updated) {
                    socket.emit('updateBall', { matchId: fetchedMatch._id, newBall: {}, updatedScorecard: fetchedMatch });
                }
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
            const mode = localStorage.getItem('commentaryMode') || 'RAVI';
            if (mode !== 'OFF') {
                setCommentary(data.text);
                if (mode === 'SYSTEMATIC' || mode === 'RAVI') {
                    speakCommentary(data.text);
                }
            }
            setTimeout(() => setCommentary(""), 8000);
        });

        socket.on('liveEvent', (newBall) => {
            if (newBall.type === 'boundary') {
                if (newBall.runs === 4) triggerSpecial('FOUR');
                else if (newBall.runs === 6) triggerSpecial('SIX');
            } else if (newBall.type === 'wicket') {
                triggerSpecial('WICKET');
            }
        });

        return () => {
            socket.off('scoreUpdated');
            socket.off('newCommentary');
            socket.off('liveEvent');
        };
    }, [id, navigate, triggerSpecial]);

    const calculateMatchResult = () => {
        if (!match || !match.isCompleted) return "";
        const t1Score = match.firstInningsData?.score || 0;
        const t2Score = match.score;
        const t1Name = match.bowlingTeam?.name || "Team 1";
        const t2Name = match.battingTeam?.name || "Team 2";

        if (t2Score > t1Score) {
            const wicketsLeft = match.battingTeam.players.length - match.wickets;
            return `${t2Name} won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
        } else if (t1Score > t2Score) {
            const runMargin = t1Score - t2Score;
            return `${t1Name} won by ${runMargin} run${runMargin > 1 ? 's' : ''}`;
        } else {
            return "Match Tied";
        }
    };

    const calculateAwards = () => {
        if (!match || !match.isCompleted) return null;
        let allBatsmen = [...(match.firstInningsData?.batsmanStats || []), ...(match.batsmanStats || [])];
        let allBowlers = [...(match.firstInningsData?.bowlerStats || []), ...(match.bowlerStats || [])];

        let playerStatsMap = {};
        const getMap = (name, tid) => {
            if (!playerStatsMap[name]) playerStatsMap[name] = { name, tid, runs: 0, wickets: 0, points: 0 };
            return playerStatsMap[name];
        };

        allBatsmen.forEach(b => {
            let p = getMap(b.name, b.tid);
            p.runs += b.runs;
            p.points += b.runs;
        });

        allBowlers.forEach(b => {
            let p = getMap(b.name, b.tid);
            p.wickets += b.wickets;
            p.points += (b.wickets * 15);
        });

        let players = Object.values(playerStatsMap);
        if (players.length === 0) return { orange: null, purple: null, mvp: null };

        let orange = players.reduce((prev, current) => (prev.runs > current.runs) ? prev : current);
        let purple = players.reduce((prev, current) => (prev.wickets > current.wickets) ? prev : current);
        
        let winningTeam = null;
        const t1Score = match.firstInningsData?.score || 0;
        const t2Score = match.score || 0;
        if (t2Score > t1Score) winningTeam = match.battingTeam;
        else if (t1Score > t2Score) winningTeam = match.bowlingTeam;

        let eligibleMvpPlayers = players;
        if (winningTeam) {
            const winningTids = winningTeam.players.map(p => p.tid);
            eligibleMvpPlayers = players.filter(p => winningTids.includes(p.tid));
        }
        if (eligibleMvpPlayers.length === 0) eligibleMvpPlayers = players;

        let mvp = eligibleMvpPlayers.reduce((prev, current) => (prev.points > current.points) ? prev : current);

        return { orange, purple, mvp };
    };

    useEffect(() => {
        if (match?.isCompleted && !matchSummary) {
            if (activeTab === 'LIVE') {
                setActiveModal('MATCH_OVER');
            }
            const fetchSummary = async () => {
                try {
                    const awards = calculateAwards();
                    const res = await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/matches/${match._id}/generate-summary`, {
                        matchData: {
                            team1Name: match.bowlingTeam?.name,
                            team1Score: match.firstInningsData?.score,
                            team1Wickets: match.firstInningsData?.wickets,
                            team2Name: match.battingTeam?.name,
                            team2Score: match.score,
                            team2Wickets: match.wickets,
                            result: calculateMatchResult(),
                            mvp: awards.mvp
                        }
                    });
                    if (res.data.success) {
                        setMatchSummary(res.data.summary);
                    }
                } catch (err) {
                    setMatchSummary("A brilliant display of turf cricket!");
                }
            };
            fetchSummary();
        }
    }, [match?.isCompleted, matchSummary]);

    if (loading || !match) return <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center font-black">Loading Pitch...</div>;

    const isAdmin = user && match.adminId === user.tid;
    const formatOvers = (b) => `${Math.floor(b / 6)}.${b % 6}`;
    const getStrikeRate = (r, b) => b > 0 ? ((r / b) * 100).toFixed(1) : '0.0';
    const getEcon = (r, b) => b > 0 ? ((r / (b / 6))).toFixed(1) : '0.0';

    const handleModeToggle = (mode) => {
        setCommentaryMode(mode);
        localStorage.setItem('commentaryMode', mode);
    };

    const remainingBatsmenCountForUI = match.battingTeam.players.filter(p => 
        p.tid !== match.currentBatsmen.striker?.tid && 
        p.tid !== match.currentBatsmen.nonStriker?.tid && 
        !(match.batsmanStats || []).some(s => s.tid === p.tid && s.dismissal !== 'Retired')
    ).length;
    const isLastWicket = remainingBatsmenCountForUI === 0;
    const isSoloMode = remainingBatsmenCountForUI === 0 && !match.currentBatsmen.nonStriker;

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

    const checkInningsStatus = (newMatch, isExtra = false) => {
        const isAllOut = !newMatch.currentBatsmen.striker && !newMatch.currentBatsmen.nonStriker;
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
        } else if (!isExtra && newMatch.balls > 0 && newMatch.balls % 6 === 0 && !isAllOut && !isTargetReached) {
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

        checkInningsStatus(newMatch, true);
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

        checkInningsStatus(newMatch, true);
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

        let outBatsman = wicketData.outBatsmanId === match.currentBatsmen.nonStriker?.tid ? match.currentBatsmen.nonStriker : match.currentBatsmen.striker;
        let isStrikerOut = outBatsman.tid === match.currentBatsmen.striker?.tid;

        if (wicketData.type !== 'Retired') {
            newMatch.wickets += 1;
            newMatch.balls += 1;
            newMatch.currentBatsmen.striker.balls += 1;
            newMatch.currentBowler.balls += 1;
            if (!['Run Out', 'Retired'].includes(wicketData.type)) {
                newMatch.currentBowler.wickets += 1;
            }
        }

        newMatch.score += wicketData.runs || 0;

        let ballStr = 'W';
        if (wicketData.type === 'Run Out') ballStr = `W(${wicketData.runs || 0}RO)`;
        
        if (wicketData.type !== 'Retired') {
            newMatch.ballHistory.push(ballStr);
        }

        let dismissalStr = wicketData.type;
        if (wicketData.type === 'Run Out' || wicketData.type === 'Caught' || wicketData.type === 'Stumped') {
            dismissalStr = `${wicketData.type === 'Caught' ? 'c' : wicketData.type === 'Stumped' ? 'st' : 'run out'} ${wicketData.fielder ? wicketData.fielder.name : ''} b ${match.currentBowler.name}`;
        } else if (wicketData.type === 'Bowled') {
            dismissalStr = `b ${match.currentBowler.name}`;
        } else if (wicketData.type === 'LBW') {
            dismissalStr = `lbw b ${match.currentBowler.name}`;
        }

        newMatch.batsmanStats.push({
            ...outBatsman,
            dismissal: dismissalStr
        });

        const remainingBatsmenCount = match.battingTeam.players.filter(p => 
            p.tid !== match.currentBatsmen.striker?.tid && 
            p.tid !== match.currentBatsmen.nonStriker?.tid && 
            !(match.batsmanStats || []).some(s => s.tid === p.tid && s.dismissal !== 'Retired')
        ).length;

        const wasSoloMode = !match.currentBatsmen.nonStriker;

        if (wasSoloMode && remainingBatsmenCount === 0) {
            newMatch.currentBatsmen.striker = null;
            newMatch.currentBatsmen.nonStriker = null;
        } else if (remainingBatsmenCount === 0) {
            if (isStrikerOut) {
                newMatch.currentBatsmen.striker = { ...newMatch.currentBatsmen.nonStriker };
                newMatch.currentBatsmen.nonStriker = null;
            } else {
                newMatch.currentBatsmen.nonStriker = null;
            }
        } else {
            let nextBatStats;
            const retiredIdx = newMatch.batsmanStats.findIndex(s => s.tid === wicketData.nextBatsman?.tid && s.dismissal === 'Retired');
            if (retiredIdx >= 0) {
                nextBatStats = { ...newMatch.batsmanStats[retiredIdx], dismissal: 'not out' };
                newMatch.batsmanStats.splice(retiredIdx, 1);
            } else {
                nextBatStats = {
                    ...wicketData.nextBatsman,
                    runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out'
                };
            }

            if (isStrikerOut) {
                newMatch.currentBatsmen.striker = nextBatStats;
            } else {
                newMatch.currentBatsmen.nonStriker = nextBatStats;
            }
        }

        if ((wicketData.runs || 0) % 2 !== 0 && !isLastWicket) {
            rotateStrike(newMatch);
        }

        if (outBatsman.runs === 0 && wicketData.type !== 'Retired') {
            triggerSpecial('DUCK');
        }

        setWicketData({ type: 'Bowled', fielder: '', runs: 0, nextBatsman: null, outBatsmanId: newMatch.currentBatsmen.striker?.tid });
        
        // Close wicket modal BEFORE checkInningsStatus so it doesn't override the INNINGS_BREAK modal
        setActiveModal(null);

        checkInningsStatus(newMatch);
        if (wicketData.type !== 'Retired') {
            playEventSound('wicket');
        }
        syncMatch(newMatch, { runs: wicketData.runs || 0, type: 'wicket', description: `WICKET! ${dismissalStr}` });
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

    const downloadGrandReport = async () => {
        if (!grandReportRef.current) return;
        try {
            const dataUrl = await toPng(grandReportRef.current, { cacheBust: true, backgroundColor: '#080B10' });
            const link = document.createElement('a');
            link.download = `Grand_Report_${match.teamA.name}_vs_${match.teamB.name}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Error generating report", err);
            alert("Failed to generate report.");
        }
    };

    const downloadReport = async () => {
        if (!scorecardRef.current) return;

        try {
            // Hide UI elements not needed in screenshot
            const elementsToHide = document.querySelectorAll('.no-print');
            elementsToHide.forEach(el => el.style.display = 'none');

            const dataUrl = await toPng(scorecardRef.current, { cacheBust: true, backgroundColor: '#080B10' });

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
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6 shadow-lg">
                <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
                    <div className="flex gap-2 items-center">
                        {ballsInOver.map((ball, i) => {
                            let bg = "bg-white/10 text-white border-white/10";
                            let display = ball;

                            if (ball === 0) display = "•";
                            if (ball === 4) bg = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                            if (ball === 6) bg = "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]";
                            if (typeof ball === 'string' && ball.startsWith('W')) { bg = "bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]"; display = "W"; }
                            if (typeof ball === 'string' && (ball.startsWith('Wd') || ball.startsWith('NB'))) bg = "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]";

                            return (
                                <div key={i} className={`${bg} w-8 h-8 rounded-full border flex items-center justify-center font-black text-xs shrink-0 transition-transform hover:scale-110`}>
                                    {display}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 text-white/60 font-bold text-xs whitespace-nowrap">
                        <span className="text-white font-display">= {overRuns}</span>
                        <span className="h-4 w-[1px] bg-white/20"></span>
                        <span className="font-display">Ovr {Math.ceil(match.balls / 6)}</span>
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
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-4 px-2">Over History</h3>
                <div className="space-y-3">
                    {overs.slice().reverse().map((over, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-md flex items-center justify-between gap-4">
                            <div className="flex flex-col items-start min-w-[60px]">
                                <span className="text-[10px] font-bold text-white/40 uppercase">Over</span>
                                <span className="text-lg font-black text-white font-display">{overs.length - i}</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                {over.map((ball, bj) => {
                                    let bg = "bg-white/10 text-white border-white/10";
                                    let display = ball;

                                    if (ball === 0) display = "•";
                                    if (ball === 4) bg = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                                    if (ball === 6) bg = "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]";
                                    if (typeof ball === 'string' && ball.startsWith('W')) { bg = "bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]"; display = "W"; }
                                    if (typeof ball === 'string' && (ball.startsWith('Wd') || ball.startsWith('NB'))) bg = "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]";

                                    return (
                                        <div key={bj} className={`${bg} w-8 h-8 rounded-full border flex items-center justify-center font-black text-[10px] shrink-0`}>
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
                    <div className="bg-white/5 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
                        <div className="bg-purple-900/60 border-b border-white/10 p-4 text-white">
                            <h3 className="font-black uppercase tracking-widest text-sm">{match.teamA.name}</h3>
                        </div>
                        <div className="p-4 space-y-2">
                            {match.teamA.players.map((p, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors">
                                    <div className="w-8 h-8 bg-purple-500/20 text-purple-300 rounded-full flex items-center justify-center font-bold text-xs">{i+1}</div>
                                    <span className="font-bold text-white/80">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
                        <div className="bg-emerald-900/60 border-b border-white/10 p-4 text-white">
                            <h3 className="font-black uppercase tracking-widest text-sm">{match.teamB.name}</h3>
                        </div>
                        <div className="p-4 space-y-2">
                            {match.teamB.players.map((p, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors">
                                    <div className="w-8 h-8 bg-emerald-500/20 text-emerald-300 rounded-full flex items-center justify-center font-bold text-xs">{i+1}</div>
                                    <span className="font-bold text-white/80">{p.name}</span>
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
    const renderInningsScorecard = (dataToRender, isFirstInnings) => {
        if (!dataToRender) return null;

        let allBatsmen = [...(dataToRender.batsmanStats || [])];
        const existingBatIds = allBatsmen.map(b => b.tid);
        if (dataToRender.currentBatsmen?.striker && !existingBatIds.includes(dataToRender.currentBatsmen.striker.tid)) {
            allBatsmen.push({ ...dataToRender.currentBatsmen.striker, dismissal: 'not out' });
        }
        if (dataToRender.currentBatsmen?.nonStriker && !existingBatIds.includes(dataToRender.currentBatsmen.nonStriker.tid)) {
            allBatsmen.push({ ...dataToRender.currentBatsmen.nonStriker, dismissal: 'not out' });
        }

        const battedIds = allBatsmen.map(b => b.tid);
        const currentBattingTeam = isFirstInnings ? (match.innings === 1 ? match.battingTeam : match.bowlingTeam) : match.battingTeam;
        const yetToBat = currentBattingTeam.players.filter(p => !battedIds.includes(p.tid));

        let allBowlers = [...(dataToRender.bowlerStats || [])];
        if (dataToRender.currentBowler && dataToRender.currentBowler.balls > 0) {
            const existing = allBowlers.findIndex(b => b.tid === dataToRender.currentBowler.tid);
            if (existing >= 0) allBowlers[existing] = dataToRender.currentBowler;
            else allBowlers.push(dataToRender.currentBowler);
        }

        const ext = dataToRender.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
        const totalExtras = ext.wides + ext.noBalls + ext.byes + ext.legByes;

        return (
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden mt-6 shadow-2xl backdrop-blur-xl">
                <div className="p-4 border-b border-white/10 flex justify-between bg-white/5 items-center">
                    <h3 className="font-black text-sm text-emerald-400 uppercase tracking-[0.2em]">Batting</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="text-white/40 text-[10px] uppercase border-b border-white/10 bg-white/5">
                                <th className="p-3 font-bold w-1/2">Batter</th>
                                <th className="p-3 text-right font-black w-10">R</th>
                                <th className="p-3 text-right font-black w-10">B</th>
                                <th className="p-3 text-right font-bold w-10">4s</th>
                                <th className="p-3 text-right font-bold w-10">6s</th>
                                <th className="p-3 text-right font-bold w-16">SR</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {allBatsmen.map((b, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3">
                                        <p className={`font-bold flex items-center gap-2 ${b.dismissal === 'not out' ? 'text-emerald-400' : 'text-white/80'}`}>
                                            {b.name}
                                            {dataToRender.currentBatsmen?.striker?.tid === b.tid && <span className="text-sm animate-pulse" title="On Strike">🏏</span>}
                                        </p>
                                        <p className="text-[10px] text-white/40 font-medium leading-tight mt-0.5">{b.dismissal || 'not out'}</p>
                                    </td>
                                    <td className="p-3 text-right font-black text-white font-display">{b.runs}</td>
                                    <td className="p-3 text-right font-bold text-white/60 font-display">{b.balls}</td>
                                    <td className="p-3 text-right text-white/40 font-display">{b.fours}</td>
                                    <td className="p-3 text-right text-white/40 font-display">{b.sixes}</td>
                                    <td className="p-3 text-right text-white/40 font-mono">{getStrikeRate(b.runs, b.balls)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
                    <span className="font-bold text-sm text-white/60">Extras</span>
                    <span className="font-bold text-sm text-white">{totalExtras} <span className="text-xs font-normal text-white/40">(W {ext.wides}, NB {ext.noBalls}, B {ext.byes}, LB {ext.legByes})</span></span>
                </div>
                <div className="p-4 border-t border-white/10 bg-white/10 flex justify-between items-center">
                    <span className="font-black text-lg text-white">Total</span>
                    <span className="font-black text-lg text-white font-display">{dataToRender.score} <span className="text-xs font-normal text-white/60">({dataToRender.wickets} wkts, {formatOvers(dataToRender.balls)} ov)</span></span>
                </div>

                {yetToBat.length > 0 && (
                    <div className="p-4 border-t border-white/10 bg-white/5">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Yet to bat</p>
                        <p className="text-xs text-white/60 leading-relaxed">
                            {yetToBat.map(p => p.name).join(' • ')}
                        </p>
                    </div>
                )}

                <div className="p-4 border-y border-white/10 flex justify-between bg-white/5 mt-4 items-center">
                    <h3 className="font-black text-sm text-emerald-400 uppercase tracking-[0.2em]">Bowling</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="text-white/40 text-[10px] uppercase border-b border-white/10 bg-white/5">
                                <th className="p-3 font-bold w-1/2">Bowler</th>
                                <th className="p-3 text-right font-bold w-10">O</th>
                                <th className="p-3 text-right font-bold w-10">M</th>
                                <th className="p-3 text-right font-black w-10">R</th>
                                <th className="p-3 text-right font-black text-white font-display">W</th>
                                <th className="p-3 text-right font-bold w-16">Econ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {allBowlers.map((b, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-bold text-white/80">{b.name}</td>
                                    <td className="p-3 text-right text-white/60 font-display">{formatOvers(b.balls)}</td>
                                    <td className="p-3 text-right text-white/60 font-display">{b.maidens || 0}</td>
                                    <td className="p-3 text-right font-black text-white font-display">{b.runs}</td>
                                    <td className="p-3 text-right font-black text-rose-400 font-display">{b.wickets}</td>
                                    <td className="p-3 text-right text-white/45 font-mono">{getEcon(b.runs, b.balls)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    let bestBatsman = null;
    let bestBowler = null;
        let bestFielder = null;
        let currentDataToRender = viewInnings === 1 && match.firstInningsData ? match.firstInningsData : match;
        
        if (match.isCompleted) {
            let allBatters = [];
            let allBowlersAwards = [];
            let fielderCounts = {};

            const processInnings = (innData) => {
                if (!innData) return;
                let stats = [...(innData.batsmanStats || [])];
                if (innData.currentBatsmen?.striker) stats.push({...innData.currentBatsmen.striker});
                if (innData.currentBatsmen?.nonStriker) stats.push({...innData.currentBatsmen.nonStriker});
                allBatters = [...allBatters, ...stats];

                let bStats = [...(innData.bowlerStats || [])];
                if (innData.currentBowler && innData.currentBowler.balls > 0) bStats.push({...innData.currentBowler});
                allBowlersAwards = [...allBowlersAwards, ...bStats];

                stats.forEach(b => {
                    if (b.dismissal) {
                        if (b.dismissal.startsWith('c ')) {
                            const parts = b.dismissal.split(' b ');
                            const fielderName = parts[0].replace('c ', '').trim();
                            if (fielderName) fielderCounts[fielderName] = (fielderCounts[fielderName] || 0) + 1;
                        } else if (b.dismissal.startsWith('run out ')) {
                            const parts = b.dismissal.split(' b ');
                            const fielderName = parts[0].replace('run out ', '').trim();
                            if (fielderName) fielderCounts[fielderName] = (fielderCounts[fielderName] || 0) + 1;
                        }
                    }
                });
            };

            processInnings(match.innings === 2 ? match.firstInningsData : match);
            if (match.innings === 2) processInnings(match);

            if (allBatters.length > 0) {
                allBatters.sort((a, b) => {
                    if (b.runs !== a.runs) return b.runs - a.runs;
                    const srA = a.balls > 0 ? a.runs/a.balls : 0;
                    const srB = b.balls > 0 ? b.runs/b.balls : 0;
                    return srB - srA;
                });
                bestBatsman = allBatters[0];
            }

            if (allBowlersAwards.length > 0) {
                allBowlersAwards.sort((a, b) => {
                    if (b.wickets !== a.wickets) return b.wickets - a.wickets;
                    if (a.runs !== b.runs) return a.runs - b.runs;
                    const erA = a.balls > 0 ? a.runs/(a.balls/6) : 0;
                    const erB = b.balls > 0 ? b.runs/(b.balls/6) : 0;
                    return erA - erB;
                });
                bestBowler = allBowlersAwards[0];
            }

            let maxCatches = 0;
            let topFielder = null;
            Object.keys(fielderCounts).forEach(f => {
                if (fielderCounts[f] > maxCatches) {
                    maxCatches = fielderCounts[f];
                    topFielder = f;
                }
            });
            if (topFielder) bestFielder = { name: topFielder, dismissals: maxCatches };
        }

    const renderGrandReportInnings = (dataToRender, teamName) => {
        if (!dataToRender) return null;

        let allBatsmen = [...(dataToRender.batsmanStats || [])];
        const existingBatIds = allBatsmen.map(b => b.tid);
        if (dataToRender.currentBatsmen?.striker && !existingBatIds.includes(dataToRender.currentBatsmen.striker.tid)) {
            allBatsmen.push({ ...dataToRender.currentBatsmen.striker, dismissal: 'not out' });
        }
        if (dataToRender.currentBatsmen?.nonStriker && !existingBatIds.includes(dataToRender.currentBatsmen.nonStriker.tid)) {
            allBatsmen.push({ ...dataToRender.currentBatsmen.nonStriker, dismissal: 'not out' });
        }

        const battedIds = allBatsmen.map(b => b.tid);
        const currentBattingTeam = (dataToRender === match.firstInningsData) ? (match.innings === 1 ? match.battingTeam : match.bowlingTeam) : match.battingTeam;
        const yetToBat = currentBattingTeam?.players?.filter(p => !battedIds.includes(p.tid)) || [];

        let allBowlers = [...(dataToRender.bowlerStats || [])];
        if (dataToRender.currentBowler && dataToRender.currentBowler.balls > 0) {
            const existing = allBowlers.findIndex(b => b.tid === dataToRender.currentBowler.tid);
            if (existing >= 0) allBowlers[existing] = dataToRender.currentBowler;
            else allBowlers.push(dataToRender.currentBowler);
        }

        const ext = dataToRender.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
        const totalExtras = ext.wides + ext.noBalls + ext.byes + ext.legByes;

        return (
            <div className="border border-white/10 rounded-3xl p-8 bg-white/5 flex flex-col h-full shadow-2xl backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white uppercase text-center mb-8 tracking-widest font-display">{teamName} INNINGS</h3>
                
                <h4 className="font-bold text-emerald-400 uppercase tracking-widest text-sm mb-4">BATTING</h4>
                <table className="w-full text-left text-sm mb-2">
                    <thead>
                        <tr className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/10">
                            <th className="pb-3 font-bold w-1/2">BATTER</th>
                            <th className="pb-3 text-right font-bold w-8">R</th>
                            <th className="pb-3 text-right font-bold w-8">B</th>
                            <th className="pb-3 text-right font-bold w-8">4S</th>
                            <th className="pb-3 text-right font-bold w-8">6S</th>
                            <th className="pb-3 text-right font-bold w-12">SR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {allBatsmen.map((b, i) => (
                            <tr key={i}>
                                <td className="py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white/80">{b.name}</span>
                                        {dataToRender.currentBatsmen?.striker?.tid === b.tid && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-400 rotate-45"><path d="M19 3l2 2-14 14-2-2L19 3z"/></svg>}
                                    </div>
                                    <div className="text-[10px] text-white/40 leading-tight mt-1">{b.dismissal || 'not out'}</div>
                                </td>
                                <td className="py-3 text-right font-bold text-white font-display">{b.runs}</td>
                                <td className="py-3 text-right text-white/60 font-display">{b.balls}</td>
                                <td className="py-3 text-right text-white/40 font-display">{b.fours}</td>
                                <td className="py-3 text-right text-white/40 font-display">{b.sixes}</td>
                                <td className="py-3 text-right text-white/60 font-display">{getStrikeRate(b.runs, b.balls)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-y border-white/10 py-4 flex justify-between items-center text-sm mb-4">
                    <span className="font-bold text-white/60">Extras</span>
                    <span className="font-bold text-white">{totalExtras} <span className="text-white/40 font-normal ml-1">(W {ext.wides}, NB {ext.noBalls}, B {ext.byes}, LB {ext.legByes})</span></span>
                </div>
                
                <div className="flex justify-between items-center text-lg mb-8">
                    <span className="font-black text-white">Total</span>
                    <span className="font-black text-white font-display">{dataToRender.score} <span className="text-white/60 font-normal text-sm ml-1">({dataToRender.wickets} wkts, {formatOvers(dataToRender.balls)} ov)</span></span>
                </div>

                {yetToBat.length > 0 && (
                    <div className="mb-8">
                        <p className="font-bold text-white/40 uppercase tracking-widest text-[10px] mb-2">YET TO BAT</p>
                        <p className="text-sm text-white/60">{yetToBat.map(p => p.name).join('  •  ')}</p>
                    </div>
                )}

                <h4 className="font-bold text-emerald-400 uppercase tracking-widest text-sm mb-4">BOWLING</h4>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/10">
                            <th className="pb-3 font-bold w-1/2">BOWLER</th>
                            <th className="pb-3 text-right font-bold w-8">O</th>
                            <th className="pb-3 text-right font-bold w-8">M</th>
                            <th className="pb-3 text-right font-bold w-8">R</th>
                            <th className="pb-3 text-right font-bold w-8">W</th>
                            <th className="pb-3 text-right font-bold w-12">ECON</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {allBowlers.map((b, i) => (
                            <tr key={i}>
                                <td className="py-3 font-bold text-white/80">{b.name}</td>
                                <td className="py-3 text-right text-white/60 font-display">{formatOvers(b.balls)}</td>
                                <td className="py-3 text-right text-white/60 font-display">{b.maidens || 0}</td>
                                <td className="py-3 text-right font-bold text-white font-display">{b.runs}</td>
                                <td className="py-3 text-right font-bold text-rose-400 font-display">{b.wickets}</td>
                                <td className="py-3 text-right text-white/60 font-display">{getEcon(b.runs, b.balls)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    let themeClasses = "bg-[#080B10] text-slate-100"; // dark theme
    return (
        <div className={`min-h-screen ${themeClasses} theme-${theme} font-sans flex flex-col items-center p-4 md:p-8 transition-colors duration-500`}>
            <div className="w-full max-w-4xl flex flex-col gap-6">
                
                {/* Top Nav Pill */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-2 flex items-center justify-between shadow-2xl">
                    <button onClick={() => navigate('/home')} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/10">
                        ←
                    </button>
                    <div className="flex-1 flex justify-center gap-2 px-2">
                        <button 
                            onClick={() => setActiveTab('LIVE')}
                            className={`px-4 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'LIVE' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            LIVE
                        </button>
                        <button 
                            onClick={() => setActiveTab('BALL BY BALL')}
                            className={`px-4 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'BALL BY BALL' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            SCORECARD
                        </button>
                        <button 
                            onClick={() => setActiveTab('ANALYTICS')}
                            className={`px-4 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ANALYTICS' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            ANALYTICS
                        </button>
                        {match.isCompleted && (
                            <button 
                                onClick={() => setActiveTab('GRAND_ANALYTICS')}
                                className={`px-4 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'GRAND_ANALYTICS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                                🏆 GRAND
                            </button>
                        )}
                    </div>
                    <button onClick={() => setActiveModal('PREMIUM_SETTINGS')} className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:bg-yellow-500/20 hover:scale-105 transition-all group relative flex items-center justify-center">
                        <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full opacity-100">PRO</div>
                        👑
                    </button>
                </div>

                {/* Commentary Mode Selector */}
                <div className="flex justify-end px-2 -mt-2">
                    <select 
                        value={commentaryMode} 
                        onChange={(e) => handleModeToggle(e.target.value)}
                        className="bg-white/5 border border-white/10 text-[10px] md:text-xs font-black uppercase tracking-widest text-white/80 rounded-full px-4 py-2 outline-none hover:border-white/20 transition-all cursor-pointer shadow-md appearance-none text-center"
                        style={{ textAlignLast: 'center' }}
                    >
                        <option value="RAVI">🎙️ Ravi Shastri (AI)</option>
                        <option value="TELUGU">😂 Telugu Memes</option>
                        <option value="SYSTEMATIC">🤖 Systematic AI</option>
                        <option value="OFF">🔇 Commentary Off</option>
                    </select>
                </div>

                <div className="flex-1">
                    {activeTab === 'LIVE' && (
                        <div className="space-y-6">
                            {/* Unified Premium Score Card */}
                            <div className="bg-white/5 rounded-[2rem] md:rounded-[3rem] p-4 md:p-10 text-white shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-xl animate-in fade-in duration-500">
                                {/* Decorative Soft Blurs */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="bg-rose-500/10 border border-rose-500/20 px-5 py-3 rounded-2xl">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-rose-400 mb-1">Live Match</p>
                                        <p className="text-sm font-black uppercase italic text-white">{currentDataToRender.battingTeam?.name || 'Team'}, {currentDataToRender.innings || 1}{currentDataToRender.innings === 1 ? 'st' : 'nd'} inn</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Overs</p>
                                        <p className="text-2xl font-black italic text-white font-display">{formatOvers(currentDataToRender.balls)} <span className="text-sm text-white/40">/ {match.overs}</span></p>
                                    </div>
                                </div>

                                <div className="text-center my-6 md:my-12 relative z-10">
                                    <h1 className="font-display text-6xl md:text-9xl font-black italic tracking-tighter flex items-end justify-center gap-2 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                        {currentDataToRender.score} <span className="text-3xl md:text-6xl text-rose-400 font-display">/{currentDataToRender.wickets}</span>
                                    </h1>
                                    <div className="flex flex-col items-center gap-3 mt-6">
                                        <div className="flex gap-4 flex-wrap justify-center">
                                            <div className="inline-flex px-6 py-2 rounded-full bg-white/5 border border-white/10 items-center gap-2 shadow-md">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <span className="text-xs font-black uppercase tracking-widest text-white/80">CRR: {getEcon(currentDataToRender.score, currentDataToRender.balls)}</span>
                                            </div>
                                            {match.currentBatsmen?.striker && match.currentBatsmen?.nonStriker && (
                                                <div className="inline-flex px-6 py-2 rounded-full bg-white/5 border border-white/10 items-center gap-2 shadow-md">
                                                    <span className="text-xl">🤝</span>
                                                    <span className="text-xs font-black uppercase tracking-widest text-white/80">
                                                        P'ship: {match.currentBatsmen.striker.runs + match.currentBatsmen.nonStriker.runs}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {match.innings === 2 && viewInnings === 2 && (
                                            <div className="inline-flex px-6 py-3 bg-rose-500/10 border border-rose-500/20 rounded-full shadow-md animate-pulse mt-2">
                                                <span className="text-white font-black tracking-[0.1em] uppercase text-xs md:text-sm">
                                                    Target: {match.target} <span className="mx-2 text-white/20">•</span> Need <span className="text-rose-400">{Math.max(0, match.target - match.score)}</span> from <span className="text-rose-400">{match.overs * 6 - match.balls}</span> <span className="mx-2 text-white/20">•</span> RRR: {getEcon(Math.max(0, match.target - match.score), match.overs * 6 - match.balls)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tables & Admin Controls */}
                            <div className="flex flex-col-reverse lg:flex-row gap-4 md:gap-6">
                                {/* Batting/Bowling */}
                                <div className="flex-[2] bg-white/5 rounded-[2.5rem] p-4 md:p-6 shadow-2xl border border-white/10 overflow-x-auto backdrop-blur-xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Current Action</h3>
                                    <table className="w-full text-xs font-bold text-left mb-6">
                                        <thead className="text-[8px] uppercase tracking-widest text-white/40 border-b border-white/10">
                                            <tr>
                                                <th className="pb-2">Batter</th>
                                                <th className="pb-2 text-center">R</th>
                                                <th className="pb-2 text-center">B</th>
                                                <th className="pb-2 text-center">4s</th>
                                                <th className="pb-2 text-center">6s</th>
                                                <th className="pb-2 text-center">SR</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {match.currentBatsmen?.striker && (
                                                <tr className="bg-emerald-500/5">
                                                    <td className="py-3 text-white flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse"></div>
                                                        {match.currentBatsmen.striker.name}
                                                        <span className="text-xs" title="On Strike">🏏</span>
                                                    </td>
                                                    <td className="py-3 text-center text-white font-black font-display text-sm">{match.currentBatsmen.striker.runs}</td>
                                                    <td className="py-3 text-center text-white/60 font-display">{match.currentBatsmen.striker.balls}</td>
                                                    <td className="py-3 text-center text-white/40 font-display">{match.currentBatsmen.striker.fours}</td>
                                                    <td className="py-3 text-center text-white/40 font-display">{match.currentBatsmen.striker.sixes}</td>
                                                    <td className="py-3 text-center text-white/40 font-mono">{getStrikeRate(match.currentBatsmen.striker.runs, match.currentBatsmen.striker.balls)}</td>
                                                </tr>
                                            )}
                                            {match.currentBatsmen?.nonStriker && (
                                                <tr>
                                                    <td className="py-3 text-white/60 pl-4">{match.currentBatsmen.nonStriker.name}</td>
                                                    <td className="py-3 text-center text-white/60 font-display">{match.currentBatsmen.nonStriker.runs}</td>
                                                    <td className="py-3 text-center text-white/40 font-display">{match.currentBatsmen.nonStriker.balls}</td>
                                                    <td className="py-3 text-center text-white/30 font-display">{match.currentBatsmen.nonStriker.fours}</td>
                                                    <td className="py-3 text-center text-white/30 font-display">{match.currentBatsmen.nonStriker.sixes}</td>
                                                    <td className="py-3 text-center text-white/30 font-mono">{getStrikeRate(match.currentBatsmen.nonStriker.runs, match.currentBatsmen.nonStriker.balls)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <thead className="text-[8px] uppercase tracking-widest text-white/40 border-b border-white/10">
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
                                                    <td className="py-3 text-white">{match.currentBowler.name}</td>
                                                    <td className="py-3 text-center text-white/60 font-display">{formatOvers(match.currentBowler.balls)}</td>
                                                    <td className="py-3 text-center text-white/60 font-display">{match.currentBowler.maidens || 0}</td>
                                                    <td className="py-3 text-center text-white/60 font-display">{match.currentBowler.runs}</td>
                                                    <td className="py-3 text-center text-rose-400 font-extrabold font-display">{match.currentBowler.wickets}</td>
                                                    <td className="py-3 text-center text-white/40 font-mono">{getEcon(match.currentBowler.runs, match.currentBowler.balls)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Admin Controls (Now beside table) */}
                                {isAdmin && !match.isCompleted && !activeModal && viewInnings === match.innings ? (
                                    <div className="flex-[1.5] bg-white/5 rounded-[2rem] md:rounded-[2.5rem] p-3 md:p-6 shadow-2xl border border-white/10 flex flex-col justify-between w-full md:min-w-[320px] backdrop-blur-xl">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Admin Controls</h4>
                                            <div className="flex gap-2">
                                                <button onClick={handleUndo} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">⎌ Undo</button>
                                                <button onClick={() => { rotateStrike(match); syncMatch(match); }} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">⇄ Swap</button>
                                                <button onClick={() => setActiveModal('BOWLER')} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">⏏ Over</button>
                                            </div>
                                        </div>
                                        
                                        {/* Run Buttons Row */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {[0, 1, 2, 3, 4, 6].map(r => {
                                                let btnClass = "glass-panel glass-panel-hover font-display text-lg font-black text-white hover:text-emerald-400 border border-white/10 rounded-xl transition-all shadow-md active:scale-95 flex-1 min-w-[2.5rem] py-4";
                                                if (r === 4) btnClass = "font-display text-lg font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 active:scale-95 transition-all shadow-md flex-1 min-w-[2.5rem] py-4";
                                                if (r === 6) btnClass = "font-display text-lg font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/20 active:scale-95 transition-all shadow-md flex-1 min-w-[2.5rem] py-4";
                                                return (
                                                    <button key={r} onClick={() => handleRun(r)} className={btnClass}>
                                                        {r}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        
                                        {/* Extras & Wicket Row */}
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <button onClick={() => setActiveModal('WIDE')} className="flex-1 min-w-[4rem] py-3 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-400 active:scale-95 transition-all shadow-sm">Wide</button>
                                            <button onClick={() => setActiveModal('NOBALL')} className="flex-1 min-w-[4rem] py-3 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-400 active:scale-95 transition-all shadow-sm">NB</button>
                                            <button onClick={() => setActiveModal('NOBALL')} className="flex-1 min-w-[3rem] py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/60 active:scale-95 transition-all">Bye</button>
                                            <button onClick={() => setActiveModal('NOBALL')} className="flex-1 min-w-[3rem] py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/60 active:scale-95 transition-all">LB</button>
                                        </div>
                                        <button onClick={() => setActiveModal('WICKET')} className="w-full py-4 bg-rose-600 rounded-xl text-sm font-black uppercase tracking-widest text-white hover:bg-rose-700 shadow-lg shadow-rose-600/30 active:scale-95 transition-all">Wicket</button>
                                    </div>
                                ) : (
                                    <div className="flex-[1] bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center p-6 text-white/40 min-h-[300px] backdrop-blur-xl">
                                        <p className="text-xs font-black uppercase tracking-widest">Waiting for Admin</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'BALL BY BALL' && (
                        <div className="flex flex-col gap-6 w-full" ref={scorecardRef}>
                            {match.innings === 2 && match.firstInningsData && (
                                <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in duration-500">
                                    <h2 className="text-2xl font-black italic uppercase text-white mb-2 text-center tracking-widest font-display">{match.bowlingTeam?.name} Innings</h2>
                                    {renderInningsScorecard(match.firstInningsData, true)}
                                </div>
                            )}
                            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in duration-500">
                                <h2 className="text-2xl font-black italic uppercase text-white mb-2 text-center tracking-widest font-display">{match.battingTeam?.name} Innings</h2>
                                {renderInningsScorecard(match, false)}
                                {renderBallHistory()}
                            </div>
                            
                            {/* AWARDS MOVED TO GRAND ANALYTICS */}
                        </div>
                    )}

                    {activeTab === 'GRAND_ANALYTICS' && match.isCompleted && (
                        <div className="flex flex-col gap-6 w-full animate-in zoom-in-95 duration-500">
                            {/* AI Summary */}
                            <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] shadow-2xl border border-white/10 text-center">
                                <h3 className="text-white/40 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mb-4">Gemini AI Match Story</h3>
                                <p className="text-white/80 text-xl md:text-2xl italic font-medium leading-relaxed px-4 md:px-10">"{matchSummary || 'Gemini AI is writing the match story...'}"</p>
                            </div>

                            {/* MVP & Caps */}
                            {(()=>{
                                const awards = calculateAwards();
                                if(!awards) return null;
                                return (
                                    <>
                                        <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] text-center border border-white/10 shadow-2xl flex flex-col items-center">
                                            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)] mb-6 animate-pulse">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                            </svg>
                                            <h3 className="text-white/40 text-xs font-black uppercase tracking-[0.4em] mb-2">Player of the Match (MVP)</h3>
                                            <p className="text-5xl md:text-6xl font-black italic text-white uppercase mb-6 font-display">{awards.mvp?.name}</p>
                                            <div className="inline-flex gap-4 border-t border-white/10 pt-6">
                                                <span className="text-white/80 font-bold text-lg">{awards.mvp?.runs} Runs</span>
                                                <span className="text-white/20 font-black">•</span>
                                                <span className="text-white/80 font-bold text-lg">{awards.mvp?.wickets} Wickets</span>
                                                <span className="text-white/20 font-black">•</span>
                                                <span className="text-yellow-400 font-black text-lg">{awards.mvp?.points} MVP Points</span>
                                            </div>
                                            <div className="mt-8">
                                                <button onClick={() => handleGenerateCard(awards.mvp)} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-full transition-all shadow-lg shadow-emerald-500/20 active:scale-95">Generate AI Persona Card</button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Orange Cap */}
                                            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] shadow-2xl backdrop-blur-xl text-center flex flex-col items-center">
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                                    <path d="M12 6c-3.87 0-7 3.13-7 7H2v3h20v-3h-3c0-3.87-3.13-7-7-7z"/>
                                                </svg>
                                                <h3 className="text-amber-400 text-xs font-black uppercase tracking-[0.3em] mb-2">Orange Cap</h3>
                                                <p className="text-4xl font-black italic text-white uppercase mb-4 font-display">{awards.orange?.name}</p>
                                                <div className="border-t border-white/10 pt-4 w-full">
                                                    <span className="text-white/80 font-bold text-xl">{awards.orange?.runs} Runs</span>
                                                </div>
                                            </div>

                                            {/* Purple Cap */}
                                            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] shadow-2xl backdrop-blur-xl text-center flex flex-col items-center">
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-purple-400 mb-6 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                                    <path d="M12 6c-3.87 0-7 3.13-7 7H2v3h20v-3h-3c0-3.87-3.13-7-7-7z"/>
                                                </svg>
                                                <h3 className="text-purple-400 text-xs font-black uppercase tracking-[0.3em] mb-2">Purple Cap</h3>
                                                <p className="text-4xl font-black italic text-white uppercase mb-4 font-display">{awards.purple?.name}</p>
                                                <div className="border-t border-white/10 pt-4 w-full">
                                                    <span className="text-white/80 font-bold text-xl">{awards.purple?.wickets} Wickets</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )
                            })()}

                            <button onClick={downloadGrandReport} className="mt-8 p-6 bg-white/5 border border-white/10 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl w-full hover:bg-white/10 transition-all text-sm flex items-center justify-center gap-4">
                                <span className="text-2xl">📥</span>
                                <span>Download Complete Match Report</span>
                            </button>
                        </div>
                    )}

                    {activeTab === 'ANALYTICS' && (
                        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
                            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl">
                                <h2 className="text-2xl font-black italic uppercase text-white mb-6 text-center tracking-widest font-display">Match Worm 📈</h2>
                                <div className="h-[400px] w-full">
                                    {(()=>{
                                        const t1Name = match.firstInningsData ? match.bowlingTeam?.name : match.battingTeam?.name;
                                        const t2Name = match.firstInningsData ? match.battingTeam?.name : match.bowlingTeam?.name;
                                        let data = [{ over: 0, [t1Name]: 0, [t2Name]: 0 }];
                                        const getOverData = (history) => {
                                            let overs = []; let currentScore = 0; let legalBalls = 0;
                                            for (let b of history) {
                                                let runs = 0;
                                                if (typeof b === 'number') runs = b;
                                                else if (typeof b === 'string') {
                                                    if (b.startsWith('Wd') || b.startsWith('NB')) runs = 1 + (parseInt(b.split('+')[1]) || 0);
                                                    else if (b.startsWith('W(')) runs = parseInt(b.match(/\d+/)?.[0]) || 0;
                                                }
                                                currentScore += runs;
                                                if (typeof b === 'number' || (typeof b === 'string' && (b === 'W' || b.startsWith('W(')))) legalBalls++;
                                                if (legalBalls === 6) { overs.push(currentScore); legalBalls = 0; }
                                            }
                                            if (legalBalls > 0) overs.push(currentScore);
                                            return overs;
                                        };
                                        const t1Overs = match.firstInningsData ? getOverData(match.firstInningsData.ballHistory) : getOverData(match.ballHistory);
                                        const t2Overs = match.innings === 2 ? getOverData(match.ballHistory) : [];
                                        const maxOvers = Math.max(t1Overs.length, t2Overs.length, match.overs || 0);
                                        for (let i = 0; i < maxOvers; i++) {
                                            data.push({
                                                over: i + 1,
                                                [t1Name]: t1Overs[i] !== undefined ? t1Overs[i] : (t1Overs.length > 0 ? t1Overs[t1Overs.length - 1] : null),
                                                [t2Name]: t2Overs[i] !== undefined ? t2Overs[i] : null
                                            });
                                        }
                                        return (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="over" stroke="#64748b" tick={{ fontSize: 12, fontWeight: 700 }} />
                                                    <YAxis stroke="#64748b" tick={{ fontSize: 12, fontWeight: 700 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(8, 11, 16, 0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', color: '#fff' }} />
                                                    <Legend wrapperStyle={{ fontWeight: 900, paddingTop: '20px' }} />
                                                    <Line type="monotone" dataKey={t1Name} stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                                                    {match.innings === 2 && (
                                                        <Line type="monotone" dataKey={t2Name} stroke="#f43f5e" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                                                    )}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* This Over Floating Glass Bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-4xl w-[90%] bg-[#080B10]/80 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-40 no-print flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 whitespace-nowrap hidden md:block">This Over</h4>
                <div className="flex gap-2 min-w-max items-center justify-center flex-1">
                    {(() => {
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
                        if (ballsInOver.length === 0) return <div className="text-xs text-white/40 italic font-bold">No balls bowled in this over yet.</div>;
                        return ballsInOver.map((b, i) => {
                            let bg = "bg-white/10 text-white border-white/10";
                            let txt = b === 0 ? '•' : b;
                            if (b === 4) bg = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                            if (b === 6) bg = "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]";
                            if (typeof b === 'string' && (b === 'W' || b.startsWith('W('))) { bg = "bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]"; txt = "W"; }
                            if (typeof b === 'string' && (b.startsWith('NB') || b.startsWith('Wd'))) { bg = "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]"; txt = b.replace('+', ' '); }
                            return (
                                <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border shrink-0 ${bg}`}>
                                    {txt}
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* Modals from old code (restyled slightly for dark theme) */}
            {activeModal === 'MATCH_OVER' && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f172a] p-10 rounded-[3rem] shadow-[0_0_150px_rgba(16,185,129,0.15)] w-full max-w-lg text-center border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
                        
                        <div className="w-32 h-32 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-6xl mx-auto mb-8 shadow-2xl shadow-yellow-500/20 relative z-10 border-4 border-slate-900">🏆</div>
                        <h2 className="text-xs font-black uppercase tracking-[0.4em] text-emerald-400 mb-3 relative z-10 font-display">Match Concluded</h2>
                        <h3 className="text-4xl md:text-5xl font-black italic text-white uppercase mb-10 leading-tight relative z-10 font-display">{calculateMatchResult()}</h3>
                        
                        <div className="flex gap-4 relative z-10">
                            <button onClick={() => { setActiveModal(null); setActiveTab('GRAND_ANALYTICS'); }} className="flex-[3] p-5 bg-emerald-500 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95 transition-all text-sm font-display">View Grand Analytics</button>
                            <button onClick={() => navigate('/home')} className="flex-1 p-5 bg-white/10 rounded-2xl text-white font-black hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center border border-white/10">🏠</button>
                        </div>
                    </div>
                </div>
            )}
            {activeModal === 'INNINGS_BREAK' && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-950/80 border border-white/10 p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-center backdrop-blur-xl">
                        <h2 className="text-4xl font-black italic text-white mb-6 uppercase font-display">Innings Complete</h2>
                        <button onClick={startSecondInnings} className="w-full p-5 bg-emerald-500 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95 transition-all font-display">Start 2nd Innings</button>
                    </div>
                </div>
            )}
            {activeModal === 'WIDE' && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-950/80 border border-white/10 p-8 rounded-[3rem] shadow-2xl w-full max-w-sm text-center backdrop-blur-xl">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-6 font-display">Wide Ball Extras</h2>
                        <div className="flex gap-2 justify-center mb-8">
                            {[0, 1, 2, 3, 4].map(r => (
                                <button key={r} onClick={() => handleWideSubmit(r)} className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 hover:border-amber-400 hover:bg-amber-500/10 text-white font-black text-xl active:scale-90 transition-all font-display">{r}</button>
                            ))}
                        </div>
                        <button onClick={() => setActiveModal(null)} className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-black uppercase tracking-widest text-xs">Cancel</button>
                    </div>
                </div>
            )}
            {activeModal === 'NOBALL' && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-950/80 border border-white/10 p-8 rounded-[3rem] shadow-2xl w-full max-w-sm text-center backdrop-blur-xl">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-6 font-display">No Ball / Bye Extras</h2>
                        <div className="flex gap-2 justify-center mb-8">
                            {[0, 1, 2, 3, 4, 6].map(r => (
                                <button key={r} onClick={() => handleNoBallSubmit(r, 'Bat')} className="w-12 h-12 rounded-2xl border border-white/10 bg-white/5 hover:border-amber-400 hover:bg-amber-500/10 text-white font-black text-lg active:scale-90 transition-all font-display">{r}</button>
                            ))}
                        </div>
                        <button onClick={() => setActiveModal(null)} className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-black uppercase tracking-widest text-xs font-display">Cancel</button>
                    </div>
                </div>
            )}
            {activeModal === 'WICKET' && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-950/90 border border-white/10 p-8 rounded-[3rem] shadow-2xl w-full max-w-md text-center max-h-[90vh] overflow-y-auto backdrop-blur-xl">
                        <h2 className="text-3xl font-black italic text-rose-500 uppercase mb-8 font-display">Wicket</h2>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Retired'].map(type => (
                                <button key={type} onClick={() => setWicketData({...wicketData, type, runs: 0, fielder: null})} className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${wicketData.type === type ? 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/10' : 'border-white/10 text-white/60 bg-white/5 hover:border-rose-500/40 hover:text-white'}`}>{type}</button>
                            ))}
                        </div>
                        {['Caught', 'Stumped', 'Run Out'].includes(wicketData.type) && (
                            <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-3">Select Fielder</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {match.bowlingTeam.players.map(p => (
                                        <button key={p.tid} onClick={() => setWicketData({...wicketData, fielder: p})} className={`p-3 rounded-xl border text-xs font-black transition-all ${wicketData.fielder?.tid === p.tid ? 'border-rose-500 bg-rose-500/20 text-rose-400' : 'border-white/10 text-white/60 bg-white/5 hover:border-white/20'}`}>{p.name}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {wicketData.type === 'Run Out' && (
                            <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-3">Runs Completed</label>
                                <div className="flex gap-2 justify-center">
                                    {[0, 1, 2, 3].map(r => (
                                        <button key={r} onClick={() => setWicketData({...wicketData, runs: r})} className={`w-12 h-12 rounded-xl border text-lg font-black transition-all ${wicketData.runs === r ? 'border-rose-500 bg-rose-500/20 text-rose-400' : 'border-white/10 text-white/60 bg-white/5 hover:border-white/20 font-display'}`}>{r}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {['Run Out', 'Retired'].includes(wicketData.type) && match.currentBatsmen.nonStriker && (
                            <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-3">Who is Out?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setWicketData({...wicketData, outBatsmanId: match.currentBatsmen.striker.tid})} className={`p-3 rounded-xl border text-xs font-black transition-all ${(wicketData.outBatsmanId === match.currentBatsmen.striker.tid || !wicketData.outBatsmanId) ? 'border-rose-500 bg-rose-500/20 text-rose-400' : 'border-white/10 text-white/60 bg-white/5 hover:border-white/20'}`}>{match.currentBatsmen.striker.name}</button>
                                    <button onClick={() => setWicketData({...wicketData, outBatsmanId: match.currentBatsmen.nonStriker.tid})} className={`p-3 rounded-xl border text-xs font-black transition-all ${wicketData.outBatsmanId === match.currentBatsmen.nonStriker.tid ? 'border-rose-500 bg-rose-500/20 text-rose-400' : 'border-white/10 text-white/60 bg-white/5 hover:border-white/20'}`}>{match.currentBatsmen.nonStriker.name}</button>
                                </div>
                            </div>
                        )}
                        {!isLastWicket && (
                            <div className="mb-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-3">Next Batsman</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {match.battingTeam.players.filter(p => p.tid !== match.currentBatsmen.striker?.tid && p.tid !== match.currentBatsmen.nonStriker?.tid && !(match.batsmanStats || []).some(s => s.tid === p.tid && s.dismissal !== 'Retired')).map(p => (
                                        <button key={p.tid} onClick={() => setWicketData({...wicketData, nextBatsman: p})} className={`p-3 rounded-xl border text-xs font-black transition-all ${wicketData.nextBatsman?.tid === p.tid ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-white/10 text-white/60 bg-white/5 hover:border-white/20'}`}>{p.name}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setActiveModal(null)} className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white font-black uppercase tracking-widest text-xs font-display">Cancel</button>
                            <button onClick={handleWicketSubmit} className="flex-1 p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 font-display">Confirm Out</button>
                        </div>
                    </div>
                </div>
            )}
            {activeModal === 'BOWLER' && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-950/90 border border-white/10 p-8 rounded-[3rem] shadow-2xl w-full max-w-md text-center max-h-[80vh] overflow-y-auto backdrop-blur-xl">
                        <h2 className="text-2xl font-black italic text-white uppercase mb-8 font-display">Select Bowler</h2>
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            {match.bowlingTeam.players.map(p => {
                                const stats = (match.bowlerStats || []).find(b => b.tid === p.tid);
                                const oversBowled = stats ? Math.floor(stats.balls / 6) : 0;
                                const isMaxedOut = oversBowled >= maxOversPerBowler;
                                const isCurrent = match.currentBowler?.tid === p.tid;

                                return (
                                    <button 
                                        key={p.tid} 
                                        disabled={isMaxedOut || isCurrent}
                                        onClick={() => setSelectedBowler(p)} 
                                        className={`p-4 rounded-2xl border text-xs font-black transition-all ${
                                            selectedBowler?.tid === p.tid 
                                                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' 
                                                : (isCurrent || isMaxedOut 
                                                    ? 'border-white/5 text-white/20 bg-white/5 opacity-50 cursor-not-allowed' 
                                                    : 'border-white/10 text-white/60 bg-white/5 hover:border-white/20')
                                        }`}
                                    >
                                        {p.name} {isMaxedOut ? '(Max)' : ''}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={handleBowlerSubmit} disabled={!selectedBowler} className="w-full p-5 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 disabled:opacity-50 font-display">Start Over</button>
                    </div>
                </div>
            )}
            
            {activeModal === 'PLAYER_CARD' && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
                    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-8 rounded-[3rem] shadow-2xl w-full max-w-md text-center border border-white/10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl"></div>
                        
                        <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white/50 hover:bg-white/20 hover:text-white transition-all">✕</button>

                        <div className="relative z-10">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500 mb-2">Turf Score Pro AI</h2>
                            <h3 className="text-3xl font-black italic text-white uppercase mb-8 font-display">Player Card</h3>

                            {isCardLoading || !playerCardData ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                                    <p className="text-xs font-bold text-white/50 animate-pulse">Gemini AI is analyzing performance...</p>
                                </div>
                            ) : (
                                <div className="animate-in zoom-in-95 duration-500">
                                    <div className="bg-gradient-to-tr from-yellow-600 to-yellow-400 p-1 rounded-2xl shadow-2xl shadow-yellow-500/20 mb-8 inline-block" id="player-card-export">
                                        <div className="bg-slate-900 px-8 py-4 rounded-xl">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-1">A.K.A</p>
                                            <h4 className="text-4xl font-black text-white italic font-display">"{playerCardData.nickname}"</h4>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 backdrop-blur-md">
                                        <h5 className="text-xl font-black text-white mb-4 uppercase">{playerCardData.name}</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-left bg-white/5 p-3 rounded-xl">
                                                <p className="text-[10px] text-white/50 uppercase tracking-widest font-black">Runs / Balls</p>
                                                <p className="text-lg text-white font-bold">{playerCardData.runs} <span className="text-xs text-white/30">({playerCardData.balls})</span></p>
                                            </div>
                                            <div className="text-left bg-white/5 p-3 rounded-xl">
                                                <p className="text-[10px] text-white/50 uppercase tracking-widest font-black">Wickets / Runs</p>
                                                <p className="text-lg text-white font-bold">{playerCardData.wickets || 0} <span className="text-xs text-white/30">({playerCardData.runsGiven || 0})</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-4 border-l-4 border-yellow-500 text-left">
                                        <p className="text-sm font-bold text-white/80 italic leading-relaxed">
                                            "{playerCardData.quote}"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'PREMIUM_SETTINGS' && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-950/90 border border-white/10 p-8 rounded-[3rem] shadow-2xl w-full max-w-md backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black italic text-white uppercase font-display">Premium <span className="text-yellow-400 font-display">Pro</span></h2>
                            <button onClick={() => setActiveModal(null)} className="w-10 h-10 bg-white/5 border border-white/10 rounded-full font-black text-white/60 hover:bg-white/10 hover:text-white flex items-center justify-center">✕</button>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Scoreboard Theme</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {['classic', 'dark', 'csk', 'rcb', 'mi'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => { setTheme(t); localStorage.setItem('turf_theme', t); }}
                                        className={`p-3 rounded-2xl border text-xs font-black uppercase transition-all ${theme === t ? 'border-yellow-400 bg-yellow-500/10 text-yellow-400' : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'}`}
                                    >
                                        {t === 'csk' ? '🟡 CSK Whistle' : t === 'rcb' ? '🔴 RCB Bold' : t === 'mi' ? '🔵 MI Duniya' : t === 'dark' ? '🌙 Dark Mode' : '⚪ Classic'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Sound Pack</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {['classic', 'meme'].map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => { setSoundPack(s); localStorage.setItem('turf_sound', s); }}
                                        className={`p-3 rounded-2xl border text-xs font-black uppercase transition-all ${soundPack === s ? 'border-yellow-400 bg-yellow-500/10 text-yellow-400' : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'}`}
                                    >
                                        {s === 'classic' ? '🏟️ Broadcast' : '😂 Meme Mode'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => setActiveModal(null)} className="w-full p-4 rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-[#080B10] font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 active:scale-95 transition-all font-display">Save Changes</button>
                    </div>
                </div>
            )}

            {/* Give some padding at the bottom so the fixed admin controls don't overlap content */}
            <div className="h-64 md:h-48 w-full shrink-0"></div>

            {/* HIDDEN GRAND REPORT CANVAS FOR EXPORT */}
            {match.isCompleted && (
                <div className="fixed top-[20000px] left-[-9999px] overflow-visible no-print">
                    <div ref={grandReportRef} className="bg-[#080B10] text-white w-[1200px] flex flex-col font-sans pt-16 pb-12 px-12 border border-white/10 rounded-[3rem]">
                        <div className="text-center px-20">
                            <h1 className="text-6xl font-black text-white uppercase tracking-wide mb-6 font-display">TURF SCORE PRO</h1>
                            <h2 className="text-4xl font-bold text-yellow-400 uppercase tracking-wide mb-8 font-display">{calculateMatchResult()}</h2>
                            <p className="text-2xl text-white/80 italic font-medium leading-relaxed px-10">"{matchSummary || 'What a phenomenal match! Both teams fought hard till the very end, but only one could emerge victorious on this beautiful day of turf cricket.'}"</p>
                        </div>
                        
                        <hr className="border-t border-white/10 my-12" />

                        <div className="grid grid-cols-3 gap-8 mb-12">
                            {(() => {
                                const awards = calculateAwards();
                                if(!awards) return null;
                                return (
                                    <>
                                    <div className="border border-white/10 bg-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-md">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                        </svg>
                                        <p className="font-bold text-sm text-white/60 mb-4 uppercase tracking-widest">MVP</p>
                                        <p className="text-4xl font-black italic text-white mb-3 font-display">{awards.mvp?.name || 'Player'}</p>
                                        <p className="text-yellow-400 text-xl font-display">{awards.mvp?.points || 0} Points</p>
                                    </div>
                                    <div className="border border-white/10 bg-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-md">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                            <path d="M12 6c-3.87 0-7 3.13-7 7H2v3h20v-3h-3c0-3.87-3.13-7-7-7z"/>
                                        </svg>
                                        <p className="font-bold text-sm text-white/60 mb-4 uppercase tracking-widest">ORANGE CAP</p>
                                        <p className="text-4xl font-black italic text-white mb-3 font-display">{awards.orange?.name || 'Player'}</p>
                                        <p className="text-amber-500 text-xl font-display">{awards.orange?.runs || 0} Runs</p>
                                    </div>
                                    <div className="border border-white/10 bg-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-md">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-purple-400 mb-6 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                            <path d="M12 6c-3.87 0-7 3.13-7 7H2v3h20v-3h-3c0-3.87-3.13-7-7-7z"/>
                                        </svg>
                                        <p className="font-bold text-sm text-white/60 mb-4 uppercase tracking-widest">PURPLE CAP</p>
                                        <p className="text-4xl font-black italic text-white mb-3 font-display">{awards.purple?.name || 'Player'}</p>
                                        <p className="text-purple-400 text-xl font-display">{awards.purple?.wickets || 0} Wickets</p>
                                    </div>
                                    </>
                                )
                            })()}
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-16">
                            {renderGrandReportInnings(match.firstInningsData, match.bowlingTeam?.name)}
                            {renderGrandReportInnings(match, match.battingTeam?.name)}
                        </div>

                        <div className="text-center font-bold text-white/40 text-[12px] tracking-[0.4em] uppercase pt-4">
                            GENERATED BY TURF SCORE PRO
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    };

    const renderSpecialEventOverlay = () => {
        if (!specialEvent) return null;
        
        let bgColor = "bg-red-600/90";
        let text = "WICKET!";
        let animation = "animate-bounce";

        if (specialEvent === 'SIX') {
            bgColor = "bg-yellow-500/90";
            text = "SIX!";
            animation = "animate-pulse scale-150";
        } else if (specialEvent === 'FOUR') {
            bgColor = "bg-blue-600/90";
            text = "FOUR!";
            animation = "animate-pulse scale-125";
        } else if (specialEvent === 'THALA') {
            bgColor = "bg-yellow-500/90";
            text = "THALA FOR A REASON";
            animation = "animate-pulse scale-110 text-center";
        } else if (specialEvent !== 'WICKET') {
            // Fallback for unknown events
            return null;
        }

        return (
            <div className={`fixed inset-0 z-[999] flex items-center justify-center ${bgColor} backdrop-blur-md transition-all duration-300`}>
                <h1 className={`text-6xl md:text-[12rem] font-black italic text-white drop-shadow-2xl ${animation} px-4`}>
                    {text}
                </h1>
            </div>
        );
    };

    return (
        <div className="font-sans">
            {renderSpecialEventOverlay()}
            {renderFullScorecard()}
        </div>
    );
};

export default MatchDashboard;