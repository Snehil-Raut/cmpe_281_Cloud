# Threat Detection Dashboard - Frontend

A React-based web application for intrusion detection system analysis with AWS integration.

## Project Structure

```
src/
├── components/          # React components
│   ├── Login.js        # Authentication component
│   ├── Dashboard.js    # Main dashboard
│   ├── Predict.js      # Single prediction form
│   ├── Upload.js       # Batch CSV analysis
│   ├── Metrics.js      # Analytics and charts
│   ├── Navbar.js       # Navigation component
│   └── index.js        # Component exports
├── hooks/              # Custom React hooks
│   └── useAuth.js      # Authentication hook
├── styles.js           # Application styles
├── App.js              # Main application component
└── index.js            # Application entry point
```

## Features

- **Authentication**: AWS Cognito integration with demo fallback
- **Dashboard**: Overview with model performance metrics
- **Single Prediction**: Manual input for intrusion detection
- **Batch Analysis**: CSV upload and bulk prediction
- **Metrics**: Real-time analytics with charts
- **Responsive Design**: Dark theme with modern UI

## Components

### Login
Handles user authentication with multiple auth modes (login, signup, password reset).

### Dashboard
Main landing page with model statistics and navigation.

### Predict
Form for single session prediction with sample data loading.

### Upload
CSV file upload and batch prediction processing.

### Metrics
Data visualization with Chart.js integration (Line, Bar, Doughnut charts).

### Navbar
Consistent navigation across all pages.

## Hooks

### useAuth
Manages authentication state and operations:
- Login/logout functionality
- AWS Cognito integration
- Local storage persistence
- Demo mode fallback

## Styling

All styles are centralized in `styles.js` with a consistent dark theme design.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm start
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Demo Credentials

- Username: `admin`
- Password: `password123`