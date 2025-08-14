import React, { useState, useEffect } from 'react';
import styles from '../styles/TodoViewer.module.css';

const TodoViewer = ({ isVisible = true }) => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tasks from main process
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await window.electronAPI.getTasks();
      if (response.success) {
        setTasks(response.data.tasks || []);
        setStats(response.data.stats || { active: 0, completed: 0 });
        setError(null);
      } else {
        setError(response.error || 'Failed to load tasks');
      }
    } catch (err) {
      setError('Error loading tasks: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh tasks every 2 seconds
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 2000);
    return () => clearInterval(interval);
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

  const getPriorityColor = (task) => {
    if (task.includes('[URGENT]')) return styles.urgent;
    if (task.includes('[LOW]')) return styles.low;
    return styles.normal;
  };

  const getTaskId = (task) => {
    const match = task.match(/^(\d{3})\s+/);
    return match ? match[1] : null;
  };

  const getTaskText = (task) => {
    return task.replace(/^\d{3}\s+/, '');
  };

  const getDeadlineInfo = (task) => {
    const match = task.match(/\(due:\s*([^)]+)\)/);
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

  if (!isVisible) return null;

  return (
    <div className={styles.todoViewer}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          📋 Your Tasks
        </h2>
        <div className={styles.stats}>
          <span className={styles.activeTasks}>{stats.active} active</span>
          <span className={styles.completedTasks}>{stats.completed} done</span>
        </div>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Loading tasks...</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span>❌ {error}</span>
          <button onClick={fetchTasks} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.taskList}>
          {tasks.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>✨</span>
              <p>No tasks yet. Say "Add [task name]" to get started!</p>
            </div>
          ) : (
            tasks.map((task, index) => {
              const taskId = getTaskId(task);
              const taskText = getTaskText(task);
              const deadline = getDeadlineInfo(task);
              const priorityClass = getPriorityColor(task);

              return (
                <div 
                  key={`${taskId}-${index}`} 
                  className={`${styles.taskItem} ${priorityClass}`}
                >
                  <div className={styles.taskHeader}>
                    {taskId && (
                      <span className={styles.taskId}>#{taskId}</span>
                    )}
                    <div className={styles.taskContent}>
                      <span className={styles.taskText}>{taskText}</span>
                      {deadline && (
                        <span className={`${styles.deadline} ${deadline.className}`}>
                          📅 {deadline.text}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className={styles.footer}>
        <p className={styles.hint}>
          🎤 Use voice commands: "Add task", "Mark [task] done", "What needs attention?"
        </p>
      </div>
    </div>
  );
};

export default TodoViewer;