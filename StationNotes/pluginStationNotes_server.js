/*
    Station Notes v1.0.0 by AAD
    https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Station-Notes

    //// Server-side code ////
*/

'use strict';

const pluginName = "Station Notes";

// Library imports
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// File imports
const config = require('../../config.json');
const { logInfo, logError } = require('../../server/console');

// Define paths
const rootDir = path.dirname(require.main.filename);
const configFolderPath = path.join(rootDir, 'plugins_configs');
const configFilePath = path.join(configFolderPath, 'StationNotes.json');

// Define variables
let extraSocket;
let debounceTimer;
let stationNotes = {};

// Check if StationNotes.json exists
function checkConfigFile() {
    if (!fs.existsSync(configFolderPath)) {
        logInfo(`${pluginName}: Creating plugins_configs folder...`);
        fs.mkdirSync(configFolderPath, { recursive: true });
    }

    if (!fs.existsSync(configFilePath)) {
        logInfo(`${pluginName}: Creating default StationNotes.json...`);
        const defaultNotes = {
            "87.5": "**Bold text**, *italic text*, __underline__, `inline code`.\nNew line here.",
            "87.6": "Some text for 87.6"
        };
        fs.writeFileSync(configFilePath, JSON.stringify(defaultNotes, null, 4));
    }
}

// Load StationNotes.json
function loadStationNotes(isReloaded = false) {
    try {
        const rawData = fs.readFileSync(configFilePath, 'utf8');
        stationNotes = JSON.parse(rawData);
        logInfo(`${pluginName}: ${isReloaded ? 'Reloaded' : 'Loaded'} notes (${Object.keys(stationNotes).length} entries)`);
        sendToClient();
    } catch (err) {
        logError(`${pluginName}: Failed to parse StationNotes.json:`, err.message);
    }
}

// Send station notes to client
function sendToClient() {
    if (extraSocket && extraSocket.readyState === WebSocket.OPEN) {
        extraSocket.send(JSON.stringify({
            type: 'station-notes',
            value: stationNotes
        }));
    }
}

// Watch file changes
function watchFile() {
    let filePreviouslyExisted = fs.existsSync(configFilePath);

    fs.watch(configFolderPath, (eventType, filename) => {
        if (filename !== path.basename(configFilePath)) return;

        const fileNowExists = fs.existsSync(configFilePath);

        if (!filePreviouslyExisted && fileNowExists) {
            logInfo(`${pluginName}: StationNotes.json created`);
            filePreviouslyExisted = true;
            loadStationNotes(true);
            return;
        }

        if (filePreviouslyExisted && !fileNowExists) {
            logInfo(`${pluginName}: StationNotes.json deleted`);
            filePreviouslyExisted = false;
            return;
        }

        if (fileNowExists) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadStationNotes(true);
            }, 500);
        }
    });
}

const webserverPort = config.webserver.webserverPort || 8080;
const externalWsPath = '/data_plugins';
const externalWsUrl = `ws://127.0.0.1:${webserverPort}${externalWsPath}`;

// WebSocket connection to /data_plugins
async function extraWebSocket() {
    if (!extraSocket || extraSocket.readyState === WebSocket.CLOSED) {
        try {
            extraSocket = new WebSocket(`${externalWsUrl}`);

            extraSocket.onopen = () => {
                logInfo(`${pluginName}: Connected to ${externalWsPath}`);
            };

            extraSocket.onerror = (err) => {
                logError(`${pluginName}: WebSocket error:`, err.message);
            };

            extraSocket.onclose = () => {
                logInfo(`${pluginName}: WebSocket closed (${externalWsPath})`);
                setTimeout(extraWebSocket, 8000);
            };

            // Handle incoming messages from client
            extraSocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'station-notes-request') {
                        if (extraSocket.readyState === WebSocket.OPEN) {
                            sendToClient();
                        }
                    }
                } catch (err) {
                    logError(`${pluginName}: Failed to handle message:`, err.message);
                }
            };

        } catch (error) {
            logError(`${pluginName}: Failed to set up WebSocket:`, error.message);
            setTimeout(extraWebSocket, 8000);
        }
    }
}

// Init
checkConfigFile();
loadStationNotes();
extraWebSocket();
watchFile();
