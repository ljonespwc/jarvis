const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class TodoFileManager {
  constructor(todoFilePath = null) {
    this.todoFilePath = todoFilePath || path.join(os.homedir(), 'todo.txt');
    this.backupDir = path.join(path.dirname(this.todoFilePath), '.jarvis-backups');
  }

  async initialize() {
    try {
      await this.ensureBackupDir();
      await this.ensureTodoFile();
      console.log(`TodoFileManager initialized with file: ${this.todoFilePath}`);
    } catch (error) {
      console.error('Failed to initialize TodoFileManager:', error);
      throw error;
    }
  }

  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  async ensureTodoFile() {
    try {
      await fs.access(this.todoFilePath);
    } catch (error) {
      const initialContent = '# Welcome to JARVIS Voice Todo!\n# Say "Add [task]" to get started\n\n';
      await fs.writeFile(this.todoFilePath, initialContent, 'utf8');
      console.log('Created new todo.txt file');
    }
  }

  async backup() {
    try {
      const content = await fs.readFile(this.todoFilePath, 'utf8');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `todo-backup-${timestamp}.txt`);
      await fs.writeFile(backupPath, content, 'utf8');
      
      await this.cleanOldBackups();
      return backupPath;
    } catch (error) {
      console.error('Backup failed:', error);
      throw new Error('Failed to create backup: ' + error.message);
    }
  }

  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('todo-backup-'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file)
        }));

      if (backupFiles.length > 10) {
        const stats = await Promise.all(
          backupFiles.map(async file => ({
            ...file,
            mtime: (await fs.stat(file.path)).mtime
          }))
        );

        stats.sort((a, b) => b.mtime - a.mtime);
        const toDelete = stats.slice(10);

        await Promise.all(
          toDelete.map(file => fs.unlink(file.path))
        );
      }
    } catch (error) {
      console.warn('Failed to clean old backups:', error);
    }
  }

  async readTasks() {
    try {
      const content = await fs.readFile(this.todoFilePath, 'utf8');
      return this.parseTodoContent(content);
    } catch (error) {
      console.error('Error reading todo file:', error);
      throw new Error('Failed to read todo file: ' + error.message);
    }
  }

  parseTodoContent(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const active = [];
    const completed = [];

    for (const line of lines) {
      if (line.startsWith('#')) {
        continue;
      }
      
      if (line.startsWith('[DONE]')) {
        const task = line.replace(/^\[DONE\]\s*\d{4}-\d{2}-\d{2}\s*/, '').trim();
        if (task) {
          completed.push(task);
        }
      } else if (line.trim()) {
        active.push(line);
      }
    }

    return { active, completed };
  }

  async addTask(taskText) {
    if (!taskText || !taskText.trim()) {
      throw new Error('Task text cannot be empty');
    }

    try {
      await this.backup();
      
      const content = await fs.readFile(this.todoFilePath, 'utf8');
      const newContent = content + '\n' + taskText.trim() + '\n';
      
      await fs.writeFile(this.todoFilePath, newContent, 'utf8');
      console.log(`Added task: ${taskText}`);
      
      return true;
    } catch (error) {
      console.error('Error adding task:', error);
      throw new Error('Failed to add task: ' + error.message);
    }
  }

  async markDone(taskMatch) {
    if (!taskMatch || !taskMatch.trim()) {
      throw new Error('Task match text cannot be empty');
    }

    try {
      await this.backup();
      
      const content = await fs.readFile(this.todoFilePath, 'utf8');
      const lines = content.split('\n');
      
      let foundMatch = false;
      const updatedLines = lines.map(line => {
        const trimmed = line.trim();
        
        if (!foundMatch && 
            trimmed && 
            !trimmed.startsWith('#') && 
            !trimmed.startsWith('[DONE]') &&
            trimmed.toLowerCase().includes(taskMatch.toLowerCase())) {
          
          foundMatch = true;
          const timestamp = new Date().toISOString().split('T')[0];
          return `[DONE] ${timestamp} ${trimmed}`;
        }
        
        return line;
      });

      if (!foundMatch) {
        throw new Error(`No matching task found for: "${taskMatch}"`);
      }

      await fs.writeFile(this.todoFilePath, updatedLines.join('\n'), 'utf8');
      console.log(`Marked task as done: ${taskMatch}`);
      
      return true;
    } catch (error) {
      console.error('Error marking task done:', error);
      throw error;
    }
  }

  async getTopTasks(limit = 5) {
    try {
      const tasks = await this.readTasks();
      return tasks.active.slice(0, limit);
    } catch (error) {
      console.error('Error getting top tasks:', error);
      throw error;
    }
  }

  async getTaskCount() {
    try {
      const tasks = await this.readTasks();
      return {
        active: tasks.active.length,
        completed: tasks.completed.length,
        total: tasks.active.length + tasks.completed.length
      };
    } catch (error) {
      console.error('Error getting task count:', error);
      throw error;
    }
  }
}

module.exports = TodoFileManager;