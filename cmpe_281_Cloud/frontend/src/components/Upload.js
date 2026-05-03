import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import styles from '../styles';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const Upload = ({ onNavigate }) => {
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [csvData, setCsvData] = useState([]);
  const [fullCsvData, setFullCsvData] = useState([]);
  const [csvContent, setCsvContent] = useState("");
  
  // Upload History state
  const [uploadHistory, setUploadHistory] = useState([]);
  const [batchPredictions, setBatchPredictions] = useState([]);
  const [viewingUploadId, setViewingUploadId] = useState(null);
  
  const [isPredicting, setIsPredicting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [models, setModels] = useState(['random_forest', 'decision_tree', 'logistic_regression']);
  const [selectedModel, setSelectedModel] = useState('random_forest');
  
  // Pagination for prediction results
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;
  
  useEffect(() => {
    // Load models and upload history on component mount
    const loadModels = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/models`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.models) && data.models.length > 0) {
            setModels(data.models);
            setSelectedModel(data.models[0]);
          }
        }
      } catch (error) {
        console.warn('Unable to load model list from backend, using defaults.');
      }
    };
    
    const loadUploadHistory = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/get_upload_history`);
        if (response.ok) {
          const data = await response.json();
          setUploadHistory(data.uploads || []);
        }
      } catch (error) {
        console.warn('Unable to load upload history:', error);
      }
    };
    
    loadModels();
    loadUploadHistory();
    
    // Refresh upload history every 5 seconds
    const interval = setInterval(loadUploadHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleBatchPredictAsync = async () => {
    if (!csvContent || !uploadedFileName) {
      setUploadStatus('Please upload a CSV file first.');
      return;
    }

    setIsPredicting(true);
    setUploadStatus('Uploading file and queuing for processing...');
    
    try {
      // Generate unique upload ID
      const uploadId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Call async batch predict endpoint
      const response = await fetch(`${BACKEND_URL}/batch_predict_async`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csv_data: csvContent,
          filename: uploadedFileName,
          upload_id: uploadId,
          model: selectedModel
        })
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      const receivedUploadId = data.upload_id;

      // Store upload history metadata to DynamoDB
      const historyResponse = await fetch(`${BACKEND_URL}/store_upload_history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upload_id: receivedUploadId,
          filename: uploadedFileName,
          row_count: data.row_count,
          model_name: selectedModel
        })
      });

      if (historyResponse.ok) {
        setUploadStatus(`File uploaded successfully! Upload ID: ${receivedUploadId}. Processing in background...`);
        
        // Refresh upload history
        const historyFetch = await fetch(`${BACKEND_URL}/get_upload_history`);
        if (historyFetch.ok) {
          const historyData = await historyFetch.json();
          setUploadHistory(historyData.uploads || []);
        }
      }
    } catch (error) {
      setUploadStatus(`Upload failed: ${error.message}`);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleViewPredictions = async (uploadId) => {
    try {
      setViewingUploadId(uploadId);
      const response = await fetch(`${BACKEND_URL}/get_batch_predictions/${uploadId}`);
      
      if (response.ok) {
        const data = await response.json();
        const predictions = data.predictions.map((pred, idx) => ({
          index: idx + 1,
          row_number: pred.row_number,
          prediction: pred.predicted_label,
          confidence: (parseFloat(pred.confidence) * 100).toFixed(1),
          actual_label: pred.actual_label,
          is_correct: pred.is_correct
        }));
        setBatchPredictions(predictions);
        setCurrentPage(1);
      } else {
        setUploadStatus('Failed to load predictions');
      }
    } catch (error) {
      setUploadStatus(`Error loading predictions: ${error.message}`);
    }
  };

  const getStatusBadgeStyle = (status) => {
    if (status === 'processing') {
      return { ...styles.badge, backgroundColor: '#FFA500', color: 'white', padding: '4px 12px', borderRadius: '4px' };
    } else if (status === 'complete') {
      return { ...styles.badge, backgroundColor: '#4CAF50', color: 'white', padding: '4px 12px', borderRadius: '4px' };
    } else {
      return { ...styles.badge, backgroundColor: '#FF6B6B', color: 'white', padding: '4px 12px', borderRadius: '4px' };
    }
  };

  const storePredictionsToDb = async (predictions, rawResults = null) => {
    // Store predictions to DynamoDB in a single batch call for efficiency
    try {
      const predictionsToStore = [];
      
      for (let idx = 0; idx < predictions.length; idx++) {
        const prediction = predictions[idx];
        const rawResult = rawResults ? rawResults[idx] : null;
        let actualLabel = null;
        
        // Try to get actual_label from backend result first
        if (rawResult && rawResult.actual_label) {
          actualLabel = rawResult.actual_label;
        }
        
        // Fall back to looking in CSV features
        if (!actualLabel) {
          const features = prediction.features || {};
          const labelColumns = ['label', 'actual_label', 'actual', 'true_label', 'target'];
          for (const col of labelColumns) {
            if (features[col] !== undefined) {
              actualLabel = features[col];
              break;
            }
          }
        }
        
        // Only include if we have an actual label for proper metrics tracking
        if (actualLabel) {
          predictionsToStore.push({
            prediction_id: `batch_pred_${Date.now()}_${Math.random()}`,
            model_name: selectedModel,
            actual_label: String(actualLabel),
            predicted_label: prediction.prediction,
            confidence: parseFloat(prediction.confidence) || 0
          });
        }
      }
      
      if (predictionsToStore.length > 0) {
        console.log(`Stored ${predictionsToStore.length} predictions via Lambda`);
      } else {
        console.log('No labeled predictions to store');
      }
    } catch (error) {
      console.error('Failed to store predictions:', error);
    }
  };

  const handleBatchPredict = async () => {
    setIsPredicting(true);
    try {
      if (!csvContent) {
        throw new Error('No CSV content available for prediction. Please upload a file first.');
      }

      const response = await fetch(`${BACKEND_URL}/batch_predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csv_data: csvContent,
          model: selectedModel
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success' && data.results) {
        const predictions = data.results.map((result) => ({
          index: result.row + 1,
          prediction: result.prediction,
          confidence: (result.confidence * 100).toFixed(1),
          features: fullCsvData[result.row] || {}
        }));
        setBatchPredictions(predictions);
        setUploadStatus('Prediction completed.');
        
        // Store predictions to DynamoDB for metrics - pass raw results too
        await storePredictionsToDb(predictions, data.results);
      } else {
        throw new Error(data.error || 'Unknown error from API');
      }
    } catch (error) {
      setUploadStatus(`Prediction failed: ${error.message}`);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleUploadToS3 = async () => {
    if (!csvContent || !uploadedFileName) {
      setUploadStatus('Please upload a CSV file first.');
      return;
    }

    setUploadStatus('Uploading...');
    try {
      const response = await fetch(`${BACKEND_URL}/upload_csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csv_data: csvContent,
          filename: uploadedFileName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setUploadStatus(`Upload successful: ${data.filename}`);
    } catch (error) {
      setUploadStatus(`Upload failed: ${error.message}`);
    }
  };

  const handleClearFile = () => {
    setCsvData([]);
    setFullCsvData([]);
    setCsvContent("");
    setUploadedFileName("");
    setUploadStatus("");
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadStatus("");

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      setCsvContent(text);

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          setFullCsvData(results.data);
          setCsvData(results.data.slice(0, 5));
        },
        error: function (error) {
          alert('Error parsing CSV file. Please check the file format.');
        }
      });
    };
    reader.readAsText(file);
  };

  const getPredictionBadgeStyle = (prediction) => {
    return prediction === "Attack" ? styles.attackBadge : styles.normalBadge;
  };

  const getCorrectnessBadge = (isCorrect) => {
    if (isCorrect === 'Correct') {
      return { ...styles.badge, backgroundColor: '#4CAF50', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' };
    } else if (isCorrect === 'Incorrect') {
      return { ...styles.badge, backgroundColor: '#FF6B6B', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' };
    } else {
      return { ...styles.badge, backgroundColor: '#9E9E9E', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' };
    }
  };

  const totalRecords = batchPredictions.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const startIndex = (currentPage - 1) * recordsPerPage;
  const currentRecords = batchPredictions.slice(startIndex, startIndex + recordsPerPage);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Batch CSV Analysis</h1>
      <p style={styles.subtitle}>
        Upload a dataset file and trigger async batch predictions powered by AWS SQS and Lambda.
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

        <label style={styles.label}>Model</label>
        <select
          name="model"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={styles.input}
        >
          {models.map((modelName) => (
            <option key={modelName} value={modelName}>
              {modelName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>

        <div style={{...styles.buttonContainer, marginTop: '16px', gap: '12px', display: 'flex', flexWrap: 'wrap'}}>
          <button style={styles.secondaryButton} onClick={() => onNavigate("dashboard")}>Back to Dashboard</button>
          {uploadedFileName && (
            <>
              <button
                style={styles.primaryButton}
                onClick={handleBatchPredictAsync}
                disabled={isPredicting || !csvContent}
              >
                {isPredicting ? "Processing..." : "Run Predictions (Async)"}
              </button>
              <button
                style={styles.secondaryButton}
                onClick={handleUploadToS3}
                disabled={!csvContent}
              >
                Upload CSV to S3
              </button>
            </>
          )}
        </div>
        {uploadStatus && (
          <div style={styles.infoBox}>
            {uploadStatus}
          </div>
        )}
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
        </div>
      )}

      {uploadHistory.length > 0 && (
        <div style={styles.tableBox}>
          <h2 style={styles.sectionTitle}>Upload History</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Filename</th>
                  <th style={styles.th}>Model</th>
                  <th style={styles.th}>Rows</th>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.map((upload) => (
                  <tr key={upload.upload_id}>
                    <td style={styles.td}>{upload.filename}</td>
                    <td style={styles.td}>{upload.model}</td>
                    <td style={styles.td}>{upload.row_count}</td>
                    <td style={styles.td}>{new Date(upload.timestamp).toLocaleString()}</td>
                    <td style={styles.td}>
                      <span style={getStatusBadgeStyle(upload.status)}>
                        {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {upload.status === 'complete' && (
                        <button
                          onClick={() => handleViewPredictions(upload.upload_id)}
                          style={{
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          View Predictions →
                        </button>
                      )}
                      {upload.status === 'processing' && (
                        <span style={{ color: '#FFA500', fontSize: '12px' }}>⏳ Processing...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {batchPredictions.length > 0 && (
        <div style={styles.tableBox}>
          <h2 style={styles.sectionTitle}>Prediction Results {viewingUploadId && `(ID: ${viewingUploadId})`}</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Row #</th>
                  <th style={styles.th}>Actual</th>
                  <th style={styles.th}>Predicted</th>
                  <th style={styles.th}>Confidence</th>
                  <th style={styles.th}>Correctness</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((pred) => (
                  <tr key={pred.index}>
                    <td style={styles.td}>{pred.index}</td>
                    <td style={styles.td}>{pred.actual_label || 'N/A'}</td>
                    <td style={styles.td}>
                      <span style={getPredictionBadgeStyle(pred.prediction)}>
                        {pred.prediction}
                      </span>
                    </td>
                    <td style={styles.td}>{pred.confidence}%</td>
                    <td style={styles.td}>
                      <span style={getCorrectnessBadge(pred.is_correct)}>
                        {pred.is_correct}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.pagination}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
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