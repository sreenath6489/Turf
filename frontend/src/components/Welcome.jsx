import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Welcome = ({ onEnter }) => {
    const [isExiting, setIsExiting] = useState(false);

    const handleEnter = () => {
        setIsExiting(true);
        setTimeout(onEnter, 1000);
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-[#0B0E14] overflow-hidden flex items-center justify-center font-sans">
            {/* 3D PERSPECTIVE GRID */}
            <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: 'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                transform: 'perspective(500px) rotateX(60deg) translateY(-100px)',
                maskImage: 'linear-gradient(to bottom, transparent, black)'
            }}></div>

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
                                rotateY: [0, 15, -15, 0],
                                rotateX: [0, 10, -10, 0],
                                y: [0, -20, 0]
                            }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="mb-12 relative group"
                        >
                            <h1 className="text-8xl md:text-9xl font-black italic text-white tracking-tighter flex flex-col items-center leading-none">
                                <span className="relative">
                                    TURF
                                    <span className="absolute -inset-1 bg-amber-500/20 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></span>
                                </span>
                                <span className="text-amber-500 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]">PRO</span>
                            </h1>
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
                        </motion.div>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-amber-500/60 font-black uppercase tracking-[0.6em] text-[10px] mb-12"
                        >
                            The Master Edition • 2025
                        </motion.p>

                        {/* 3D INTERACTIVE BUTTON */}
                        <motion.button
                            whileHover={{ scale: 1.1, rotateX: -10, boxShadow: "0 0 50px rgba(245,158,11,0.4)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleEnter}
                            className="px-12 py-6 bg-white text-slate-950 font-black rounded-[2rem] uppercase tracking-[0.3em] italic shadow-2xl relative overflow-hidden group"
                        >
                            <span className="relative z-10">Step Into The Arena</span>
                            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </motion.button>

                        <div className="mt-20 flex gap-4 opacity-30">
                            {[1, 2, 3].map(i => (
                                <motion.div 
                                    key={i}
                                    animate={{ height: [10, 30, 10] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    className="w-1 bg-white rounded-full"
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
