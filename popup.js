// Constants
const STORAGE_KEYS = {
    startTime: 'startTime',
    duration: 'duration',
    isPaused: 'isPaused',
    remainingTime: 'remainingTime'
};

// State management
const state = {
    countdownTimer: null,
    isPaused: false,
    remainingTime: 0,
    pauseOnEnd: false,
    isInSettings: false
};

// Event listener for when the DOM content is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    loadLocalizedStrings();
    setupQuickTimes();
    setupEventListeners();
    initializeTimerState();
});

// Setup functions
function setupQuickTimes() {
    const defaultSettings = { quickTimes: [10, 20, 30] };
    
    chrome.storage.sync.get(["quickTimes"], (data) => {
        const quickTimes = data.quickTimes || defaultSettings.quickTimes;
        if (!data.quickTimes) {
            chrome.storage.sync.set({ quickTimes });
        }

        updateQuickTimeUI(quickTimes);
    });
}

function updateQuickTimeUI(quickTimes) {
    const quickTimeButtons = document.querySelectorAll(".quick-time");
    quickTimes.forEach((time, index) => {
        quickTimeButtons[index].textContent = `${time} min`;
        quickTimeButtons[index].dataset.time = time;
        document.getElementById(`quickTime${index + 1}`).value = time;
    });
}

function setupEventListeners() {
    // Quick time buttons
    document.querySelectorAll(".quick-time").forEach(button => {
        button.addEventListener("click", () => {
            document.getElementById("timer").value = button.dataset.time;
        });
    });

    // Number key presses
    document.addEventListener("keydown", handleKeyPress);

    // Pause on End button
    document.getElementById("pauseOnEnd").addEventListener("click", handlePauseOnEnd);

    // Start button
    document.getElementById("start").addEventListener("click", startTimer);

    // Pause button
    document.getElementById("pause").addEventListener("click", handlePause);

    // Cancel button
    document.getElementById("cancel").addEventListener("click", handleCancel);

    // Settings button
    document.getElementById("settingsButton").addEventListener("click", handleSettings);

    // Back button (for settings)
    document.getElementById("backButton").addEventListener("click", handleBack);

    // Save Settings button
    document.getElementById("saveSettings").addEventListener("click", handleSaveSettings);

    // Help button
    document.getElementById("helpButton").addEventListener("click", handleHelp);
    document.getElementById("closeHelp").addEventListener("click", closeHelp);

    // Feedback button
    document.getElementById("feedbackButton").addEventListener("click", handleFeedback);
    document.getElementById("closeFeedback").addEventListener("click", closeFeedback);
    document.getElementById("submitFeedback").addEventListener("click", submitFeedback);
}

// Event handlers
function handleKeyPress(event) {
    if (document.getElementById("timer-setup").classList.contains("hidden")) return;
    
    if (event.key === "Enter") startTimer();
    if (document.activeElement.id === "timer") return;

    const timerInput = document.getElementById("timer");
    if (event.key >= "0" && event.key <= "9") {
        timerInput.value += event.key;
    } else if (event.key === "Backspace") {
        timerInput.value = timerInput.value.slice(0, -1);
    }
}

function handlePauseOnEnd() {
    state.pauseOnEnd = true;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: getRemainingVideoTime
        }, (results) => {
            if (results?.[0]?.result) {
                const time = Math.ceil(results[0].result / 60);
                document.getElementById("timer").value = time > 1 ? time - 1 : time;
                startTimer();
            }
        });
    });
}

function handlePause() {
    const action = state.isPaused ? "resumeTimer" : "pauseTimer";
    chrome.runtime.sendMessage({ action }, () => {
        updateTimerState();
    });
}

function handleCancel() {
    // Update UI state immediately
    state.remainingTime = 0;
    state.isPaused = false;
    state.pauseOnEnd = false;
    
    // Show setup elements and update UI
    document.getElementById("settingsButton").classList.remove("hidden");
    document.getElementById("spacer").classList.remove("hidden");
    updateUI();
    
    // Cancel timer in background
    chrome.runtime.sendMessage({ action: "cancelTimer" });
}

function handleSettings() {
    // Set state to indicate we're in settings
    state.isInSettings = true;
    
    // Hide all timer-related elements
    document.getElementById("timer-setup").classList.add("hidden");
    document.getElementById("countdown-container").classList.add("hidden");
    document.getElementById("settingsButton").classList.add("hidden");
    document.getElementById("spacer").classList.add("hidden");
    document.getElementById("header-container").classList.add("hidden");
    
    // Show settings container
    document.getElementById("settings-container").classList.remove("hidden");
}

function handleBack() {
    // Set state to indicate we're not in settings
    state.isInSettings = false;
    
    // Hide settings container
    document.getElementById("settings-container").classList.add("hidden");
    
    // Show timer setup
    document.getElementById("timer-setup").classList.remove("hidden");
    document.getElementById("header-container").classList.remove("hidden");
    
    // Show or hide timer elements based on state
    if (state.remainingTime > 0) {
        document.getElementById("countdown-container").classList.remove("hidden");
        document.getElementById("settingsButton").classList.add("hidden");
        document.getElementById("spacer").classList.add("hidden");
    } else {
        document.getElementById("countdown-container").classList.add("hidden");
        document.getElementById("settingsButton").classList.remove("hidden");
        document.getElementById("spacer").classList.remove("hidden");
    }
}

