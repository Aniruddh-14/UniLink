import { useEffect, useRef, useState } from "react"
import { Room } from "./Room";

const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
const BACKEND_URL = envUrl || (import.meta.env.PROD ? "" : `http://${window.location.hostname}:3000`);

export const Landing = () => {
    const [email, setEmail] = useState("test@mit.edu");
    const [name, setName] = useState("");
    const [step, setStep] = useState<'email' | 'name'>('email');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setlocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        document.body.className = theme === 'dark' ? 'dark-mode' : '';
    }, [theme]);
    const [joined, setJoined] = useState(false);

    const getCam = async () => {
        try {
            const stream = await window.navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            })
            // MediaStream
            const audioTrack = stream.getAudioTracks()[0]
            const videoTrack = stream.getVideoTracks()[0]
            setLocalAudioTrack(audioTrack);
            setlocalVideoTrack(videoTrack);
            if (videoRef.current) {
                // Stop any existing playback to prevent interruption
                if (videoRef.current.srcObject) {
                    const oldStream = videoRef.current.srcObject as MediaStream;
                    oldStream.getTracks().forEach(track => track.stop());
                }
                videoRef.current.srcObject = new MediaStream([videoTrack])
                videoRef.current.play().catch(err => {
                    if (err.name !== 'AbortError') {
                        console.error("Error playing video:", err);
                    }
                });
            }
        } catch (error) {
            console.error("Error accessing camera/microphone:", error);
            alert("Could not access camera/microphone. Please allow permissions and refresh the page.");
        }
    }

    useEffect(() => {
        getCam();
    }, []);

    useEffect(() => {
        if (!videoRef.current || !localVideoTrack) {
            return;
        }

        const currentStream = videoRef.current.srcObject as MediaStream | null;
        const currentTrack = currentStream?.getVideoTracks()[0];

        // Only stop the preview track if it's different from the incoming track.
        if (currentTrack && currentTrack !== localVideoTrack) {
            currentTrack.stop();
        }

        if (currentTrack !== localVideoTrack) {
            videoRef.current.srcObject = new MediaStream([localVideoTrack]);
        }

        videoRef.current
            .play()
            .catch(err => {
                if (err.name !== 'AbortError') {
                    console.error("Error playing video:", err);
                }
            });
    }, [localVideoTrack, videoRef]);

    const verifyEmail = async () => {
        if (!email.trim()) {
            setError('Please enter your college email');
            return;
        }

        setLoading(true);
        setError("");

        console.log('Backend URL:', BACKEND_URL);
        console.log('Attempting to verify email:', email.trim());

        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${BACKEND_URL}/api/auth/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    name: name.trim() || 'User'
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Invalid response' }));
                setError(errorData.error || 'Invalid email address');
                setLoading(false);
                return;
            }

            const data = await response.json();

            setVerifiedEmail(email.trim());
            if (data.user && data.user.name) {
                setName(data.user.name);
            }
            setStep('name');
            setLoading(false);
        } catch (error: any) {
            console.error('Error verifying email:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            if (error.name === 'AbortError') {
                setError('Request timed out. Please check your connection and try again.');
            } else {
                setError('Failed to verify email. Please try again.');
            }
            setLoading(false);
        }
    };

    const handleStartChatting = () => {
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!verifiedEmail) {
            setError('Please verify your email first');
            return;
        }
        setJoined(true);
    };

    const handleLeaveRoom = () => {
        setJoined(false);
    };

    if (!joined) {
        return (
            <div className="landing-container">
                <div className="ambient-orb orb-1"></div>
                <div className="ambient-orb orb-2"></div>

                <nav className="nav-header glass-panel">
                    <div className="brand-logo">
                        <div className="brand-icon">UL</div>
                        <div className="brand-text-container">
                            <span className="brand-title">UniLink</span>
                        </div>
                    </div>
                    <div className="nav-actions">
                        {/* the theme toggle icon has been removed per user request */}
                    </div>
                </nav>

                <main className="hero-grid">
                    <div className="hero-text-content">
                        <h1>Instant connections,<br />campus wide.</h1>
                        <p>
                            Jump into spontaneous video conversations with learners across the ecosystem.
                            Every profile is email-verified for a trusted, campus-only vibe.
                        </p>
                        <div className="stats-row">
                            <div className="stat-box">
                                <span className="stat-number">24/7</span>
                                <span className="stat-label">Active Matches</span>
                            </div>
                            <div className="stat-box">
                                <span className="stat-number">100%</span>
                                <span className="stat-label">Verified</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-interaction-panel">
                        <div className="video-preview-wrapper glass-panel">
                            <div className="preview-badge">
                                <div className="pulse-dot"></div> Live Preview
                            </div>
                            <video
                                autoPlay
                                ref={videoRef}
                                muted
                            ></video>
                        </div>

                        <div className="form-glass-card glass-panel">
                            {error && (
                                <div className="alert-error">
                                    {error}
                                </div>
                            )}

                            {step === 'email' && (
                                <>
                                    <div className="input-group">
                                        <label>College Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@college.edu"
                                            className="glass-input"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && email.trim()) {
                                                    verifyEmail();
                                                }
                                            }}
                                        />
                                        <span className="helper-text">Only verified college domains are accepted.</span>
                                    </div>
                                    <button
                                        onClick={verifyEmail}
                                        disabled={!email.trim() || loading}
                                        className="btn-glow"
                                    >
                                        {loading ? 'Verifying...' : 'Continue'}
                                    </button>
                                </>
                            )}

                            {step === 'name' && (
                                <>
                                    <div className="badge-success">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        Verified: {verifiedEmail}
                                    </div>
                                    <div className="input-group">
                                        <label>How should people call you?</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your Name"
                                            className="glass-input"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && name.trim()) {
                                                    handleStartChatting();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        <button
                                            onClick={() => {
                                                setStep('email');
                                                setError('');
                                            }}
                                            className="btn-ghost"
                                            style={{ flex: 1 }}
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleStartChatting}
                                            disabled={!name.trim()}
                                            className="btn-glow"
                                            style={{ flex: 2 }}
                                        >
                                            Enter Lobby
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <Room
            name={name}
            email={verifiedEmail || ''}
            localAudioTrack={localAudioTrack}
            localVideoTrack={localVideoTrack}
            onLeave={handleLeaveRoom}
        />
    )
}