/*
*  Auto updater channel feature is not available for GitHub releases.
*  Because of that, for the second environment, we are going to use the allowPrerelease field.
*  After doing any development, the app should be builded for dev.
*  The dev build will create a new version number with -beta suffix. 
*  After releasing the builded package, it should be released with the pre-release checkbox.
*  Then the update will be available for beta users. 
*  After deciding to release the package for live users, the package should be builded and released for prod. 
*  For the prod release, the pre-release checkbox should not be checked.
*  Test scenario versions 1.1.2-beta / 1.1.2 / 1.1.3-beta / 1.1.3 / 1.1.4-beta
*  If you download 1.1.2-beta or 1.1.3-beta, you will see the update popup for 1.1.4-beta. After clicking the update button, the app will be updated to 1.1.4-beta.
*  If you download 1.1.2, you will see the update popup for 1.1.3. After clicking the update button, the app will be updated to 1.1.3. Not 1.1.4-beta.
*  Note: After releasing the 1.1.4 live version, the old beta version will not be able to download 1.1.4-beta version anymore. 
*  The beta users will continue to see the update popup after releasing the next beta version. 
*/

const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { autoUpdater } = require("electron-updater");
/*
*  The following 3 lines is required for to read version number.
*  The app creates different version number for beta versions.
*  With this specific version name, it decides to allow pre-releases or not.
*/
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

    /*
    *  The following condition is required to decide if the pre-release tag is available for package or not.
    *  Pre-released packages should be available just for beta users.
    */
    if (dataObj.version.includes("-beta")) {
        autoUpdater.allowPrerelease = true;
    } else {
        autoUpdater.allowPrerelease = false;
    }

    /*
    *  The app should not download the package automatically. We don't want to download live packages for beta users.
    */
    autoUpdater.autoDownload = false;

    /*
    *  This block compares the update version with the current version and decides the action.
    *  With this block, beta users will have beta updates and live users will have live updates.
    *  If we don't add this block, beta users will have live updates and it will not be possible to download beta packages again for them because of the allowPrerelease field. 
    */
    updateInterval = setInterval(() => autoUpdater.checkForUpdatesAndNotify().then((updateCheckResult) => {
        if (updateCheckResult.updateInfo.version !== dataObj.version) {
            if (updateCheckResult.updateInfo.version.includes("-beta") && dataObj.version.includes("-beta")) {
                clearInterval(updateInterval);
                dialog.showMessageBox({
                    type: 'info',
                    title: 'Update available',
                    message: 'A beta update is available. Do you want to update now?',
                    buttons: ['Yes', 'No']
                }).then((result) => {
                    if (result.response === 0) {
                        autoUpdater.downloadUpdate();
                    }
                });
            } else if (!updateCheckResult.updateInfo.version.includes("-beta") && !dataObj.version.includes("-beta")) {
                clearInterval(updateInterval);
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
