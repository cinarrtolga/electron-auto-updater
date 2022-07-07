const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { autoUpdater } = require("electron-updater");
const fs = require('fs');
const data = fs.readFileSync(__dirname + '/../package.json', 'utf8');
const dataObj = JSON.parse(data);

let updateInterval = null;

function createWindow() {
    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '../index.html'),
        protocol: 'file:',
        slashes: true,
    });
    const win = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        }
    });
    win.loadURL('file:///' + __dirname + "/index.html");
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit()
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    if (dataObj.version.includes("-alpha")) {
        autoUpdater.channel = "alpha";
        autoUpdater.allowPrerelease = true;
    } else if (dataObj.version.includes("-beta")) {
        autoUpdater.channel = "beta";
        autoUpdater.allowPrerelease = true;
    } else {
        autoUpdater.channel = "latest";
        autoUpdater.allowPrerelease = false;
    }

    autoUpdater.autoDownload = false;

    updateInterval = setInterval(() => autoUpdater.checkForUpdatesAndNotify().then((updateCheckResult) => {
        if (updateCheckResult.updateInfo.version !== dataObj.version) {
            if (updateCheckResult.updateInfo.version.includes("-alpha") && dataObj.version.includes("-alpha")) {
                dialog.showMessageBox({
                    type: 'info',
                    title: 'Update available',
                    message: 'An update is available. Do you want to update now?',
                    buttons: ['Yes', 'No']
                }).then((result) => {
                    if (result.response === 0) {
                        autoUpdater.downloadUpdate();
                    }
                });
            } else if (!updateCheckResult.updateInfo.version.includes("-alpha") && !dataObj.version.includes("-alpha")) {
                dialog.showMessageBox({
                    type: 'info',
                    title: 'Update available',
                    message: 'An update is available. Do you want to update now?',
                    buttons: ['Yes', 'No']
                }).then((result) => {
                    if (result.response === 0) {
                        autoUpdater.downloadUpdate();
                    }
                });
            }
        }
    }), 5000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
});

autoUpdater.on("update-available", (_event, releaseNotes, releaseName) => {
    const dialogOpts = {
        type: 'info',
        buttons: ['Ok'],
        title: 'Update Available',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: `A new ${autoUpdater.channel} version download started. The app will be restarted to install the update.`
    };
    dialog.showMessageBox(dialogOpts);

    clearInterval(updateInterval);
});

autoUpdater.on("update-downloaded", (_event, releaseNotes, releaseName) => {
    clearInterval(updateInterval);

    const dialogOpts = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: `A new ${autoUpdater.channel} version has been downloaded. Restart the application to apply the updates.`
    };
    dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall()
    });
});
