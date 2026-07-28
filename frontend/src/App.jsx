import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PresenceProvider } from './hooks/usePresence';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';


export default function App() {
  return (
    <AuthProvider>
      <PresenceProvider>
        <ThemeProvider>
          <Routes>
        {/* Full-screen Gajim Desktop Messenger route */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        {/* Standard Website Pages with Top Navbar */}
        <Route
          path="/*"
          element={
            <div className="app-container">
              <Navbar />
              <main style={{ minHeight: 'calc(100vh - 70px)' }}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Routes>
              </main>
            </div>
          }
        />
        </Routes>
        </ThemeProvider>
      </PresenceProvider>
    </AuthProvider>
  );
}
