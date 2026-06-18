import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [activeTab, setActiveTab] = useState('LOGIN'); // 'LOGIN' or 'SIGNUP'
    const [identifier, setIdentifier] = useState(''); // For login
    const [name, setName] = useState(''); // For signup
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async () => {
        if (!identifier.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/login`, { identifier: identifier.trim() });
            localStorage.setItem('user', JSON.stringify(res.data.player));
            navigate('/home');
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setError("Player not found. Please switch to the Sign Up tab.");
            } else {
                setError(err.response?.data?.message || "Check if Backend is running!");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        if (!name.trim()) return;
        setLoading(true);
        setError('');
        try {
            const signupRes = await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/signup`, {
                name: name.trim(),
                profilePic: '',
                role: 'All-Rounder' // Default role
            });
            
            const newPlayer = signupRes.data.player;
            alert(`Account created successfully!\n\nYour Username is: ${newPlayer.tid}\n\nPlease remember this username for future logins.`);
            
            const loginRes = await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/login`, { identifier: newPlayer.tid });
            localStorage.setItem('user', JSON.stringify(loginRes.data.player));
            navigate('/home');
        } catch (err) {
            setError(err.response?.data?.message || "Error creating player. Check backend.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6 relative overflow-hidden font-sans">
            {/* VIDEO BACKGROUND */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0 opacity-35 pointer-events-none"
            >
                <source src="/background.mp4" type="video/mp4" />
            </video>

            {/* DARK TRANSPARENT OVERLAY */}
            <div className="absolute inset-0 bg-black/60 z-0 pointer-events-none"></div>

            {/* Background elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-10">
                    <h1 className="text-6xl md:text-7xl font-black text-yellow-500 mb-2 tracking-tighter italic leading-none">
                        TURF<span className="text-white">PRO</span>
                    </h1>
                    <p className="text-yellow-500/70 font-bold uppercase tracking-[0.4em] text-[10px]">Host • Score • Analyze</p>
                </div>

                <div className="bg-[#0a0a0a] border border-yellow-500/20 p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-yellow-900/10 backdrop-blur-xl relative">
                    
                    {/* Tabs */}
                    <div className="flex gap-4 mb-8 bg-black/50 p-2 rounded-3xl border border-white/5">
                        <button 
                            onClick={() => { setActiveTab('LOGIN'); setError(''); }}
                            className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'LOGIN' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Login
                        </button>
                        <button 
                            onClick={() => { setActiveTab('SIGNUP'); setError(''); }}
                            className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'SIGNUP' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                            <p className="text-xs font-bold text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {activeTab === 'LOGIN' ? (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest ml-2">
                                        Username or Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter your TID or Name..."
                                        className="w-full p-5 bg-[#111] border border-white/10 rounded-2xl focus:border-yellow-500/50 outline-none text-white placeholder:text-gray-600 transition-all font-bold text-sm shadow-inner"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                    />
                                </div>
                                <button 
                                    onClick={handleLogin} 
                                    disabled={loading || !identifier.trim()}
                                    className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed mt-4 active:scale-95"
                                >
                                    {loading ? "Authenticating..." : "Enter Arena"}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest ml-2">
                                        Your Full Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="E.g., Sreenath"
                                        className="w-full p-5 bg-[#111] border border-white/10 rounded-2xl focus:border-yellow-500/50 outline-none text-white placeholder:text-gray-600 transition-all font-bold text-sm shadow-inner"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSignup()}
                                    />
                                    <p className="text-[9px] text-slate-500 font-bold ml-2 mt-2">A unique Username (TID) will be generated for you.</p>
                                </div>
                                <button 
                                    onClick={handleSignup} 
                                    disabled={loading || !name.trim()}
                                    className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed mt-4 active:scale-95"
                                >
                                    {loading ? "Creating..." : "Create Account"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;