import NavBar from '../components/NavBar';
import { useAuth } from '../context/AuthContext';

function WorkspacePage() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <NavBar />
      <div className="workspace-page">
        <h1>Welcome, {user?.email}</h1>
        <p>Your tasks will live here in a future feature.</p>
      </div>
    </div>
  );
}

export default WorkspacePage;
