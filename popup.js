let countdownTimer;
let isPaused = false;
let remainingTime;

document.addEventListener("DOMContentLoaded", () => {
  loadLocalizedStrings();

  // Default settings
  const defaultSettings = {
    quickTimes: [10, 20, 30]
  };

  // Load settings
  chrome.storage.sync.get(["quickTimes"], (data) => {
    if (!data.quickTimes) {
      chrome.storage.sync.set({ quickTimes: defaultSettings.quickTimes });
      data.quickTimes = defaultSettings.quickTimes;
    }

    const quickTimeButtons = document.querySelectorAll(".quick-time");
    quickTimeButtons[0].textContent = `${data.quickTimes[0]} min`;
    quickTimeButtons[0].dataset.time = data.quickTimes[0];
    quickTimeButtons[1].textContent = `${data.quickTimes[1]} min`;
    quickTimeButtons[1].dataset.time = data.quickTimes[1];
    quickTimeButtons[2].textContent = `${data.quickTimes[2]} min`;
    quickTimeButtons[2].dataset.time = data.quickTimes[2];

    document.getElementById("quickTime1").value = data.quickTimes[0];
    document.getElementById("quickTime2").value = data.quickTimes[1];
    document.getElementById("quickTime3").value = data.quickTimes[2];
  });

  document.querySelectorAll(".quick-time").forEach(button => {
    button.addEventListener("click", () => {
      document.getElementById("timer").value = button.dataset.time;
    });
  });

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

  document.getElementById("start").addEventListener("click", () => {
    let time = parseInt(document.getElementById("timer").value);
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

  document.getElementById("cancel").addEventListener("click", () => {
    document.getElementById("settingsButton").classList.remove("hidden");
    document.getElementById("spacer").classList.remove("hidden");
    chrome.runtime.sendMessage({ action: "cancelTimer" }, () => {
      remainingTime = 0;
      isPaused = false;
      updateUI();
    });
  });

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

  document.getElementById("backButton").addEventListener("click", () => {
    document.getElementById("settings-container").classList.add("hidden");
    document.getElementById("timer-setup").classList.remove("hidden");
    document.getElementById("header-container").classList.remove("hidden");
  });

  document.getElementById("saveSettings").addEventListener("click", () => {
    const quickTimes = [
      parseInt(document.getElementById("quickTime1").value),
      parseInt(document.getElementById("quickTime2").value),
      parseInt(document.getElementById("quickTime3").value)
    ];

    chrome.storage.sync.set({ quickTimes }, () => {
      alert("Settings saved!");
      // Update quick-time buttons
      const quickTimeButtons = document.querySelectorAll(".quick-time");
      quickTimeButtons[0].textContent = `${quickTimes[0]} min`;
      quickTimeButtons[0].dataset.time = quickTimes[0];
      quickTimeButtons[1].textContent = `${quickTimes[1]} min`;
      quickTimeButtons[1].dataset.time = quickTimes[1];
      quickTimeButtons[2].textContent = `${quickTimes[2]} min`;
      quickTimeButtons[2].dataset.time = quickTimes[2];
    });
  });

  chrome.runtime.sendMessage({ action: "getTimerState" }, (response) => {
    remainingTime = response.remainingTime;
    isPaused = response.isPaused;
    updateUI();
  });

  function updateUI() {
    if (remainingTime > 0) {
      updateCountdownDisplay();
      if (!isPaused) {
        startCountdown();
      }
      document.getElementById("timer-setup").classList.add("hidden");
      document.getElementById("countdown-container").classList.remove("hidden");
      document.getElementById("pause").textContent = isPaused ? chrome.i18n.getMessage("resumeButton") : chrome.i18n.getMessage("pauseButton");
    } else {
      document.getElementById("countdown-container").classList.add("hidden");
      document.getElementById("timer-setup").classList.remove("hidden");
      document.getElementById("settingsButton").classList.remove("hidden");
      document.getElementById("spacer").classList.remove("hidden");
    }
  }

  function startCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      if (!isPaused) {
        remainingTime--;
        if (remainingTime <= 0) {
          clearInterval(countdownTimer);
          document.getElementById("countdown").textContent = chrome.i18n.getMessage("timeExpiredText");
        }
        updateCountdownDisplay();
      }
    }, 1000);
  }

  function updateCountdownDisplay() {
    let countdownElement = document.getElementById("countdown");
    if (remainingTime <= 0) {
      countdownElement.textContent = chrome.i18n.getMessage("timeExpiredText");
    } else {
      let min = Math.floor(remainingTime / 60);
      let sec = remainingTime % 60;
      countdownElement.textContent = `${chrome.i18n.getMessage("countdownText")} ${min}:${sec < 10 ? "0" : ""}${sec}`;
    }
  }

  function getRemainingVideoTime() {
    let video = document.querySelector("video");
    return video ? video.duration - video.currentTime : 0;
  }

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