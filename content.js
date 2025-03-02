
// Listen for messages from the background script to pause the video
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "pause") {
    let video = document.querySelector('video');
    if (video) {
      video.pause();
    }
  }
});


  function addNetflixTimerButton() {
    const controls = document.querySelector(".player-controls-wrapper");
  
    if (controls && !document.querySelector("#netflix-timer-btn")) {
      const button = document.createElement("button");
      button.id = "netflix-timer-btn";
      button.innerText = "Set Timer";
      button.style.padding = "8px";
      button.style.marginLeft = "10px";
      button.style.borderRadius = "5px";
      button.style.background = "red";
      button.style.color = "white";
      button.style.border = "none";
      button.style.cursor = "pointer";
      
      button.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "openPopup" });
      });
      console.log("Netflix Timer button added!");
      controls.appendChild(button);
    }
  }
  
  // Continuously check if Netflix UI is loaded
  const observer = new MutationObserver(() => {
    addNetflixTimerButton();
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  