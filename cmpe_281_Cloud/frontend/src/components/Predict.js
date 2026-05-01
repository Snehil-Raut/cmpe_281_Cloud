import React, { useState } from 'react';
import styles from '../styles';

const Predict = ({ onNavigate }) => {
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  const getRiskBadgeStyle = (risk) => {
    if (risk === "Low") return styles.lowBadge;
    if (risk === "Moderate") return styles.moderateBadge;
    return styles.highBadge;
  };

  const getPredictionBadgeStyle = (prediction) => {
    return prediction === "Attack" ? styles.attackBadge : styles.normalBadge;
  };

  return (
    <div style={styles.page}>
      <div style={styles.navbar}>
        <div style={styles.logo}>Threat Detection Dashboard</div>
        <div style={styles.navButtons}>
          <button style={styles.navButton} onClick={() => onNavigate("dashboard")}>Home</button>
          <button style={styles.navButton} onClick={() => onNavigate("predict")}>Predict</button>
          <button style={styles.navButton} onClick={() => onNavigate("upload")}>Batch Analysis</button>
          <button style={styles.logoutButton} onClick={() => onNavigate("login")}>Logout</button>
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
          <button style={styles.secondaryButton} onClick={() => onNavigate("dashboard")}>
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
};

export default Predict;