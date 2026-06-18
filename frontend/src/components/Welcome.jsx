import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Welcome = ({ onEnter }) => {
    const [isExiting, setIsExiting] = useState(false);

    const handleEnter = () => {
        setIsExiting(true);
        setTimeout(onEnter, 1000);
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black overflow-hidden flex items-center justify-center font-sans">
            {/* VIDEO BACKGROUND */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 pointer-events-none"
            >
                <source src="/background.mp4" type="video/mp4" />
            </video>

            {/* DARK GRADIENT OVERLAY */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black z-0 pointer-events-none"></div>

            {/* 3D PERSPECTIVE PITCH */}
            <div className="absolute inset-0 opacity-[0.05] z-0" style={{ 
                backgroundImage: 'linear-gradient(to right, #991b1b 1px, transparent 1px), linear-gradient(to bottom, #991b1b 1px, transparent 1px)',
                backgroundSize: '60px 60px',
                transform: 'perspective(600px) rotateX(60deg) translateY(-100px)',
                maskImage: 'linear-gradient(to bottom, transparent, black)'
            }}></div>

            {/* FLOATING STUMPS BACKGROUND */}
            <div className="absolute top-1/4 right-10 opacity-[0.03] rotate-12 scale-150 z-0">
                <svg width="100" height="200" viewBox="0 0 100 200" fill="#991b1b"><rect x="20" y="20" width="8" height="160" /><rect x="46" y="20" width="8" height="160" /><rect x="72" y="20" width="8" height="160" /><rect x="15" y="10" width="70" height="5" /></svg>
            </div>

            <AnimatePresence>
                {!isExiting && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5, rotateX: 45 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                        exit={{ opacity: 0, scale: 3, filter: 'blur(20px)', transition: { duration: 0.8 } }}
                        className="relative z-10 flex flex-col items-center"
                        style={{ perspective: '1000px' }}
                    >
                        {/* 3D FLOATING LOGO */}
                        <motion.div
                            animate={{ 
                                rotateY: [0, 10, -10, 0],
                                rotateX: [0, 5, -5, 0],
                                y: [0, -15, 0]
                            }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="mb-12 relative group"
                        >
                            <h1 className="text-8xl md:text-9xl font-black italic text-white tracking-tighter flex flex-col items-center leading-none drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]">
                                <span className="relative">
                                    TURF
                                    <span className="absolute -inset-2 bg-red-600/10 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></span>
                                </span>
                                <span className="text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">PRO</span>
                            </h1>
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
                        </motion.div>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-yellow-500/90 font-black uppercase tracking-[0.6em] text-[10px] mb-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                        >
                            The Master Class • 2025
                        </motion.p>

                        {/* 3D INTERACTIVE BUTTON */}
                        <motion.button
                            whileHover={{ scale: 1.05, rotateX: -5, boxShadow: "0 20px 40px rgba(234,179,8,0.3)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleEnter}
                            className="px-12 py-6 bg-yellow-500 text-black font-black rounded-[2rem] uppercase tracking-[0.3em] italic shadow-2xl relative overflow-hidden group border border-yellow-400/20 transition-colors"
                        >
                            <span className="relative z-10 group-hover:text-white transition-colors duration-300">Step Into The Arena</span>
                            <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </motion.button>
                        
                        <div className="mt-20 flex gap-4 opacity-40">
                            {[1, 2, 3].map(i => (
                                <motion.div 
                                    key={i}
                                    animate={{ height: [10, 30, 10] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    className="w-1 bg-yellow-500 rounded-full"
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* EXIT FLASH EFFECT */}
            <AnimatePresence>
                {isExiting && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[2000] bg-white"
                        transition={{ duration: 0.2 }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Welcome;
