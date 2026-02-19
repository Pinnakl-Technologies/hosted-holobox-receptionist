import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";

import ToolPanel from "./ToolPanel";
import Avatar from "./Avatar";
import AvatarSwitcher from "./AvatarSwitcher";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("avatar1");
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession(avatarOverride) {
    // Get a session token for OpenAI Realtime API
    const currentAvatar = avatarOverride || selectedAvatar;
    const voice = currentAvatar === "avatar1" ? "marin" : "ash";
    const tokenResponse = await fetch(`/token?voice=${voice}`);
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime/calls";
    const model = "gpt-4o-mini-realtime-preview";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const sdp = await sdpResponse.text();
    const answer = { type: "answer", sdp };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      peerConnection.current.close();
    }

    if (audioElement.current) {
      audioElement.current.pause();
      audioElement.current.srcObject = null;
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    setEvents([]); // Clear conversation history
  }

  const handleAvatarSwitch = () => {
    const newAvatar = selectedAvatar === "avatar1" ? "avatar2" : "avatar1";
    setSelectedAvatar(newAvatar);
    setEvents([]); // Clear history immediately on switch

    if (isSessionActive) {
      stopSession();
      // Small delay to ensure cleanup before restart
      setTimeout(() => {
        startSession(newAvatar);
      }, 100);
    }
  };

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        setEvents((prev) => [event, ...prev]);
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  return (
    <main className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0">
        <Avatar
          events={events} // Pass events to Avatar to trigger animations
          isSessionActive={isSessionActive}
          selectedAvatar={selectedAvatar}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-center z-10 gap-4">
        <AvatarSwitcher
          selectedAvatar={selectedAvatar}
          onSwitch={handleAvatarSwitch}
        />
        <SessionControls
          startSession={startSession}
          stopSession={stopSession}
          sendClientEvent={sendClientEvent}
          sendTextMessage={sendTextMessage}
          events={events}
          isSessionActive={isSessionActive}
        />
      </div>
    </main>
  );
}
