import { useState } from "react";
import { Amplify } from 'aws-amplify';
import { Login, Dashboard, Predict, Upload, Metrics } from './components';
import { useAuth } from './hooks/useAuth';

// Configure AWS Amplify with placeholder values
// These should be replaced with your actual AWS Cognito configuration
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_XXXXXXXXX', // Replace with your User Pool ID
      userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // Replace with your App Client ID
      region: 'us-east-1', // Replace with your region
    }
  }
});

function App() {
  const [page, setPage] = useState("login");
  const { isAuthenticated, login, logout } = useAuth();

  const handleLogin = async (loginData, setLoginError) => {
    const success = await login(loginData, setLoginError);
    if (success) {
      setPage("dashboard");
    }
  };

  const handleLogout = async () => {
    await logout();
    setPage("login");
  };

  const handleNavigate = (newPage) => {
    if (newPage === "login") {
      handleLogout();
    } else {
      setPage(newPage);
    }
  };

  if (page === "login" || !isAuthenticated) {
    return <Login onLogin={handleLogin} onNavigate={handleNavigate} />;
  }

  if (page === "dashboard") {
    return <Dashboard onNavigate={handleNavigate} />;
  }

  if (page === "predict") {
    return <Predict onNavigate={handleNavigate} />;
  }

  if (page === "upload") {
    return <Upload onNavigate={handleNavigate} />;
  }

  if (page === "metrics") {
    return <Metrics onNavigate={handleNavigate} />;
  }

  return <Dashboard onNavigate={handleNavigate} />;
}

export default App;