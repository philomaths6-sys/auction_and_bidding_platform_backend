import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { WsProvider } from './context/WsContext';
import { CategoryProvider } from './context/CategoryContext';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AuctionDetail from './pages/AuctionDetail';
import CreateAuction from './pages/CreateAuction';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Navbar';
import AdminDashboard from './pages/AdminDashboard';
import PublicProfile from './pages/PublicProfile';
import AccountSuspended from './pages/AccountSuspended';

import Watchlist from './pages/Watchlist';
import Settings from './pages/Settings';
import PaymentFlow from './pages/PaymentFlow';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WsProvider>
          <AuthProvider>
            <CategoryProvider>
              <BrowserRouter>
                <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
                  <Navbar />
                  <main className="flex-grow">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/auctions/:id" element={<AuctionDetail />} />
                      <Route path="/seller/:id" element={<PublicProfile />} />
                      <Route path="/suspended" element={<AccountSuspended />} />
                      
                      <Route path="/create" element={<ProtectedRoute><CreateAuction /></ProtectedRoute>} />
                      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/payment/:id" element={<ProtectedRoute><PaymentFlow /></ProtectedRoute>} />
                      <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    </Routes>
                  </main>
                </div>
              </BrowserRouter>
            </CategoryProvider>
          </AuthProvider>
        </WsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
