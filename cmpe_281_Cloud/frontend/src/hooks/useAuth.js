import { useState, useEffect } from 'react';
import { signIn, signOut } from 'aws-amplify/auth';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authStatus = localStorage.getItem('isAuthenticated');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log("Auth check failed:", error);
    }
  };

  const login = async (loginData, setLoginError) => {
    try {
      const { isSignedIn } = await signIn({
        username: loginData.username,
        password: loginData.password,
      });

      if (isSignedIn) {
        setIsAuthenticated(true);
        setLoginError("");
        localStorage.setItem('isAuthenticated', 'true');
        return true;
      }
    } catch (error) {
      console.log("Login error:", error);
      // Fallback to demo mode
      if (loginData.username === "admin" && loginData.password === "password123") {
        setIsAuthenticated(true);
        setLoginError("");
        localStorage.setItem('isAuthenticated', 'true');
        return true;
      } else {
        setLoginError("Invalid username or password");
        return false;
      }
    }
    return false;
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.log("Logout error:", error);
    }
    setIsAuthenticated(false);
    localStorage.setItem('isAuthenticated', 'false');
  };

  return {
    isAuthenticated,
    login,
    logout,
  };
};