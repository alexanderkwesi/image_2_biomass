import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function Home() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🌾 PastureScan</h1>
      <p>Image to Biomass Prediction</p>
      <p>API Status: <a href="/api/health">Check API</a></p>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
