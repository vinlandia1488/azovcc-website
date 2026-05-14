// Utility for communicating with the local software via WebSocket (winsocket)
let socket = null;
const WS_PORT = 9002;
let connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected'
const statusListeners = new Set();

export const getConnectionStatus = () => connectionStatus;

export const onConnectionStatusChange = (callback) => {
  statusListeners.add(callback);
  return () => statusListeners.delete(callback);
};

const notifyStatusChange = (status) => {
  connectionStatus = status;
  statusListeners.forEach(cb => cb(status));
};

export const connectWS = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  try {
    notifyStatusChange('connecting');
    socket = new WebSocket(`ws://localhost:${WS_PORT}`);

    socket.onopen = () => {
      console.log(`[WS] Connected to Azov software on port ${WS_PORT}`);
      notifyStatusChange('connected');
    };

    socket.onclose = () => {
      console.log('[WS] Disconnected from software');
      notifyStatusChange('disconnected');
      socket = null;
      // Optional: auto-reconnect after some time
      setTimeout(connectWS, 5000);
    };

    socket.onerror = (err) => {
      console.error('[WS] Socket error:', err);
      notifyStatusChange('disconnected');
    };

    return socket;
  } catch (err) {
    console.error('[WS] Failed to create socket:', err);
    notifyStatusChange('disconnected');
    return null;
  }
};

export const sendWSMessage = (message) => {
  const s = connectWS();
  if (s && s.readyState === WebSocket.OPEN) {
    const messageStr = JSON.stringify(message);
    console.log('[WS] Sending message:', messageStr);
    s.send(messageStr);
    return true;
  } else {
    console.error('[WS] Cannot send message - socket not connected. State:', s ? s.readyState : 'null');
    return false;
  }
};

// Start connection on load
if (typeof window !== 'undefined') {
  connectWS();
}
