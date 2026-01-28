import React, { useState, useEffect } from 'react';
import {
  loadProgress,
  getProgressSummary,
  getWeakDomains,
  getStrongDomains,
  getStudyRecommendations,
  getRecentSessions,
  exportProgress,
  importProgress,
  resetProgress,
  type StudyProgress,
} from '../utils/studyProgressTracker';
import { DOMAIN_INFO } from '../utils/examEngine';
import { useLearningStore } from '../store/learningStore';
import type { DomainId } from '@/types/scenarios';

interface StudyDashboardProps {
  onClose?: () => void;
  onStartExam?: (mode: string, domain?: DomainId) => void;
  onStartLab?: (scenarioId: string) => void; // Reserved for future lab integration
}

export const StudyDashboard: React.FC<StudyDashboardProps> = ({
  onClose,
  onStartExam,
  // onStartLab - Reserved for future lab integration
}) => {
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'domains' | 'history' | 'settings'>('overview');
  const [showExportModal, setShowExportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const domainProgress = useLearningStore(state => state.domainProgress);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  if (!progress) {
    return (
      <div style={styles.container}>
        <p style={styles.loadingText}>Loading progress data...</p>
      </div>
    );
  }

  const summary = getProgressSummary();
  const recommendations = getStudyRecommendations();
  const weakDomains = getWeakDomains();
  const strongDomains = getStrongDomains();
  const recentSessions = getRecentSessions(10);

  const handleExport = () => {
    const data = exportProgress();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ncp-aii-progress-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (importProgress(importData)) {
      setProgress(loadProgress());
      setImportData('');
      setShowExportModal(false);
      alert('Progress imported successfully!');
    } else {
      alert('Failed to import progress. Invalid data format.');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      resetProgress();
      setProgress(loadProgress());
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving': return { icon: '\u2191', color: '#4CAF50' }; // Up arrow
      case 'declining': return { icon: '\u2193', color: '#F44336' }; // Down arrow
      default: return { icon: '\u2192', color: '#888' }; // Right arrow
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Study Progress Dashboard</h2>
          <p style={styles.subtitle}>Track your NCP-AII certification journey</p>
        </div>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            &times;
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabBar}>
        {(['overview', 'domains', 'history', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{summary.totalExams}</div>
                <div style={styles.statLabel}>Exams Taken</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{summary.totalLabs}</div>
                <div style={styles.statLabel}>Labs Completed</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statValue, color: summary.averageScore >= 70 ? '#4CAF50' : '#F44336' }}>
                  {summary.averageScore}%
                </div>
                <div style={styles.statLabel}>Avg Score</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statValue, color: summary.passRate >= 70 ? '#4CAF50' : '#F44336' }}>
                  {summary.passRate}%
                </div>
                <div style={styles.statLabel}>Pass Rate</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statValue, color: '#76b900' }}>
                  {summary.streak}
                </div>
                <div style={styles.statLabel}>Day Streak</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{summary.totalTime}</div>
                <div style={styles.statLabel}>Total Time</div>
              </div>
            </div>

            {/* Weekly Progress */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Weekly Progress</h3>
              <div style={styles.weeklyBar}>
                <div style={styles.weeklyProgress}>
                  <div
                    style={{
                      ...styles.weeklyFill,
                      width: `${Math.min(100, (progress.streak.weeklyProgress / progress.streak.weeklyGoal) * 100)}%`,
                    }}
                  />
                </div>
                <span style={styles.weeklyText}>
                  {progress.streak.weeklyProgress} / {progress.streak.weeklyGoal} days
                </span>
              </div>
            </div>

            {/* Recommendations */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Study Recommendations</h3>
              {recommendations.length > 0 ? (
                <ul style={styles.recommendationList}>
                  {recommendations.map((rec, idx) => (
                    <li key={idx} style={styles.recommendationItem}>
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={styles.emptyText}>
                  Take some practice exams to get personalized recommendations!
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Quick Actions</h3>
              <div style={styles.actionButtons}>
                <button
                  onClick={() => onStartExam?.('full-practice')}
                  style={styles.actionButton}
                >
                  Full Practice Exam
                </button>
                <button
                  onClick={() => onStartExam?.('quick-quiz')}
                  style={{ ...styles.actionButton, backgroundColor: '#555' }}
                >
                  Quick Quiz (15 min)
                </button>
                {weakDomains.length > 0 && (
                  <button
                    onClick={() => onStartExam?.('weak-area-focus')}
                    style={{ ...styles.actionButton, backgroundColor: '#d63031' }}
                  >
                    Practice Weak Areas
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'domains' && (
          <>
            {/* Domain Performance */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Performance by Domain</h3>
              {(Object.keys(progress.domainTrends) as DomainId[]).map(domain => {
                const trend = progress.domainTrends[domain];
                const domainInfo = DOMAIN_INFO[domain];
                const trendStyle = getTrendIcon(trend.trend);

                return (
                  <div key={domain} style={styles.domainCard}>
                    <div style={styles.domainHeader}>
                      <div>
                        <h4 style={styles.domainName}>{domainInfo.name}</h4>
                        <p style={styles.domainDescription}>{domainInfo.description}</p>
                      </div>
                      <div style={styles.domainStats}>
                        <span style={styles.examWeight}>{domainInfo.weight}% weight</span>
                      </div>
                    </div>

                    {trend.totalAttempts > 0 ? (
                      <div style={styles.domainMetrics}>
                        <div style={styles.scoreBar}>
                          <div
                            style={{
                              ...styles.scoreFill,
                              width: `${trend.averageScore}%`,
                              backgroundColor: trend.averageScore >= 70 ? '#4CAF50' : '#F44336',
                            }}
                          />
                        </div>
                        <div style={styles.domainMetricRow}>
                          <span>Average: {trend.averageScore}%</span>
                          <span style={{ color: trendStyle.color }}>
                            {trendStyle.icon} {trend.trend}
                          </span>
                          <span>{trend.totalAttempts} attempts</span>
                        </div>
                      </div>
                    ) : (
                      <div style={styles.noDataText}>
                        No attempts yet - <button
                          onClick={() => onStartExam?.('domain-test', domain)}
                          style={styles.inlineButton}
                        >
                          Start Practice
                        </button>
                      </div>
                    )}

                    {/* Labs Progress */}
                    <div style={styles.labsProgress}>
                      <div style={styles.labsProgressHeader}>
                        <span style={styles.labsProgressLabel}>Labs Progress</span>
                        <span style={styles.labsProgressCount}>
                          {domainProgress[domain].labsCompleted} of {domainProgress[domain].labsTotal} complete
                        </span>
                      </div>
                      <div style={styles.labsProgressBar}>
                        <div
                          style={{
                            ...styles.labsProgressFill,
                            width: `${domainProgress[domain].labsTotal > 0
                              ? (domainProgress[domain].labsCompleted / domainProgress[domain].labsTotal) * 100
                              : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Areas Summary */}
            <div style={styles.twoColumn}>
              <div style={styles.section}>
                <h3 style={{ ...styles.sectionTitle, color: '#F44336' }}>Weak Areas</h3>
                {weakDomains.length > 0 ? (
                  <ul style={styles.areaList}>
                    {weakDomains.map(d => (
                      <li key={d.domain} style={styles.areaItem}>
                        <span>{d.domainName}</span>
                        <span style={{ color: '#F44336' }}>{d.averageScore}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={styles.emptyText}>No weak areas - great job!</p>
                )}
              </div>

              <div style={styles.section}>
                <h3 style={{ ...styles.sectionTitle, color: '#4CAF50' }}>Strong Areas</h3>
                {strongDomains.length > 0 ? (
                  <ul style={styles.areaList}>
                    {strongDomains.map(d => (
                      <li key={d.domain} style={styles.areaItem}>
                        <span>{d.domainName}</span>
                        <span style={{ color: '#4CAF50' }}>{d.averageScore}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={styles.emptyText}>Keep practicing to identify strengths!</p>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Recent Activity</h3>
            {recentSessions.length > 0 ? (
              <div style={styles.historyList}>
                {recentSessions.map(session => (
                  <div key={session.id} style={styles.historyItem}>
                    <div style={styles.historyIcon}>
                      {session.type === 'exam' ? '\uD83D\uDCDD' : session.type === 'quiz' ? '\u26A1' : '\uD83D\uDCBB'}
                    </div>
                    <div style={styles.historyContent}>
                      <div style={styles.historyTitle}>
                        {session.type === 'exam' ? 'Practice Exam' :
                          session.type === 'quiz' ? 'Quick Quiz' :
                            session.type === 'lab' ? session.scenarioTitle || 'Lab Scenario' : 'Review'}
                        {session.mode && session.mode !== 'full-practice' && (
                          <span style={styles.historyBadge}>{session.mode}</span>
                        )}
                      </div>
                      <div style={styles.historyMeta}>
                        <span>{formatDate(session.timestamp)}</span>
                        {session.duration && <span>• {formatDuration(session.duration)}</span>}
                        {session.score !== undefined && (
                          <span style={{ color: session.passed ? '#4CAF50' : '#F44336' }}>
                            • {session.score}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={styles.historyResult}>
                      {session.passed !== undefined && (
                        <span style={{
                          color: session.passed ? '#4CAF50' : '#F44336',
                          fontWeight: 'bold',
                        }}>
                          {session.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.emptyText}>
                No study sessions yet. Start with a practice exam or lab!
              </p>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Progress Settings</h3>

            <div style={styles.settingRow}>
              <div>
                <h4 style={styles.settingTitle}>Weekly Study Goal</h4>
                <p style={styles.settingDesc}>Days per week you want to study</p>
              </div>
              <select
                value={progress.streak.weeklyGoal}
                onChange={(e) => {
                  const newGoal = parseInt(e.target.value);
                  const updated = { ...progress };
                  updated.streak.weeklyGoal = newGoal;
                  setProgress(updated);
                  // saveProgress would be called here in real implementation
                }}
                style={styles.select}
              >
                {[3, 4, 5, 6, 7].map(n => (
                  <option key={n} value={n}>{n} days</option>
                ))}
              </select>
            </div>

            <div style={styles.settingRow}>
              <div>
                <h4 style={styles.settingTitle}>Export Progress</h4>
                <p style={styles.settingDesc}>Download your progress data as JSON</p>
              </div>
              <button onClick={handleExport} style={styles.settingButton}>
                Export
              </button>
            </div>

            <div style={styles.settingRow}>
              <div>
                <h4 style={styles.settingTitle}>Import Progress</h4>
                <p style={styles.settingDesc}>Restore from a backup file</p>
              </div>
              <button onClick={() => setShowExportModal(true)} style={styles.settingButton}>
                Import
              </button>
            </div>

            <div style={{ ...styles.settingRow, borderColor: '#F44336' }}>
              <div>
                <h4 style={{ ...styles.settingTitle, color: '#F44336' }}>Reset Progress</h4>
                <p style={styles.settingDesc}>Delete all progress data (cannot be undone)</p>
              </div>
              <button
                onClick={handleReset}
                style={{ ...styles.settingButton, backgroundColor: '#F44336' }}
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showExportModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Import Progress Data</h3>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste your progress JSON here..."
              style={styles.importTextarea}
            />
            <div style={styles.modalActions}>
              <button onClick={() => setShowExportModal(false)} style={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={handleImport} style={styles.importButton}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '1000px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    color: '#76b900',
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: '#888',
    fontSize: '14px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '28px',
    cursor: 'pointer',
    lineHeight: 1,
  },
  loadingText: {
    color: '#888',
    textAlign: 'center',
    padding: '40px',
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    borderBottom: '1px solid #333',
    paddingBottom: '4px',
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    fontSize: '14px',
    fontWeight: 500,
  },
  tabActive: {
    backgroundColor: '#333',
    color: '#76b900',
  },
  content: {
    minHeight: '400px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '15px',
    marginBottom: '25px',
  },
  statCard: {
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '5px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    color: '#76b900',
    fontSize: '16px',
  },
  weeklyBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  weeklyProgress: {
    flex: 1,
    height: '12px',
    backgroundColor: '#333',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  weeklyFill: {
    height: '100%',
    backgroundColor: '#76b900',
    transition: 'width 0.3s ease',
  },
  weeklyText: {
    fontSize: '14px',
    color: '#888',
    minWidth: '80px',
  },
  recommendationList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  recommendationItem: {
    padding: '10px 15px',
    backgroundColor: '#333',
    borderRadius: '4px',
    marginBottom: '8px',
    borderLeft: '3px solid #76b900',
    fontSize: '14px',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '12px 20px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  domainCard: {
    backgroundColor: '#333',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '10px',
  },
  domainHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  domainName: {
    margin: '0 0 5px 0',
    color: '#fff',
    fontSize: '15px',
  },
  domainDescription: {
    margin: 0,
    color: '#888',
    fontSize: '12px',
  },
  domainStats: {
    textAlign: 'right',
  },
  examWeight: {
    backgroundColor: '#444',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#aaa',
  },
  domainMetrics: {
    marginTop: '10px',
  },
  scoreBar: {
    height: '8px',
    backgroundColor: '#222',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  scoreFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  domainMetricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#888',
  },
  noDataText: {
    color: '#666',
    fontSize: '13px',
    marginTop: '10px',
  },
  inlineButton: {
    background: 'none',
    border: 'none',
    color: '#76b900',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: 'inherit',
    padding: 0,
  },
  labsProgress: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #333',
  },
  labsProgressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  labsProgressLabel: {
    fontSize: '12px',
    color: '#888',
  },
  labsProgressCount: {
    fontSize: '12px',
    color: '#76b900',
    fontWeight: 500,
  },
  labsProgressBar: {
    height: '6px',
    backgroundColor: '#222',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  labsProgressFill: {
    height: '100%',
    backgroundColor: '#76b900',
    transition: 'width 0.3s ease',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  areaList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  areaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #333',
    fontSize: '14px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '12px',
    backgroundColor: '#333',
    borderRadius: '6px',
  },
  historyIcon: {
    fontSize: '24px',
    width: '40px',
    textAlign: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    color: '#fff',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  historyBadge: {
    backgroundColor: '#444',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#aaa',
  },
  historyMeta: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
    display: 'flex',
    gap: '8px',
  },
  historyResult: {
    textAlign: 'right',
    minWidth: '80px',
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#333',
    borderRadius: '6px',
    marginBottom: '10px',
    border: '1px solid #444',
  },
  settingTitle: {
    margin: '0 0 5px 0',
    color: '#fff',
    fontSize: '14px',
  },
  settingDesc: {
    margin: 0,
    color: '#888',
    fontSize: '12px',
  },
  settingButton: {
    padding: '8px 16px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
  },
  select: {
    padding: '8px 12px',
    backgroundColor: '#444',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    padding: '25px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
  },
  modalTitle: {
    margin: '0 0 15px 0',
    color: '#76b900',
  },
  importTextarea: {
    width: '100%',
    height: '200px',
    backgroundColor: '#333',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#e0e0e0',
    padding: '10px',
    fontFamily: 'monospace',
    fontSize: '12px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '15px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#444',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
  },
  importButton: {
    padding: '10px 20px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};

export default StudyDashboard;
