import React, { useState } from 'react';
import styles from '../styles';

const Login = ({ onLogin, onNavigate }) => {
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState("login"); // login, signup, reset
  const [signupData, setSignupData] = useState({ username: "", email: "", password: "" });
  const [confirmationCode, setConfirmationCode] = useState("");
  const [resetData, setResetData] = useState({ username: "", code: "", newPassword: "" });

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    await onLogin(loginData, setLoginError);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoginError("");
    // Signup logic here
    setLoginError("Signup functionality not implemented yet");
  };

  const handleConfirmSignup = async (e) => {
    e.preventDefault();
    setLoginError("");
    // Confirm signup logic here
    setLoginError("Confirm signup functionality not implemented yet");
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoginError("");
    // Password reset logic here
    setLoginError("Password reset functionality not implemented yet");
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    setLoginError("");
    // Confirm reset logic here
    setLoginError("Confirm reset functionality not implemented yet");
  };

  return (
    <div style={styles.loginPage}>
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <div style={styles.loginHeader}>
            <h1 style={styles.loginTitle}>Threat Detection Dashboard</h1>
            <p style={styles.loginSubtitle}>
              {authMode === 'login' ? 'Sign in to access the intrusion detection system' :
               authMode === 'signup' ? 'Create a new account' :
               authMode === 'confirm' ? 'Confirm your account' :
               authMode === 'reset' ? 'Reset your password' :
               'Confirm password reset'}
            </p>
          </div>

          {authMode === 'login' && (
            <form onSubmit={handleLogin}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                name="username"
                value={loginData.username}
                onChange={handleLoginChange}
                style={styles.input}
                placeholder="Enter username"
                required
              />

              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={loginData.password}
                onChange={handleLoginChange}
                style={styles.input}
                placeholder="Enter password"
                required
              />

              {loginError && (
                <div style={styles.errorMessage}>{loginError}</div>
              )}

              <button type="submit" style={styles.loginButton}>
                Login
              </button>

              <div style={styles.authLinks}>
                <button type="button" style={styles.linkButton} onClick={() => setAuthMode('signup')}>
                  Create Account
                </button>
                <button type="button" style={styles.linkButton} onClick={() => setAuthMode('reset')}>
                  Forgot Password?
                </button>
              </div>

              <div style={styles.loginInfo}>
                <p style={styles.loginInfoText}>Demo Credentials (for testing):</p>
                <p style={styles.loginInfoText}>Username: <strong>admin</strong></p>
                <p style={styles.loginInfoText}>Password: <strong>password123</strong></p>
              </div>
            </form>
          )}

          {authMode === 'signup' && (
            <form onSubmit={handleSignup}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                name="username"
                value={signupData.username}
                onChange={(e) => setSignupData({...signupData, username: e.target.value})}
                style={styles.input}
                placeholder="Choose username"
                required
              />

              <label style={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                value={signupData.email}
                onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                style={styles.input}
                placeholder="Enter email"
                required
              />

              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={signupData.password}
                onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                style={styles.input}
                placeholder="Choose password"
                required
              />

              {loginError && (
                <div style={styles.errorMessage}>{loginError}</div>
              )}

              <button type="submit" style={styles.loginButton}>
                Sign Up
              </button>

              <div style={styles.authLinks}>
                <button type="button" style={styles.linkButton} onClick={() => setAuthMode('login')}>
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {authMode === 'confirm' && (
            <form onSubmit={handleConfirmSignup}>
              <label style={styles.label}>Confirmation Code</label>
              <input
                type="text"
                name="code"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                style={styles.input}
                placeholder="Enter confirmation code"
                required
              />

              {loginError && (
                <div style={styles.errorMessage}>{loginError}</div>
              )}

              <button type="submit" style={styles.loginButton}>
                Confirm Account
              </button>

              <div style={styles.authLinks}>
                <button type="button" style={styles.linkButton} onClick={() => setAuthMode('login')}>
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {authMode === 'reset' && (
            <form onSubmit={handlePasswordReset}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                name="username"
                value={resetData.username}
                onChange={(e) => setResetData({...resetData, username: e.target.value})}
                style={styles.input}
                placeholder="Enter username"
                required
              />

              {loginError && (
                <div style={styles.errorMessage}>{loginError}</div>
              )}

              <button type="submit" style={styles.loginButton}>
                Send Reset Code
              </button>

              <div style={styles.authLinks}>
                <button type="button" style={styles.linkButton} onClick={() => setAuthMode('login')}>
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {authMode === 'confirm-reset' && (
            <form onSubmit={handleConfirmResetPassword}>
              <label style={styles.label}>Confirmation Code</label>
              <input
                type="text"
                name="code"
                value={resetData.code}
                onChange={(e) => setResetData({...resetData, code: e.target.value})}
                style={styles.input}
                placeholder="Enter confirmation code"
                required
              />

              <label style={styles.label}>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={resetData.newPassword}
                onChange={(e) => setResetData({...resetData, newPassword: e.target.value})}
                style={styles.input}
                placeholder="Enter new password"
                required
              />

              {loginError && (
                <div style={styles.errorMessage}>{loginError}</div>
              )}

              <button type="submit" style={styles.loginButton}>
                Reset Password
              </button>

              <div style={styles.authLinks}>
                <button type="button" style={styles.linkButton} onClick={() => setAuthMode('login')}>
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;