function handleSaveSettings() {
    const quickTimes = [
        parseInt(document.getElementById("quickTime1").value),
        parseInt(document.getElementById("quickTime2").value),
        parseInt(document.getElementById("quickTime3").value)
    ];
    
    chrome.storage.sync.set({ quickTimes }, () => {
        alert("Settings saved!");
        updateQuickTimeUI(quickTimes);
    });
}

// Timer functions
function startTimer() {
    const time = parseInt(document.getElementById("timer").value);
    if (!isNaN(time) && time > 0) {
        if (time > 600) {
            alert("Please enter a time less than 600 minutes.");
            return;
        }
        
        // Update UI state immediately
        state.remainingTime = time * 60; // Convert minutes to seconds
        state.isPaused = false;
        
        // Hide setup elements and update UI
        document.getElementById("settingsButton").classList.add("hidden");
        document.getElementById("spacer").classList.add("hidden");
        updateUI();
        
        // Start timer in background
        chrome.runtime.sendMessage({ action: "startTimer", time, pauseOnEnd: state.pauseOnEnd });
    }
}

function updateTimerState() {
    chrome.runtime.sendMessage({ action: "getTimerState" }, (response) => {
        state.remainingTime = response.remainingTime;
        state.isPaused = response.isPaused;
        updateUI();
    });
}

function initializeTimerState() {
    updateTimerState();
    // Set up periodic state updates
    setInterval(updateTimerState, 1000);
}

// UI functions
function updateUI() {
    // Don't update UI if we're in settings
    if (state.isInSettings) return;
    
    if (state.remainingTime > 0) {
        updateCountdownDisplay();
        if (!state.isPaused) {
            startCountdown();
        }
        document.getElementById("timer-setup").classList.add("hidden");
        document.getElementById("settingsButton").classList.add("hidden");
        document.getElementById("spacer").classList.add("hidden");
        document.getElementById("countdown-container").classList.remove("hidden");
        document.getElementById("countdown").classList.remove("text-5xl");
        document.getElementById("countdown").classList.add("text-8xl");
        document.getElementById("pause").textContent = state.isPaused ? 
            chrome.i18n.getMessage("resumeButton") : 
            chrome.i18n.getMessage("pauseButton");
    } else {
        document.getElementById("countdown-container").classList.add("hidden");
        document.getElementById("timer-setup").classList.remove("hidden");
        document.getElementById("settingsButton").classList.remove("hidden");
        document.getElementById("spacer").classList.remove("hidden");
    }
}

function startCountdown() {
    clearInterval(state.countdownTimer);
    state.countdownTimer = setInterval(() => {
        if (!state.isPaused) {
            state.remainingTime--;
            if (state.remainingTime <= 0) {
                clearInterval(state.countdownTimer);
                const countdownElement = document.getElementById("countdown");
                countdownElement.classList.remove("text-8xl");
                countdownElement.classList.add("text-5xl");
                countdownElement.textContent = chrome.i18n.getMessage("timeExpiredText");
            }
            updateCountdownDisplay();
        }
    }, 1000);
}

function updateCountdownDisplay() {
    const countdownElement = document.getElementById("countdown");
    if (state.remainingTime <= 0) {
        countdownElement.textContent = chrome.i18n.getMessage("timeExpiredText");
    } else {
        const min = Math.floor(state.remainingTime / 60);
        const hours = Math.floor(min / 60);
        const sec = state.remainingTime % 60;
        const displayMin = hours > 0 ? min % 60 : min;
        
        countdownElement.textContent = hours > 0
            ? `${hours}:${displayMin < 10 ? "0" : ""}${displayMin}:${sec < 10 ? "0" : ""}${sec}`
            : `${min}:${sec < 10 ? "0" : ""}${sec}`;
    }
}

// Helper functions
function getRemainingVideoTime() {
    const video = document.querySelector("video");
    return video ? video.duration - video.currentTime : 0;
}

function loadLocalizedStrings() {
    const elements = {
        appName: "appName",
        timerLabel: "timerLabel",
        quickSelectLabel: "quickSelectLabel",
        pauseOnEndButton: "pauseOnEndButton",
        startButton: "startButton",
        pauseButton: "pauseButton",
        cancelButton: "cancelButton",
        buyMeCoffee: "buyMeCoffee"
    };

    Object.entries(elements).forEach(([id, messageKey]) => {
        document.getElementById(id).textContent = chrome.i18n.getMessage(messageKey);
    });
}

// Help and Feedback functions
function handleHelp() {
    document.getElementById("helpModal").classList.remove("hidden");
}

function closeHelp() {
    document.getElementById("helpModal").classList.add("hidden");
}

function handleFeedback() {
    document.getElementById("feedbackModal").classList.remove("hidden");
}

function closeFeedback() {
    document.getElementById("feedbackModal").classList.add("hidden");
    document.getElementById("feedbackText").value = "";
}

function submitFeedback() {
  const feedback = document.getElementById("feedbackText").value.trim();
  if (feedback) {
      const entryId = "1810568594";
      const formId = "1FAIpQLScPTx-dzdEzOqH3ILQe43Y8XPKe--5yabv0BbCKF2hGBntd8w";
      const feedbackUrl = `https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url&entry.${entryId}=${encodeURIComponent(feedback)}`;
      
      chrome.tabs.create({ url: feedbackUrl });
  }
}
