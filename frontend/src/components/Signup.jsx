import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            // Try to login first
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/login`, { identifier: name });
            localStorage.setItem('user', JSON.stringify(res.data.player));
            navigate('/home');
        } catch (err) {
            // If player not found, sign them up automatically
            if (err.response && err.response.status === 404) {
                try {
                    const signupRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/signup`, {
                        name: name,
                        profilePic: '',
                        role: 'Batsman'
                    });
                    
                    // After signup, login with their new tid
                    const loginRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/login`, { identifier: signupRes.data.player.tid });
                    localStorage.setItem('user', JSON.stringify(loginRes.data.player));
                    navigate('/home');
                } catch (signupErr) {
                    alert(signupErr.response?.data?.message || "Error creating player. Check backend.");
                }
            } else {
                alert(err.response?.data?.message || "Check if Backend is running!");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6 relative overflow-hidden">
            <div className="w-full max-w-md z-10">
                <div className="text-center mb-10">
                    <h1 className="text-7xl font-black text-yellow-500 mb-2 tracking-tighter italic leading-none">
                        TURF<span className="text-white">PRO</span>
                    </h1>
                    <p className="text-yellow-500/70 font-bold uppercase tracking-[0.4em] text-[10px]">Enter to Host or Join</p>
                </div>

                <div className="bg-[#111] border border-yellow-500/20 p-10 rounded-[3rem] shadow-2xl">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest ml-1">
                                Your Name
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your name..."
                                className="w-full p-5 bg-black border border-yellow-500/30 rounded-2xl focus:ring-2 focus:ring-yellow-500 outline-none text-white placeholder:text-gray-600 transition-all font-bold"
                                onChange={(e) => setName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>

                        <button 
                            onClick={handleLogin} 
                            disabled={loading || !name.trim()}
                            className="w-full py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-xl disabled:opacity-50"
                        >
                            {loading ? "Entering..." : "Login"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;