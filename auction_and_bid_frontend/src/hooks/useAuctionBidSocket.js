import { useEffect, useRef } from 'react';
import { useWs } from '../context/WsContext';
import { connectAuctionBidSocket } from '../services/realtime/auctionBidSocket';

/**
 * Subscribe to bid_placed events for one auction (reconnect + keepalive).
 */
export function useAuctionBidSocket(auctionId, onBidPlaced, enabled = true) {
  const { notifyWsOpen, notifyWsClose } = useWs();
  const handlerRef = useRef(onBidPlaced);
  handlerRef.current = onBidPlaced;

  useEffect(() => {
    if (!auctionId || !enabled) return undefined;
    const { disconnect } = connectAuctionBidSocket(
      auctionId,
      (data) => handlerRef.current?.(data),
      { notifyWsOpen, notifyWsClose }
    );
    return disconnect;
  }, [auctionId, enabled, notifyWsOpen, notifyWsClose]);
}
