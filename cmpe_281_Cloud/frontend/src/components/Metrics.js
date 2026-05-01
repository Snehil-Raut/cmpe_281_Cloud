import React from 'react';
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
import styles from '../styles';

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

const Metrics = ({ onNavigate }) => {
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
          <button style={styles.navButton} onClick={() => onNavigate("dashboard")}>Home</button>
          <button style={styles.navButton} onClick={() => onNavigate("upload")}>Batch Analysis</button>
          <button style={styles.navButton} onClick={() => onNavigate("metrics")}>Metrics</button>
          <button style={styles.logoutButton} onClick={() => onNavigate("login")}>Logout</button>
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
              <div style={{...styles.metricValue, color: '#f87171'}}>Attack Detected</div>
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
};

export default Metrics;