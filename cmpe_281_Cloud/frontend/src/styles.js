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
  appContainer: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a, #111827, #1e293b)",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif"
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
    backgroundColor: "#0f172a",
    border: "1px solid rgba(148, 163, 184, 0.15)",
    borderRadius: "18px",
    padding: "18px 24px",
    marginBottom: "30px",
    boxShadow: "0 10px 35px rgba(15, 23, 42, 0.28)",
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
    gridTemplateColumns: "repeat(2, 1fr)",
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
  processingBadge: {
    backgroundColor: "#92400e",
    color: "#fef3c7",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px"
  },
  completeBadge: {
    backgroundColor: "#064e3b",
    color: "#a7f3d0",
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
  badge: {
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

export default styles;