import React, { useCallback, useEffect, useState } from 'react';
import Papa from 'papaparse';
import styles from '../styles';

const BACKEND_URL = '/api'

const Upload = ({ onNavigate, onToast }) => {
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [csvData, setCsvData] = useState([]);
  const [csvContent, setCsvContent] = useState("");
  
  // Upload History state
  const [uploadHistory, setUploadHistory] = useState([]);
  const [batchPredictions, setBatchPredictions] = useState([]);
  const [viewingUploadId, setViewingUploadId] = useState(null);
  
  const [isPredicting, setIsPredicting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [models, setModels] = useState(['random_forest', 'decision_tree', 'logistic_regression']);
  const [selectedModel, setSelectedModel] = useState('random_forest');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [deletingUploadId, setDeletingUploadId] = useState(null);

  const loadModels = useCallback(async () => {
    setIsLoadingModels(true);
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
      if (onToast) {
        onToast('Unable to load models from backend, using defaults.', 'warning');
      }
    } finally {
      setIsLoadingModels(false);
    }
  }, [onToast]);

  const loadUploadHistory = useCallback(async (showError = false) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${BACKEND_URL}/get_upload_history`);
      if (!response.ok) {
        throw new Error(`History request failed with status ${response.status}`);
      }

      const data = await response.json();
      setUploadHistory(data.uploads || []);
      if (showError && onToast) {
        onToast('Upload history refreshed.', 'success');
      }
    } catch (error) {
      console.warn('Unable to load upload history:', error);
      if (showError) {
        setUploadStatus(`Unable to load upload history: ${error.message}`);
        if (onToast) {
          onToast(`Unable to load upload history: ${error.message}`, 'error');
        }
      }
    } finally {
      setIsLoadingHistory(false);
    }
  }, [onToast]);
  
  // Pagination for prediction results
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;
  
  useEffect(() => {
    loadModels();
    loadUploadHistory();
  }, [loadModels, loadUploadHistory]);

  const handleBatchPredictAsync = async () => {
    if (!csvContent || !uploadedFileName) {
      setUploadStatus('Please upload a CSV file first.');
      if (onToast) {
        onToast('Please upload a CSV file first.', 'warning');
      }
      return;
    }

    setIsPredicting(true);
    setUploadStatus('Uploading file and queuing for processing...');
    
    try {
      // Generate unique upload ID
      const uploadId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Call async batch predict endpoint
      const response = await fetch('/api/batch_predict_async', {
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
        if (onToast) {
          onToast('Batch upload queued successfully.', 'success');
        }
        await loadUploadHistory(true);
      }
    } catch (error) {
      setUploadStatus(`Upload failed: ${error.message}`);
      if (onToast) {
        onToast(`Upload failed: ${error.message}`, 'error');
      }
    } finally {
      setIsPredicting(false);
    }
  };

  const handleViewPredictions = async (uploadId) => {
    try {
      setIsLoadingPredictions(true);
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
        if (onToast) {
          onToast(`Loaded ${predictions.length} prediction rows.`, 'success');
        }
      } else {
        setUploadStatus('Failed to load predictions');
        if (onToast) {
          onToast('Failed to load predictions.', 'error');
        }
      }
    } catch (error) {
      setUploadStatus(`Error loading predictions: ${error.message}`);
      if (onToast) {
        onToast(`Error loading predictions: ${error.message}`, 'error');
      }
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  const handleDeleteUpload = async (uploadId) => {
    const confirmed = window.confirm('Delete this upload history entry?');
    if (!confirmed) {
      return;
    }

    try {
      setDeletingUploadId(uploadId);
      const response = await fetch(`${BACKEND_URL}/delete_upload_history/${encodeURIComponent(uploadId)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      setUploadHistory((prev) => prev.filter((item) => item.upload_id !== uploadId));

      if (viewingUploadId === uploadId) {
        setViewingUploadId(null);
        setBatchPredictions([]);
      }

      setUploadStatus('Upload history entry deleted.');
      if (onToast) {
        onToast('Upload history entry deleted.', 'success');
      }
    } catch (error) {
      setUploadStatus(`Delete failed: ${error.message}`);
      if (onToast) {
        onToast(`Delete failed: ${error.message}`, 'error');
      }
    } finally {
      setDeletingUploadId(null);
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

  const handleClearFile = () => {
    setCsvData([]);
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
          setCsvData(results.data.slice(0, 5));
        },
        error: function (error) {
          if (onToast) {
            onToast('Error parsing CSV file. Please check the file format.', 'error');
          }
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
        {isLoadingModels && (
          <div style={styles.infoBox}>Loading available models...</div>
        )}

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

      <div style={styles.tableBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Upload History</h2>
          <button
            onClick={() => loadUploadHistory(true)}
            disabled={isLoadingHistory}
            style={{
              backgroundColor: '#1f4e79',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: isLoadingHistory ? 'not-allowed' : 'pointer',
              fontSize: '13px'
            }}
          >
            {isLoadingHistory ? 'Refreshing...' : 'Refresh History'}
          </button>
        </div>
        {isLoadingHistory && <div style={styles.infoBox}>Loading upload history...</div>}
        {uploadHistory.length > 0 ? (
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
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {upload.status === 'complete' && (
                        <button
                          onClick={() => handleViewPredictions(upload.upload_id)}
                          disabled={isLoadingPredictions}
                          style={{
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: isLoadingPredictions ? 'not-allowed' : 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {isLoadingPredictions && viewingUploadId === upload.upload_id ? 'Loading...' : 'View Predictions →'}
                        </button>
                      )}
                      {upload.status === 'processing' && (
                        <span style={{ color: '#FFA500', fontSize: '12px' }}>⏳ Processing...</span>
                      )}
                      <button
                        onClick={() => handleDeleteUpload(upload.upload_id)}
                        disabled={deletingUploadId === upload.upload_id}
                        style={{
                          backgroundColor: '#d64545',
                          color: 'white',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          cursor: deletingUploadId === upload.upload_id ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {deletingUploadId === upload.upload_id ? 'Deleting...' : 'Delete'}
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ margin: 0, color: '#5f6b7a' }}>No upload history available yet.</p>
        )}
      </div>

      {batchPredictions.length > 0 && (
        <div style={styles.tableBox}>
          <h2 style={styles.sectionTitle}>Prediction Results</h2>
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