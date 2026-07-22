import React, { useState, useEffect, useRef } from 'react';
import { Send, UserCheck, HeartPulse, Sparkles } from 'lucide-react';

export default function NurseForm({ messages, extractedData, onSendMessage, onCompile, isLoading, isComplete }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Chat Window */}
      <div className="glass-panel chat-container">
        {/* Chat Title */}
        <div style={{ padding: '1rem 1.25rem', background: 'rgba(10, 15, 30, 0.8)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HeartPulse className="heart-pulse" style={{ width: '1.1rem', height: '1.1rem', color: 'var(--error)' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
            Nurse Agent Triage Conversation
          </span>
        </div>

        {/* Message Logs */}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`chat-bubble ${msg.role === 'model' ? 'nurse' : 'patient'}`}
            >
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className="chat-bubble nurse" style={{ opacity: 0.7, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>Nurse is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area or action */}
        {isComplete ? (
          <div style={{ padding: '1.25rem', background: 'rgba(10, 15, 30, 0.9)', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifycontent: 'center', gap: '0.375rem', justifyContent: 'center' }}>
              <UserCheck style={{ width: '1rem', height: '1rem' }} />
              Intake Completed. Vitals Captured.
            </div>
            <button 
              onClick={onCompile}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
            >
              <Sparkles style={{ width: '1rem', height: '1rem' }} />
              Compile & Send Patient Intake Report
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="chat-input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your response here..."
              disabled={isLoading}
              className="chat-input"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="btn-primary" 
              style={{ width: 'auto', padding: '0.75rem 1.25rem', borderRadius: '0.75rem' }}
            >
              <Send style={{ width: '0.9rem', height: '0.9rem' }} />
            </button>
          </form>
        )}
      </div>

      {/* 2. Extraction Telemetry Panel */}
      <div className="glass-panel p-5">
        <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Agent Extraction Telemetry
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Name:</span>
            <span style={{ color: extractedData.name ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {extractedData.name ? extractedData.name : 'Waiting...'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Age:</span>
            <span style={{ color: extractedData.age ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {extractedData.age ? `${extractedData.age} yrs` : 'Waiting...'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Temp:</span>
            <span style={{ color: extractedData.temp_f ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {extractedData.temp_f ? `${extractedData.temp_f}°F` : 'Waiting...'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Weight:</span>
            <span style={{ color: extractedData.weight_lbs ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {extractedData.weight_lbs ? `${extractedData.weight_lbs} lbs` : 'Waiting...'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Height:</span>
            <span style={{ color: extractedData.height_inches ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {extractedData.height_inches ? `${extractedData.height_inches} in` : 'Waiting...'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Blood Press:</span>
            <span style={{ color: extractedData.blood_pressure ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {extractedData.blood_pressure ? extractedData.blood_pressure : 'Waiting...'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', gridColumn: 'span 2' }}>
            <span style={{ color: 'var(--text-muted)' }}>Symptoms:</span>
            <span 
              style={{ color: extractedData.symptoms ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}
              title={extractedData.symptoms || ''}
            >
              {extractedData.symptoms ? 'Logged' : 'Waiting...'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
