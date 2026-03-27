/* ============================================================
   LinkVault Chrome Extension — Background Service Worker
   ============================================================
   
   Handles:
   - Extension install event (open config setup if needed)
   ============================================================ */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("LinkVault extension installed");
  }
});
