const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

// Timer state
let timerState = {
  taskTitle: 'Focus Time',
  subtaskTitle: 'Working...',
  timeLeft: 300,
  initialDuration: 300,
  isRunning: false,
};

function createWindow() {
  // Create a small, frameless, always-on-top window
  mainWindow = new BrowserWindow({
    width: 200,
    height: 120,
    x: 50,
    y: 50,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // CRITICAL: Always on top at 'screen-saver' level (above fullscreen apps)
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // macOS: Show on all workspaces/spaces
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // macOS: Prevent app from showing in dock when only timer is open
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Allow dragging the window
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Debug: Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function createTray() {
  // Create tray icon from assets
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon2xPath = path.join(__dirname, 'assets', 'tray-icon@2x.png');

  let icon;
  try {
    // Try to load the @2x version for retina displays
    icon = nativeImage.createFromPath(icon2xPath);
    // Set as template image for proper macOS menu bar appearance
    icon.setTemplateImage(true);
  } catch (e) {
    try {
      icon = nativeImage.createFromPath(iconPath);
      icon.setTemplateImage(true);
    } catch (e2) {
      // Fallback to empty icon
      icon = nativeImage.createEmpty();
    }
  }

  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABzSURBVDiNY/z//z8DJYCJgUIwasC/f/8YGBgYGP7//89ACWBkZGQgxwBGRkZGhn///jGQC/79+8dIyGJsmpBdQIoBLAz//v1jJNcQXJqwGUCyC8gBTIyMjIwMDP8ZKAEsDAz/GRj//SMoB9eFhFxIEAAALM4YxNDptNcAAAAASUVORK5CYII='
  ) : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Timer',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'Hide Timer',
      click: () => {
        if (mainWindow) mainWindow.hide();
      }
    },
    { type: 'separator' },
    {
      label: 'Play/Pause',
      click: () => {
        timerState.isRunning = !timerState.isRunning;
        if (mainWindow) {
          mainWindow.webContents.send('timer-update', timerState);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    },
  ]);

  tray.setToolTip('TaskFlow Timer');
  tray.setContextMenu(contextMenu);
}

// IPC Handlers
ipcMain.handle('get-timer-state', () => timerState);

ipcMain.on('update-timer', (event, newState) => {
  timerState = { ...timerState, ...newState };
});

ipcMain.on('toggle-timer', () => {
  timerState.isRunning = !timerState.isRunning;
  if (mainWindow) {
    mainWindow.webContents.send('timer-update', timerState);
  }
});

ipcMain.on('hide-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.on('set-timer', (event, { taskTitle, subtaskTitle, duration }) => {
  timerState = {
    taskTitle: taskTitle || 'Focus Time',
    subtaskTitle: subtaskTitle || 'Working...',
    timeLeft: duration || 300,
    initialDuration: duration || 300,
    isRunning: false,
  };
  if (mainWindow) {
    mainWindow.webContents.send('timer-update', timerState);
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on macOS, keep tray icon
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle deep links (for web app integration)
app.on('open-url', (event, url) => {
  event.preventDefault();
  // Parse URL like: taskflow-timer://start?task=...&subtask=...&duration=300
  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;

    timerState = {
      taskTitle: params.get('task') || 'Focus Time',
      subtaskTitle: params.get('subtask') || 'Working...',
      timeLeft: parseInt(params.get('duration') || '300'),
      initialDuration: parseInt(params.get('duration') || '300'),
      isRunning: params.get('autostart') === 'true',
    };

    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('timer-update', timerState);
    }
  } catch (e) {
    console.error('Failed to parse deep link:', e);
  }
});

// Register custom protocol
app.setAsDefaultProtocolClient('taskflow-timer');

console.log('TaskFlow Timer started! Window should appear on top of all apps.');
