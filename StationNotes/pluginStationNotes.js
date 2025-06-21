/*
    Station Notes v1.0.0 by AAD
    https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Station-Notes
*/

'use strict';

(() => {

    const displayMethod = 'popup' // 'tooltip', 'popup', 'tooltip-popup'

    const pluginName = "Station Notes";
    const pluginVersion = '1.0.0';
    const pluginHomepageUrl = "https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Station-Notes";
    const pluginUpdateUrl = "https://raw.githubusercontent.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Station-Notes/refs/heads/main/StationNotes/pluginStationNotes.js";
    const pluginSetupOnlyNotify = true;
    const CHECK_FOR_UPDATES = true;

    document.addEventListener('DOMContentLoaded', () => {
        let noteIcon = 'fa-note-sticky';
        let noteIconOffset = -10;
        let debug = false;
        let tooltipMap = {};
        let dataFreq, freq, stationTooltipHTML;

        const currentURL = new URL(window.location.href);
        const WebserverURL = currentURL.hostname;
        const WebserverPath = currentURL.pathname.replace(/setup/g, '');
        const WebserverPORT = currentURL.port || (currentURL.protocol === 'https:' ? '443' : '80');
        const protocol = currentURL.protocol === 'https:' ? 'wss:' : 'ws:';
        const WEBSOCKET_URL = `${protocol}//${WebserverURL}:${WebserverPORT}${WebserverPath}data_plugins`;

        const pluginSocket = new WebSocket(WEBSOCKET_URL);

        pluginSocket.addEventListener('open', () => {
            // Request station notes on connection open
            pluginSocket.send(JSON.stringify({
                type: 'station-notes-request'
            }));
        });

        pluginSocket.addEventListener('message', (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'station-notes' && typeof message.value === 'object') {
                    // Reset tooltipMap and update with new data
                    tooltipMap = {};
                    Object.assign(tooltipMap, message.value);
                    console.log(`[${pluginName}] tooltipMap updated with ${Object.keys(tooltipMap).length} entries`);
                    updateTooltip(freq);
                }
            } catch (err) {
                console.error(`[${pluginName}] Failed to parse message:`, err);
            }
        });

        function updateTooltip(freq) {
            const freqHeading = document.querySelector('.wrapper-outer #wrapper #freq-container h2');
            if (!freqHeading) return;

            let rawTooltip = tooltipMap[freq];

            if (rawTooltip === undefined && typeof freq === 'number') {
                const freqStr = freq.toString();
                const freqFixed1 = freq.toFixed(1);
                const freqFixed2 = freq.toFixed(2);
                const freqFixed3 = freq.toFixed(3);

                rawTooltip = tooltipMap[freqStr] ?? tooltipMap[freqFixed1] ?? tooltipMap[freqFixed2] ?? tooltipMap[freqFixed3];
            }

            // Remove existing tooltip
            $('.tooltip-wrapper').fadeOut(300, function () {
                $(this).remove();
            });

            // Remove existing icon
            const oldIcon = freqHeading.querySelector('.' + noteIcon);
            if (oldIcon) oldIcon.remove();

            if (!rawTooltip) return;

            // Convert markdown to HTML
            stationTooltipHTML = simpleMarkdownToHtml(rawTooltip);

            // Rebuild icon
            const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
            const windowInnerHeight = window.innerHeight;
            const icon = document.createElement('i');
            icon.classList.add('fa-solid', noteIcon);

            icon.setAttribute('data-tooltip', stationTooltipHTML);

            icon.id = 'station-notes-plugin';
            icon.style.position = 'absolute';
            icon.style.width = windowInnerHeight > 720 ? '32px' : '24px';
            icon.style.top = '50%';
            icon.style.transform = isFirefox && windowInnerHeight < 720 ? `translateY(${-52 + noteIconOffset}%)` : isFirefox ? `translateY(${-42 + noteIconOffset}%)` : `translateY(${-40 + noteIconOffset}%)`;
            icon.style.fontSize = windowInnerHeight > 720 ? '18px' : '14px';
            icon.style.visibility = 'visible';
            icon.style.opacity = '0.5';
            icon.style.transition = 'opacity 0.3s';
            icon.style.filter = 'brightness(1)';
            icon.style.padding = '8px';

            const freqContainer = document.querySelector('.wrapper-outer #wrapper #freq-container');
            if (freqContainer) {
              freqContainer.addEventListener('mouseenter', () => {
                icon.style.opacity = '1';
                icon.style.filter = 'brightness(1.1)';
              });
              freqContainer.addEventListener('mouseleave', () => {
                icon.style.opacity = '0.5';
                icon.style.filter = 'brightness(1)';
              });

              if (freqContainer.matches(':hover')) {
                icon.style.opacity = '1';
                icon.style.filter = 'brightness(1.1)';
              }
            }

            icon.addEventListener('mouseenter', () => {
              icon.style.opacity = '1';
              icon.style.filter = 'brightness(1.5)';
            });

            icon.addEventListener('mouseleave', () => {
              icon.style.opacity = '1';
              icon.style.filter = 'brightness(1.1)';
            });

            freqHeading.style.position = 'relative';
            freqHeading.appendChild(icon);

            if (displayMethod === 'tooltip' || displayMethod === 'tooltip-popup') if (typeof initTooltips === 'function') initTooltips(icon);
        }

        function simpleMarkdownToHtml(text) {
            if (!text) return '';

            return text
                // Bold **text**
                .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
                // Italic *text*
                .replace(/\*(.+?)\*/g, '<i>$1</i>')
                // Underline __text__
                .replace(/__(.+?)__/g, '<u>$1</u>')
                // Inline code `code`
                .replace(/`(.+?)`/g, '<code>$1</code>')
                // New lines \n or \r\n to <br>
                .replace(/\r?\n/g, '<br>');
        }

        // Popup using togglePopup from modal.js
        function popupMethod(selector, title, contentHtml) {
            const $popup = $(selector);
            const $header = $popup.find(".popup-header");
            const $title = $header.find("p.color-4");
            if ($title.length && !$title.hasClass("popup-title")) $title.addClass("popup-title");
            $popup.find(".popup-title").text(title);
            $popup.find(".popup-content").html(contentHtml);
            togglePopup(selector);
        }

        // Open popup on click
        document.addEventListener('click', function (event) {
            const popupId = "#popup-panel-mobile-settings";
            const icon = document.getElementById('station-notes-plugin');
            const popup = document.querySelector(popupId);
            const textInput = document.getElementById('commandinput');

            if (icon && event.target === icon) {
                // Unfocus input
                requestAnimationFrame(() => {
                    if (document.activeElement === textInput) textInput.blur();
                });

                const popupVisible = popup && popup.style.display !== 'none' && popup.offsetParent !== null;
                const newTitle = `Notes for ${freq} MHz`;
                const newContent = `<p style="text-align: center;">${stationTooltipHTML}</p>`;
                if (popupVisible) {
                    const titleEl = popup.querySelector('.popup-header .color-4');
                    const contentEl = popup.querySelector('.popup-content');
                    if (titleEl) titleEl.textContent = newTitle;
                    if (contentEl) contentEl.innerHTML = newContent;

                    event.stopPropagation();
                    event.preventDefault();
                    return;
                }

                if (displayMethod === 'popup' || displayMethod === 'tooltip-popup') popupMethod(popupId, newTitle, newContent);

                event.stopPropagation();
                event.preventDefault();
            }
        });

        function getFreq() {
            const targetNode = document.getElementById('data-frequency');
            const config = {
                childList: true,
                subtree: true
            };

            const observerCallback = (mutationsList) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList' || mutation.type === 'subtree') {
                        if (data.freq || targetNode.textContent) {
                            dataFreq = Number(data.freq) || Number(targetNode.textContent);
                            if (freq !== 0 && freq !== dataFreq) {
                                freq = dataFreq;
                                if (debug) console.log(`[${pluginName}] Frequency changed:`, freq);

                                setTimeout(() => { // Might execute too quickly without a delay
                                    updateTooltip(freq);
                                }, 100);

                                return;
                            }
                            freq = dataFreq;
                        }
                    }
                }
            };

            const observer = new MutationObserver(observerCallback);
            if (window.location.pathname !== '/setup') observer.observe(targetNode, config);
        }

        function drawIcon() {
            const freqHeading = document.querySelector('.wrapper-outer #wrapper #freq-container h2');

            if (freqHeading) {
                freqHeading.style.position = 'relative';

                if (freqHeading.querySelector('.' + noteIcon)) return;

                const infoIcon = document.createElement('i');
                infoIcon.classList.add('fa-solid', noteIcon, 'tooltip');
                infoIcon.style.position = 'absolute';
                infoIcon.style.width = '36px';
                infoIcon.style.top = '50%';
                infoIcon.style.transform = 'translateY(-48%)';
                infoIcon.style.fontSize = '20px';
                infoIcon.style.visibility = 'hidden';

                freqHeading.appendChild(infoIcon);
            }
        }

        getFreq();
        drawIcon();
    });

    // Function for update notification in /setup
    function checkUpdate(setupOnly, pluginName, urlUpdateLink, urlFetchLink) {
        if (setupOnly && window.location.pathname !== '/setup') return;

        let pluginVersionCheck = typeof pluginVersion !== 'undefined' ? pluginVersion : typeof plugin_version !== 'undefined' ? plugin_version : typeof PLUGIN_VERSION !== 'undefined' ? PLUGIN_VERSION : 'Unknown';

        // Function to check for updates
        async function fetchFirstLine() {
            const urlCheckForUpdate = urlFetchLink;

            try {
                const response = await fetch(urlCheckForUpdate);
                if (!response.ok) {
                    throw new Error(`[${pluginName}] update check HTTP error! status: ${response.status}`);
                }

                const text = await response.text();
                const lines = text.split('\n');

                let version;

                if (lines.length > 2) {
                    const versionLine = lines.find(line => line.includes("const pluginVersion =") || line.includes("const plugin_version =") || line.includes("const PLUGIN_VERSION ="));
                    if (versionLine) {
                        const match = versionLine.match(/const\s+(?:pluginVersion|plugin_version|PLUGIN_VERSION)\s*=\s*['"]([^'"]+)['"]/);
                        if (match) {
                            version = match[1];
                        }
                    }
                }

                if (!version) {
                    const firstLine = lines[0].trim();
                    version = /^\d/.test(firstLine) ? firstLine : "Unknown"; // Check if first character is a number
                }

                return version;
            } catch (error) {
                console.error(`[${pluginName}] error fetching file:`, error);
                return null;
            }
        }

        // Check for updates
        fetchFirstLine().then(newVersion => {
            if (newVersion) {
                if (newVersion !== pluginVersionCheck) {
                    let updateConsoleText = "There is a new version of this plugin available";
                    // Any custom code here
                    
                    console.log(`[${pluginName}] ${updateConsoleText}`);
                    setupNotify(pluginVersionCheck, newVersion, pluginName, urlUpdateLink);
                }
            }
        });

        function setupNotify(pluginVersionCheck, newVersion, pluginName, urlUpdateLink) {
            if (window.location.pathname === '/setup') {
              const pluginSettings = document.getElementById('plugin-settings');
              if (pluginSettings) {
                const currentText = pluginSettings.textContent.trim();
                const newText = `<a href="${urlUpdateLink}" target="_blank">[${pluginName}] Update available: ${pluginVersionCheck} --> ${newVersion}</a><br>`;

                if (currentText === 'No plugin settings are available.') {
                  pluginSettings.innerHTML = newText;
                } else {
                  pluginSettings.innerHTML += ' ' + newText;
                }
              }

              const updateIcon = document.querySelector('.wrapper-outer #navigation .sidenav-content .fa-puzzle-piece') || document.querySelector('.wrapper-outer .sidenav-content') || document.querySelector('.sidenav-content');

              const redDot = document.createElement('span');
              redDot.style.display = 'block';
              redDot.style.width = '12px';
              redDot.style.height = '12px';
              redDot.style.borderRadius = '50%';
              redDot.style.backgroundColor = '#FE0830' || 'var(--color-main-bright)'; // Theme colour set here as placeholder only
              redDot.style.marginLeft = '82px';
              redDot.style.marginTop = '-12px';

              updateIcon.appendChild(redDot);
            }
        }
    }

    if (CHECK_FOR_UPDATES) checkUpdate(pluginSetupOnlyNotify, pluginName, pluginHomepageUrl, pluginUpdateUrl);

})();
