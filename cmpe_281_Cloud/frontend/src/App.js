import { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, signUp, confirmSignUp, resetPassword, confirmResetPassword } from 'aws-amplify/auth';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState("login"); // login, signup, reset
  const [signupData, setSignupData] = useState({ username: "", email: "", password: "" });
  const [confirmationCode, setConfirmationCode] = useState("");
  const [resetData, setResetData] = useState({ username: "", code: "", newPassword: "" });
  const [batchPredictions, setBatchPredictions] = useState([]);
  const [isPredicting, setIsPredicting] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // For demo purposes, we'll use localStorage to track auth
      const authStatus = localStorage.getItem('isAuthenticated');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
        setPage("dashboard");
      }
    } catch (error) {
      console.log("Auth check failed:", error);
    }
  };
  const [formData, setFormData] = useState({
    duration: "",
    protocol_type: "tcp",
    service: "http",
    flag: "SF",
    src_bytes: "",
    dst_bytes: "",
    logged_in: "",
    count: "",
    srv_count: "",
    serror_rate: "",
    rerror_rate: "",
    dst_host_count: "",
    dst_host_srv_count: "",
    model: "Random Forest"
  });

  const [result, setResult] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [csvData, setCsvData] = useState([]);

  const models = [
    {
      name: "Decision Tree",
      accuracy: "99.84%",
      precision: "1.00",
      recall: "1.00",
      f1: "1.00"
    },
    {
      name: "Random Forest",
      accuracy: "99.89%",
      precision: "1.00",
      recall: "1.00",
      f1: "1.00"
    },
    {
      name: "Logistic Regression",
      accuracy: "97.23%",
      precision: "0.98",
      recall: "0.96",
      f1: "0.97"
    }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      // AWS Cognito Sign In
      const { isSignedIn, nextStep } = await signIn({
        username: loginData.username,
        password: loginData.password,
      });

      if (isSignedIn) {
        setIsAuthenticated(true);
        setLoginError("");
        setPage("dashboard");
        localStorage.setItem('isAuthenticated', 'true');
      }
    } catch (error) {
      console.log("Login error:", error);
      // Fallback to demo mode if AWS Cognito is not configured
      if (loginData.username === "admin" && loginData.password === "password123") {
        setIsAuthenticated(true);
        setLoginError("");
        setPage("dashboard");
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        setLoginError("Invalid username or password");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.log("Logout error:", error);
    }
    setIsAuthenticated(false);
    setLoginData({ username: "", password: "" });
    localStorage.setItem('isAuthenticated', 'false');
    setPage("login");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: signupData.username,
        password: signupData.password,
        options: {
          userAttributes: {
            email: signupData.email,
          },
        },
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setAuthMode('confirm');
      }
    } catch (error) {
      console.log("Signup error:", error);
      setLoginError(error.message || "Signup failed");
    }
  };

  const handleConfirmSignup = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username: signupData.username,
        confirmationCode: confirmationCode,
      });

      if (isSignUpComplete) {
        setAuthMode('login');
        setLoginError("Account confirmed. Please login.");
      }
    } catch (error) {
      console.log("Confirm signup error:", error);
      setLoginError(error.message || "Confirmation failed");
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const output = await resetPassword({
        username: resetData.username,
      });

      if (output.nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
        setAuthMode('confirm-reset');
      }
    } catch (error) {
      console.log("Password reset error:", error);
      setLoginError(error.message || "Password reset failed");
    }
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      await confirmResetPassword({
        username: resetData.username,
        confirmationCode: resetData.code,
        newPassword: resetData.newPassword,
      });

      setAuthMode('login');
      setLoginError("Password reset successful. Please login.");
    } catch (error) {
      console.log("Confirm reset error:", error);
      setLoginError(error.message || "Password reset confirmation failed");
    }
  };

  const handleBatchPredict = () => {
    setIsPredicting(true);
    // Simulate prediction for demo purposes
    setTimeout(() => {
      const predictions = csvData.map((row, index) => {
        // Simple demo prediction logic based on some features
        const risk = Math.random() > 0.7 ? "Attack" : "Normal";
        const confidence = (Math.random() * 20 + 80).toFixed(1);
        return {
          index: index + 1,
          prediction: risk,
          confidence: confidence,
          features: row
        };
      });
      setBatchPredictions(predictions);
      setIsPredicting(false);
    }, 1500);
  };

  const handleClearFile = () => {
    setCsvData([]);
    setUploadedFileName("");
    setBatchPredictions([]);
  };

  const loadNormalSample = () => {
    setFormData({
      ...formData,
      duration: "0",
      protocol_type: "tcp",
      service: "http",
      flag: "SF",
      src_bytes: "181",
      dst_bytes: "5450",
      logged_in: "1",
      count: "8",
      srv_count: "8",
      serror_rate: "0",
      rerror_rate: "0",
      dst_host_count: "255",
      dst_host_srv_count: "255"
    });
  };

  const loadAttackSample = () => {
    setFormData({
      ...formData,
      duration: "0",
      protocol_type: "tcp",
      service: "private",
      flag: "REJ",
      src_bytes: "0",
      dst_bytes: "0",
      logged_in: "0",
      count: "150",
      srv_count: "150",
      serror_rate: "1",
      rerror_rate: "0",
      dst_host_count: "255",
      dst_host_srv_count: "20"
    });
  };

  const handlePredict = () => {
    // Check if all required fields are filled
    const requiredFields = [
      'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes',
      'logged_in', 'count', 'srv_count', 'dst_host_count', 'dst_host_srv_count'
    ];

    const emptyFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');

    if (emptyFields.length > 0) {
      alert('Please fill all the fields');
      return;
    }

    let score = 0;

    score += Number(formData.serror_rate || 0) * 40;
    score += Number(formData.rerror_rate || 0) * 30;
    score += Number(formData.count || 0) > 100 ? 15 : 0;
    score += formData.flag === "REJ" ? 15 : 0;

    score = Math.min(100, Math.max(1, Math.round(score)));

    let riskLevel = "";
    if (score <= 35) {
      riskLevel = "Low";
    } else if (score <= 60) {
      riskLevel = "Moderate";
    } else {
      riskLevel = "High";
    }

    setResult({
      prediction: riskLevel === "High" ? "Attack" : "Normal",
      risk: riskLevel,
      score: score,
      model: formData.model
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        setCsvData(results.data.slice(0, 5));
      }
    });
  };

  const getRiskBadgeStyle = (risk) => {
    if (risk === "Low") return styles.lowBadge;
    if (risk === "Moderate") return styles.moderateBadge;
    return styles.highBadge;
  };

  const getPredictionBadgeStyle = (prediction) => {
    return prediction === "Attack" ? styles.attackBadge : styles.normalBadge;
  };

  // Login Page
  if (page === "login" || !isAuthenticated) {
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
  }

  if (page === "dashboard") {
    return (
      <div style={styles.page}>
        <div style={styles.navbar}>
          <div style={styles.logo}>Threat Detection Dashboard</div>
          <div style={styles.navButtons}>
            <button style={styles.navButton} onClick={() => setPage("upload")}>Batch Analysis</button>
            <button style={styles.navButton} onClick={() => setPage("metrics")}>Metrics</button>
            <button style={styles.logoutButton} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div style={styles.heroSection}>
          <p style={styles.tag}>AWS + Machine Learning + Intrusion Analysis</p>
          <h1 style={styles.title}>Cloud-Based Intrusion Detection System</h1>
          <p style={styles.subtitle}>
            Analyze network session data and classify it as normal or attack using machine learning models.
          </p>

          <div style={styles.heroButtons}>
            <button style={styles.primaryButton} onClick={() => setPage("predict")}>
              Predict Single Session
            </button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Best Model</p>
            <h2 style={styles.statValue}>Random Forest</h2>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Best Accuracy</p>
            <h2 style={styles.statValue}>99.89%</h2>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Available Models</p>
            <h2 style={styles.statValue}>3</h2>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Model Performance</h2>
          <div style={styles.cardContainer}>
            {models.map((model, index) => (
              <div key={index} style={styles.modelCard}>
                <div style={styles.modelCardHeader}>
                  <h3 style={styles.modelTitle}>{model.name}</h3>
                  {model.name === "Random Forest" && (
                    <span style={styles.bestBadge}>Best</span>
                  )}
                </div>
                <div style={styles.metricRow}>
                  <span>Accuracy</span>
                  <strong>{model.accuracy}</strong>
                </div>
                <div style={styles.metricRow}>
                  <span>Precision</span>
                  <strong>{model.precision}</strong>
                </div>
                <div style={styles.metricRow}>
                  <span>Recall</span>
                  <strong>{model.recall}</strong>
                </div>
                <div style={styles.metricRow}>
                  <span>F1-Score</span>
                  <strong>{model.f1}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (page === "upload") {
    return (
      <div style={styles.page}>
        <div style={styles.navbar}>
          <div style={styles.logo}>Threat Detection Dashboard</div>
          <div style={styles.navButtons}>
            <button style={styles.navButton} onClick={() => setPage("dashboard")}>Home</button>
            <button style={styles.navButton} onClick={() => setPage("upload")}>Batch Analysis</button>
            <button style={styles.navButton} onClick={() => setPage("metrics")}>Metrics</button>
            <button style={styles.logoutButton} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <h1 style={styles.title}>Batch CSV Analysis</h1>
        <p style={styles.subtitle}>
          Upload a dataset file and preview the first few records before connecting backend prediction.
        </p>

        <div style={styles.formBox}>
          <label style={styles.label}>Choose CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={styles.fileInput}
          />

          {uploadedFileName && (
            <div style={styles.fileInfoBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Uploaded File:</strong> {uploadedFileName}
                </div>
                <button
                  style={styles.cancelButton}
                  onClick={handleClearFile}
                >
                  ✕ Remove
                </button>
              </div>
            </div>
          )}

          <div style={styles.buttonContainer}>
            <button style={styles.secondaryButton} onClick={() => setPage("dashboard")}>
              Back to Dashboard
            </button>
          </div>
        </div>

        {csvData.length > 0 && (
          <div style={styles.tableBox}>
            <h2 style={styles.sectionTitle}>CSV Preview</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {Object.keys(csvData[0]).map((key) => (
                      <th key={key} style={styles.th}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td key={i} style={styles.td}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{...styles.buttonContainer, marginTop: "20px"}}>
              <button
                style={styles.primaryButton}
                onClick={handleBatchPredict}
                disabled={isPredicting}
              >
                {isPredicting ? "Predicting..." : "Run Predictions"}
              </button>
            </div>
          </div>
        )}

        {batchPredictions.length > 0 && (
          <div style={styles.tableBox}>
            <h2 style={styles.sectionTitle}>Prediction Results</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Row #</th>
                    <th style={styles.th}>Prediction</th>
                    <th style={styles.th}>Confidence</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batchPredictions.map((pred) => (
                    <tr key={pred.index}>
                      <td style={styles.td}>{pred.index}</td>
                      <td style={styles.td}>{pred.prediction}</td>
                      <td style={styles.td}>{pred.confidence}%</td>
                      <td style={styles.td}>
                        <span style={getPredictionBadgeStyle(pred.prediction)}>
                          {pred.prediction}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.summaryBox}>
              <h3 style={styles.summaryTitle}>Summary</h3>
              <p style={styles.summaryText}>
                Total Records: {batchPredictions.length} | 
                Attacks Detected: {batchPredictions.filter(p => p.prediction === "Attack").length} | 
                Normal: {batchPredictions.filter(p => p.prediction === "Normal").length}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (page === "metrics") {
    const accuracyData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Random Forest',
          data: [95, 96, 97, 96, 98, 97],
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          tension: 0.3,
        },
        {
          label: 'SVM',
          data: [92, 93, 94, 93, 95, 94],
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129, 140, 248, 0.1)',
          tension: 0.3,
        },
        {
          label: 'Logistic Regression',
          data: [88, 89, 90, 89, 91, 90],
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.1)',
          tension: 0.3,
        },
      ],
    };

    const predictionData = {
      labels: ['Normal', 'Attack'],
      datasets: [{
        data: [75, 25],
        backgroundColor: ['#34d399', '#f87171'],
        borderColor: ['#10b981', '#ef4444'],
        borderWidth: 2,
      }],
    };

    const modelPerformanceData = {
      labels: ['Accuracy', 'Precision', 'Recall', 'F1 Score'],
      datasets: [
        {
          label: 'Random Forest',
          data: [97, 98, 96, 97],
          backgroundColor: '#38bdf8',
        },
        {
          label: 'SVM',
          data: [94, 95, 93, 94],
          backgroundColor: '#818cf8',
        },
        {
          label: 'Logistic Regression',
          data: [90, 91, 89, 90],
          backgroundColor: '#34d399',
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#f8fafc',
            font: { size: 12 }
          }
        },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#334155' }
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#334155' }
        }
      }
    };

    const doughnutOptions = {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#f8fafc',
            font: { size: 14 }
          }
        },
      },
    };

    const barOptions = {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#f8fafc',
            font: { size: 12 }
          }
        },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#334155' }
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#334155' },
          min: 0,
          max: 100
        }
      }
    };

    return (
      <div style={styles.page}>
        <div style={styles.navbar}>
          <div style={styles.logo}>Threat Detection Dashboard</div>
          <div style={styles.navButtons}>
            <button style={styles.navButton} onClick={() => setPage("dashboard")}>Home</button>
            <button style={styles.navButton} onClick={() => setPage("upload")}>Batch Analysis</button>
            <button style={styles.navButton} onClick={() => setPage("metrics")}>Metrics</button>
            <button style={styles.logoutButton} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <h1 style={styles.title}>Metrics Dashboard</h1>
        <p style={styles.subtitle}>
          Real-time visualization of model performance and prediction analytics
        </p>

        <div style={styles.metricsGrid}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Model Accuracy Over Time</h3>
            <div style={styles.chartContainer}>
              <Line data={accuracyData} options={chartOptions} />
            </div>
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Prediction Distribution</h3>
            <div style={styles.chartContainer}>
              <Doughnut data={predictionData} options={doughnutOptions} />
            </div>
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Model Performance Comparison</h3>
            <div style={styles.chartContainer}>
              <Bar data={modelPerformanceData} options={barOptions} />
            </div>
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Key Metrics</h3>
            <div style={styles.metricsContainer}>
              <div style={styles.metricItem}>
                <div style={styles.metricLabel}>Total Predictions</div>
                <div style={styles.metricValue}>12,458</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricLabel}>Attack Detected</div>
                <div style={{...styles.metricValue, color: '#f87171'}}>3,114</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricLabel}>False Positive Rate</div>
                <div style={{...styles.metricValue, color: '#fbbf24'}}>2.3%</div>
              </div>
              <div style={styles.metricItem}>
                <div style={styles.metricLabel}>Best Model</div>
                <div style={{...styles.metricValue, color: '#38bdf8'}}>Random Forest</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.navbar}>
        <div style={styles.logo}>Threat Detection Dashboard</div>
        <div style={styles.navButtons}>
          <button style={styles.navButton} onClick={() => { alert("Home button clicked!"); setPage("dashboard"); }}>Home</button>
          <button style={styles.navButton} onClick={() => setPage("predict")}>Predict</button>
          <button style={styles.navButton} onClick={() => setPage("upload")}>Batch Analysis</button>
          <button style={styles.logoutButton} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <h1 style={styles.title}>Predict Single Session</h1>
      <p style={styles.subtitle}>
        Enter session-level network features and simulate attack classification.
      </p>

      <div style={styles.formBox}>
        <label style={styles.label}>Model</label>
        <select name="model" value={formData.model} onChange={handleChange} style={styles.input}>
          <option>Random Forest</option>
          <option>Decision Tree</option>
          <option>Logistic Regression</option>
        </select>

        <label style={styles.label}>Duration</label>
        <input name="duration" value={formData.duration} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Protocol Type</label>
        <select name="protocol_type" value={formData.protocol_type} onChange={handleChange} style={styles.input}>
          <option>tcp</option>
          <option>udp</option>
          <option>icmp</option>
        </select>

        <label style={styles.label}>Service</label>
        <input name="service" value={formData.service} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Flag</label>
        <input name="flag" value={formData.flag} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Source Bytes</label>
        <input name="src_bytes" value={formData.src_bytes} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Destination Bytes</label>
        <input name="dst_bytes" value={formData.dst_bytes} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Logged In</label>
        <input name="logged_in" value={formData.logged_in} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Count</label>
        <input name="count" value={formData.count} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Srv Count</label>
        <input name="srv_count" value={formData.srv_count} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Serror Rate</label>
        <input name="serror_rate" value={formData.serror_rate} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Rerror Rate</label>
        <input name="rerror_rate" value={formData.rerror_rate} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Dst Host Count</label>
        <input name="dst_host_count" value={formData.dst_host_count} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Dst Host Srv Count</label>
        <input name="dst_host_srv_count" value={formData.dst_host_srv_count} onChange={handleChange} style={styles.input} />

        <div style={styles.buttonContainer}>
          <button style={styles.secondaryButton} onClick={loadNormalSample}>
            Load Normal Sample
          </button>
          <button style={styles.secondaryButton} onClick={loadAttackSample}>
            Load Attack Sample
          </button>
        </div>

        <div style={styles.buttonContainer}>
          <button style={styles.primaryButton} onClick={handlePredict}>
            Predict
          </button>
          <button style={styles.secondaryButton} onClick={() => setPage("dashboard")}>
            Back
          </button>
        </div>
      </div>

      {result && (
        <div style={styles.resultBox}>
          <div style={styles.resultHeader}>
            <h2 style={{ margin: 0 }}>Prediction Result</h2>
            <span style={getPredictionBadgeStyle(result.prediction)}>
              {result.prediction}
            </span>
          </div>

          <div style={styles.resultRow}>
            <span>Risk Level</span>
            <span style={getRiskBadgeStyle(result.risk)}>{result.risk}</span>
          </div>

          <div style={styles.resultRow}>
            <span>Risk Score</span>
            <strong>{result.score}</strong>
          </div>

          <div style={styles.resultRow}>
            <span>Model</span>
            <strong>{result.model}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  loginPage: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a, #111827, #1e293b)",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px"
  },
  loginContainer: {
    width: "100%",
    maxWidth: "450px"
  },
  loginBox: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    border: "1px solid #334155",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.4)"
  },
  loginHeader: {
    textAlign: "center",
    marginBottom: "30px"
  },
  loginTitle: {
    fontSize: "28px",
    marginBottom: "10px",
    color: "#38bdf8",
    margin: "0 0 10px 0"
  },
  loginSubtitle: {
    fontSize: "16px",
    color: "#94a3b8",
    margin: "0"
  },
  errorMessage: {
    backgroundColor: "#7f1d1d",
    color: "#fecaca",
    padding: "12px",
    borderRadius: "10px",
    marginTop: "15px",
    marginBottom: "15px",
    textAlign: "center",
    fontSize: "14px"
  },
  loginButton: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    background: "linear-gradient(90deg, #0ea5e9, #2563eb)",
    color: "white",
    fontWeight: "bold",
    marginTop: "20px"
  },
  loginInfo: {
    marginTop: "25px",
    padding: "15px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px"
  },
  loginInfoText: {
    color: "#94a3b8",
    fontSize: "13px",
    margin: "5px 0"
  },
  authLinks: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "15px",
    gap: "10px"
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#38bdf8",
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "underline"
  },
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a, #111827, #1e293b)",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif",
    padding: "30px"
  },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "15px"
  },
  logo: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#38bdf8"
  },
  navButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  navButton: {
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500"
  },
  logoutButton: {
    backgroundColor: "#7f1d1d",
    color: "#fecaca",
    border: "1px solid #991b1b",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer"
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
    gap: "20px",
    marginTop: "30px"
  },
  chartCard: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
  },
  chartTitle: {
    color: "#f8fafc",
    fontSize: "18px",
    marginBottom: "16px",
    margin: "0 0 16px 0"
  },
  chartContainer: {
    minHeight: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  metricsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px"
  },
  metricItem: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #334155"
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: "12px",
    marginBottom: "8px"
  },
  metricValue: {
    color: "#f8fafc",
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0"
  },
  summaryBox: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "20px",
    marginTop: "20px"
  },
  summaryTitle: {
    color: "#f8fafc",
    fontSize: "18px",
    marginBottom: "10px",
    margin: "0 0 10px 0"
  },
  summaryText: {
    color: "#94a3b8",
    fontSize: "14px",
    margin: "0"
  },
  cancelButton: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500",
    transition: "background-color 0.2s"
  },
  heroSection: {
    textAlign: "center",
    padding: "40px 20px",
    maxWidth: "900px",
    margin: "0 auto 30px"
  },
  tag: {
    color: "#38bdf8",
    fontWeight: "bold",
    letterSpacing: "1px",
    fontSize: "14px",
    marginBottom: "10px"
  },
  title: {
    textAlign: "center",
    fontSize: "40px",
    marginBottom: "10px",
    color: "#f8fafc"
  },
  subtitle: {
    textAlign: "center",
    fontSize: "18px",
    color: "#cbd5e1",
    maxWidth: "760px",
    margin: "0 auto 20px",
    lineHeight: "1.6"
  },
  heroButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginTop: "25px"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    maxWidth: "1100px",
    margin: "0 auto 35px"
  },
  statCard: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)"
  },
  statLabel: {
    color: "#94a3b8",
    marginBottom: "8px",
    fontSize: "14px"
  },
  statValue: {
    margin: 0,
    color: "#38bdf8"
  },
  section: {
    maxWidth: "1100px",
    margin: "0 auto"
  },
  sectionTitle: {
    fontSize: "28px",
    marginBottom: "20px",
    color: "#f8fafc"
  },
  cardContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px"
  },
  modelCard: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    border: "1px solid #334155",
    padding: "22px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)"
  },
  modelCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },
  modelTitle: {
    margin: 0,
    color: "#f8fafc"
  },
  bestBadge: {
    backgroundColor: "#14532d",
    color: "#bbf7d0",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  metricRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #334155",
    color: "#cbd5e1"
  },
  formBox: {
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    border: "1px solid #334155",
    padding: "30px",
    borderRadius: "18px",
    maxWidth: "650px",
    margin: "30px auto",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
  },
  label: {
    display: "block",
    marginTop: "14px",
    marginBottom: "8px",
    fontWeight: "bold",
    color: "#e2e8f0"
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #475569",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontSize: "14px",
    boxSizing: "border-box"
  },
  fileInput: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #475569",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontSize: "14px",
    boxSizing: "border-box"
  },
  buttonContainer: {
    marginTop: "22px",
    display: "flex",
    justifyContent: "center",
    gap: "14px",
    flexWrap: "wrap"
  },
  primaryButton: {
    padding: "12px 22px",
    fontSize: "15px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    background: "linear-gradient(90deg, #0ea5e9, #2563eb)",
    color: "white",
    fontWeight: "bold"
  },
  secondaryButton: {
    padding: "12px 22px",
    fontSize: "15px",
    border: "1px solid #475569",
    borderRadius: "10px",
    cursor: "pointer",
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    fontWeight: "bold"
  },
  resultBox: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    border: "1px solid #334155",
    padding: "24px",
    borderRadius: "18px",
    maxWidth: "520px",
    margin: "20px auto",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "10px"
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #334155",
    color: "#e2e8f0"
  },
  attackBadge: {
    backgroundColor: "#7f1d1d",
    color: "#fecaca",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px"
  },
  normalBadge: {
    backgroundColor: "#14532d",
    color: "#bbf7d0",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px"
  },
  lowBadge: {
    backgroundColor: "#14532d",
    color: "#bbf7d0",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px"
  },
  moderateBadge: {
    backgroundColor: "#78350f",
    color: "#fde68a",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px"
  },
  highBadge: {
    backgroundColor: "#7f1d1d",
    color: "#fecaca",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px"
  },
  fileInfoBox: {
    marginTop: "18px",
    padding: "14px",
    borderRadius: "10px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    color: "#cbd5e1"
  },
  tableBox: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    border: "1px solid #334155",
    padding: "20px",
    borderRadius: "18px",
    maxWidth: "1150px",
    margin: "20px auto",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
    color: "#f8fafc"
  },
  th: {
    border: "1px solid #334155",
    padding: "10px",
    backgroundColor: "#1e293b",
    textAlign: "left",
    color: "#38bdf8"
  },
  td: {
    border: "1px solid #334155",
    padding: "10px",
    textAlign: "left",
    backgroundColor: "#0f172a",
    color: "#e2e8f0"
  }
};

export default App;