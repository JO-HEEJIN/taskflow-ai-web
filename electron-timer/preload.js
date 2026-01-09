const { contextBridge, ipcRenderer } = require('electron');

// Expose secure APIs to renderer
contextBridge.exposeInMainWorld('timerAPI', {
  // Get current timer state
  getState: () => ipcRenderer.invoke('get-timer-state'),

  // Update timer state
  updateState: (state) => ipcRenderer.send('update-timer', state),

  // Toggle play/pause
  toggle: () => ipcRenderer.send('toggle-timer'),

  // Hide window
  hideWindow: () => ipcRenderer.send('hide-window'),

  // Set new timer
  setTimer: (taskTitle, subtaskTitle, duration) => {
    ipcRenderer.send('set-timer', { taskTitle, subtaskTitle, duration });
  },

  // Listen for timer updates from main process
  onTimerUpdate: (callback) => {
    ipcRenderer.on('timer-update', (event, state) => callback(state));
  },

  // Remove listener
  removeTimerListener: () => {
    ipcRenderer.removeAllListeners('timer-update');
  },
});
