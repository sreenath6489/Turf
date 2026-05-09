import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [isLogin, setIsLogin] = useState(false);
    const [name, setName] = useState('');
    const [profilePic, setProfilePic] = useState('');
    const [role, setRole] = useState('All-Rounder');
    const [identifier, setIdentifier] = useState('');
    const [generatedTid, setGeneratedTid] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePic(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAction = async () => {
        setLoading(true);
        try {
            const endpoint = isLogin ? '/api/login' : '/api/signup';
            const payload = isLogin ? { identifier } : { name, profilePic, role };

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF4EA] p-6 relative overflow-hidden">
            {/* Grainy Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstripe-light.png')]"></div>

            {/* Animated Background Cricketing Elements */}
            <div className="absolute top-10 -left-20 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-10 -right-20 w-96 h-96 bg-red-900/5 rounded-full blur-[100px] animate-pulse delay-700"></div>
            
            <div className="w-full max-w-md z-10">
                <div className="text-center mb-10">
                    <div className="inline-block px-4 py-1.5 bg-red-600 text-white text-[8px] font-black uppercase tracking-[0.4em] rounded-full mb-4 shadow-xl shadow-red-600/20">Official Platform</div>
                    <h1 className="text-7xl font-black text-slate-950 mb-2 tracking-tighter italic leading-none">
                        TURF<span className="text-red-600">PRO</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">Professional Scorekeeping Engine</p>
                </div>

                <div className="bg-white border border-red-900/10 p-10 rounded-[3rem] shadow-2xl shadow-red-900/5">
                    {generatedTid ? (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                 </svg>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Registration Successful!</p>
                            <p className="text-[10px] text-slate-500 mb-2">Save your Unique TID:</p>
                            <h2 className="text-4xl font-black text-slate-950 tracking-widest bg-stone-50 py-6 rounded-3xl border border-red-600/30 mb-8 font-mono">
                                {generatedTid}
                            </h2>
                            <button 
                                onClick={switchToLogin} 
                                className="w-full py-5 bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-red-600/20"
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
                                    className="w-full p-5 bg-stone-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none text-slate-900 placeholder:text-slate-300 transition-all font-bold"
                                    onChange={(e) => isLogin ? setIdentifier(e.target.value) : setName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAction()}
                                />
                            </div>

                            {!isLogin && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                            Upload Profile Photo
                                        </label>
                                        <div className="flex items-center gap-4">
                                            {profilePic && (
                                                <img src={profilePic} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-red-600" />
                                            )}
                                            <label className="flex-1 flex items-center justify-center p-5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all border-dashed">
                                                <span className="text-xs font-bold text-slate-400">
                                                    {profilePic ? "Change Photo" : "Select from Gallery"}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                            Player Role
                                        </label>
                                        <select 
                                            className="w-full p-5 bg-stone-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none text-slate-900 transition-all font-bold appearance-none"
                                            onChange={(e) => setRole(e.target.value)}
                                        >
                                            <option value="All-Rounder">All-Rounder</option>
                                            <option value="Batsman">Batsman</option>
                                            <option value="Bowler">Bowler</option>
                                            <option value="Wicket-Keeper">Wicket-Keeper</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <button 
                                onClick={handleAction} 
                                disabled={loading}
                                className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl disabled:opacity-50"
                            >
                                {loading ? "Verifying..." : (isLogin ? "Sign In" : "Create TID")}
                            </button>

                            <div className="pt-4 text-center">
                                <button 
                                    onClick={() => setIsLogin(!isLogin)} 
                                    className="text-xs font-bold text-slate-400 hover:text-red-600 transition-colors"
                                >
                                    {isLogin ? "Don't have a TID? " : "Already registered? "}
                                    <span className="text-red-600 underline underline-offset-4 decoration-2 ml-1">
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