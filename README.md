# Station Notes plugin for FM-DX Webserver

This plugin displays a note icon above the current frequency, displaying a popup with information about the selected frequency when clicked.

* [Download the latest zip file](https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Station-Notes/archive/refs/heads/main.zip)
* Transfer `StationNotes` folder, and `StationNotes.js` to FM-DX-Webserver `plugins` folder
* Restart FM-DX Webserver if required
* Login to Adminstrator Panel and enable plugin

## Options

#### Open `StationNotes.json` located in the `plugins_configs` folder with a text editor to add frequency entries.

* Sample frequency entries are provided. Edit as required, leaving only the last entry without a trailing comma (`,`). Basic markdown supported.

#### Open `pluginStationNotes.js` with a text editor to find available options at the beginning of the file.

* `displayMethod`: Select how the information is displayed, using either the FM-DX Webserver's native popup window, or native tooltip.



v1.0.1
------
* Changes to initial popup positioning

v1.0.0
------
* Intitial release
