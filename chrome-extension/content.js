// Content Script for LIKOM Helper Extension
// Runs on instagram.com AND http://localhost:3000/*

(function() {
  // 1. Dashboard Integration Mode (runs on http://localhost:3000)
  if (window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1')) {
    console.log('[LIKOM HELPER] Extension Content Script attached to LIKOM Dashboard.');

    setInterval(() => {
      window.postMessage({ type: 'LIKOM_EXTENSION_READY' }, '*');
    }, 800);

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
  console.log('[LIKOM HELPER] Human-like Content script active on Instagram.');

  function getPostId() {
    const match = window.location.pathname.match(/\/(?:p|reel)\/([a-zA-Z0-9_\-]+)/);
    return match ? match[1] : null;
  }

  const postId = getPostId();

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

  function checkIsLiked() {
    const redHearts = document.querySelectorAll(
      'svg[aria-label="Unlike"], svg[aria-label="Batal Suka"], svg[color="rgb(255, 48, 64)"], svg[color="rgb(237, 73, 86)"], svg[fill="#ff3040"]'
    );
    return redHearts.length > 0;
  }

  // Human-like Like with realistic delay
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
        // Human delay (2.5 - 4 seconds) before liking
        const humanDelay = 2500 + Math.random() * 1500;
        setTimeout(() => {
          if (!checkIsLiked()) {
            console.log(`[LIKOM HELPER] Liking post (Human delay: ${Math.round(humanDelay)}ms)...`);
            btn.click();
            currentLikedState = true;
            syncStatus(true, currentCommentedState);
          }
        }, humanDelay);
        break;
      }
    }
  }

  function checkIsCommented() {
    const myHandle = 'mzaa_offc';
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

  function monitorLikeAndComment() {
    if (!postId) return;

    const isLiked = checkIsLiked();
    const isCommented = checkIsCommented();

    if (isLiked !== currentLikedState || isCommented !== currentCommentedState) {
      currentLikedState = isLiked;
      currentCommentedState = isCommented;
      syncStatus(currentLikedState, currentCommentedState);
    }

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
      console.log('[LIKOM HELPER] No instruction found for this post. Running in315152341253452');
      return;
    }

    console.log(`[LIKOM HELPER] Active instruction: "${instruction}". Waiting for human-like timing...`);

    // Trigger human-like like
    autoLikeIfNeeded();

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

      const commentInput = findElement(inputSelectors);
      const targetUsername = extractUsername();
      const captionText = extractCaption(targetUsername);

      if (commentInput) {
        if (!captionText && searchAttempts < 8) {
          return;
        }

        clearInterval(intervalId);
        console.log('[LIKOM HELPER] Comment input field found! Fetching AI comment...');

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
              console.log(`[LIKOM HELPER] AI Comment: "${response.comment}". Simulating human typing...`);
              // Human delay before typing (1.5 - 3 seconds)
              setTimeout(() => {
                humanTypeComment(commentInput, response.comment);
              }, 1500 + Math.random() * 1500);
            }
          }
        );
      } else if (searchAttempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    }, 600);
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

  // Simulate realistic human typing character by character into Instagram input
  function humanTypeComment(inputElement, text) {
    inputElement.focus();
    let currentText = '';
    let charIndex = 0;

    function typeNextChar() {
      if (charIndex < text.length) {
        currentText += text[charIndex];
        charIndex++;

        if (inputElement.tagName === 'TEXTAREA') {
          try {
            const nativeValueSetter = Object.getOwnPropertyDescriptor(
              HTMLTextAreaElement.prototype,
              'value'
            ).set;
            nativeValueSetter.call(inputElement, currentText);
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          } catch (e) {
            inputElement.value = currentText;
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else {
          try {
            inputElement.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, currentText);
          } catch (e) {
            inputElement.innerText = currentText;
            inputElement.dispatchEvent(new InputEvent('input', { bubbles: true }));
          }
        }

        // Random delay between keypresses (50ms - 130ms)
        const delay = Math.floor(Math.random() * 80) + 50;
        setTimeout(typeNextChar, delay);
      } else {
        // Finished typing
        console.log('[LIKOM HELPER] Finished human-like typing!');
        currentCommentedState = true;
        syncStatus(currentLikedState, true);
      }
    }

    typeNextChar();
  }
})();
