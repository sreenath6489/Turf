import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [isLogin, setIsLogin] = useState(false);
    const [name, setName] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [generatedTid, setGeneratedTid] = useState(null);
    const navigate = useNavigate();

    const handleAction = async () => {
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
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                <h1 className="text-4xl font-black text-emerald-500 mb-2 text-center tracking-tighter">
                    TURF<span className="text-white">HERO</span>
                </h1>

                {generatedTid ? (
                    <div className="text-center">
                        <p className="text-sm text-slate-400 mb-2">Registration Successful! Your TID:</p>
                        <h2 className="text-5xl font-mono font-bold text-white tracking-widest bg-slate-800 py-4 rounded-xl border border-emerald-500/50">
                            {generatedTid}
                        </h2>
                        <button onClick={() => setIsLogin(true)} className="mt-8 text-emerald-500 font-bold underline">
                            Login Now
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder={isLogin ? "Enter Name or TID" : "Full Name"}
                            className="w-full p-4 bg-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                            onChange={(e) => isLogin ? setIdentifier(e.target.value) : setName(e.target.value)}
                        />
                        <button onClick={handleAction} className="w-full py-4 bg-emerald-500 text-black font-black rounded-xl uppercase">
                            {isLogin ? "Login" : "Generate My TID"}
                        </button>
                        <p className="text-center text-slate-500 text-sm">
                            {isLogin ? "New player?" : "Already have a TID?"}
                            <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-emerald-500 font-bold">
                                {isLogin ? "Sign Up" : "Login"}
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Signup;