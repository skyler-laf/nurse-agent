import React, { useState, useEffect } from 'react';
import { Heart, Activity, User, LogOut, Loader2, RefreshCw, Sparkles, AlertCircle, FileText, Check } from 'lucide-react';
import HistoryDrawer from './components/HistoryDrawer';
import NurseForm from './components/NurseForm';
import IntakeReportView from './components/IntakeReportView';
import AgentConsole from './components/AgentConsole';
import LoginModal from './components/LoginModal';

const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''
  : 'https://nurse-agent-backend-skyler.onrender.com';

const INITIAL_EXTRACTED = {
  name: null,
  age: null,
  symptoms: null,
  weight_lbs: null,
  height_inches: null,
  temp_f: null,
  blood_pressure: null
};

const SCENARIOS = [
  { id: 'broken arm', label: 'Broken Arm', icon: '🩹' },
  { id: 'migraine', label: 'Migraine', icon: '🧠' },
  { id: 'fever', label: 'High Fever', icon: '🤒' },
  { id: 'asthma attack', label: 'Asthma Attack', icon: '🫁' },
  { id: 'chest pain', label: 'Chest Pain', icon: '💔' },
  { id: 'allergic reaction', label: 'Allergic Reaction', icon: '🐝' },
  { id: 'sprained ankle', label: 'Sprained Ankle', icon: '🦶' },
  { id: 'food poisoning', label: 'Food Poisoning', icon: '🤢' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  // Patient Case Profile
  const [patientCase, setPatientCase] = useState(null);

  // Chat & Triage States
  const [chatMessages, setChatMessages] = useState([]);
  const [extractedData, setExtractedData] = useState(INITIAL_EXTRACTED);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Compiling & Report States
  const [isCompiling, setIsCompiling] = useState(false);
  const [logs, setLogs] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const restoreActiveSession = (userId) => {
    const saved = localStorage.getItem(`active_session_${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChatMessages(parsed.chatMessages || []);
        setExtractedData(parsed.extractedData || INITIAL_EXTRACTED);
        setPatientCase(parsed.patientCase || null);
        setIsComplete(parsed.isComplete || false);
      } catch (e) {
        console.error("Failed to restore active session:", e);
      }
    }
  };

  // Load user session on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('currentClinician');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setCurrentUser(parsed);
      fetchHistory(parsed.id);
      restoreActiveSession(parsed.id);
    } else {
      setIsLoginOpen(true);
    }
  }, []);

  // Auto-save active in-progress session to localStorage
  useEffect(() => {
    if (currentUser && patientCase) {
      localStorage.setItem(`active_session_${currentUser.id}`, JSON.stringify({
        chatMessages,
        extractedData,
        patientCase,
        isComplete
      }));
    }
  }, [chatMessages, extractedData, patientCase, isComplete, currentUser]);

  const fetchHistory = async (userId) => {
    // Render from local storage cache first
    const cached = localStorage.getItem(`triage_history_${userId}`);
    if (cached) {
      setHistoryList(JSON.parse(cached));
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/reports?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
        localStorage.setItem(`triage_history_${userId}`, JSON.stringify(data));
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentClinician', JSON.stringify(user));
    fetchHistory(user.id);
    restoreActiveSession(user.id);
  };

  const handleLogout = () => {
    if (currentUser) {
      localStorage.removeItem(`active_session_${currentUser.id}`);
    }
    setCurrentUser(null);
    setHistoryList([]);
    setActiveHistoryId(null);
    handleResetIntake();
    localStorage.removeItem('currentClinician');
  };

  const handleResetIntake = () => {
    setChatMessages([]);
    setExtractedData(INITIAL_EXTRACTED);
    setIsComplete(false);
    setReportData(null);
    setLogs([]);
    setErrorMsg("");
    setActiveHistoryId(null);
    setPatientCase(null);
    if (currentUser) {
      localStorage.removeItem(`active_session_${currentUser.id}`);
    }
  };

  // Generate patient case
  const admitNewPatient = async (scenarioId) => {
    setIsLoading(true);
    setErrorMsg("");
    handleResetIntake();
    
    const url = scenarioId 
      ? `${BACKEND_URL}/api/generate-patient-case?scenario=${encodeURIComponent(scenarioId)}`
      : `${BACKEND_URL}/api/generate-patient-case`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load patient case");
      const data = await res.json();
      setPatientCase(data);
      
      setChatMessages([
        { role: 'patient', content: `Hello, nurse. I'm feeling really sick today.` }
      ]);
    } catch (err) {
      setErrorMsg("Failed to generate simulated patient profile.");
    } finally {
      setIsLoading(false);
    }
  };

  // Conversational loop (Clinician Nurse asks, Patient replies)
  const handleSendMessage = async (text) => {
    if (!patientCase) return;
    setIsLoading(true);
    setErrorMsg("");
    
    // User is the Nurse, Model is the Patient
    const updatedMessages = [...chatMessages, { role: 'nurse', content: text }];
    setChatMessages(updatedMessages);

    // Map roles back to standard format for Gemini prompt
    const promptHistory = updatedMessages.map(msg => ({
      role: msg.role === 'nurse' ? 'user' : 'model',
      content: msg.content
    }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_history: promptHistory,
          patient_case: patientCase,
          extracted_data: extractedData
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'patient', content: data.message }]);
        setExtractedData(data.extracted_data);
        setIsComplete(data.is_complete);
      } else {
        setErrorMsg("Failed to receive response from the Patient.");
      }
    } catch (err) {
      setErrorMsg("Network error contacting simulated patient.");
    } finally {
      setIsLoading(false);
    }
  };

  // Compile Patient Intake Report (SSE)
  const handleCompileReport = () => {
    setIsCompiling(true);
    setReportData(null);
    setLogs([]);
    setErrorMsg("");

    const name = extractedData.name || patientCase.name;
    const age = extractedData.age || patientCase.age;
    const symptoms = extractedData.symptoms || patientCase.chief_complaint;
    const weight = extractedData.weight_lbs || patientCase.weight_lbs;
    const height = extractedData.height_inches || patientCase.height_inches;
    const temp = extractedData.temp_f || patientCase.temp_f;
    const bp = extractedData.blood_pressure || patientCase.blood_pressure;

    const url = `${BACKEND_URL}/api/compile-report?name=${encodeURIComponent(name)}&age=${age}&symptoms=${encodeURIComponent(symptoms)}&weight=${weight}&height=${height}&temperature=${temp}&blood_pressure=${encodeURIComponent(bp)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (payload.type === 'progress') {
          setLogs(prev => [...prev, { 
            time: timeStr, 
            agent: payload.agent, 
            text: payload.message 
          }]);
        } else if (payload.type === 'result') {
          setReportData(payload.data);
          setIsCompiling(false);
          eventSource.close();
          
          // Auto-save search report once compiled
          if (currentUser) {
            autoSaveReport(payload.data);
          }
        } else if (payload.type === 'error') {
          setLogs(prev => [...prev, { 
            time: timeStr, 
            agent: 'System', 
            text: `Error: ${payload.message}` 
          }]);
          setErrorMsg(payload.message);
          setIsCompiling(false);
          eventSource.close();
        }
      } catch (e) {
        console.error("SSE Compiling Error:", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection Failed:", err);
      eventSource.close();
      setIsCompiling(false);
      setErrorMsg("Failed to connect to compilation server.");
    };
  };

  const autoSaveReport = async (report) => {
    // Generate a temporary local item and cache it immediately
    const newItem = {
      id: `local_${Date.now()}`,
      user_id: currentUser.id,
      patient_name: report.patient_name,
      symptoms: report.clinical_summary,
      weight: report.vitals.weight,
      height: report.vitals.height,
      temperature: report.vitals.temperature,
      blood_pressure: report.vitals.blood_pressure,
      report_json: JSON.stringify(report),
      created_at: new Date().toISOString()
    };

    const updatedList = [newItem, ...historyList];
    setHistoryList(updatedList);
    localStorage.setItem(`triage_history_${currentUser.id}`, JSON.stringify(updatedList));

    try {
      await fetch(`${BACKEND_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          patient_name: report.patient_name,
          symptoms: report.clinical_summary,
          weight: report.vitals.weight,
          height: report.vitals.height,
          temperature: report.vitals.temperature,
          blood_pressure: report.vitals.blood_pressure,
          report_data: report
        })
      });
      fetchHistory(currentUser.id);
    } catch (err) {
      console.error("Auto save failed:", err);
    }
  };

  const handleSelectHistory = async (id) => {
    setIsLoading(true);
    setReportData(null);
    setLogs([]);
    setErrorMsg("");
    setActiveHistoryId(id);

    // Look for it in our client-side cache first if the full report is present
    const cachedItem = historyList.find(item => item.id === id);
    if (cachedItem && cachedItem.report_json) {
      try {
        const parsedReport = typeof cachedItem.report_json === 'string'
          ? JSON.parse(cachedItem.report_json)
          : cachedItem.report_json;
        setReportData(parsedReport);
        setIsLoading(false);
        return;
      } catch (e) {
        console.error("Failed to parse cached report:", e);
      }
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/reports/${id}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        setErrorMsg("Failed to load saved report details.");
      }
    } catch (err) {
      setErrorMsg("Error loading saved report.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    // Remove from local cache immediately
    const updatedList = historyList.filter(item => item.id !== id);
    setHistoryList(updatedList);
    localStorage.setItem(`triage_history_${currentUser.id}`, JSON.stringify(updatedList));

    if (activeHistoryId === id) {
      setReportData(null);
      setActiveHistoryId(null);
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchHistory(currentUser.id);
      }
    } catch (err) {
      console.error("Delete history failed:", err);
    }
  };

  return (
    <div className="container animate-fade-in">
      <header>
        <div className="logo">
          <Activity className="logo-icon text-indigo-400" style={{ animation: 'heartPulse 1.5s infinite ease-in-out' }} />
          <span className="logo-text">Nurse Agent Triage</span>
        </div>
        
        {/* Clinician bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.375rem 0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                <User style={{ width: '0.9rem', height: '0.9rem' }} />
                <span>{currentUser.username} ({currentUser.preferences})</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="btn-select" 
                style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                title="Log Out Attending Nurse"
              >
                <LogOut style={{ width: '0.75rem', height: '0.75rem' }} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsLoginOpen(true)} 
              className="btn-primary" 
              style={{ padding: '0.5rem 1rem', width: 'auto', borderRadius: '0.75rem' }}
            >
              <User style={{ width: '0.9rem', height: '0.9rem' }} />
              <span>Clinician Sign In</span>
            </button>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Clinical Agent</span>
            <span>•</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Midterm</span>
          </div>
        </div>
      </header>

      <main className="dashboard-grid">
        {/* Left Panel: Saved Reports & Arrived Patient Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Patient Arrival Board */}
          {patientCase && !reportData && (
            <div className="glass-panel p-5 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span>🩺 New Patient Arrived</span>
                </h4>
                <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', fontWeight: 700 }}>
                  Waiting for Intake
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Name:</span>{' '}
                  <strong style={{ color: '#fff' }}>{patientCase.name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Age:</span>{' '}
                  <strong style={{ color: '#fff' }}>{patientCase.age}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Chief Complaint:</span>
                  <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.03)', color: '#fff', fontStyle: 'italic' }}>
                    {patientCase.chief_complaint}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Known Information:</span>
                  <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                    {patientCase.known_information.split('\n').map((line, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span style={{ color: 'var(--primary)' }}>•</span>
                        <span>{line.replace('•', '').trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentUser && (
            <HistoryDrawer 
              historyList={historyList} 
              onSelect={handleSelectHistory} 
              onDelete={handleDeleteHistory}
              activeId={activeHistoryId}
            />
          )}

          {errorMsg && (
            <div className="glass-panel" style={{ borderColor: 'var(--error)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle style={{ color: 'var(--error)', width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{errorMsg}</div>
            </div>
          )}
        </div>

        {/* Right Panel: Chat or Intake Report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {reportData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleResetIntake}
                  className="btn-select"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.25)', color: '#fff' }}
                >
                  <RefreshCw style={{ width: '0.85rem', height: '0.85rem' }} />
                  <span>Start New Patient Intake Session</span>
                </button>
                {patientCase && (
                  <button 
                    onClick={() => {
                      setReportData(null);
                      setActiveHistoryId(null);
                    }}
                    className="btn-primary"
                    style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.75rem' }}
                  >
                    <span>Back to Active Chat ({patientCase.name})</span>
                  </button>
                )}
              </div>
              <IntakeReportView report={reportData} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Simulation CTA Landing banner with scenario grid */}
              {!isLoading && !patientCase && !reportData && (
                <div className="glass-panel" style={{ padding: '3.5rem 2rem', color: 'var(--text-secondary)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <Activity className="text-indigo-400" style={{ width: '3.5rem', height: '3.5rem', margin: '0 auto 1.25rem', animation: 'heartPulse 1.2s infinite ease-in-out' }} />
                    <h3 style={{ color: '#fff', fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 800 }}>
                      Patient Intake Simulation Portal
                    </h3>
                    <p style={{ fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
                      Select a medical case scenario below to admit a patient to the triage clinic. Interview them in the chat panel to discover symptoms and record vital signs.
                    </p>
                  </div>

                  {/* Scenarios Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    {SCENARIOS.map((sc) => (
                      <button
                        key={sc.id}
                        onClick={() => admitNewPatient(sc.id)}
                        className="btn-select"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.25rem 1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
                      >
                        <span style={{ fontSize: '2rem' }}>{sc.icon}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{sc.label}</span>
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button 
                      onClick={() => admitNewPatient(null)}
                      className="btn-primary"
                      style={{ maxWidth: '280px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}
                    >
                      <Sparkles style={{ width: '1rem', height: '1rem' }} />
                      Random Patient Scenario
                    </button>
                  </div>
                </div>
              )}

              {/* Conversational Chat Form (hidden initially until simulation begins) */}
              {patientCase && (
                <div>
                  {/* Informative Hint */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <Sparkles style={{ width: '1rem', height: '1rem', color: 'var(--primary)', flexShrink: 0 }} />
                    <span>
                      <strong>Triage Instruction:</strong> Question the patient to obtain their Name, Symptoms, Weight, Height, Temp, and Blood Pressure.
                    </span>
                  </div>
                  
                  <NurseForm 
                    messages={chatMessages.map(msg => ({
                      role: msg.role === 'nurse' ? 'user' : 'model', // Map roles correctly for NurseForm visual classes
                      content: msg.content
                    }))} 
                    extractedData={extractedData} 
                    onSendMessage={handleSendMessage}
                    onCompile={handleCompileReport}
                    isLoading={isLoading} 
                    isComplete={isComplete}
                  />
                </div>
              )}

              {/* Progress compiler checklists */}
              {(isCompiling || logs.length > 0) && (
                <AgentConsole logs={logs} isLoading={isCompiling} />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Staff Login Modal */}
      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onLoginSuccess={handleLoginSuccess} 
        canClose={!!currentUser}
      />
    </div>
  );
}
