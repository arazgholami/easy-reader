let overlayState = {};

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "easy-reader-options",
        title: "Easy Reader Options",
        contexts: ["action"]
    });
});

// Open options page when context menu is clicked
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "easy-reader-options") {
        chrome.runtime.openOptionsPage();
    }
});

// Handle the extension icon click
chrome.action.onClicked.addListener((tab) => {
    // Send a message to the content script to toggle the overlay
    chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' })
    .catch(error => {
        console.error('Error sending message to content script:', error);
    });
});

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'resetState') {
        overlayState[sender.tab.id] = false;
    }
});
