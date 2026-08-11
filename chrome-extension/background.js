// Background Service Worker for LIKOM Helper Extension
// Handles AI generation, status sync, and clean tab creation via chrome.tabs.create

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Open Instagram Tab without Referer (bypasses 429 block)
  if (message.action === 'openTab') {
    const { url, postId, instruction } = message;
    if (postId && instruction && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [`likom_inst_${postId}`]: instruction });
    }
    chrome.tabs.create({ url: url, active: true });
    sendResponse({ success: true });
    return true;
  }

  // 2. AI Comment Generation Proxy
  if (message.action === 'generateComment') {
    const { instruction, caption, targetUsername } = message;

    fetch('http://localhost:3000/api/generate-smart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instruction, caption, targetUsername })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('API server returned status: ' + response.status);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, comment: data.comment });
      })
      .catch(error => {
        console.error('Error fetching smart comment from background:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  // 3. Status Sync Proxy to Local Dashboard
  if (message.action === 'updateStatus') {
    const { postId, isLiked, isCommented } = message;

    fetch('http://localhost:3000/api/status-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ postId, isLiked, isCommented })
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }
});
