import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Welcome = ({ onEnter }) => {
    const [isExiting, setIsExiting] = useState(false);

    const handleEnter = () => {
        setIsExiting(true);
        setTimeout(onEnter, 1000);
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-[#05070a] overflow-hidden flex items-center justify-center font-sans selection:bg-red-500/25">
            {/* VIDEO BACKGROUND */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0 opacity-30 pointer-events-none"
            >
                <source src="/background.mp4" type="video/mp4" />
            </video>

            {/* RADIAL DARK GRADIENT OVERLAY */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#05070a] via-transparent to-[#05070a] z-0 pointer-events-none"></div>
            <div className="absolute inset-0 bg-black/50 z-0 pointer-events-none"></div>

            {/* 3D PERSPECTIVE PITCH */}
            <div className="absolute inset-0 opacity-[0.08] z-0" style={{ 
                backgroundImage: 'linear-gradient(to right, #ef4444 1px, transparent 1px), linear-gradient(to bottom, #ef4444 1px, transparent 1px)',
                backgroundSize: '80px 80px',
                transform: 'perspective(500px) rotateX(60deg) translateY(-80px)',
                maskImage: 'linear-gradient(to bottom, transparent, black)'
            }}></div>

            {/* FLOATING STUMPS BACKGROUND */}
            <div className="absolute top-1/4 right-12 opacity-[0.04] rotate-12 scale-150 z-0 pointer-events-none">
                <svg width="100" height="200" viewBox="0 0 100 200" fill="#ef4444">
                    <rect x="20" y="20" width="8" height="160" rx="3" />
                    <rect x="46" y="20" width="8" height="160" rx="3" />
                    <rect x="72" y="20" width="8" height="160" rx="3" />
                    <rect x="15" y="10" width="70" height="6" rx="2" />
                </svg>
            </div>

            <AnimatePresence>
                {!isExiting && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)', transition: { duration: 0.8, ease: "easeInOut" } }}
                        className="relative z-10 flex flex-col items-center max-w-lg w-full px-6"
                    >
                        {/* GLASS CONTAINER */}
                        <div className="w-full bg-white/[0.02] border border-white/10 backdrop-blur-xl p-10 md:p-14 rounded-[3.5rem] shadow-2xl flex flex-col items-center glow-red">
                            
                            {/* FLOATING LOGO */}
                            <motion.div
                                animate={{ 
                                    rotateY: [0, 5, -5, 0],
                                    rotateX: [0, 3, -3, 0],
                                    y: [0, -10, 0]
                                }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="mb-8 relative group"
                                style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
                            >
                                <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter flex flex-col items-center leading-none font-display text-white">
                                    <span className="relative drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                                        TURF
                                        <span className="absolute -inset-4 bg-red-500/10 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity"></span>
                                    </span>
                                    <span className="text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.4)]">PRO</span>
                                </h1>
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                            </motion.div>

                            <motion.p 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-amber-400 font-bold uppercase tracking-[0.5em] text-[10px] mb-12 text-center"
                            >
                                The Master Class Arena
                            </motion.p>

                            {/* INTERACTIVE BUTTON */}
                            <motion.button
                                whileHover={{ scale: 1.03, boxShadow: "0 15px 35px rgba(245,158,11,0.2)" }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleEnter}
                                className="w-full py-5 bg-amber-400 text-black font-black rounded-3xl uppercase tracking-[0.25em] text-xs shadow-xl relative overflow-hidden group border border-amber-300/30 transition-all duration-300 cursor-pointer"
                            >
                                <span className="relative z-10 group-hover:text-white transition-colors duration-300 font-display">Step Into The Arena</span>
                                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            </motion.button>
                            
                            {/* Animated Audio/Visualizer Waves */}
                            <div className="mt-12 flex gap-1.5 opacity-60 h-8 items-end">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <motion.div 
                                        key={i}
                                        animate={{ height: [8, 28, 8] }}
                                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                                        className="w-1 bg-amber-400 rounded-full"
                                    />
                                ))}
                            </div>
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
                        className="fixed inset-0 z-[2000] bg-black"
                        transition={{ duration: 0.2 }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Welcome;
