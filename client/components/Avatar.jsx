import { useEffect, useState, useRef } from "react";
// Import video assets
// Import video assets for Avatar 1
import idleVideo1 from "../assets/avatar/avatar1/idle.mp4";
import listeningVideo1 from "../assets/avatar/avatar1/listening.mp4";
import speakingVideo1 from "../assets/avatar/avatar1/speaking.mp4";

// Import video assets for Avatar 2
import idleVideo2 from "../assets/avatar/avatar2/idle.mp4";
import listeningVideo2 from "../assets/avatar/avatar2/listening.mp4";
import speakingVideo2 from "../assets/avatar/avatar2/speaking.mp4";

const allVideos = [
    { avatar: "avatar1", type: "idle", src: idleVideo1 },
    { avatar: "avatar1", type: "listening", src: listeningVideo1 },
    { avatar: "avatar1", type: "speaking", src: speakingVideo1 },
    { avatar: "avatar2", type: "idle", src: idleVideo2 },
    { avatar: "avatar2", type: "listening", src: listeningVideo2 },
    { avatar: "avatar2", type: "speaking", src: speakingVideo2 },
];

export default function Avatar({ events = [], isSessionActive = false, selectedAvatar = "avatar1" }) {
    const [activeType, setActiveType] = useState("idle");
    const timeoutRef = useRef(null);
    const speakingHoldTimeoutRef = useRef(null);
    const videoRefs = useRef({});
    const isUserSpeaking = useRef(false);

    useEffect(() => {
        if (!isSessionActive) {
            setActiveType("idle");
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (speakingHoldTimeoutRef.current) clearTimeout(speakingHoldTimeoutRef.current);
            isUserSpeaking.current = false;
            return;
        }

        if (!events || events.length === 0) return;

        const mostRecentEvent = events[0];
        const eventType = mostRecentEvent.type;

        // Clear existing timeout on any new event processing
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (speakingHoldTimeoutRef.current) {
            clearTimeout(speakingHoldTimeoutRef.current);
            speakingHoldTimeoutRef.current = null;
        }

        // --- Robust State Machine ---

        // 1. User starts speaking (Interruption) -> Immediate Listening
        if (eventType === "input_audio_buffer.speech_started") {
            isUserSpeaking.current = true;
            setActiveType("listening");
        }
        // 2. AI starts speaking -> Speaking
        else if (eventType === "output_audio_buffer.started") {
            setActiveType("speaking");
        }
        // 3. AI stops speaking -> Listening (then eventually Idle)
        else if (eventType === "output_audio_buffer.stopped") {
            // Delay switch to listening to bridge gaps between buffers
            speakingHoldTimeoutRef.current = setTimeout(() => {
                setActiveType("listening");

                // Only set return-to-idle timeout if user is NOT speaking
                if (!isUserSpeaking.current) {
                    timeoutRef.current = setTimeout(() => {
                        setActiveType("idle");
                    }, 6000); // 6 seconds before going idle
                }
            }, 500);
        }
        // 4. Fallback/Other events
        else if (eventType === "output_audio_buffer.cleared") {
            setActiveType("listening");
        }
        else if (eventType === "input_audio_buffer.speech_stopped") {
            isUserSpeaking.current = false;
            // Only switch to listening if the AI hasn't already started speaking (barge-in response)
            setActiveType((prev) => (prev === "speaking" ? "speaking" : "listening"));

            // Set timeout to return to idle after user stops speaking
            timeoutRef.current = setTimeout(() => {
                setActiveType((prev) => (prev === "speaking" ? "speaking" : "idle"));
            }, 6000);
        }

    }, [events, isSessionActive]);

    // Explicitly manage video playback to prevent browser pausing hidden videos
    useEffect(() => {
        Object.entries(videoRefs.current).forEach(([key, videoEl]) => {
            if (!videoEl) return;

            // Check if this video matches the current selection and active type
            const [avatar, type] = key.split("-");
            const isActive = avatar === selectedAvatar && type === activeType;

            if (isActive) {
                videoEl.play().catch((e) => {
                    console.error(`Failed to play ${key}:`, e);
                });
            } else {
                videoEl.pause();
                // Optional: Reset time for speaking videos so they start fresh?
                // if (type === 'speaking') videoEl.currentTime = 0;
            }
        });
    }, [activeType, selectedAvatar]);

    return (
        <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative">
            {allVideos
                .filter((v) => v.avatar === selectedAvatar)
                .map((v) => (
                    <video
                        key={`${v.avatar}-${v.type}`}
                        ref={(el) => {
                            const key = `${v.avatar}-${v.type}`;
                            if (el) {
                                videoRefs.current[key] = el;
                            } else {
                                delete videoRefs.current[key];
                            }
                        }}
                        src={v.src}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className={`absolute w-full h-full object-contain transition-opacity duration-500 ease-in-out ${activeType === v.type
                            ? "opacity-100 z-10"
                            : "opacity-0 z-0"
                            }`}
                    >
                        Your browser does not support the video tag.
                    </video>
                ))}

        </div>
    );
}
