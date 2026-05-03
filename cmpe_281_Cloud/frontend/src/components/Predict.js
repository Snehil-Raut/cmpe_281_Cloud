import React, { useEffect, useState } from 'react';
import styles from '../styles';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
const LAMBDA_ENDPOINT = 'https://yof26i9009.execute-api.us-east-1.amazonaws.com/dev/predict';

const Predict = ({ onNavigate, onToast }) => {
  const [models, setModels] = useState(['random_forest', 'decision_tree', 'logistic_regression']);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
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
    model: "random_forest"
  });

  const [result, setResult] = useState(null);
  const [storing, setStoring] = useState(false);
  const [storeMessage, setStoreMessage] = useState(null);

  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const response = await fetch(`${BACKEND_URL}/models`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.models) && data.models.length > 0) {
            setModels(data.models);
            setFormData((prev) => ({ ...prev, model: data.models[0] }));
          }
        }
      } catch (error) {
        console.warn('Unable to load model list from backend, using defaults.');
        if (onToast) {
          onToast('Unable to load models from backend, using defaults.', 'warning');
        }
      } finally {
        setIsLoadingModels(false);
      }
    };
    loadModels();
  }, [onToast]);

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
      if (onToast) {
        onToast('Please fill all required fields before prediction.', 'warning');
      }
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
      model: formData.model,
      confirmed: false
    });
    
    setStoreMessage(null);
    if (onToast) {
      onToast(`Prediction completed: ${riskLevel} risk`, 'info');
    }
  };

  // Store prediction to Lambda with confirmed actual label
  const storePredictionToLambda = async (actualLabel) => {
    if (!result) return;
    
    setStoring(true);
    try {
      const response = await fetch(LAMBDA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'store_prediction',
          prediction_id: `pred_${Date.now()}`,
          model_name: result.model,
          actual_label: actualLabel,
          predicted_label: result.prediction,
          confidence: (result.score / 100).toFixed(4)
        })
      });
      
      const resData = await response.json();
      
      if (response.ok) {
        setStoreMessage({
          type: 'success',
          text: `✓ Prediction stored! Actual: ${actualLabel}, Predicted: ${result.prediction}`
        });
        setResult({ ...result, confirmed: true, actualLabel });
        if (onToast) {
          onToast('Prediction stored successfully.', 'success');
        }
      } else {
        setStoreMessage({
          type: 'error',
          text: `Failed to store: ${resData.error || 'Unknown error'}`
        });
        if (onToast) {
          onToast(`Failed to store prediction: ${resData.error || 'Unknown error'}`, 'error');
        }
      }
    } catch (error) {
      setStoreMessage({
        type: 'error',
        text: `Error storing prediction: ${error.message}`
      });
      if (onToast) {
        onToast(`Error storing prediction: ${error.message}`, 'error');
      }
    }
    setStoring(false);
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
      <h1 style={styles.title}>Predict Single Session</h1>
      <p style={styles.subtitle}>
        Enter session-level network features and simulate attack classification.
      </p>

      <div style={styles.formBox}>
        <label style={styles.label}>Model</label>
        <select name="model" value={formData.model} onChange={handleChange} style={styles.input}>
          {models.map((modelName) => (
            <option key={modelName} value={modelName}>
              {modelName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        {isLoadingModels && (
          <div style={styles.infoBox}>Loading available models...</div>
        )}

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

          {/* Confirmation Section */}
          {!result.confirmed && (
            <div style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #334155'
            }}>
              <p style={{ color: '#94a3b8', marginBottom: '15px' }}>
                📊 Confirm actual label to store prediction and update metrics:
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}>
                <button
                  onClick={() => storePredictionToLambda('Normal')}
                  disabled={storing}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#34d399',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: storing ? 'not-allowed' : 'pointer',
                    opacity: storing ? 0.6 : 1
                  }}
                >
                  {storing ? 'Storing...' : '✓ Actual: Normal'}
                </button>
                <button
                  onClick={() => storePredictionToLambda('Attack')}
                  disabled={storing}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#f87171',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: storing ? 'not-allowed' : 'pointer',
                    opacity: storing ? 0.6 : 1
                  }}
                >
                  {storing ? 'Storing...' : '✗ Actual: Attack'}
                </button>
              </div>
            </div>
          )}

          {/* Stored Confirmation */}
          {result.confirmed && (
            <div style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #334155',
              backgroundColor: 'rgba(52, 211, 153, 0.1)',
              padding: '15px',
              borderRadius: '6px',
              border: '1px solid #10b981'
            }}>
              <div style={{ color: '#10b981', fontWeight: 'bold' }}>
                ✓ Prediction stored successfully!
              </div>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '5px' }}>
                Actual: <strong>{result.actualLabel}</strong> | 
                Predicted: <strong>{result.prediction}</strong> | 
                Correct: <strong>{result.actualLabel === result.prediction ? 'Yes' : 'No'}</strong>
              </div>
            </div>
          )}

          {/* Store Message */}
          {storeMessage && (
            <div style={{
              marginTop: '15px',
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: storeMessage.type === 'success' 
                ? 'rgba(52, 211, 153, 0.2)' 
                : 'rgba(248, 113, 113, 0.2)',
              color: storeMessage.type === 'success' ? '#10b981' : '#f87171',
              border: `1px solid ${storeMessage.type === 'success' ? '#10b981' : '#f87171'}`
            }}>
              {storeMessage.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Predict;