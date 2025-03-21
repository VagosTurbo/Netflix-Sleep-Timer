// State management
const state = {
    countdownTimer: null,
    remainingTime: 0,
    isPaused: false,
    pauseOnEnd: false
};

// Constants
const STORAGE_KEYS = {
    startTime: 'startTime',
    duration: 'duration',
    isPaused: 'isPaused',
    remainingTime: 'remainingTime'
};

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "startTimer":
            handleStartTimer(message);
            break;
        case "pauseTimer":
            handlePauseTimer();
            break;
        case "resumeTimer":
            handleResumeTimer();
            break;
        case "cancelTimer":
            handleCancelTimer();
            break;
        case "getTimerState":
            handleGetTimerState(sendResponse);
            break;
        case "stopTimer":
            handleStopTimer();
            break;
        default:
            console.log("Unknown message action:", message.action);
    }
    return true; // Keep the message channel open for async responses
});

// Timer functions
function startTimer(time) {
    const startTime = Date.now();
    const duration = time * 60; // Convert minutes to seconds
    state.remainingTime = duration;
    state.isPaused = false;

    chrome.storage.local.set({ 
        [STORAGE_KEYS.startTime]: startTime, 
        [STORAGE_KEYS.duration]: duration, 
        [STORAGE_KEYS.isPaused]: state.isPaused 
    });

    state.countdownTimer = setInterval(() => {
        if (!state.isPaused) {
            state.remainingTime--;
            chrome.storage.local.set({ [STORAGE_KEYS.remainingTime]: state.remainingTime });

            if (state.remainingTime <= 0) {
                clearInterval(state.countdownTimer);
                netflixPause();
            }
        }
    }, 1000);
}

function pauseTimer() {
    state.isPaused = true;
    chrome.storage.local.set({ [STORAGE_KEYS.isPaused]: state.isPaused });
}

function resumeTimer() {
    state.isPaused = false;
    chrome.storage.local.set({ [STORAGE_KEYS.isPaused]: state.isPaused });
}

function cancelTimer() {
    clearInterval(state.countdownTimer);
    state.remainingTime = 0;
    state.isPaused = false;
    state.pauseOnEnd = false;
    chrome.storage.local.remove(Object.values(STORAGE_KEYS));
}

// Video control functions
function pauseVideo() {
    const video = document.querySelector('video');
    if (video) {
        video.pause();
    }
}

function netflixPause() {
    cancelTimer();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: pauseVideo
            });
        }
    });
}

// Message handlers
function handleStartTimer(message) {
    state.pauseOnEnd = message.pauseOnEnd;
    startTimer(message.time);
    
    if (state.pauseOnEnd) {
        notifyContentScript("startEndObserver");
    }
}

function handlePauseTimer() {
    pauseTimer();
}

function handleResumeTimer() {
    resumeTimer();
}

function handleCancelTimer() {
    cancelTimer();
    notifyContentScript("stopEndObserver");
}

function handleGetTimerState(sendResponse) {
    sendResponse({ 
        remainingTime: state.remainingTime, 
        isPaused: state.isPaused 
    });
}

function handleStopTimer() {
    netflixPause();
    notifyContentScript("stopEndObserver");
}

// Helper functions
function notifyContentScript(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { action });
        }
    });
}
