/**
 * Live auction bid channel: REST places bids; server broadcasts updates on this WebSocket.
 * Includes reconnect + keepalive (server reads messages in a loop).
 */

function wsBaseUrl() {
  const raw = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000';
  return raw.replace(/\/$/, '');
}

function parseBidPayload(data) {
  if (!data || data.event !== 'bid_placed') return null;
  const price = Number(data.current_price);
  return {
    ...data,
    current_price: Number.isFinite(price) ? price : data.current_price,
    total_bids:
      data.total_bids != null ? Number(data.total_bids) : undefined,
  };
}

/**
 * @param {number|string} auctionId
 * @param {(data: object) => void} onBidPlaced
 * @param {{ notifyWsOpen?: () => void, notifyWsClose?: () => void }} [wsActivity]
 * @returns {{ disconnect: () => void }}
 */
export function connectAuctionBidSocket(auctionId, onBidPlaced, wsActivity = {}) {
  const { notifyWsOpen, notifyWsClose } = wsActivity;
  let cancelled = false;
  let preventReconnect = false;
  let wsInstance = null;
  let opened = false;
  let pingTimer = null;
  let reconnectTimer = null;
  let attempts = 0;

  const clearPing = () => {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  };

  const connect = () => {
    if (cancelled || preventReconnect) return;
    const url = `${wsBaseUrl()}/auctions/ws/${auctionId}`;
    wsInstance = new WebSocket(url);

    wsInstance.onopen = () => {
      if (cancelled) return;
      opened = true;
      attempts = 0;
      notifyWsOpen?.();
      clearPing();
      pingTimer = setInterval(() => {
        try {
          if (wsInstance?.readyState === WebSocket.OPEN) {
            wsInstance.send('ping');
          }
        } catch {
          /* ignore */
        }
      }, 25000);
    };

    wsInstance.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const data = parseBidPayload(raw);
        if (data) onBidPlaced(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    wsInstance.onclose = () => {
      clearPing();
      if (opened) {
        opened = false;
        notifyWsClose?.();
      }
      wsInstance = null;
      if (!cancelled && !preventReconnect && attempts < 12) {
        attempts += 1;
        const delay = Math.min(30000, 700 * 2 ** (attempts - 1));
        reconnectTimer = setTimeout(connect, delay);
      }
    };
  };

  connect();

  return {
    disconnect: () => {
      preventReconnect = true;
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      clearPing();
      if (wsInstance) {
        wsInstance.onclose = null;
        wsInstance.close();
        wsInstance = null;
      }
      if (opened) {
        opened = false;
        notifyWsClose?.();
      }
    },
  };
}
