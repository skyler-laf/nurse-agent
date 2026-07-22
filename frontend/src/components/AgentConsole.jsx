import React, { useEffect, useRef } from 'react';
import { Terminal, Loader2 } from 'lucide-react';

export default function AgentConsole({ logs, isLoading }) {
  const consoleEndRef = useRef(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="console-container scanline">
      <div className="console-header">
        <div className="console-title">
          <Terminal style={{ width: '1rem', height: '1rem', color: 'var(--success)' }} />
          Clinical Console
        </div>
        <div className="console-dots">
          <div className="console-dot red"></div>
          <div className="console-dot yellow"></div>
          <div className="console-dot green"></div>
        </div>
      </div>
      <div className="console-body">
        {logs.length === 0 ? (
          <div className="console-placeholder">
            <Terminal style={{ width: '2.5rem', height: '2.5rem', opacity: 0.2 }} />
            <p>Logs will stream here during intake report compilation.</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div className="console-log-row" key={index}>
              <span className="log-time">[{log.time}]</span>
              <span className="log-agent">{log.agent}:</span>
              <span className="log-text">{log.text}</span>
            </div>
          ))
        )}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginTop: '0.5rem' }}>
            <Loader2 className="spin" style={{ width: '0.9rem', height: '0.9rem' }} />
            <span>Agent thinking...</span>
          </div>
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
