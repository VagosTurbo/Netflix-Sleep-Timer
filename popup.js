// Declare variables for the countdown timer, pause state, and remaining time
let countdownTimer;
let isPaused = false;
let remainingTime;

// Event listener for when the DOM content is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Load localized strings for UI elements
  loadLocalizedStrings();

  // Default settings for quick times
  const defaultSettings = {
    quickTimes: [10, 20, 30]
  };

  // Load settings from Chrome storage
  chrome.storage.sync.get(["quickTimes"], (data) => {
    // If quickTimes are not set, use default settings
    if (!data.quickTimes) {
      chrome.storage.sync.set({ quickTimes: defaultSettings.quickTimes });
      data.quickTimes = defaultSettings.quickTimes;
    }

    // Update quick time buttons with loaded settings
    const quickTimeButtons = document.querySelectorAll(".quick-time");
    quickTimeButtons[0].textContent = `${data.quickTimes[0]} min`;
    quickTimeButtons[0].dataset.time = data.quickTimes[0];
    quickTimeButtons[1].textContent = `${data.quickTimes[1]} min`;
    quickTimeButtons[1].dataset.time = data.quickTimes[1];
    quickTimeButtons[2].textContent = `${data.quickTimes[2]} min`;
    quickTimeButtons[2].dataset.time = data.quickTimes[2];

    // Update quick time input fields with loaded settings
    document.getElementById("quickTime1").value = data.quickTimes[0];
    document.getElementById("quickTime2").value = data.quickTimes[1];
    document.getElementById("quickTime3").value = data.quickTimes[2];
  });

  // Add event listeners to quick time buttons
  document.querySelectorAll(".quick-time").forEach(button => {
    button.addEventListener("click", () => {
      document.getElementById("timer").value = button.dataset.time;
    });
  });

  // Event listener for the "Pause on End" button
  document.getElementById("pauseOnEnd").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: getRemainingVideoTime
      }, (results) => {
        if (results && results[0] && results[0].result) {
          let time = Math.ceil(results[0].result / 60);

          if(time > 1) {
            document.getElementById("timer").value = time - 1;
          } else {
            document.getElementById("timer").value = time;
          }
        }
      });
    });
  });

  // Event listener for the "Start" button
  document.getElementById("start").addEventListener("click", () => {
    let time = parseInt(document.getElementById("timer").value);
    time = 0.1;
    if (!isNaN(time) && time > 0) {
      document.getElementById("settingsButton").classList.add("hidden");
      document.getElementById("spacer").classList.add("hidden");
      chrome.runtime.sendMessage({ action: "startTimer", time }, () => {
        chrome.runtime.sendMessage({ action: "getTimerState" }, (response) => {
          remainingTime = response.remainingTime;
          isPaused = response.isPaused;
          updateUI();
        });
      });
    }
  });

  // Event listener for the "Pause" button
  document.getElementById("pause").addEventListener("click", () => {
    if (isPaused) {
      chrome.runtime.sendMessage({ action: "resumeTimer" }, () => {
        chrome.runtime.sendMessage({ action: "getTimerState" }, (response) => {
          remainingTime = response.remainingTime;
          isPaused = response.isPaused;
          updateUI();
        });
      });
    } else {
      chrome.runtime.sendMessage({ action: "pauseTimer" }, () => {
        chrome.runtime.sendMessage({ action: "getTimerState" }, (response) => {
          remainingTime = response.remainingTime;
          isPaused = response.isPaused;
          updateUI();
        });
      });
    }
  });

  // Event listener for the "Cancel" button
  document.getElementById("cancel").addEventListener("click", () => {
    document.getElementById("settingsButton").classList.remove("hidden");
    document.getElementById("spacer").classList.remove("hidden");
    chrome.runtime.sendMessage({ action: "cancelTimer" }, () => {
      remainingTime = 0;
      isPaused = false;
      updateUI();
    });
  });

  // Event listener for the "Settings" button
  document.getElementById("settingsButton").addEventListener("click", () => {
    document.getElementById("timer-setup").classList.add("hidden");
    document.getElementById("countdown-container").classList.add("hidden");
    document.getElementById("settings-container").classList.remove("hidden");
    document.getElementById("header-container").classList.add("hidden");

    // Load settings into the settings page
    chrome.storage.sync.get(["quickTimes"], (data) => {
      if (data.quickTimes) {
        document.getElementById("quickTime1").value = data.quickTimes[0];
        document.getElementById("quickTime2").value = data.quickTimes[1];
        document.getElementById("quickTime3").value = data.quickTimes[2];
      }
    });
  });

  // Event listener for the "Back" button in the settings page
  document.getElementById("backButton").addEventListener("click", () => {
    document.getElementById("settings-container").classList.add("hidden");
    document.getElementById("timer-setup").classList.remove("hidden");
    document.getElementById("header-container").classList.remove("hidden");
  });

  // Event listener for the "Save Settings" button
  document.getElementById("saveSettings").addEventListener("click", () => {
    const quickTimes = [
      parseInt(document.getElementById("quickTime1").value),
      parseInt(document.getElementById("quickTime2").value),
      parseInt(document.getElementById("quickTime3").value)
    ];

    chrome.storage.sync.set({ quickTimes }, () => {
      alert("Settings saved!");
      // Update quick-time buttons with new settings
      const quickTimeButtons = document.querySelectorAll(".quick-time");
      quickTimeButtons[0].textContent = `${quickTimes[0]} min`;
      quickTimeButtons[0].dataset.time = quickTimes[0];
      quickTimeButtons[1].textContent = `${quickTimes[1]} min`;
      quickTimeButtons[1].dataset.time = quickTimes[1];
      quickTimeButtons[2].textContent = `${quickTimes[2]} min`;
      quickTimeButtons[2].dataset.time = quickTimes[2];
    });
  });

  // Get the current timer state from the background script
  chrome.runtime.sendMessage({ action: "getTimerState" }, (response) => {
    remainingTime = response.remainingTime;
    isPaused = response.isPaused;
    updateUI();
  });

  // Function to update the UI based on the timer state
  function updateUI() {
    if (remainingTime > 0) {
      updateCountdownDisplay();
      if (!isPaused) {
        startCountdown();
      }
      document.getElementById("timer-setup").classList.add("hidden");
      document.getElementById("settingsButton").classList.add("hidden");
      document.getElementById("spacer").classList.add("hidden");
      document.getElementById("countdown-container").classList.remove("hidden");
      document.getElementById("countdown").classList.remove("text-5xl");
      document.getElementById("countdown").classList.add("text-8xl");
      document.getElementById("pause").textContent = isPaused ? chrome.i18n.getMessage("resumeButton") : chrome.i18n.getMessage("pauseButton");
    } else {
      document.getElementById("countdown-container").classList.add("hidden");
      document.getElementById("timer-setup").classList.remove("hidden");
      document.getElementById("settingsButton").classList.remove("hidden");
      document.getElementById("spacer").classList.remove("hidden");
    }
  }

  // Function to start the countdown timer
  function startCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      if (!isPaused) {
        remainingTime--;
        if (remainingTime <= 0) {
          clearInterval(countdownTimer);
          let countdownElement = document.getElementById("countdown");
          countdownElement.classList.remove("text-8xl");
          countdownElement.classList.add("text-5xl");
          countdownElement.textContent = chrome.i18n.getMessage("timeExpiredText");
        }
        updateCountdownDisplay();
      }
    }, 1000);
  }

  // Function to update the countdown display
  function updateCountdownDisplay() {
    let countdownElement = document.getElementById("countdown");
    if (remainingTime <= 0) {
      countdownElement.textContent = chrome.i18n.getMessage("timeExpiredText");
    } else {
      let min = Math.floor(remainingTime / 60);
      let hours = Math.floor(min / 60);
      let sec = remainingTime % 60;
      if (hours > 0) {
        min = min % 60;
        countdownElement.textContent = `${hours}:${min < 10 ? "0" : ""}${min}:${sec < 10 ? "0" : ""}${sec}`;
      } else {
        countdownElement.textContent = `${min}:${sec < 10 ? "0" : ""}${sec}`;
      }
    }
  }

  // Function to get the remaining video time on the current tab
  function getRemainingVideoTime() {
    let video = document.querySelector("video");
    return video ? video.duration - video.currentTime : 0;
  }

  // Function to load localized strings for UI elements
  function loadLocalizedStrings() {
    document.getElementById("appName").textContent = chrome.i18n.getMessage("appName");
    document.getElementById("timerLabel").textContent = chrome.i18n.getMessage("timerLabel");
    document.getElementById("quickSelectLabel").textContent = chrome.i18n.getMessage("quickSelectLabel");
    document.getElementById("pauseOnEndButton").textContent = chrome.i18n.getMessage("pauseOnEndButton");
    document.getElementById("startButton").textContent = chrome.i18n.getMessage("startButton");
    document.getElementById("pauseButton").textContent = chrome.i18n.getMessage("pauseButton");
    document.getElementById("cancelButton").textContent = chrome.i18n.getMessage("cancelButton");
    document.getElementById("buyMeCoffee").textContent = chrome.i18n.getMessage("buyMeCoffee");
  }
});