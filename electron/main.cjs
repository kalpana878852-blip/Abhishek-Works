const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 1024,
    minHeight: 700,
    title: 'MANUFACTUREQUOTE AI - Abhishek Engineering Works (AEW)',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handler to save generated PDF files to local disk
ipcMain.handle('save-pdf-dialog', async (event, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save PDF Document',
    defaultPath: defaultName || 'AEW_Document.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) return null;
  return filePath;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
