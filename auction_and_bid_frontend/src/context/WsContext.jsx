import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const WsContext = createContext();

export const useWs = () => useContext(WsContext);

export const WsProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const openCountRef = useRef(0);

  const notifyWsOpen = useCallback(() => {
    openCountRef.current += 1;
    setIsConnected(true);
  }, []);

  const notifyWsClose = useCallback(() => {
    openCountRef.current = Math.max(0, openCountRef.current - 1);
    if (openCountRef.current === 0) {
      setIsConnected(false);
    }
  }, []);

  return (
    <WsContext.Provider value={{ isConnected, notifyWsOpen, notifyWsClose }}>
      {children}
    </WsContext.Provider>
  );
};
