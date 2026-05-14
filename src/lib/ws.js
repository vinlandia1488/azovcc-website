// Utility for communicating with the local software via WebSocket
// Note: Software must support WebSocket protocol on port 9002
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
    socket = new WebSocket(`ws://127.0.0.1:${WS_PORT}`);

    socket.onopen = () => {
      console.log(`[WS] Connected to Azov software on port ${WS_PORT}`);
      notifyStatusChange('connected');
    };

    socket.onclose = (event) => {
      console.log('[WS] Disconnected from software. Code:', event.code, 'Reason:', event.reason);
      notifyStatusChange('disconnected');
      socket = null;
      // Auto-reconnect after 5 seconds
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
    console.error('[WS] Software may not support WebSocket protocol. Ensure software is listening for WebSocket connections on port 9002.');
    return false;
  }
};

// Start connection on load
if (typeof window !== 'undefined') {
  connectWS();
}
