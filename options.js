document.addEventListener('DOMContentLoaded', () => {
    const instantModeSwitch = document.getElementById('instant-mode');
    const fullscreenModeSwitch = document.getElementById('fullscreen-mode');

    // Load the saved settings
    chrome.storage.sync.get(['instantMode', 'fullscreenMode'], (data) => {
        instantModeSwitch.checked = !!data.instantMode;
        fullscreenModeSwitch.checked = !!data.fullscreenMode;
    });

    // Save settings when changed
    instantModeSwitch.addEventListener('change', () => {
        chrome.storage.sync.set({ instantMode: instantModeSwitch.checked });
    });

    fullscreenModeSwitch.addEventListener('change', () => {
        chrome.storage.sync.set({ fullscreenMode: fullscreenModeSwitch.checked });
    });
});
