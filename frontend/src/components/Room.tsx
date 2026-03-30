import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";

// Use backend URL from env if provided, otherwise use the current page host.
// This allows opening the app from another device on the same network without code changes.
const BACKEND_HOST = (import.meta as any).env?.VITE_BACKEND_URL || window.location.hostname;
const URL = BACKEND_HOST.startsWith('http') ? BACKEND_HOST : `http://${BACKEND_HOST}:3000`;

type ChatMessage = {
    id: string;
    text: string;
    sender: 'me' | 'peer';
    senderName: string;
    timestamp: string;
};

export const Room = ({
    name,
    email,
    localAudioTrack,
    localVideoTrack,
    onLeave
}: {
    name: string,
    email: string,
    localAudioTrack: MediaStreamTrack | null,
    localVideoTrack: MediaStreamTrack | null,
    onLeave: () => void,
}) => {
    const [lobby, setLobby] = useState(true);
    const [socket, setSocket] = useState<null | Socket>(null);
    const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
    const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const chatBottomRef = useRef<HTMLDivElement | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');

    const handleRemoteTrack = (event: RTCTrackEvent) => {
        const videoElement = remoteVideoRef.current;
        if (!videoElement) {
            return;
        }

        const incomingStream = event.streams?.[0];
        if (incomingStream && videoElement.srcObject !== incomingStream) {
            videoElement.srcObject = incomingStream;
        } else if (!incomingStream) {
            const currentStream = (videoElement.srcObject as MediaStream | null) ?? new MediaStream();
            const alreadyAdded = currentStream.getTracks().some(track => track.id === event.track.id);
            if (!alreadyAdded) {
                currentStream.addTrack(event.track);
            }
            if (videoElement.srcObject !== currentStream) {
                videoElement.srcObject = currentStream;
            }
        }

        videoElement.play().catch(err => {
            if (err.name !== "AbortError") {
                console.error("Failed to start remote video", err);
            }
        });
    };

    useEffect(() => {
        const socket = io(URL);
        
        // Send join event with email and name
        socket.emit('join', { email, name, interests: [] });
        
        socket.on('error', ({ message }: { message: string }) => {
            alert(message);
        });
        
        socket.on('user-disconnected', () => {
            setLobby(true);
            alert('The other user disconnected. Searching for a new match...');
        });

        socket.on("chat-message", ({ roomId: incomingRoomId, message, senderName, timestamp }: { roomId: string, message: string, senderName: string, timestamp: string }) => {
            setMessages(prev => ([
                ...prev,
                {
                    id: `${incomingRoomId}-${Date.now()}`,
                    text: message,
                    sender: 'peer',
                    senderName: senderName || 'Stranger',
                    timestamp: timestamp || new Date().toISOString()
                }
            ]));
        });
        
        socket.on('send-offer', async ({roomId}) => {
            console.log("sending offer");
            setLobby(false);
            setCurrentRoomId(roomId);
            const pc = new RTCPeerConnection();

            setSendingPc(pc);
            const localStream = new MediaStream();
            if (localVideoTrack) {
                localStream.addTrack(localVideoTrack);
            }
            if (localAudioTrack) {
                localStream.addTrack(localAudioTrack);
            }
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

            pc.onicecandidate = async (e) => {
                console.log("receiving ice candidate locally");
                if (e.candidate) {
                   socket.emit("add-ice-candidate", {
                    candidate: e.candidate,
                    type: "sender",
                    roomId
                   })
                }
            }

            pc.onnegotiationneeded = async () => {
                console.log("on negotiation neeeded, sending offer");
                const sdp = await pc.createOffer();
                //@ts-ignore
                pc.setLocalDescription(sdp)
                socket.emit("offer", {
                    sdp,
                    roomId
                })
            }

            pc.ontrack = handleRemoteTrack;
        });

        socket.on("offer", async ({roomId, sdp: remoteSdp}) => {
            console.log("received offer");
            setLobby(false);
            setCurrentRoomId(roomId);
            const pc = new RTCPeerConnection();
            const localStream = new MediaStream();
            if (localVideoTrack) {
                localStream.addTrack(localVideoTrack);
            }
            if (localAudioTrack) {
                localStream.addTrack(localAudioTrack);
            }
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
            pc.setRemoteDescription(remoteSdp)
            const sdp = await pc.createAnswer();
            //@ts-ignore
            pc.setLocalDescription(sdp)

            setReceivingPc(pc);
            pc.ontrack = handleRemoteTrack;

            pc.onicecandidate = async (e) => {
                if (!e.candidate) {
                    return;
                }
                console.log("omn ice candidate on receiving seide");
                if (e.candidate) {
                   socket.emit("add-ice-candidate", {
                    candidate: e.candidate,
                    type: "receiver",
                    roomId
                   })
                }
            }

            socket.emit("answer", {
                roomId,
                sdp: sdp
            });
        });

        socket.on("answer", ({ sdp: remoteSdp }) => {
            setLobby(false);
            setSendingPc(pc => {
                pc?.setRemoteDescription(remoteSdp)
                return pc;
            });
            console.log("loop closed");
        })

        socket.on("lobby", () => {
            setLobby(true);
        })

        socket.on("add-ice-candidate", ({candidate, type}) => {
            console.log("add ice candidate from remote");
            console.log({candidate, type})
            if (type == "sender") {
                setReceivingPc(pc => {
                    if (!pc) {
                        console.error("receicng pc nout found")
                    }
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            } else {
                setSendingPc(pc => {
                    if (!pc) {
                        console.error("sending pc nout found")
                    }
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            }
        })

        setSocket(socket)

        return () => {
            socket.disconnect();
        }
    }, [name])

    useEffect(() => {
        if (!localVideoRef.current || !localVideoTrack) return;

        localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
        localVideoRef.current.play().catch((err) => {
            if (err.name !== "AbortError") {
                console.error("Failed to start local video preview", err);
            }
        });
    }, [localVideoTrack])

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (lobby) {
            setMessages([]);
        }
    }, [lobby]);

    const handleDisconnect = () => {
        if (socket && currentRoomId) {
            socket.emit('disconnect-room');
            setLobby(true);
            setCurrentRoomId(null);
            setMessages([]);
            setChatInput('');
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
            // Clean up peer connections
            if (sendingPc) {
                sendingPc.close();
                setSendingPc(null);
            }
            if (receivingPc) {
                receivingPc.close();
                setReceivingPc(null);
            }
        }
    };

    const handleCancelSearch = () => {
        if (sendingPc) {
            sendingPc.close();
            setSendingPc(null);
        }
        if (receivingPc) {
            receivingPc.close();
            setReceivingPc(null);
        }
        setMessages([]);
        setChatInput('');
        setCurrentRoomId(null);
        setLobby(true);
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }
        onLeave();
    };

    const handleReport = () => {
        if (socket && currentRoomId) {
            if (confirm('Are you sure you want to report this user?')) {
                socket.emit('report-user', { roomId: currentRoomId });
                handleDisconnect();
            }
        }
    };

    const handleSendMessage = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!socket || !currentRoomId) return;
        const text = chatInput.trim();
        if (!text) return;

        const newMessage: ChatMessage = {
            id: `${currentRoomId}-${Date.now()}`,
            text,
            sender: 'me',
            senderName: name,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMessage]);
        socket.emit('chat-message', { roomId: currentRoomId, message: text });
        setChatInput('');
    };

    return (
        <div className="room-container">
            <div className="ambient-orb orb-1"></div>
            <div className="ambient-orb orb-2"></div>
            
            <header className="room-control-bar glass-panel" style={{ margin: '1rem', borderRadius: '16px' }}>
                <div className="brand-logo">
                    <div className="brand-icon" style={{ width: '30px', height: '30px', fontSize: '1rem' }}>UL</div>
                    <span className="brand-title" style={{ fontSize: '1.1rem' }}>UniLink Room</span>
                </div>
                <div className="control-group">
                    <span className="overlay-pill" style={{ background: lobby ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)' }}>
                        {lobby ? 'Searching...' : 'Connected'}
                    </span>
                    <button 
                        onClick={handleReport}
                        className="btn-ghost"
                        disabled={lobby}
                    >
                        Report
                    </button>
                    <button 
                        onClick={lobby ? handleCancelSearch : handleDisconnect}
                        className={lobby ? 'btn-ghost' : 'btn-glow btn-danger'}
                    >
                        {lobby ? 'Cancel Search' : 'Skip Next'}
                    </button>
                </div>
            </header>

            <div className="room-layout-grid">
                <div className="video-arena glass-panel">
                    {!lobby && (
                        <div className="video-overlay-info">
                            <span className="overlay-pill">Stranger</span>
                        </div>
                    )}
                    {lobby && (
                        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', zIndex: 10 }}>
                            <div className="pulse-dot" style={{ display: 'inline-block', margin: '0 auto 1rem', width: '12px', height: '12px' }}></div>
                            <h2>Finding a match...</h2>
                            <p>Hang tight, we're pairing you with someone.</p>
                        </div>
                    )}
                    <video 
                        autoPlay 
                        playsInline
                        ref={remoteVideoRef}
                        className="remote-video-full"
                        style={{ display: lobby ? 'none' : 'block' }}
                    />
                    <div className="local-video-pip">
                        <video
                            autoPlay
                            playsInline
                            ref={localVideoRef}
                            muted
                        />
                    </div>
                </div>

                <div className="chat-sidebar glass-panel">
                    <div className="chat-messages-area">
                        {messages.length === 0 && (
                            <div className="chat-empty-state">
                                {lobby ? 'Chat unlocks when you connect.' : 'Say hi! Send the first message.'}
                            </div>
                        )}
                        {messages.map(message => (
                            <div
                                key={message.id}
                                className={`chat-bubble ${message.sender === 'me' ? 'me' : 'peer'}`}
                            >
                                <div className="bubble-sender">
                                    {message.sender === 'me' ? 'You' : message.senderName}
                                </div>
                                <div className="bubble-text">{message.text}</div>
                            </div>
                        ))}
                        <div ref={chatBottomRef} />
                    </div>
                    
                    <div className="chat-input-area">
                        <form className="chat-form" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder={lobby ? 'Waiting for peer...' : 'Type a message...'}
                                className="glass-input"
                                disabled={lobby}
                            />
                            <button
                                type="submit"
                                className="btn-send"
                                disabled={lobby || !chatInput.trim()}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

