import { useState, useEffect } from "react";
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Metrics from './components/Metrics';
import Predict from './components/Predict';
import Navbar from './components/Navbar';
import styles from './styles';

function App() {
  const [page, setPage] = useState("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setPage("dashboard");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPage("login");
  };

  const navigate = (newPage) => {
    setPage(newPage);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={styles.appContainer}>
      <Navbar onNavigate={navigate} onLogout={handleLogout} />
      {page === "dashboard" && <Dashboard onNavigate={navigate} />}
      {page === "upload" && <Upload onNavigate={navigate} />}
      {page === "metrics" && <Metrics onNavigate={navigate} />}
      {page === "predict" && <Predict onNavigate={navigate} />}
    </div>
  );
}

export default App;

