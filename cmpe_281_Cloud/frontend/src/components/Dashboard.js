import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../styles';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
const LAMBDA_ENDPOINT = 'https://yof26i9009.execute-api.us-east-1.amazonaws.com/dev/predict';

const defaultModelOptions = [
  { value: 'decision_tree', label: 'Decision Tree' },
  { value: 'random_forest', label: 'Random Forest' },
  { value: 'logistic_regression', label: 'Logistic Regression' }
];

const toDisplayName = (modelName) =>
  modelName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const Dashboard = ({ onNavigate }) => {
  const [modelOptions, setModelOptions] = useState(defaultModelOptions);
  const [metricsByModel, setMetricsByModel] = useState({});
  const [selectedModel, setSelectedModel] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const loadModelOptions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/models`);
      if (!response.ok) {
        return defaultModelOptions;
      }

      const data = await response.json();
      if (!Array.isArray(data.models) || data.models.length === 0) {
        return defaultModelOptions;
      }

      return data.models.map((modelName) => ({
        value: modelName,
        label: toDisplayName(modelName)
      }));
    } catch {
      return defaultModelOptions;
    }
  };

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const options = await loadModelOptions();
      setModelOptions(options);

      const results = await Promise.all(
        options.map(async (model) => {
          const response = await fetch(LAMBDA_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'get_metrics',
              model_name: model.value
            })
          });

          const payload = await parseLambdaBody(response);
          const metrics = payload?.metrics ?? payload ?? {};

          return {
            ...model,
            accuracy: toNumber(metrics.accuracy, 0),
            precision: toNumber(metrics.precision, 0),
            recall: toNumber(metrics.recall, 0),
            f1: toNumber(metrics.f1_score, 0),
            totalPredictions: toNumber(metrics.total_predictions, 0)
          };
        })
      );

      const mapped = results.reduce((acc, item) => {
        acc[item.value] = item;
        return acc;
      }, {});

      setMetricsByModel(mapped);
    } catch (loadError) {
      setError(`Unable to load live metrics: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const allModelMetrics = modelOptions
    .map((option) => metricsByModel[option.value])
    .filter(Boolean);

  const visibleModels = selectedModel === 'all'
    ? allModelMetrics
    : allModelMetrics.filter((model) => model.value === selectedModel);

  const bestModel = allModelMetrics.reduce((best, current) => {
    if (!best) {
      return current;
    }
    return current.accuracy > best.accuracy ? current : best;
  }, null);

  const selectedModelMetric = selectedModel === 'all'
    ? null
    : allModelMetrics.find((model) => model.value === selectedModel) || null;

  const headlineModel = selectedModelMetric || bestModel;

  const formatPercent = (value) => `${(toNumber(value, 0) * 100).toFixed(2)}%`;
  const formatScore = (value) => toNumber(value, 0).toFixed(4);

  return (
    <div style={styles.page}>
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
          <p style={styles.statLabel}>{selectedModel === 'all' ? 'Best Model' : 'Selected Model'}</p>
          <h2 style={styles.statValue}>{headlineModel?.label || 'Loading...'}</h2>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>{selectedModel === 'all' ? 'Best Accuracy' : 'Selected Accuracy'}</p>
          <h2 style={styles.statValue}>{headlineModel ? formatPercent(headlineModel.accuracy) : '0.00%'}</h2>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Available Models</p>
          <h2 style={styles.statValue}>{visibleModels.length}</h2>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Model Performance</h2>
        <div style={{ maxWidth: '360px', marginBottom: '20px' }}>
          <label htmlFor="dashboard-model-filter" style={styles.label}>Filter by Model</label>
          <select
            id="dashboard-model-filter"
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            style={styles.input}
          >
            <option value="all">All Models</option>
            {modelOptions.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p style={{ color: '#fca5a5', marginBottom: '16px' }}>{error}</p>}
        <div style={styles.cardContainer}>
          {visibleModels.map((model) => (
            <div key={model.value} style={styles.modelCard}>
              <div style={styles.modelCardHeader}>
                <h3 style={styles.modelTitle}>{model.label}</h3>
                {bestModel && model.value === bestModel.value && (
                  <span style={styles.bestBadge}>Best</span>
                )}
              </div>
              <div style={styles.metricRow}>
                <span>Accuracy</span>
                <strong>{formatPercent(model.accuracy)}</strong>
              </div>
              <div style={styles.metricRow}>
                <span>Precision</span>
                <strong>{formatScore(model.precision)}</strong>
              </div>
              <div style={styles.metricRow}>
                <span>Recall</span>
                <strong>{formatScore(model.recall)}</strong>
              </div>
              <div style={styles.metricRow}>
                <span>F1-Score</span>
                <strong>{formatScore(model.f1)}</strong>
              </div>
            </div>
          ))}
          {loading && visibleModels.length === 0 && (
            <div style={styles.modelCard}>
              <div style={styles.metricRow}>
                <span>Loading live model metrics...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  onNavigate: PropTypes.func.isRequired
};

export default Dashboard;