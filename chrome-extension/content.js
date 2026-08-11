// Content Script for LIKOM Helper Extension
// Runs on instagram.com AND http://localhost:3000/*

(function() {
  // 1. Dashboard Integration Mode (runs on http://localhost:3000)
  if (window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1')) {
    console.log('[LIKOM HELPER] Extension Content Script attached to LIKOM Dashboard.');

    // Continuously inform Dashboard UI that extension is active & ready
    setInterval(() => {
      window.postMessage({ type: 'LIKOM_EXTENSION_READY' }, '*');
    }, 800);

    // Listen for tab open & instruction store requests from Dashboard UI
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'LIKOM_OPEN_TAB') {
        const { url, postId, instruction } = event.data;
        console.log(`[LIKOM HELPER] Opening tab via Extension for post ${postId}...`);
        chrome.runtime.sendMessage({
          action: 'openTab',
          url,
          postId,
          instruction
        });
      }
    });

    return;
  }

  // 2. Instagram Page Automation & Tracking (runs on instagram.com)
  console.log('[LIKOM HELPER] Content script active on Instagram.');

  // Extract post ID from URL (e.g. /reel/DbvXESRceS/ -> "DbvXESRceS")
  function getPostId() {
    const match = window.location.pathname.match(/\/(?:p|reel)\/([a-zA-Z0-9_\-]+)/);
    return match ? match[1] : null;
  }

  const postId = getPostId();

  // Status tracking state
  let currentLikedState = false;
  let currentCommentedState = false;

  function syncStatus(isLiked, isCommented) {
    if (!postId) return;
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      postId: postId,
      isLiked: isLiked,
      isCommented: isCommented
    }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res && res.success) {
        console.log(`[LIKOM HELPER] Status synced -> Liked: ${isLiked}, Commented: ${isCommented}`);
      }
    });
  }

  // Check if post is currently Liked by inspecting Instagram's heart icon SVG
  function checkIsLiked() {
    const redHearts = document.querySelectorAll(
      'svg[aria-label="Unlike"], svg[aria-label="Batal Suka"], svg[color="rgb(255, 48, 64)"], svg[color="rgb(237, 73, 86)"], svg[fill="#ff3040"]'
    );
    return redHearts.length > 0;
  }

  // Auto-like post when opened if not liked yet
  function autoLikeIfNeeded() {
    if (checkIsLiked()) {
      currentLikedState = true;
      return;
    }

    const unlikedSvgs = document.querySelectorAll(
      'div[role="button"] svg[aria-label="Like"], div[role="button"] svg[aria-label="Suka"]'
    );
    for (const svg of unlikedSvgs) {
      const btn = svg.closest('div[role="button"]');
      if (btn) {
        console.log('[LIKOM HELPER] Auto-liking post...');
        btn.click();
        currentLikedState = true;
        syncStatus(true, currentCommentedState);
        break;
      }
    }
  }

  // Check if user has commented or has posted a comment
  function checkIsCommented() {
    const myHandle = 'mzaa_offc';

    // Scan all links in comment list for user profile links
    const allLinks = document.querySelectorAll('a[role="link"], a');
    for (const a of allLinks) {
      const text = a.textContent.trim().toLowerCase();
      const href = (a.getAttribute('href') || '').toLowerCase();
      
      if (text === myHandle || href.includes('/' + myHandle)) {
        const isCommentItem = a.closest('ul, li, div._a9zs, span, div[role="button"]');
        if (isCommentItem && !a.closest('header') && !a.closest('nav')) {
          return true;
        }
      }
    }

    return currentCommentedState;
  }

  // Monitor DOM for Like button clicks and Comment button clicks
  function monitorLikeAndComment() {
    if (!postId) return;

    const isLiked = checkIsLiked();
    const isCommented = checkIsCommented();

    if (isLiked !== currentLikedState || isCommented !== currentCommentedState) {
      currentLikedState = isLiked;
      currentCommentedState = isCommented;
      syncStatus(currentLikedState, currentCommentedState);
    }

    // Attach click listeners to all Like buttons on page
    const likeButtons = document.querySelectorAll('div[role="button"] svg[aria-label="Like"], div[role="button"] svg[aria-label="Suka"], div[role="button"] svg[aria-label="Unlike"], div[role="button"] svg[aria-label="Batal Suka"]');
    likeButtons.forEach(svg => {
      const btn = svg.closest('div[role="button"]');
      if (btn && !btn.dataset.likomBound) {
        btn.dataset.likomBound = 'true';
        btn.addEventListener('click', () => {
          setTimeout(() => {
            currentLikedState = checkIsLiked();
            syncStatus(currentLikedState, currentCommentedState);
          }, 300);
        });
      }
    });

    // Attach click listeners to Post / Kirim buttons
    const postButtons = document.querySelectorAll('div[role="button"]');
    postButtons.forEach(btn => {
      const text = btn.textContent.trim().toLowerCase();
      if ((text === 'post' || text === 'kirim' || text === 'bagikan') && !btn.dataset.likomBound) {
        btn.dataset.likomBound = 'true';
        btn.addEventListener('click', () => {
          console.log('[LIKOM HELPER] User clicked Post button! Syncing isCommented = true...');
          currentCommentedState = true;
          syncStatus(currentLikedState, true);
        });
      }
    });
  }

  setInterval(monitorLikeAndComment, 1000);

  if (!postId) return;

  // Retrieve instruction from Chrome local storage OR query string fallback
  const urlParams = new URLSearchParams(window.location.search);
  const queryInstruction = urlParams.get('likom_instruction');

  const getStorage = (cb) => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([`likom_inst_${postId}`], (result) => {
        cb(result ? result[`likom_inst_${postId}`] : null);
      });
    } else {
      cb(null);
    }
  };

  getStorage((storedInstruction) => {
    const instruction = storedInstruction || queryInstruction;

    if (!instruction) {
      console.log('[LIKOM HELPER] No instruction found for this post. Running in passive sync mode.');
      return;
    }

    console.log(`[LIKOM HELPER] Active instruction retrieved for post ${postId}: "${instruction}". Executing...`);

    // Auto-like
    setTimeout(autoLikeIfNeeded, 1200);

    const captionSelectors = [
      'article h1 span',
      'h1 span',
      'span._ap3a._aaco._aacw._aacx._aad7._aade',
      'div._a9zs span',
      'span[dir="auto"]'
    ];

    const inputSelectors = [
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="comment" i]',
      'textarea[placeholder*="komentar" i]',
      'div[aria-label*="comment" i]',
      'div[aria-label*="komentar" i]',
      'textarea[autocomplete="off"]',
      'textarea'
    ];

    let searchAttempts = 0;
    const maxAttempts = 30;

    const intervalId = setInterval(() => {
      searchAttempts++;

      autoLikeIfNeeded();

      const commentInput = findElement(inputSelectors);
      const targetUsername = extractUsername();
      const captionText = extractCaption(targetUsername);

      if (commentInput) {
        if (!captionText && searchAttempts < 8) {
          return;
        }

        clearInterval(intervalId);
        console.log('[LIKOM HELPER] Comment input field found!');

        chrome.runtime.sendMessage(
          { 
            action: 'generateComment', 
            instruction: instruction, 
            caption: captionText,
            targetUsername: targetUsername
          }, 
          (response) => {
            if (chrome.runtime.lastError) return;

            if (response && response.success && response.comment) {
              console.log(`[LIKOM HELPER] AI Smart Comment received: "${response.comment}"`);
              injectComment(commentInput, response.comment);
            }
          }
        );
      } else if (searchAttempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    }, 500);
  });

  function findElement(selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && isElementVisible(el)) return el;
    }
    return null;
  }

  function isElementVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function extractUsername() {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
    const ogMatch = ogTitle.match(/^([a-zA-Z0-9_\.]+)\s+(?:on|di|@)\s+Instagram/i);
    if (ogMatch && ogMatch[1].toLowerCase() !== 'instagram') {
      return ogMatch[1];
    }

    const metaDesc = document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '';
    const descMatch = metaDesc.match(/-\s*([a-zA-Z0-9_\.]+)\s+on\s+[A-Z]/i) || metaDesc.match(/-\s*([a-zA-Z0-9_\.]+)\s+di\s+[A-Z]/i);
    if (descMatch) {
      return descMatch[1];
    }

    const cleanTitle = document.title.replace(/^\(\d+\)\s*/, '').trim();

    const match1 = cleanTitle.match(/^([a-zA-Z0-9_\.]+)\s+(?:on|di|@)\s+Instagram/i);
    if (match1 && match1[1].toLowerCase() !== 'instagram') return match1[1];

    const match2 = cleanTitle.match(/[a-zA-Z0-9_\.]+\s+\((@?[a-zA-Z0-9_\.]+)\)/);
    if (match2) return match2[1].replace('@', '');

    const match3 = cleanTitle.match(/by\s+@?([a-zA-Z0-9_\.]+)/i);
    if (match3) return match3[1];

    const header = document.querySelector('header');
    if (header) {
      const a = header.querySelector('a[role="link"], a');
      if (a && a.textContent.trim()) {
        return a.textContent.trim();
      }
    }

    return '';
  }

  function extractCaption(username) {
    let caption = '';

    const metaDesc = document.querySelector('meta[name="description"]')?.content 
                  || document.querySelector('meta[property="og:description"]')?.content 
                  || '';

    if (metaDesc) {
      const quoteMatch = metaDesc.match(/:\s*["“](.+?)["”]/s) || metaDesc.match(/on\s+[A-Za-z0-9, ]+:\s*["“]?(.+)/s);
      if (quoteMatch && quoteMatch[1] && quoteMatch[1].trim().length > 5) {
        caption = quoteMatch[1].replace(/["”]$/, '').trim();
        if (caption) return caption;
      }
    }

    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
    if (ogTitle) {
      const ogQuoteMatch = ogTitle.match(/:\s*["“](.+?)["”]/s);
      if (ogQuoteMatch && ogQuoteMatch[1] && ogQuoteMatch[1].trim().length > 5) {
        caption = ogQuoteMatch[1].replace(/["”]$/, '').trim();
        if (caption) return caption;
      }
    }

    if (username) {
      const links = document.querySelectorAll('a[role="link"], a');
      for (const link of links) {
        const linkText = link.textContent.trim().toLowerCase();
        if (linkText === username.toLowerCase() || (username && linkText.includes(username.toLowerCase()))) {
          let parent = link.parentElement;
          for (let depth = 0; depth < 5 && parent; depth++) {
            const autoSpans = parent.querySelectorAll('span[dir="auto"], span');
            for (const span of autoSpans) {
              const text = span.textContent.trim();
              if (
                text.length > 15 && 
                !text.toLowerCase().startsWith(username.toLowerCase()) && 
                !text.includes('Tambahkan komentar') &&
                !text.includes('Add a comment') &&
                !span.querySelector('a')
              ) {
                return text;
              }
            }
            parent = parent.parentElement;
          }
        }
      }
    }

    const dirSpans = document.querySelectorAll('span[dir="auto"]');
    for (const span of dirSpans) {
      const text = span.textContent.trim();
      if (
        text.length > 15 && 
        !text.includes('Tambahkan komentar') && 
        !text.includes('Add a comment') &&
        !text.includes('Balas') &&
        !text.includes('Reply') &&
        !text.includes('Lihat jawaban')
      ) {
        return text;
      }
    }

    for (const selector of captionSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent && el.textContent.trim().length > 10) {
        return el.textContent.trim();
      }
    }

    return '';
  }

  function injectComment(inputElement, text) {
    inputElement.focus();

    if (inputElement.tagName === 'TEXTAREA') {
      try {
        const nativeValueSetter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          'value'
        ).set;
        nativeValueSetter.call(inputElement, text);
        
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {
        inputElement.value = text;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      try {
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        
        const success = document.execCommand('insertText', false, text);
        if (!success) {
          throw new Error('execCommand returned false');
        }
      } catch (e) {
        inputElement.innerText = text;
        inputElement.dispatchEvent(new InputEvent('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    currentCommentedState = true;
    syncStatus(currentLikedState, true);
  }
})();
