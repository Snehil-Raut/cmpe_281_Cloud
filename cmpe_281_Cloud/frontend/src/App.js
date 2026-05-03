import { useCallback, useState } from "react";
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Metrics from './components/Metrics';
import Predict from './components/Predict';
import Navbar from './components/Navbar';
import styles from './styles';

const toastStyleByType = {
  success: styles.toastSuccess,
  error: styles.toastError,
  warning: styles.toastWarning,
  info: styles.toastInfo
};

function App() {
  const [page, setPage] = useState("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [toasts, setToasts] = useState([]);

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

  const pushToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={styles.appContainer}>
      <Navbar onNavigate={navigate} onLogout={handleLogout} />
      {page === "dashboard" && <Dashboard onNavigate={navigate} onToast={pushToast} />}
      {page === "upload" && <Upload onNavigate={navigate} onToast={pushToast} />}
      {page === "metrics" && <Metrics onNavigate={navigate} onToast={pushToast} />}
      {page === "predict" && <Predict onNavigate={navigate} onToast={pushToast} />}

      <div style={styles.toastContainer}>
        {toasts.map((toast) => {
          const typeStyle = toastStyleByType[toast.type] || styles.toastInfo;

          return (
            <div
              key={toast.id}
              style={{
                ...styles.toast,
                ...typeStyle
              }}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                style={styles.toastCloseButton}
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;

