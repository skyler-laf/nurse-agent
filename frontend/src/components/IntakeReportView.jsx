import React from 'react';
import { ShieldAlert, Activity, CheckCircle, AlertTriangle, FileText, ArrowRight } from 'lucide-react';

export default function IntakeReportView({ report }) {
  if (!report) return null;

  const {
    patient_name,
    age,
    vitals,
    bmi_category,
    vital_assessment,
    triage_status,
    clinical_summary,
    recommended_actions
  } = report;

  // Determine Triage color indicators
  const triageColor = triage_status === 'Urgent' 
    ? 'var(--error)' 
    : triage_status === 'Elevated' 
      ? 'var(--warning)' 
      : 'var(--success)';

  const triageBg = triage_status === 'Urgent' 
    ? 'rgba(239, 68, 68, 0.1)' 
    : triage_status === 'Elevated' 
      ? 'rgba(245, 158, 11, 0.1)' 
      : 'rgba(16, 185, 129, 0.1)';

  const triageBorder = triage_status === 'Urgent' 
    ? 'rgba(239, 68, 68, 0.25)' 
    : triage_status === 'Elevated' 
      ? 'rgba(245, 158, 11, 0.25)' 
      : 'rgba(16, 185, 129, 0.25)';

  return (
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-slate-800">
      
      {/* Visual top border indicator matching Triage Status */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '4px', 
          background: triageColor 
        }}
      ></div>

      {/* Header with Name & Triage Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Clinical Intake Document
          </span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>
            {patient_name} <span style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', fontWeight: 500 }}>(Age {age})</span>
          </h2>
        </div>

        {/* Triage Badge */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            background: triageBg, 
            border: `1px solid ${triageBorder}`, 
            color: triageColor, 
            padding: '0.5rem 1rem', 
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700
          }}
        >
          <ShieldAlert className={triage_status === 'Urgent' ? 'heart-pulse' : ''} style={{ width: '1rem', height: '1rem' }} />
          <span>Triage Status: {triage_status.toUpperCase()}</span>
        </div>
      </div>

      {/* Vitals Telemetry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="vital-box">
          <span className="vital-label">Temperature</span>
          <span className="vital-value" style={{ color: vitals.temperature >= 100.4 ? 'var(--error)' : 'var(--text-primary)' }}>
            {vitals.temperature}°F
          </span>
        </div>
        <div className="vital-box">
          <span className="vital-label">Blood Pressure</span>
          <span className="vital-value">
            {vitals.blood_pressure}
          </span>
        </div>
        <div className="vital-box">
          <span className="vital-label">Body Mass Index</span>
          <span className="vital-value" style={{ color: bmi_category === 'Obese' ? 'var(--warning)' : 'var(--text-primary)' }}>
            {vitals.bmi}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{bmi_category}</span>
        </div>
        <div className="vital-box">
          <span className="vital-label">Weight & Height</span>
          <span className="vital-value" style={{ fontSize: '1.25rem', marginTop: '0.5rem' }}>
            {vitals.weight} lbs / {vitals.height} in
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Clinical Assessment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <FileText style={{ width: '0.95rem', height: '0.95rem', color: 'var(--primary)' }} />
              Intake Summary
            </h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.02)' }}>
              {clinical_summary}
            </p>
          </div>

          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Vital Assessments
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {vital_assessment.map((assess, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    fontSize: '0.8rem',
                    color: assess.toLowerCase().includes('high') || assess.toLowerCase().includes('hyper') ? 'var(--error)' : 'var(--text-secondary)'
                  }}
                >
                  <Activity style={{ width: '0.85rem', height: '0.85rem', flexShrink: 0 }} />
                  <span>{assess}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommended Clinical Actions */}
        <div>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <AlertTriangle style={{ width: '0.95rem', height: '0.95rem', color: 'var(--warning)' }} />
            Suggested Attending Doctor Actions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recommended_actions.map((action, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'start', 
                  gap: '0.5rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.04)',
                  padding: '0.75rem', 
                  borderRadius: '0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)'
                }}
              >
                <ArrowRight style={{ width: '0.85rem', height: '0.85rem', color: 'var(--primary)', marginTop: '0.125rem', flexShrink: 0 }} />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
