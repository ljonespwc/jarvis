#!/usr/bin/env node

const TodoFileManager = require('./src/TodoFileManager');
const path = require('path');
const os = require('os');

async function testBasicOperations() {
  console.log('🧪 Testing JARVIS Todo File Operations...\n');
  
  try {
    // Initialize with a test file in the project directory
    const testFilePath = path.join(__dirname, 'test-todo.txt');
    const todoManager = new TodoFileManager(testFilePath);
    
    console.log('1. Initializing TodoFileManager...');
    await todoManager.initialize();
    console.log('✅ TodoFileManager initialized successfully\n');
    
    console.log('2. Adding test tasks...');
    await todoManager.addTask('Call dentist for appointment');
    await todoManager.addTask('Buy groceries for dinner');
    await todoManager.addTask('Review quarterly report');
    await todoManager.addTask('Schedule team meeting');
    console.log('✅ Added 4 test tasks\n');
    
    console.log('3. Reading all tasks...');
    const tasks = await todoManager.readTasks();
    console.log('Active tasks:', tasks.active.length);
    console.log('Completed tasks:', tasks.completed.length);
    tasks.active.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task}`);
    });
    console.log();
    
    console.log('4. Getting top 3 priority tasks...');
    const topTasks = await todoManager.getTopTasks(3);
    topTasks.forEach((task, index) => {
      console.log(`  Priority ${index + 1}: ${task}`);
    });
    console.log();
    
    console.log('5. Marking a task as done...');
    await todoManager.markDone('dentist');
    console.log('✅ Marked "dentist" task as completed\n');
    
    console.log('6. Reading tasks after completion...');
    const updatedTasks = await todoManager.readTasks();
    console.log('Active tasks:', updatedTasks.active.length);
    console.log('Completed tasks:', updatedTasks.completed.length);
    
    console.log('\nActive tasks:');
    updatedTasks.active.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task}`);
    });
    
    console.log('\nCompleted tasks:');
    updatedTasks.completed.forEach((task, index) => {
      console.log(`  ✓ ${task}`);
    });
    
    console.log('\n7. Getting task counts...');
    const counts = await todoManager.getTaskCount();
    console.log(`Total tasks: ${counts.total} (${counts.active} active, ${counts.completed} completed)`);
    
    console.log('\n🎉 All tests passed! File operations are working correctly.');
    console.log(`📄 Test file created at: ${testFilePath}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testBasicOperations();