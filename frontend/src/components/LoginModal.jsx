import React, { useState } from 'react';
import { X, Lock, User, Sparkles, AlertCircle } from 'lucide-react';

const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''
  : 'https://nurse-agent-backend-skyler.onrender.com';

export default function LoginModal({ isOpen, onClose, onLoginSuccess, canClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [preferences, setPreferences] = useState("Nurse Station A");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    setIsLoading(true);
    const endpoint = isSignUp 
      ? `${BACKEND_URL}/api/auth/register` 
      : `${BACKEND_URL}/api/auth/login`;
    const payload = isSignUp 
      ? { username, password, preferences }
      : { username, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        backdropFilter: 'blur(12px)', 
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(5, 7, 15, 0.85)' 
      }}
    >
      <div className="glass-panel modal-card p-6">
        
        {/* Close Button - only show if user can close */}
        {canClose && (
          <button 
            onClick={onClose} 
            className="btn-close"
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifycontent: 'center', color: 'white', margin: '0 auto 0.75rem', justifyContent: 'center' }}>
            <Sparkles style={{ width: '1.25rem', height: '1.25rem' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
            {isSignUp ? "Clinical Staff Register" : "Clinical Staff Sign In"}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {isSignUp 
              ? "Register to begin patient intake sessions." 
              : "Sign in to access patient triage and history."}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '0.75rem', color: 'var(--error)', marginBottom: '1rem' }}>
            <AlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Clinician ID / Username</label>
            <div className="input-wrapper">
              <User className="input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter clinician username"
                disabled={isLoading}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Staff Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLoading}
                className="form-input"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Medical Unit / Station</label>
              <input
                type="text"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g. Triage Bay C"
                disabled={isLoading}
                className="form-input"
                style={{ paddingLeft: '1rem' }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{ marginTop: '0.5rem' }}
          >
            {isLoading ? "Validating Staff Credentials..." : isSignUp ? "Create Staff Account" : "Access Intake Portal"}
          </button>
        </form>

        {/* Footer Toggle */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {isSignUp ? (
            <span>
              Already registered?{" "}
              <button 
                onClick={() => { setIsSignUp(false); setError(""); }} 
                className="auth-link"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New clinician?{" "}
              <button 
                onClick={() => { setIsSignUp(true); setError(""); }} 
                className="auth-link"
              >
                Create Staff Account
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
