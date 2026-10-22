import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <nav className="navbar">
      <span className="navbar__email">{user?.email}</span>
      <button onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? 'Logging out…' : 'Logout'}
      </button>
    </nav>
  );
}

export default NavBar;
