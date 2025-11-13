import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";

// Use backend URL from env if provided, otherwise use the current page host.
// This allows opening the app from another device on the same network without code changes.
const BACKEND_HOST = (import.meta as any).env?.VITE_BACKEND_URL || window.location.hostname;
const URL = `http://${BACKEND_HOST}:3000`;

export const Room = ({
    name,
    email,
    localAudioTrack,
    localVideoTrack
}: {
    name: string,
    email: string,
    localAudioTrack: MediaStreamTrack | null,
    localVideoTrack: MediaStreamTrack | null,
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [lobby, setLobby] = useState(true);
    const [socket, setSocket] = useState<null | Socket>(null);
    const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
    const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>();
    const localVideoRef = useRef<HTMLVideoElement>();

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
        
        socket.on('send-offer', async ({roomId}) => {
            console.log("sending offer");
            setLobby(false);
            setCurrentRoomId(roomId);
            const pc = new RTCPeerConnection();

            setSendingPc(pc);
            if (localVideoTrack) {
                console.error("added tack");
                console.log(localVideoTrack)
                pc.addTrack(localVideoTrack)
            }
            if (localAudioTrack) {
                console.error("added tack");
                console.log(localAudioTrack)
                pc.addTrack(localAudioTrack)
            }

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
        });

        socket.on("offer", async ({roomId, sdp: remoteSdp}) => {
            console.log("received offer");
            setLobby(false);
            setCurrentRoomId(roomId);
            const pc = new RTCPeerConnection();
            pc.setRemoteDescription(remoteSdp)
            const sdp = await pc.createAnswer();
            //@ts-ignore
            pc.setLocalDescription(sdp)
            const stream = new MediaStream();
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
            }

            setRemoteMediaStream(stream);
            // trickle ice 
            setReceivingPc(pc);
            window.pcr = pc;
            pc.ontrack = (e) => {
                alert("ontrack");
                // console.error("inside ontrack");
                // const {track, type} = e;
                // if (type == 'audio') {
                //     // setRemoteAudioTrack(track);
                //     // @ts-ignore
                //     remoteVideoRef.current.srcObject.addTrack(track)
                // } else {
                //     // setRemoteVideoTrack(track);
                //     // @ts-ignore
                //     remoteVideoRef.current.srcObject.addTrack(track)
                // }
                // //@ts-ignore
                // remoteVideoRef.current.play();
            }

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
            setTimeout(() => {
                const track1 = pc.getTransceivers()[0].receiver.track
                const track2 = pc.getTransceivers()[1].receiver.track
                console.log(track1);
                if (track1.kind === "video") {
                    setRemoteAudioTrack(track2)
                    setRemoteVideoTrack(track1)
                } else {
                    setRemoteAudioTrack(track1)
                    setRemoteVideoTrack(track2)
                }
                //@ts-ignore
                remoteVideoRef.current.srcObject.addTrack(track1)
                //@ts-ignore
                remoteVideoRef.current.srcObject.addTrack(track2)
                //@ts-ignore
                remoteVideoRef.current.play();
                // if (type == 'audio') {
                //     // setRemoteAudioTrack(track);
                //     // @ts-ignore
                //     remoteVideoRef.current.srcObject.addTrack(track)
                // } else {
                //     // setRemoteVideoTrack(track);
                //     // @ts-ignore
                //     remoteVideoRef.current.srcObject.addTrack(track)
                // }
                // //@ts-ignore
            }, 5000)
        });

        socket.on("answer", ({roomId, sdp: remoteSdp}) => {
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
                    } else {
                        console.error(pc.ontrack)
                    }
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            } else {
                setSendingPc(pc => {
                    if (!pc) {
                        console.error("sending pc nout found")
                    } else {
                        // console.error(pc.ontrack)
                    }
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            }
        })

        setSocket(socket)
    }, [name])

    useEffect(() => {
        if (localVideoRef.current) {
            if (localVideoTrack) {
                localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
                localVideoRef.current.play();
            }
        }
    }, [localVideoRef])

    const handleDisconnect = () => {
        if (socket && currentRoomId) {
            socket.emit('disconnect-room');
            setLobby(true);
            setCurrentRoomId(null);
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

    const handleReport = () => {
        if (socket && currentRoomId) {
            if (confirm('Are you sure you want to report this user?')) {
                socket.emit('report-user', { roomId: currentRoomId });
                handleDisconnect();
            }
        }
    };

    return <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Hi {name}!</h2>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div>
                <h3>You</h3>
                <video 
                    autoPlay 
                    width={400} 
                    height={300} 
                    ref={localVideoRef}
                    style={{ border: '2px solid #333', borderRadius: '8px' }}
                    muted
                />
            </div>
            <div>
                <h3>{lobby ? 'Waiting for match...' : 'Connected'}</h3>
                <video 
                    autoPlay 
                    width={400} 
                    height={300} 
                    ref={remoteVideoRef}
                    style={{ border: '2px solid #333', borderRadius: '8px', backgroundColor: '#000' }}
                />
            </div>
        </div>
        {!lobby && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                    onClick={handleDisconnect}
                    style={{ 
                        padding: '10px 20px', 
                        fontSize: '16px', 
                        backgroundColor: '#ff4444', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Disconnect
                </button>
                <button 
                    onClick={handleReport}
                    style={{ 
                        padding: '10px 20px', 
                        fontSize: '16px', 
                        backgroundColor: '#ff8800', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Report
                </button>
            </div>
        )}
    </div>
}

