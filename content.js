// Constants
const OBSERVER_CONFIG = {
    childList: true,
    subtree: true,
    attributes: true
};

// State management
const state = {
    nextEpisodeObserver: null
};

// DOM Selectors
const selectors = {
    watchCreditsButton: "button[data-uia='watch-credits-seamless-button']"
};

// Functions
function handleEpisodeEnd() {
    const watchCreditsButton = document.querySelector(selectors.watchCreditsButton);
    if (watchCreditsButton) {
        watchCreditsButton.click();
        
        // Wait for 1 second before stopping timer
        setTimeout(() => {
            chrome.runtime.sendMessage({ action: "stopTimer" });
        }, 1000);
    }
}

function startEpisodeObserver() {
    if (!state.nextEpisodeObserver) {
        state.nextEpisodeObserver = new MutationObserver(handleEpisodeEnd);
        state.nextEpisodeObserver.observe(document.body, OBSERVER_CONFIG);
        console.log("Started observing for end of episode");
    }
}

function stopEpisodeObserver() {
    if (state.nextEpisodeObserver) {
        state.nextEpisodeObserver.disconnect();
        state.nextEpisodeObserver = null;
        console.log("Ended observing for end of episode");
    }
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "startEndObserver":
            startEpisodeObserver();
            break;
        case "stopEndObserver":
            stopEpisodeObserver();
            break;
        default:
            console.log("Unknown message action:", message.action);
    }
});




