import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './components/Signup';
import Home from './components/Home';
import CreateMatch from './components/CreateMatch';
import Toss from './components/Toss';
import MatchDashboard from './components/MatchDashboard.jsx';
import SetupPlayers from './components/SetupPlayers';
import PlayerStats from './components/PlayerStats';
import AllPlayerStats from './components/AllPlayerStats';
import Welcome from './components/Welcome';
import Teams from './components/Teams';

// KEEP THIS OUTSIDE THE APP FUNCTION
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// THE MAIN FUNCTION
export default function App() {
  const [showWelcome, setShowWelcome] = React.useState(true);

  return (
    <Router>
      <div className="min-h-screen bg-[#0B0E14] text-white">
        {showWelcome && <Welcome onEnter={() => setShowWelcome(false)} />}
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Signup />} />

          {/* Private Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-match"
            element={
              <ProtectedRoute>
                <CreateMatch />
              </ProtectedRoute>
            }
          />
          <Route path="/toss" element={<ProtectedRoute><Toss /></ProtectedRoute>} />
          <Route path="/setup-players" element={<ProtectedRoute><SetupPlayers /></ProtectedRoute>} />
          <Route path="/scoreboard/:id" element={<ProtectedRoute><MatchDashboard /></ProtectedRoute>} />
          <Route path="/scoreboard" element={<ProtectedRoute><MatchDashboard /></ProtectedRoute>} />
          <Route path="/player-stats/:tid" element={<ProtectedRoute><PlayerStats /></ProtectedRoute>} />
          <Route path="/all-stats" element={<ProtectedRoute><AllPlayerStats /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}