import React from 'react';
import styles from '../styles';

const Dashboard = ({ onNavigate }) => {
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

  return (
    <div style={styles.page}>
      <div style={styles.navbar}>
        <div style={styles.logo}>Threat Detection Dashboard</div>
        <div style={styles.navButtons}>
          <button style={styles.navButton} onClick={() => onNavigate("upload")}>Batch Analysis</button>
          <button style={styles.navButton} onClick={() => onNavigate("metrics")}>Metrics</button>
          <button style={styles.logoutButton} onClick={() => onNavigate("login")}>Logout</button>
        </div>
      </div>

      <div style={styles.heroSection}>
        <p style={styles.tag}>AWS + Machine Learning + Intrusion Analysis</p>
        <h1 style={styles.title}>Cloud-Based Intrusion Detection System</h1>
        <p style={styles.subtitle}>
          Analyze network session data and classify it as normal or attack using machine learning models.
        </p>

        <div style={styles.heroButtons}>
          <button style={styles.primaryButton} onClick={() => onNavigate("predict")}>
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
};

export default Dashboard;