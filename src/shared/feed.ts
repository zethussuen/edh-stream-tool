import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [], // No STUN/TURN needed on LAN
};

// 15 Mbps target. LAN has plenty of headroom; default ~2.5 Mbps is too low for
// readable 1080p card art / text. Tune down if a venue's wifi is congested.
const MAX_BITRATE_BPS = 15_000_000;

/**
 * Hook for the producer: captures a camera (e.g. OBS Virtual Camera)
 * and streams it to casters via WebRTC.
 */
export function useFeedPublisher(socket: React.RefObject<Socket | null>, connected: boolean) {
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [publishing, setPublishing] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState("");

  // Handle caster feed requests — create a peer connection and send offer
  useEffect(() => {
    const s = socket.current;
    if (!s || !connected) return;

    async function onFeedRequest({ casterId }: { casterId: string }) {
      if (!s) return;
      const stream = streamRef.current;
      if (!stream) return;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current.set(casterId, pc);

      // Add video tracks from the captured stream
      const senders: RTCRtpSender[] = [];
      for (const track of stream.getTracks()) {
        senders.push(pc.addTrack(track, stream));
      }

      // Crank encoder bitrate and prefer sharpness over framerate. WebRTC's
      // defaults are tuned for VoIP over the internet; on LAN we can spend much
      // more bandwidth for legible card text.
      for (const sender of senders) {
        if (sender.track?.kind !== "video") continue;
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        for (const enc of params.encodings) {
          enc.maxBitrate = MAX_BITRATE_BPS;
        }
        // Drop framerate before resolution when the link gets stressed.
        params.degradationPreference = "maintain-resolution";
        sender.setParameters(params).catch((err) => {
          console.warn("Failed to set encoder parameters:", err);
        });
      }

      // Send ICE candidates as they're gathered
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          s.emit("webrtc:ice-candidate", { targetId: casterId, candidate: e.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          pc.close();
          peersRef.current.delete(casterId);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (pc.localDescription) {
        s.emit("webrtc:offer", { targetId: casterId, offer: pc.localDescription });
      }
    }

    async function onAnswer({ senderId, answer }: { senderId: string; answer: RTCSessionDescriptionInit }) {
      const pc = peersRef.current.get(senderId);
      if (pc) await pc.setRemoteDescription(answer);
    }

    function onIceCandidate({ senderId, candidate }: { senderId: string; candidate: RTCIceCandidateInit }) {
      const pc = peersRef.current.get(senderId);
      if (pc) pc.addIceCandidate(candidate).catch(() => {});
    }

    s.on("feed:request", onFeedRequest);
    s.on("webrtc:answer", onAnswer);
    s.on("webrtc:ice-candidate", onIceCandidate);

    return () => {
      s.off("feed:request", onFeedRequest);
      s.off("webrtc:answer", onAnswer);
      s.off("webrtc:ice-candidate", onIceCandidate);
      // Close all peer connections on cleanup (reconnect/unmount)
      for (const pc of peersRef.current.values()) pc.close();
      peersRef.current.clear();
    };
  }, [socket, connected]);

  const stopCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    for (const pc of peersRef.current.values()) pc.close();
    peersRef.current.clear();

    setPublishing(false);
    setDeviceLabel("");
    socket.current?.emit("feed:stopped");
  }, [socket]);

  const startCapture = useCallback(async (deviceId?: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        audio: false,
      });
      streamRef.current = stream;
      setPublishing(true);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Optimize encoder for sharpness over motion — cards/text matter more
        // than smoothness on a tournament table feed.
        videoTrack.contentHint = "detail";
      }
      setDeviceLabel(videoTrack?.label ?? "Camera");

      socket.current?.emit("feed:available");

      videoTrack?.addEventListener("ended", () => stopCapture());
    } catch (err) {
      console.error("Failed to capture camera:", err);
    }
  }, [socket, stopCapture]);

  return { publishing, deviceLabel, stream: streamRef, startCapture, stopCapture };
}

/**
 * Hook for casters: receives the producer's video feed via WebRTC.
 */
export function useFeedReceiver(
  socket: React.RefObject<Socket | null> | undefined,
  connected: boolean,
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [feedAvailable, setFeedAvailable] = useState(false);
  const [feedConnected, setFeedConnected] = useState(false);

  useEffect(() => {
    const s = socket?.current;
    if (!s || !connected) return;

    function onFeedAvailable({ producerId }: { producerId: string }) {
      if (!s) return;
      setFeedAvailable(true);
      s.emit("feed:request", { producerId });
    }

    function onFeedStopped() {
      setFeedAvailable(false);
      setFeedConnected(false);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    async function onOffer({ senderId, offer }: { senderId: string; offer: RTCSessionDescriptionInit }) {
      // Clean up previous connection if any
      if (pcRef.current) {
        pcRef.current.close();
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (videoRef.current) {
          videoRef.current.srcObject = e.streams[0] ?? new MediaStream([e.track]);
          setFeedConnected(true);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && s) {
          s.emit("webrtc:ice-candidate", { targetId: senderId, candidate: e.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setFeedConnected(false);
        }
        if (pc.connectionState === "connected") {
          setFeedConnected(true);
        }
      };

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (s && pc.localDescription) {
        s.emit("webrtc:answer", { targetId: senderId, answer: pc.localDescription });
      }
    }

    function onIceCandidate({ candidate }: { senderId: string; candidate: RTCIceCandidateInit }) {
      pcRef.current?.addIceCandidate(candidate).catch(() => {});
    }

    s.on("feed:available", onFeedAvailable);
    s.on("feed:stopped", onFeedStopped);
    s.on("webrtc:offer", onOffer);
    s.on("webrtc:ice-candidate", onIceCandidate);

    return () => {
      s.off("feed:available", onFeedAvailable);
      s.off("feed:stopped", onFeedStopped);
      s.off("webrtc:offer", onOffer);
      s.off("webrtc:ice-candidate", onIceCandidate);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [socket, connected, videoRef]);

  return { feedAvailable, feedConnected };
}
