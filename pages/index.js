import { useState } from 'react';
import VoiceInterface from '../components/VoiceInterface';
import TodoViewer from '../components/TodoViewer';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [activeView, setActiveView] = useState('voice'); // 'voice' or 'todo'

  return (
    <div className={styles.app}>
      <div className={styles.tabBar}>
        <button 
          className={`${styles.tab} ${activeView === 'voice' ? styles.active : ''}`}
          onClick={() => setActiveView('voice')}
        >
          🎤 Voice
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'todo' ? styles.active : ''}`}
          onClick={() => setActiveView('todo')}
        >
          📋 Tasks
        </button>
      </div>
      
      <div className={styles.content}>
        {activeView === 'voice' && <VoiceInterface />}
        {activeView === 'todo' && <TodoViewer />}
      </div>
    </div>
  )
}