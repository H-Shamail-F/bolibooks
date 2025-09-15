import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';

function TestApp() {
  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>🎯 BoliBooks Route Test</h1>
        <nav style={{ marginBottom: '20px' }}>
          <Link to="/" style={{ marginRight: '20px', color: 'blue' }}>Home</Link>
          <Link to="/test" style={{ marginRight: '20px', color: 'blue' }}>Test Page</Link>
          <Link to="/login" style={{ marginRight: '20px', color: 'blue' }}>Login</Link>
        </nav>
        
        <div style={{ border: '2px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <Routes>
            <Route path="/" element={
              <div>
                <h2>✅ Home Route Working!</h2>
                <p>If you can see this, React Router is functioning correctly.</p>
                <p>Backend API: <span style={{color: 'green'}}>Connected</span></p>
                <p>Time: {new Date().toLocaleString()}</p>
              </div>
            } />
            <Route path="/test" element={
              <div>
                <h2>✅ Test Route Working!</h2>
                <p>This proves client-side routing is working properly.</p>
              </div>
            } />
            <Route path="/login" element={
              <div>
                <h2>🔐 Login Route</h2>
                <p>Login page would be here.</p>
              </div>
            } />
            <Route path="*" element={
              <div>
                <h2>❌ Route Not Found</h2>
                <p>You've reached a route that doesn't exist.</p>
                <Link to="/" style={{color: 'blue'}}>Go back to Home</Link>
              </div>
            } />
          </Routes>
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
          <p>If you see "Route not found" when navigating, there's a routing issue.</p>
          <p>If all routes work, the problem is in the main App.js configuration.</p>
        </div>
      </div>
    </Router>
  );
}

export default TestApp;
