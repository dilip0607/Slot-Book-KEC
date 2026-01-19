import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import PrivateRoute from './components/PrivateRoute';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <div className="flex-grow">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected User Routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/" element={<UserDashboard />} />
              </Route>

              {/* Protected Admin Routes */}
              <Route element={<PrivateRoute adminOnly={true} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            </Routes>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
