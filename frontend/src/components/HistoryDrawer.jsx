import React from 'react';
import { Calendar, Trash2, ArrowUpRight, History } from 'lucide-react';

export default function HistoryDrawer({ historyList, onSelect, onDelete, activeId }) {
  if (!historyList || historyList.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>
        <History style={{ width: '1.25rem', height: '1.25rem', margin: '0 auto 0.5rem', opacity: 0.5 }} />
        No patient intakes completed yet today.
      </div>
    );
  }

  return (
    <div className="glass-panel p-5">
      <h3 className="history-title">
        <History style={{ width: '1rem', height: '1rem', color: 'var(--primary)' }} />
        Intake Logs ({historyList.length})
      </h3>

      <div className="history-list">
        {historyList.map((item) => {
          const isActive = activeId === item.id;
          const symptomsSnippet = item.symptoms.length > 36 
            ? `${item.symptoms.substring(0, 36)}...` 
            : item.symptoms;
            
          return (
            <div
              key={item.id}
              className={`history-item ${isActive ? 'active' : ''}`}
            >
              <button
                onClick={() => onSelect(item.id)}
                className="history-btn-select"
              >
                <div className="history-dest">
                  <span>{item.patient_name}</span>
                  <ArrowUpRight style={{ width: '0.75rem', height: '0.75rem', opacity: 0.6, display: 'inline-block', marginLeft: '0.25rem' }} />
                </div>
                
                <div className="history-details">
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{symptomsSnippet}</span>
                </div>
              </button>

              <button
                onClick={() => onDelete(item.id)}
                className="history-btn-delete"
                title="Delete log"
              >
                <Trash2 style={{ width: '0.9rem', height: '0.9rem' }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
