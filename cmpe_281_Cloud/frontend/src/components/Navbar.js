import React from 'react';
import styles from '../styles';

const Navbar = ({ onNavigate, onLogout }) => {
  return (
    <div style={styles.navbar}>
      <div style={styles.logo}>Threat Detection Dashboard</div>
      <div style={styles.navButtons}>
        <button style={styles.navButton} onClick={() => onNavigate("dashboard")}>Home</button>
        <button style={styles.navButton} onClick={() => onNavigate("upload")}>Batch Analysis</button>
        <button style={styles.navButton} onClick={() => onNavigate("metrics")}>Metrics</button>
        <button style={styles.logoutButton} onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
};

export default Navbar;