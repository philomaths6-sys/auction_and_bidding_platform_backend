import React, { createContext, useContext, useState } from 'react';

const WsContext = createContext();

export const useWs = () => useContext(WsContext);

export const WsProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <WsContext.Provider value={{ isConnected, setIsConnected }}>
      {children}
    </WsContext.Provider>
  );
};
