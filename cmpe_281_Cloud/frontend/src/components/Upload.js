import React, { useState } from 'react';
import Papa from 'papaparse';
import styles from '../styles';

const Upload = ({ onNavigate }) => {
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [csvData, setCsvData] = useState([]);
  const [batchPredictions, setBatchPredictions] = useState([]);
  const [isPredicting, setIsPredicting] = useState(false);

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

  const getPredictionBadgeStyle = (prediction) => {
    return prediction === "Attack" ? styles.attackBadge : styles.normalBadge;
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
          <button style={styles.secondaryButton} onClick={() => onNavigate("dashboard")}>
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
};

export default Upload;