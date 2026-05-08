import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [isLogin, setIsLogin] = useState(false);
    const [name, setName] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [generatedTid, setGeneratedTid] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleAction = async () => {
        setLoading(true);
        try {
            const endpoint = isLogin ? '/api/login' : '/api/signup';
            const payload = isLogin ? { identifier } : { name };

            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`, payload);

            if (isLogin) {
                localStorage.setItem('user', JSON.stringify(res.data.player));
                navigate('/home');
            } else {
                setGeneratedTid(res.data.player.tid);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Check if Backend is running!");
        } finally {
            setLoading(false);
        }
    };

    const switchToLogin = () => {
        setGeneratedTid(null);
        setIsLogin(true);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-6 relative overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-700"></div>

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-10">
                    <h1 className="text-6xl font-black text-white mb-2 tracking-tighter italic">
                        TURF<span className="text-emerald-500">PRO</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">Professional Cricket Scoring</p>
                </div>

                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
                    {generatedTid ? (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Registration Successful!</p>
                            <p className="text-[10px] text-slate-500 mb-2">Save your Unique TID:</p>
                            <h2 className="text-4xl font-black text-white tracking-widest bg-white/5 py-6 rounded-3xl border border-emerald-500/30 mb-8 font-mono">
                                {generatedTid}
                            </h2>
                            <button 
                                onClick={switchToLogin} 
                                className="w-full py-5 bg-emerald-500 text-slate-950 font-black rounded-2xl uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-emerald-500/20"
                            >
                                Continue to Login
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                    {isLogin ? "Your Identity" : "Full Name"}
                                </label>
                                <input
                                    type="text"
                                    placeholder={isLogin ? "Name or TID" : "e.g. MS Dhoni"}
                                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-white placeholder:text-slate-600 transition-all font-bold"
                                    onChange={(e) => isLogin ? setIdentifier(e.target.value) : setName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAction()}
                                />
                            </div>

                            <button 
                                onClick={handleAction} 
                                disabled={loading}
                                className="w-full py-5 bg-white text-slate-950 font-black rounded-2xl uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl disabled:opacity-50"
                            >
                                {loading ? "Verifying..." : (isLogin ? "Sign In" : "Create TID")}
                            </button>

                            <div className="pt-4 text-center">
                                <button 
                                    onClick={() => setIsLogin(!isLogin)} 
                                    className="text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors"
                                >
                                    {isLogin ? "Don't have a TID? " : "Already registered? "}
                                    <span className="text-emerald-500 underline underline-offset-4 decoration-2 ml-1">
                                        {isLogin ? "Sign Up" : "Login"}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                <p className="text-center mt-10 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Build for the Turf. Powered by AI.
                </p>
            </div>
        </div>
    );
};

export default Signup;