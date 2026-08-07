import { useEffect, useRef, useState, useCallback } from 'react';

export interface CloudModeStatus {
    isCloudModeEnabled: boolean;
    isWakeLockActive: boolean;
    isAudioKeepAliveActive: boolean;
    isWorkerActive: boolean;
    wakeLockSupported: boolean;
}

export const useCloudBackgroundManager = (isBotRunning: boolean, onBackgroundPulse?: () => void) => {
    const [isCloudModeEnabled, setIsCloudModeEnabled] = useState<boolean>(() => {
        const saved = localStorage.getItem('isCloudModeEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [isWakeLockActive, setIsWakeLockActive] = useState(false);
    const [isAudioKeepAliveActive, setIsAudioKeepAliveActive] = useState(false);
    const [isWorkerActive, setIsWorkerActive] = useState(false);
    const wakeLockRef = useRef<any>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const workerRef = useRef<Worker | null>(null);

    const wakeLockSupported = typeof window !== 'undefined' && 'wakeLock' in navigator;

    // Toggle Cloud Mode
    const toggleCloudMode = useCallback((enable?: boolean) => {
        setIsCloudModeEnabled(prev => {
            const next = enable !== undefined ? enable : !prev;
            localStorage.setItem('isCloudModeEnabled', JSON.stringify(next));
            return next;
        });
    }, []);

    // 1. Wake Lock Handler
    const requestWakeLock = useCallback(async () => {
        if (!wakeLockSupported || wakeLockRef.current) return;
        try {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            setIsWakeLockActive(true);
            wakeLockRef.current.addEventListener('release', () => {
                setIsWakeLockActive(false);
                wakeLockRef.current = null;
            });
        } catch (err) {
            console.warn('[Cloud Mode] WakeLock error:', err);
            setIsWakeLockActive(false);
        }
    }, [wakeLockSupported]);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
            } catch (err) {
                console.warn('[Cloud Mode] WakeLock release error:', err);
            }
            wakeLockRef.current = null;
            setIsWakeLockActive(false);
        }
    }, []);

    // 2. Silent Audio Keep-Alive Handler
    const startAudioKeepAlive = useCallback(() => {
        if (audioCtxRef.current) return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            
            // Gain at near zero so audio is inaudible but active for OS media session
            const gainNode = ctx.createGain();
            gainNode.gain.value = 0.001; 

            const osc = ctx.createOscillator();
            osc.frequency.value = 440; // Standard pitch
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.start();
            audioCtxRef.current = ctx;
            setIsAudioKeepAliveActive(true);
        } catch (err) {
            console.warn('[Cloud Mode] Audio Keep-Alive error:', err);
        }
    }, []);

    const stopAudioKeepAlive = useCallback(() => {
        if (audioCtxRef.current) {
            try {
                audioCtxRef.current.close();
            } catch (err) {
                console.warn('[Cloud Mode] Audio stop error:', err);
            }
            audioCtxRef.current = null;
            setIsAudioKeepAliveActive(false);
        }
    }, []);

    // 3. Web Worker Background Heartbeat (Bypasses Tab Throttling)
    const startBackgroundWorker = useCallback(() => {
        if (workerRef.current) return;
        try {
            const workerCode = `
                let timer = null;
                self.onmessage = function(e) {
                    if (e.data === 'start') {
                        if (!timer) {
                            timer = setInterval(() => {
                                self.postMessage('pulse');
                            }, 1000);
                        }
                    } else if (e.data === 'stop') {
                        if (timer) {
                            clearInterval(timer);
                            timer = null;
                        }
                    }
                };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            worker.onmessage = (e) => {
                if (e.data === 'pulse' && onBackgroundPulse) {
                    onBackgroundPulse();
                }
            };

            worker.postMessage('start');
            workerRef.current = worker;
            setIsWorkerActive(true);
        } catch (err) {
            console.warn('[Cloud Mode] Background Worker error:', err);
        }
    }, [onBackgroundPulse]);

    const stopBackgroundWorker = useCallback(() => {
        if (workerRef.current) {
            try {
                workerRef.current.postMessage('stop');
                workerRef.current.terminate();
            } catch (err) {
                console.warn('[Cloud Mode] Worker terminate error:', err);
            }
            workerRef.current = null;
            setIsWorkerActive(false);
        }
    }, []);

    // Effect: Manage background cloud execution services when bot is running and cloud mode is enabled
    useEffect(() => {
        const shouldRunBackgroundServices = isBotRunning && isCloudModeEnabled;

        if (shouldRunBackgroundServices) {
            requestWakeLock();
            startAudioKeepAlive();
            startBackgroundWorker();
        } else {
            releaseWakeLock();
            stopAudioKeepAlive();
            stopBackgroundWorker();
        }

        return () => {
            releaseWakeLock();
            stopAudioKeepAlive();
            stopBackgroundWorker();
        };
    }, [isBotRunning, isCloudModeEnabled, requestWakeLock, releaseWakeLock, startAudioKeepAlive, stopAudioKeepAlive, startBackgroundWorker, stopBackgroundWorker]);

    // Handle Page Visibility Change (Re-acquire wake lock if tab comes back)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isBotRunning && isCloudModeEnabled) {
                requestWakeLock();
                if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                    audioCtxRef.current.resume().catch(() => {});
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isBotRunning, isCloudModeEnabled, requestWakeLock]);

    return {
        isCloudModeEnabled,
        toggleCloudMode,
        isWakeLockActive,
        isAudioKeepAliveActive,
        isWorkerActive,
        wakeLockSupported
    };
};
