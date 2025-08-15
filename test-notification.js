const { app, Notification } = require('electron');

app.whenReady().then(() => {
  console.log('🧪 Testing Electron notifications...');
  
  // Check if notifications are supported
  if (Notification.isSupported()) {
    console.log('✅ Notifications are supported');
    
    // Create and show a test notification
    const notification = new Notification({
      title: 'JARVIS Test Notification',
      body: 'This is a test notification from Electron',
      silent: false
    });
    
    notification.show();
    console.log('📱 Test notification shown');
    
    notification.on('click', () => {
      console.log('🖱️ Notification clicked');
    });
    
    notification.on('close', () => {
      console.log('❌ Notification closed');
    });
    
    // Auto quit after showing notification
    setTimeout(() => {
      app.quit();
    }, 5000);
    
  } else {
    console.log('❌ Notifications are NOT supported');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Don't quit on macOS
});