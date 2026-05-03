import React, { useState, useEffect } from 'react';
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
import { Doughnut } from 'react-chartjs-2';
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

const LAMBDA_ENDPOINT = 'https://yof26i9009.execute-api.us-east-1.amazonaws.com/dev/predict';


const Metrics = ({ onNavigate }) => {
  const [confusionMatrix, setConfusionMatrix] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const formatInteger = (value, fallback = '0') => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.round(num).toLocaleString() : fallback;
  };

  const formatPercent = (value, fallback = '0.00') => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2) : fallback;
  };

  const formatConfidence = (value, fallback = '0.0000') => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(4) : fallback;
  };

  const parseLambdaBody = async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (typeof result?.body === 'string') {
      return JSON.parse(result.body);
    }

    if (result?.body && typeof result.body === 'object') {
      return result.body;
    }

    return result;
  };

  const setSampleConfusionMatrix = () => {
    setConfusionMatrix({
      confusion_matrix: {
        true_positive: 2850,
        true_negative: 8500,
        false_positive: 300,
        false_negative: 50,
      },
      metrics: {
        accuracy: 0.9703,
        precision: 0.9048,
        recall: 0.9826,
        f1_score: 0.9423,
      },
      total_predictions: 11700,
    });
  };

  const setSampleMetrics = () => {
    setMetricsData({
      total_predictions: 11700,
      attacks_detected: 2900,
      normal_predictions: 8800,
      avg_confidence: 0.9456,
      attack_percentage: 24.79,
    });
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(LAMBDA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'get_metrics' }),
      });

      const data = await parseLambdaBody(response);
      console.log('Metrics raw response:', data);

      const metricsPayload = data?.metrics ?? data ?? {};

      const totalPredictions = toNumber(metricsPayload.total_predictions, 0);
      const tp = toNumber(metricsPayload.true_positives, 0);
      const tn = toNumber(metricsPayload.true_negatives, 0);
      const fp = toNumber(metricsPayload.false_positives, 0);
      const fn = toNumber(metricsPayload.false_negatives, 0);
      
      const attacksDetected = toNumber(metricsPayload.total_attacks, 0) || (tp + fn);
      const normalPredictions = toNumber(metricsPayload.total_normal, 0) || (tn + fp);

      const computedAttackPercentage =
        totalPredictions > 0 ? (attacksDetected / totalPredictions) * 100 : 0;

      setConfusionMatrix({
        confusion_matrix: {
          true_positive: tp,
          true_negative: tn,
          false_positive: fp,
          false_negative: fn,
        },
        metrics: {
          accuracy: toNumber(metricsPayload.accuracy, 0),
          precision: toNumber(metricsPayload.precision, 0),
          recall: toNumber(metricsPayload.recall, 0),
          f1_score: toNumber(metricsPayload.f1_score, 0),
        },
        total_predictions: totalPredictions,
      });

      setMetricsData({
        total_predictions: totalPredictions,
        attacks_detected: attacksDetected,
        normal_predictions: normalPredictions,
        avg_confidence: toNumber(metricsPayload.avg_confidence, 0.95),
        attack_percentage: computedAttackPercentage,
      });
    } catch (err) {
      console.error('Failed to fetch metrics data:', err);
      setError(`Failed to fetch data: ${err.message}`);
      setSampleConfusionMatrix();
      setSampleMetrics();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const safeNormalPredictions = toNumber(metricsData?.normal_predictions, 0);
  const safeAttacksDetected = toNumber(metricsData?.attacks_detected, 0);

  const chartNormal = safeNormalPredictions < 0 ? 0 : safeNormalPredictions;
  const chartAttack = safeAttacksDetected < 0 ? 0 : safeAttacksDetected;

  const predictionData = {
    labels: ['Normal', 'Attack'],
    datasets: [
      {
        data:
          chartNormal === 0 && chartAttack === 0
            ? [1, 0]
            : [chartNormal, chartAttack],
        backgroundColor: ['#34d399', '#f87171'],
        borderColor: ['#10b981', '#ef4444'],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#f8fafc',
          font: { size: 14 },
        },
      },
    },
  };

  const ConfusionMatrixGrid = ({ data }) => {
    const matrix = data?.confusion_matrix;

    if (!matrix) {
      return <div style={{ color: '#f87171' }}>No data available</div>;
    }

    const {
      true_positive: tp = 0,
      true_negative: tn = 0,
      false_positive: fp = 0,
      false_negative: fn = 0,
    } = matrix;

    const baseCellStyle = {
      padding: '16px',
      textAlign: 'center',
      borderRadius: '8px',
      minHeight: '90px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      border: '2px solid #334155',
      boxSizing: 'border-box',
      width: '100%',
    };

    const headerCellStyle = {
      ...baseCellStyle,
      backgroundColor: '#334155',
      fontWeight: 'bold',
      minHeight: '70px',
    };

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 1fr',
          gap: '10px',
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        <div></div>

        <div style={headerCellStyle}>Predicted Attack</div>
        <div style={headerCellStyle}>Predicted Normal</div>

        <div style={headerCellStyle}>Actual Attack</div>
        <div
          style={{
            ...baseCellStyle,
            backgroundColor: 'rgba(52, 211, 153, 0.2)',
            borderColor: '#10b981',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {tp}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
            True Positive
          </div>
        </div>
        <div
          style={{
            ...baseCellStyle,
            backgroundColor: 'rgba(248, 113, 113, 0.2)',
            borderColor: '#ef4444',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171' }}>
            {fn}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
            False Negative
          </div>
        </div>

        <div style={headerCellStyle}>Actual Normal</div>
        <div
          style={{
            ...baseCellStyle,
            backgroundColor: 'rgba(248, 113, 113, 0.2)',
            borderColor: '#ef4444',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171' }}>
            {fp}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
            False Positive
          </div>
        </div>
        <div
          style={{
            ...baseCellStyle,
            backgroundColor: 'rgba(52, 211, 153, 0.2)',
            borderColor: '#10b981',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {tn}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
            True Negative
          </div>
        </div>
      </div>
    );
  };

  const displayTotal = toNumber(metricsData?.total_predictions, 0);
  const displayAttacks = toNumber(metricsData?.attacks_detected, 0);
  const displayNormal = toNumber(metricsData?.normal_predictions, 0);
  const displayAttackPercent =
    displayTotal > 0 ? (displayAttacks / displayTotal) * 100 : 0;
  const displayConfidence = toNumber(metricsData?.avg_confidence, 0);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Metrics Dashboard</h1>
      <p style={styles.subtitle}>
        Real-time visualization of model performance and prediction analytics
      </p>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            color: '#fca5a5',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #f87171',
          }}
        >
          ℹ️ {error} - Showing sample data
        </div>
      )}

      {loading && (
        <div
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: '#93c5fd',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          Loading metrics...
        </div>
      )}

      <div style={styles.metricsGrid}>
        <div style={styles.chartCard}>
  <h3 style={styles.chartTitle}>Confusion Matrix</h3>
  <div
    style={{
      ...styles.chartContainer,
     width: '100%',
    overflowX: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    }}
  >
    <ConfusionMatrixGrid data={confusionMatrix} />

    {confusionMatrix?.metrics && (
      <div
        style={{
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid #334155',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))',
            gap: '15px',
            width: '100%',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '14px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>Accuracy</div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#38bdf8',
                marginTop: '6px',
              }}
            >
              {(toNumber(confusionMatrix.metrics.accuracy, 0) * 100).toFixed(2)}%
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '14px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>Precision</div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#34d399',
                marginTop: '6px',
              }}
            >
              {(toNumber(confusionMatrix.metrics.precision, 0) * 100).toFixed(2)}%
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '14px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>Recall</div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#fbbf24',
                marginTop: '6px',
              }}
            >
              {(toNumber(confusionMatrix.metrics.recall, 0) * 100).toFixed(2)}%
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '14px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>F1 Score</div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#f87171',
                marginTop: '6px',
              }}
            >
              {(toNumber(confusionMatrix.metrics.f1_score, 0) * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
</div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Prediction Distribution</h3>
          <div style={{ ...styles.chartContainer, height: '320px' }}>
            <Doughnut data={predictionData} options={doughnutOptions} />
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Key Metrics</h3>
          <div style={styles.metricsContainer}>
            <div style={styles.metricItem}>
              <div style={styles.metricLabel}>Total Predictions</div>
              <div style={styles.metricValue}>
                {formatInteger(displayTotal, '0')}
              </div>
            </div>

            <div style={styles.metricItem}>
              <div style={styles.metricLabel}>Attack Detected</div>
              <div style={{ ...styles.metricValue, color: '#f87171' }}>
                {formatInteger(displayAttacks, '0')}
              </div>
            </div>

            <div style={styles.metricItem}>
              <div style={styles.metricLabel}>Normal Predictions</div>
              <div style={{ ...styles.metricValue, color: '#34d399' }}>
                {formatInteger(displayNormal, '0')}
              </div>
            </div>

            <div style={styles.metricItem}>
              <div style={styles.metricLabel}>Attack %</div>
              <div style={{ ...styles.metricValue, color: '#fbbf24' }}>
                {formatPercent(displayAttackPercent, '0.00')}%
              </div>
            </div>

            <div style={styles.metricItem}>
              <div style={styles.metricLabel}>Avg Confidence</div>
              <div style={{ ...styles.metricValue, color: '#38bdf8' }}>
                {formatConfidence(displayConfidence, '0.0000')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metrics;