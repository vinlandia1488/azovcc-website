// Utility for communicating with the local software via WebSocket (winsocket)
let socket = null;
const WS_PORT = 9002;

export const connectWS = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  try {
    socket = new WebSocket(`ws://localhost:${WS_PORT}`);

    socket.onopen = () => {
      console.log(`[WS] Connected to Azov software on port ${WS_PORT}`);
    };

    socket.onclose = () => {
      console.log('[WS] Disconnected from software');
      socket = null;
      // Optional: auto-reconnect after some time
      setTimeout(connectWS, 5000);
    };

    socket.onerror = (err) => {
      // console.error('[WS] Socket error:', err);
    };

    return socket;
  } catch (err) {
    console.error('[WS] Failed to create socket:', err);
    return null;
  }
};

export const sendWSMessage = (message) => {
  const s = connectWS();
  if (s && s.readyState === WebSocket.OPEN) {
    s.send(JSON.stringify(message));
    return true;
  }
  return false;
};

// Start connection on load
if (typeof window !== 'undefined') {
  connectWS();
}
