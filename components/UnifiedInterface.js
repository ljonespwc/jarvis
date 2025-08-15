import { useState, useEffect } from 'react';
import { useLayercodePipeline } from '@layercode/react-sdk';
import styles from '../styles/UnifiedInterface.module.css';

export default function UnifiedInterface() {
  const [status, setStatus] = useState('Initializing JARVIS...');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'all', 'active', 'completed'

  // Console suppression (preserve from original)
  useEffect(() => {
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalLog = console.log;
    
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('CleanUnusedInitializersAndNodeArgs') || 
          message.includes('onnxruntime') ||
          message.includes('graph.cc') ||
          message.includes('decoder/rnn') ||
          message.includes('_output_0') ||
          message.includes('VAD model failed to load') ||
          message.includes('onSpeechStart') ||
          message.includes('Interruption requested') ||
          message.includes('webSecurity') ||
          message.includes('allowRunningInsecureContent') ||
          message.includes('Content-Security-Policy') ||
          message.includes('Electron Security Warning') ||
          message.includes('Unknown message type received') ||
          message.includes('speech_end_tracking') ||
          message.includes('vad_events') ||
          message.includes('trigger.response.audio.replay_finished')) {
        return;
      }
      originalWarn.apply(console, args);
    };
    
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Electron Security Warning') ||
          message.includes('webSecurity') ||
          message.includes('Content-Security-Policy') ||
          message.includes('allowRunningInsecureContent') ||
          message.includes('Unknown message type received') ||
          message.includes('speech_end_tracking') ||
          message.includes('vad_events') ||
          message.includes('trigger.response.audio.replay_finished')) {
        return;
      }
      originalError.apply(console, args);
    };
    
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('Electron Security Warning') ||
          message.includes('webSecurity')) {
        return;
      }
      originalLog.apply(console, args);
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;  
      console.log = originalLog;
    };
  }, []);

  // Fetch tasks from main process
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await window.electronAPI.getTasks();
      if (response.success) {
        setTasks(response.data.tasks || []);
        setStats(response.data.stats || { active: 0, completed: 0 });
        setError('');
      } else {
        setError(response.error || 'Failed to load tasks');
      }
    } catch (err) {
      setError('Error loading tasks: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load only - no auto-refresh to prevent UI jumpiness
  useEffect(() => {
    fetchTasks();
  }, []);

  // Listen for real-time task updates from voice commands
  useEffect(() => {
    const handleTaskUpdate = () => {
      fetchTasks();
    };

    window.electronAPI?.onTaskUpdate?.(handleTaskUpdate);
    
    return () => {
      window.electronAPI?.removeTaskListener?.(handleTaskUpdate);
    };
  }, []);

  // Local voice command processing
  const processVoiceCommand = async (transcript) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setStatus('⏳ JARVIS is thinking...');
    
    try {
      const response = await fetch('http://localhost:47821/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'process_command', 
          data: { text: transcript } 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process command locally');
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('❌ Error processing voice command:', error);
      return "Sorry, I had trouble processing that request. Please try again.";
    } finally {
      setIsProcessing(false);
    }
  };

  // Layercode React SDK integration
  const sdkResult = useLayercodePipeline({
    pipelineId: 'l7l2bv2c',
    authorizeSessionEndpoint: 'https://jarvis-vert-eta.vercel.app/api/authorize',
    metadata: {
      sessionId: 'jarvis-' + Date.now()
    },
    onConnect: ({ sessionId }) => {
      console.log('✅ Connected to Layercode:', sessionId);
      setStatus('');
      
      // Send sessionId to main process for bridge connection
      if (window.electronAPI) {
        window.electronAPI.setSessionId(sessionId);
      }
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from Layercode');
      setStatus('Voice processing disconnected');
    },
    onError: (error) => {
      console.error('❌ Layercode error:', error);
      setError('Voice error: ' + error.message);
      setTimeout(() => setError(''), 5000);
    },
    onTranscript: async (transcript) => {
      console.log('📝 Voice input:', transcript.substring(0, 50));
      setStatus(`You said: "${transcript}"`);
      
      // Process the command locally
      const response = await processVoiceCommand(transcript);
      
      if (speak && response) {
        console.log('🗣️ JARVIS response:', response.substring(0, 50));
        speak(response);
        setStatus(`🤖 JARVIS: "${response.substring(0, 50)}..."`);
        
        // Auto-reset to listening after response
        setTimeout(() => {
          setStatus('');
        }, 4000);
      }
    },
    onTurnStarted: () => {
      console.log('🎤 Turn started - user speaking');
      setStatus('🎤 Listening to you...');
    },
    onTurnFinished: async (data) => {
      console.log('🎤 Turn finished - processing locally', data);
      
      if (data?.transcript) {
        console.log('📝 Voice input from turn finished:', data.transcript.substring(0, 50));
        setStatus(`You said: "${data.transcript}"`);
        
        const response = await processVoiceCommand(data.transcript);
        
        if (response) {
          console.log('🗣️ JARVIS response:', response.substring(0, 50));
          
          // Use Web Speech API for TTS
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(response);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
              voice.name.includes('Samantha') || 
              voice.name.includes('Alex') ||
              voice.name.includes('Daniel') ||
              voice.default
            );
            if (preferredVoice) {
              utterance.voice = preferredVoice;
            }
            
            speechSynthesis.speak(utterance);
          }
          
          setStatus(`🤖 JARVIS: "${response.substring(0, 50)}..."`);
          
          // Auto-reset to listening after response
          setTimeout(() => {
            setStatus('');
          }, 4000);
        }
      }
    }
  });

  // Extract values from SDK result
  const { 
    userAudioAmplitude = 0,
    agentAudioAmplitude = 0,
    speak
  } = sdkResult;

  // Helper functions for task parsing
  const getTaskId = (task) => {
    if (task.status === 'completed') {
      return 'DONE';
    }
    // For active tasks, show numeric ID
    return task.id ? task.id.toString().padStart(3, '0') : null;
  };

  const getTaskText = (task) => {
    // Now task is an object with text property
    return task.text || task;
  };

  const getPriorityClass = (task) => {
    const text = task.text || task;
    if (text.includes('[URGENT]')) return styles.urgent;
    if (text.includes('[LOW]')) return styles.low;
    return styles.normal;
  };

  const getDeadlineInfo = (task) => {
    const text = task.text || task;
    const match = text.match(/\(due:\s*([^)]+)\)/);
    if (!match) return null;
    
    const dueDate = match[1];
    const today = new Date().toISOString().split('T')[0];
    const isToday = dueDate === today;
    const isPast = dueDate < today;
    
    return {
      date: dueDate,
      text: dueDate,
      isToday,
      isPast,
      className: isPast ? styles.overdue : (isToday ? styles.dueToday : styles.upcoming)
    };
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>JARVIS</h1>
        <p className={styles.subtitle}>Productivity Assistant</p>
        <div className={styles.statusBar}>
          <span className={styles.status}>{status}</span>
          {error && <span className={styles.error}>⚠️ {error}</span>}
        </div>
      </div>

      {/* Voice Amplitude Cards */}
      <div className={styles.voiceCards}>
        <SpeakerCard 
          emoji="🤖"
          name="JARVIS"
          amplitude={agentAudioAmplitude}
          speaking={agentAudioAmplitude > 0.001}
          statusText={agentAudioAmplitude > 0.001 ? 'Speaking...' : 'Ready'}
          type="agent"
        />

        <SpeakerCard 
          emoji="🎤"
          name="You"
          amplitude={userAudioAmplitude}
          speaking={userAudioAmplitude > 0.001}
          statusText={userAudioAmplitude > 0.001 ? 'Speaking...' : 'Listening'}
          type="user"
        />
      </div>

      {/* Todo List - TextEdit Style */}
      <div className={styles.todoDocument}>
        <div className={styles.documentHeader}>
          <div className={styles.documentTitle}>My Todo List</div>
          <div className={styles.documentStats}>
            <button 
              className={`${styles.activeCount} ${filter === 'active' ? styles.activeFilter : ''}`}
              onClick={() => setFilter(filter === 'active' ? 'all' : 'active')}
            >
              {stats.active} active
            </button>
            <button 
              className={`${styles.completedCount} ${filter === 'completed' ? styles.activeFilter : ''}`}
              onClick={() => setFilter(filter === 'completed' ? 'all' : 'completed')}
            >
              {stats.completed} completed
            </button>
          </div>
        </div>

        <div className={styles.documentContent}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <span>Loading tasks...</span>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <span>❌ {error}</span>
              <button onClick={fetchTasks} className={styles.retryButton}>
                Retry
              </button>
            </div>
          ) : tasks.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No tasks yet. Say "Add [task name]" to get started!</p>
            </div>
          ) : (
            <div className={styles.tasksList}>
              {tasks.filter(task => {
                if (filter === 'active') return task.status === 'active';
                if (filter === 'completed') return task.status === 'completed';
                return true; // 'all' filter
              }).map((task, index) => {
                const taskId = getTaskId(task);
                const taskText = getTaskText(task);
                const deadline = getDeadlineInfo(task);
                const priorityClass = getPriorityClass(task);

                return (
                  <div 
                    key={`${taskId}-${index}`} 
                    className={`${styles.taskLine} ${priorityClass}`}
                  >
                    <span className={styles.taskId}>#{taskId}</span>
                    <span className={styles.taskContent}>{taskText}</span>
                    {deadline && (
                      <span className={`${styles.deadline} ${deadline.className}`}>
                        📅 {deadline.text}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpeakerCard({ emoji, name, amplitude, speaking, statusText, type }) {
  // Scale amplitude values for visual effect
  const scaledAmplitude = type === 'user' ? amplitude * 300 : amplitude * 180;
  const height = Math.max(4, scaledAmplitude);
  
  return (
    <div className={`${styles.speakerCard} ${speaking ? styles.speaking : ''}`}>
      <div className={styles.speakerInfo}>
        <span className={styles.speakerEmoji}>{emoji}</span>
        <span className={styles.speakerName}>{name}</span>
        <span className={styles.speakerStatus}>{statusText}</span>
      </div>
      <div className={styles.amplitudeBars}>
        <div className={styles.bar} style={{ height: `${height}px` }}></div>
        <div className={styles.bar} style={{ height: `${height}px`, animationDelay: '0.1s' }}></div>
        <div className={styles.bar} style={{ height: `${height}px`, animationDelay: '0.2s' }}></div>
        <div className={styles.bar} style={{ height: `${height}px`, animationDelay: '0.3s' }}></div>
        <div className={styles.bar} style={{ height: `${height}px`, animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
}