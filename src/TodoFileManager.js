const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class TodoFileManager {
  constructor() {
    this.todoFilePath = path.join(os.homedir(), 'Desktop', 'todo.txt');
    this.backupDir = path.join(os.homedir(), '.jarvis-backups');
    this.maxBackups = 10;
    this.nextId = 1; // Track next available task ID
    this.usedIds = new Set(); // Track used IDs to avoid conflicts
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
    this.usedIds.clear();
    let maxId = 0;

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
        // Active task - check for ID prefix
        const idMatch = line.match(/^(\d{3})\s+(.+)$/);
        if (idMatch) {
          // Task with ID: "001 Task description"
          const id = parseInt(idMatch[1]);
          const taskText = idMatch[2];
          this.usedIds.add(id);
          maxId = Math.max(maxId, id);
          
          activeTasks.push({
            id: id,
            text: taskText,
            originalLine: line
          });
        } else {
          // Legacy task without ID - assign one
          const newId = this.getNextAvailableId();
          this.usedIds.add(newId);
          maxId = Math.max(maxId, newId);
          
          activeTasks.push({
            id: newId,
            text: line,
            originalLine: line,
            needsIdAssignment: true // Flag for file rewrite
          });
        }
      }
    }

    // Update next ID counter
    this.nextId = maxId + 1;

    return { activeTasks, doneTasks };
  }

  getNextAvailableId() {
    while (this.usedIds.has(this.nextId)) {
      this.nextId++;
    }
    return this.nextId++;
  }

  formatTaskId(id) {
    return id.toString().padStart(3, '0');
  }

  async writeTodoFile(activeTasks, doneTasks) {
    // Create backup before writing
    await this.createBackup();

    const lines = ['# My Todo List'];
    
    // Add active tasks with IDs
    activeTasks.forEach(task => {
      const id = this.formatTaskId(task.id);
      lines.push(`${id} ${task.text}`);
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
    return activeTasks.map(task => ({
      id: task.id,
      text: task.text,
      fullLine: `${this.formatTaskId(task.id)} ${task.text}`
    }));
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

  // ===== ENHANCED FUNCTION LIBRARY =====

  async add_task(task, priority = 'normal', deadline = null) {
    try {
      const { activeTasks, doneTasks } = await this.readTodoFile();
      
      // Format task with priority and deadline
      let formattedTask = task.trim();
      if (priority === 'urgent') formattedTask = `[URGENT] ${formattedTask}`;
      if (priority === 'low') formattedTask = `[LOW] ${formattedTask}`;
      if (deadline) {
        const deadlineStr = this.formatDeadline(deadline);
        formattedTask += ` (due: ${deadlineStr})`;
      }

      // Assign new ID
      const newId = this.getNextAvailableId();
      this.usedIds.add(newId);

      activeTasks.push({
        id: newId,
        text: formattedTask,
        originalLine: `${this.formatTaskId(newId)} ${formattedTask}`
      });

      await this.writeTodoFile(activeTasks, doneTasks);
      console.log('➕ Added task:', `${this.formatTaskId(newId)} ${formattedTask}`);
      
      return { success: true, message: `Added as task ${this.formatTaskId(newId)}` };
    } catch (error) {
      console.error('❌ Error adding task:', error);
      return { success: false, message: 'Failed to add task' };
    }
  }

  async mark_complete(taskQuery) {
    try {
      const { activeTasks, doneTasks } = await this.readTodoFile();
      
      // Find matching task by ID or text
      const { index: matchIndex, matchType } = this.findTaskByQuery(activeTasks, taskQuery);

      if (matchIndex === -1) {
        return { 
          success: false, 
          message: `Could not find task matching "${taskQuery}"`
        };
      }

      const completedTask = activeTasks[matchIndex];
      const today = new Date().toISOString().split('T')[0];

      // Move task to done list (without ID)
      doneTasks.push({
        text: completedTask.text,
        completedDate: today,
        originalLine: `[DONE] ${today} ${completedTask.text}`
      });

      // Remove from active tasks and free up the ID
      this.usedIds.delete(completedTask.id);
      activeTasks.splice(matchIndex, 1);

      await this.writeTodoFile(activeTasks, doneTasks);
      console.log('✅ Marked done:', `${this.formatTaskId(completedTask.id)} ${completedTask.text}`);

      return { success: true, message: 'Done' };
    } catch (error) {
      console.error('❌ Error marking task complete:', error);
      return { success: false, message: 'Failed to complete task' };
    }
  }

  async update_task(taskQuery, newText) {
    try {
      const { activeTasks, doneTasks } = await this.readTodoFile();
      
      const { index: matchIndex } = this.findTaskByQuery(activeTasks, taskQuery);

      if (matchIndex === -1) {
        return { success: false, message: `Could not find task matching "${taskQuery}"` };
      }

      const task = activeTasks[matchIndex];
      const oldText = task.text;
      task.text = newText.trim();
      task.originalLine = `${this.formatTaskId(task.id)} ${newText.trim()}`;

      await this.writeTodoFile(activeTasks, doneTasks);
      console.log('🔄 Updated task:', `${this.formatTaskId(task.id)} ${oldText}`, '→', `${this.formatTaskId(task.id)} ${newText}`);

      return { success: true, message: 'Updated' };
    } catch (error) {
      console.error('❌ Error updating task:', error);
      return { success: false, message: 'Failed to update task' };
    }
  }

  async delete_task(taskQuery) {
    try {
      const { activeTasks, doneTasks } = await this.readTodoFile();
      
      const { index: matchIndex } = this.findTaskByQuery(activeTasks, taskQuery);

      if (matchIndex === -1) {
        return { success: false, message: `Could not find task matching "${taskQuery}"` };
      }

      const deletedTask = activeTasks[matchIndex];
      
      // Free up the ID and remove task
      this.usedIds.delete(deletedTask.id);
      activeTasks.splice(matchIndex, 1);

      await this.writeTodoFile(activeTasks, doneTasks);
      console.log('🗑️ Deleted task:', `${this.formatTaskId(deletedTask.id)} ${deletedTask.text}`);

      return { success: true, message: 'Removed' };
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      return { success: false, message: 'Failed to remove task' };
    }
  }

  async add_deadline(taskQuery, deadline) {
    try {
      const { activeTasks, doneTasks } = await this.readTodoFile();
      
      // Find matching task by ID or text
      const { index: matchIndex } = this.findTaskByQuery(activeTasks, taskQuery);

      if (matchIndex === -1) {
        return { success: false, message: `Could not find task matching "${taskQuery}"` };
      }

      const task = activeTasks[matchIndex];
      let taskText = task.text;
      const deadlineStr = this.formatDeadline(deadline);
      
      // Remove existing deadline if present
      taskText = taskText.replace(/\s*\(due:.*?\)/, '');
      taskText += ` (due: ${deadlineStr})`;

      task.text = taskText;
      task.originalLine = `${this.formatTaskId(task.id)} ${taskText}`;

      await this.writeTodoFile(activeTasks, doneTasks);
      console.log('📅 Added deadline:', `${this.formatTaskId(task.id)} ${taskText}`);

      return { success: true, message: 'Updated' };
    } catch (error) {
      console.error('❌ Error adding deadline:', error);
      return { success: false, message: 'Failed to add deadline' };
    }
  }

  async set_priority(taskQuery, priority) {
    try {
      const { activeTasks, doneTasks } = await this.readTodoFile();
      
      // Find matching task by ID or text
      const { index: matchIndex } = this.findTaskByQuery(activeTasks, taskQuery);

      if (matchIndex === -1) {
        return { success: false, message: `Could not find task matching "${taskQuery}"` };
      }

      const task = activeTasks[matchIndex];
      let taskText = task.text;
      
      // Remove existing priority markers
      taskText = taskText.replace(/^\[URGENT\]\s*/, '').replace(/^\[LOW\]\s*/, '');
      
      // Add new priority
      if (priority === 'urgent') taskText = `[URGENT] ${taskText}`;
      if (priority === 'low') taskText = `[LOW] ${taskText}`;

      task.text = taskText;
      task.originalLine = `${this.formatTaskId(task.id)} ${taskText}`;

      await this.writeTodoFile(activeTasks, doneTasks);
      console.log('🏷️ Set priority:', `${this.formatTaskId(task.id)} ${taskText}`);

      return { success: true, message: 'Updated' };
    } catch (error) {
      console.error('❌ Error setting priority:', error);
      return { success: false, message: 'Failed to set priority' };
    }
  }

  async list_tasks(filter = 'all') {
    try {
      const activeTasks = await this.getActiveTasks();
      
      let filteredTasks = activeTasks;
      
      if (filter === 'urgent') {
        filteredTasks = activeTasks.filter(task => 
          task.toLowerCase().includes('[urgent]')
        );
      } else if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filteredTasks = activeTasks.filter(task => 
          task.includes(`due: ${today}`) || task.includes('due: today')
        );
      }

      if (filteredTasks.length === 0) {
        return { success: true, tasks: [], message: 'No tasks found' };
      }

      return { success: true, tasks: filteredTasks, message: `Found ${filteredTasks.length} tasks` };
    } catch (error) {
      console.error('❌ Error listing tasks:', error);
      return { success: false, message: 'Failed to list tasks' };
    }
  }

  async search_tasks(query) {
    try {
      const activeTasks = await this.getActiveTasks();
      const searchQuery = query.toLowerCase();
      
      const matchingTasks = activeTasks.filter(task => 
        task.toLowerCase().includes(searchQuery)
      );

      return { 
        success: true, 
        tasks: matchingTasks, 
        message: `Found ${matchingTasks.length} matching tasks` 
      };
    } catch (error) {
      console.error('❌ Error searching tasks:', error);
      return { success: false, message: 'Failed to search tasks' };
    }
  }

  // Helper method to format deadlines
  // Helper method to find task by ID or text
  findTaskByQuery(activeTasks, taskQuery) {
    const query = taskQuery.trim();
    
    // Try ID matching first (001, 1, task 1, etc.)
    const idMatch = query.match(/(?:task\s+)?(\d+)/i);
    if (idMatch) {
      const targetId = parseInt(idMatch[1]);
      const taskIndex = activeTasks.findIndex(task => task.id === targetId);
      if (taskIndex !== -1) {
        return { index: taskIndex, matchType: 'id' };
      }
    }
    
    // Fallback to text matching
    const lowerQuery = query.toLowerCase();
    const taskIndex = activeTasks.findIndex(task => 
      task.text.toLowerCase().includes(lowerQuery)
    );
    
    if (taskIndex !== -1) {
      return { index: taskIndex, matchType: 'text' };
    }
    
    return { index: -1, matchType: 'none' };
  }

  formatDeadline(deadline) {
    if (deadline === 'today') {
      return new Date().toISOString().split('T')[0];
    } else if (deadline === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    return deadline; // Return as-is for other formats
  }
}

module.exports = TodoFileManager;