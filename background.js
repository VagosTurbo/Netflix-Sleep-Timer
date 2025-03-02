let countdownTimer;
let remainingTime;
let isPaused = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startTimer") {
    startTimer(message.time);
  } else if (message.action === "pauseTimer") {
    pauseTimer();
  } else if (message.action === "resumeTimer") {
    resumeTimer();
  } else if (message.action === "cancelTimer") {
    cancelTimer();
  } else if (message.action === "getTimerState") {
    sendResponse({ remainingTime, isPaused });
  }
});

function startTimer(time) {
  let startTime = Date.now();
  let duration = time * 60; // Convert minutes to seconds
  remainingTime = duration;
  isPaused = false;

  chrome.storage.local.set({ startTime, duration, isPaused });

  countdownTimer = setInterval(() => {
    if (!isPaused) {
      remainingTime--;
      chrome.storage.local.set({ remainingTime });

      if (remainingTime <= 0) {
        clearInterval(countdownTimer);
        chrome.storage.local.remove(['startTime', 'duration', 'isPaused', 'remainingTime']);
        // Pause the video in one second
        netflixPause();
      }
    }
  }, 1000);
}

function pauseTimer() {
  isPaused = true;
  chrome.storage.local.set({ isPaused });
}

function resumeTimer() {
  isPaused = false;
  chrome.storage.local.set({ isPaused });
}

function cancelTimer() {
  clearInterval(countdownTimer);
  remainingTime = 0;
  isPaused = false;
  chrome.storage.local.remove(['startTime', 'duration', 'isPaused', 'remainingTime']);
}

function pauseVideo() {
  let video = document.querySelector('video');
  if (video) {
    video.pause();
  }
}

function netflixPause(){
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: pauseVideo
      });
    }
  });
}