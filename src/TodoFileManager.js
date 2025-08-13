const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class TodoFileManager {
  constructor() {
    this.todoFilePath = path.join(os.homedir(), 'Desktop', 'todo.txt');
    this.backupDir = path.join(os.homedir(), '.jarvis-backups');
    this.maxBackups = 10;
  }

  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      console.log('📁 Creating backup directory:', this.backupDir);
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    try {
      await this.ensureBackupDir();
      
      // Check if todo file exists before backing up
      try {
        await fs.access(this.todoFilePath);
      } catch (error) {
        console.log('📝 No todo.txt file to backup');
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `todo-backup-${timestamp}.txt`);
      
      await fs.copyFile(this.todoFilePath, backupPath);
      console.log('💾 Created backup:', backupPath);
      
      // Clean old backups
      await this.cleanOldBackups();
      
      return backupPath;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('todo-backup-') && f.endsWith('.txt'))
        .map(f => ({ name: f, path: path.join(this.backupDir, f) }))
        .sort((a, b) => b.name.localeCompare(a.name)); // Sort by name (newest first)

      if (backupFiles.length > this.maxBackups) {
        const filesToDelete = backupFiles.slice(this.maxBackups);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          console.log('🗑️  Deleted old backup:', file.name);
        }
      }
    } catch (error) {
      console.error('❌ Failed to clean old backups:', error);
    }
  }

  async readTodoFile() {
    try {
      const content = await fs.readFile(this.todoFilePath, 'utf8');
      return this.parseTodoContent(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📝 No todo.txt file found, will create one');
        return { activeTasks: [], doneTasks: [] };
      }
      throw new Error(`Failed to read todo file: ${error.message}`);
    }
  }

  parseTodoContent(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const activeTasks = [];
    const doneTasks = [];

    for (const line of lines) {
      if (line.startsWith('#')) {
        // Skip comments
        continue;
      } else if (line.startsWith('[DONE]')) {
        // Parse completed task: [DONE] 2025-08-12 Task description
        const match = line.match(/^\[DONE\]\s*(\d{4}-\d{2}-\d{2})?\s*(.+)$/);
        if (match) {
          doneTasks.push({
            text: match[2].trim(),
            completedDate: match[1] || new Date().toISOString().split('T')[0],
            originalLine: line
          });
        }
      } else if (line.length > 0) {
        // Active task
        activeTasks.push({
          text: line,
          originalLine: line
        });
      }
    }

    return { activeTasks, doneTasks };
  }

  async writeTodoFile(activeTasks, doneTasks) {
    // Create backup before writing
    await this.createBackup();

    const lines = ['# My Todo List'];
    
    // Add active tasks
    activeTasks.forEach(task => {
      lines.push(task.text);
    });

    // Add empty line before done tasks if there are any
    if (doneTasks.length > 0) {
      lines.push('');
      doneTasks.forEach(task => {
        lines.push(`[DONE] ${task.completedDate} ${task.text}`);
      });
    }

    const content = lines.join('\n') + '\n';
    
    try {
      await fs.writeFile(this.todoFilePath, content, 'utf8');
      console.log('✅ Updated todo.txt file');
    } catch (error) {
      throw new Error(`Failed to write todo file: ${error.message}`);
    }
  }

  async addTask(taskText) {
    const { activeTasks, doneTasks } = await this.readTodoFile();
    
    // Add new task to active tasks
    activeTasks.push({
      text: taskText.trim(),
      originalLine: taskText.trim()
    });

    await this.writeTodoFile(activeTasks, doneTasks);
    console.log('➕ Added task:', taskText);
    
    return { success: true, message: `Added "${taskText}" to your todo list` };
  }

  async markTaskDone(taskQuery) {
    const { activeTasks, doneTasks } = await this.readTodoFile();
    
    // Find matching task (fuzzy matching)
    const query = taskQuery.toLowerCase();
    const matchIndex = activeTasks.findIndex(task => 
      task.text.toLowerCase().includes(query)
    );

    if (matchIndex === -1) {
      return { 
        success: false, 
        message: `Could not find task matching "${taskQuery}"`,
        activeTasks: activeTasks.map(t => t.text)
      };
    }

    const completedTask = activeTasks[matchIndex];
    const today = new Date().toISOString().split('T')[0];

    // Move task to done list
    doneTasks.push({
      text: completedTask.text,
      completedDate: today,
      originalLine: `[DONE] ${today} ${completedTask.text}`
    });

    // Remove from active tasks
    activeTasks.splice(matchIndex, 1);

    await this.writeTodoFile(activeTasks, doneTasks);
    console.log('✅ Marked done:', completedTask.text);

    return { 
      success: true, 
      message: `Marked "${completedTask.text}" as complete`,
      completedTask: completedTask.text
    };
  }

  async getActiveTasks() {
    const { activeTasks } = await this.readTodoFile();
    return activeTasks.map(task => task.text);
  }

  async getPriorityTasks(count = 5) {
    const activeTasks = await this.getActiveTasks();
    
    // Simple prioritization - look for urgency keywords
    const urgencyKeywords = ['urgent', 'asap', 'today', 'important', 'critical'];
    
    const prioritized = activeTasks.map(task => {
      const lowerTask = task.toLowerCase();
      const urgencyScore = urgencyKeywords.reduce((score, keyword) => {
        return score + (lowerTask.includes(keyword) ? 1 : 0);
      }, 0);
      
      return { task, urgencyScore };
    }).sort((a, b) => b.urgencyScore - a.urgencyScore);

    return prioritized.slice(0, count).map(item => item.task);
  }

  async getStats() {
    const { activeTasks, doneTasks } = await this.readTodoFile();
    return {
      activeCount: activeTasks.length,
      completedCount: doneTasks.length,
      totalTasks: activeTasks.length + doneTasks.length
    };
  }
}

module.exports = TodoFileManager;