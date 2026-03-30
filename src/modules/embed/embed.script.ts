/**
 * Injects a host div with Shadow DOM so widget styles are isolated from the page.
 * Usage: <script src="https://your-api.com/embed/embed.js" data-token="JWT" data-backend-url="https://your-api.com"></script>
 */
export const EMBED_SCRIPT = `
(function() {
  var script = document.currentScript;
  var token = script && script.getAttribute('data-token');
  if (!token || !String(token).trim()) {
    console.error('[Onboard widget] Missing required data-token on embed script tag');
    return;
  }
  var backendUrlAttr = script && script.getAttribute('data-backend-url');
  if (!backendUrlAttr || !String(backendUrlAttr).trim()) {
    console.error('[Onboard widget] Missing required data-backend-url on embed script tag');
    return;
  }
  function stripTrailingSlash(s) {
    return String(s || '').replace(/\\/+$/, '');
  }
  function resolveBases(scriptEl) {
    var src = (scriptEl && scriptEl.src) || '';
    var srcUrl = null;
    try { srcUrl = new URL(src, window.location.href); } catch (e) {}

    var dataApiBase = scriptEl && scriptEl.getAttribute('data-api-base');
    var dataSocketBase = scriptEl && scriptEl.getAttribute('data-socket-base');
    var dataBackendUrl = backendUrlAttr;

    var fallbackApiBase = src.replace(/\\/embed\\/embed\\.js.*$/, '/embed');
    if (fallbackApiBase === src && srcUrl) fallbackApiBase = srcUrl.origin + '/embed';
    var backendUrl = stripTrailingSlash(dataBackendUrl);
    fallbackApiBase = backendUrl + '/embed';

    var apiBase = stripTrailingSlash(dataApiBase || fallbackApiBase);
    var socketBase = stripTrailingSlash(
      dataSocketBase || backendUrl,
    );

    return { apiBase: apiBase, socketBase: socketBase };
  }
  var bases = resolveBases(script);
  var apiBase = bases.apiBase;
  var socketBase = bases.socketBase;
  var botId = (function() {
    try {
      var parts = token.split('.');
      if (parts.length !== 3) return null;
      var payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
      return payload.botId || null;
    } catch (e) { return null; }
  })();
  if (!botId) return;
  var storageKey = 'onboard_visitor_' + botId;
  var visitorId = localStorage.getItem(storageKey);
  if (!visitorId) {
    visitorId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 3 | 8);
      return v.toString(16);
    });
    localStorage.setItem(storageKey, visitorId);
  }

  if (!document.getElementById('onboard-widget-font')) {
    var pre = document.createElement('link');
    pre.rel = 'preconnect';
    pre.href = 'https://fonts.googleapis.com';
    document.head.appendChild(pre);
    var pre2 = document.createElement('link');
    pre2.rel = 'preconnect';
    pre2.href = 'https://fonts.gstatic.com';
    pre2.crossOrigin = '';
    document.head.appendChild(pre2);
    var font = document.createElement('link');
    font.id = 'onboard-widget-font';
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap';
    document.head.appendChild(font);
  }

  var defaultWidgetLogoSvg = ___DEFAULT_WIDGET_LOGO_SVG_JSON___;
  var sendSvg = '<svg class="ob-send-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  var css = ':host { display: block; } * { box-sizing: border-box; } .ob-root { font-family: Roboto, system-ui, sans-serif; font-size: 15px; display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-end; gap: 10px; } #onboard-widget-btn { width: 56px; height: 56px; padding: 12px; box-sizing: border-box; border-radius: 50%; border: none; background: #7B61FF; color: #fff; cursor: pointer; box-shadow: 0 4px 20px rgba(123,97,255,0.45); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background 0.15s, transform 0.15s; } #onboard-widget-btn:hover { background: #6A52E8; transform: scale(1.03); } #onboard-widget-btn.loading { cursor: wait; } #onboard-widget-btn.loading .ob-widget-logo-svg { animation: ob-spin 1s linear infinite; } @keyframes ob-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } #onboard-widget-btn .ob-widget-logo-svg { width: 100%; height: 100%; max-width: 27px; max-height: 27px; } #onboard-widget-panel { display: none; width: 400px; max-width: calc(100vw - 20px); height: 480px; max-height: calc(100vh - 100px); background: #fff; border-radius: 16px; box-shadow: 0px 4px 24px 0px #0000001F; flex-direction: column; overflow: hidden; } #onboard-widget-panel.open { display: flex; } .ob-section-header { flex-shrink: 0; position: relative; padding: 12px 16px; background: #7B61FF; display: flex; align-items: center; justify-content: flex-start; } .ob-header-row { display: flex; align-items: center; text-align: left; } .ob-header-logo { width: 46px; height: 46px; border-radius: 50%; background: #FEFEFE4D; color: #FEFEFE; padding: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; } .ob-header-logo .ob-widget-logo-svg { max-width: 21px; max-height: 21px; width: 100%; height: 100%; } .ob-header-copy { display: flex; flex-direction: column; align-items: flex-start; margin-left: 12px; min-width: 0; } .ob-header-title { font-family: Roboto, sans-serif; font-size: 16px; font-weight: 500; line-height: 1.25; color: #FEFEFE; } .ob-header-status { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-family: Roboto, sans-serif; font-size: 12px; font-weight: 400; color: #FEFEFE; } .ob-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00A94F; flex-shrink: 0; } .ob-close { position: absolute; top: 12px; right: 16px; background: transparent; border: none; color: #E9EAF2; font-size: 24px; line-height: 1; cursor: pointer; padding: 0; opacity: 0.9; border-radius: 9999px; display: flex; align-items: center; justify-content: center; } .ob-section-messages { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; background: #fff; padding: 16px; } .ob-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; } .ob-msg { display: flex; flex-direction: column; max-width: 88%; } .ob-msg-bot { align-self: flex-start; } .ob-msg-user { align-self: flex-end; max-width: 88%; } .ob-bubble { padding: 12px 14px; border-radius: 16px; word-break: break-word; line-height: 1.45; display: flex; flex-direction: column; gap: 10px; font-size: 14px; font-weight: 400; } .ob-msg-bot .ob-bubble { background: #F2EFFF; color: #7B61FF; border-radius: 16px 16px 16px 4px; } .ob-msg-user .ob-bubble { background: #7B61FF; color: #FEFEFE; border-radius: 16px 16px 4px 16px; } .ob-bubble-text { font-size: 14px; font-weight: 400; } .ob-msg-meta { display: flex; align-items: center; gap: 6px; justify-content: flex-end; } .ob-msg-bot .ob-msg-meta { justify-content: flex-start; } .ob-msg-time { font-size: 12px; font-weight: 400; } .ob-msg-status { font-size: 11px; font-weight: 500; opacity: 0.95; } .ob-msg-status-pending { color: #E7E7E7; } .ob-msg-status-sent { color: #E7E7E7; } .ob-msg-status-error { color: #FFD2D2; } .ob-msg-bot .ob-msg-time { color: #6974A6; } .ob-msg-user .ob-msg-time { color: #E7E7E7; text-align: right; } .ob-msg-user.pending .ob-bubble { opacity: 0.85; } .ob-msg-bot-loading .ob-bubble { width: 52px; min-width: 52px; align-items: center; } .ob-msg-bot-loading .ob-bubble-text { width: 24px; text-align: left; letter-spacing: 1px; } .ob-section-footer { flex-shrink: 0; padding: 16px; border-top: 1px solid #E5E7EB; background: #fff; } .ob-task-chips-wrap { width: 75%; margin-left: auto; } .ob-task-chips { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 8px; } .ob-task-chip { border: 1px solid #DCD7FF; background: #F7F5FF; color: #6C57DA; border-radius: 999px; font-size: 12px; font-weight: 500; line-height: 1; padding: 8px 12px; cursor: pointer; transition: filter 0.15s; } .ob-task-chip:hover { filter: brightness(0.97); } .ob-task-chip:disabled { opacity: 0.65; cursor: not-allowed; } .ob-input-row { display: flex; align-items: center; gap: 10px; } .ob-input { flex: 1; height: 36px; padding: 8px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; font-weight: 500; color: #1F307A; outline: none; transition: border-color 0.15s; box-sizing: border-box; } .ob-input::placeholder { color: #BABFD6; font-size: 14px; font-weight: 500; } .ob-input:focus { border-color: #7B61FF; } .ob-send { width: 36px; height: 36px; border: none; border-radius: 8px; background: #7B61FF; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s; } .ob-send:hover { background: #6A52E8; } .ob-send .ob-send-svg { width: 20px; height: 20px; flex-shrink: 0; } .ob-powered { text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 10px; } .ob-powered-brand { font-weight: 500; }';

  var html =
    '<style>' + css + '</style>' +
    '<div class="ob-root">' +
    '<div id="onboard-widget-panel">' +
    '<header class="ob-section-header">' +
    '<div class="ob-header-row">' +
    '<div class="ob-header-logo">' + defaultWidgetLogoSvg + '</div>' +
    '<div class="ob-header-copy">' +
    '<div class="ob-header-title">Hi, how can I help?</div>' +
    '<div class="ob-header-status"><span class="ob-status-dot" aria-hidden="true"></span><span>Online</span></div>' +
    '</div></div>' +
    '<button type="button" class="ob-close" aria-label="Close">&#215;</button>' +
    '</header>' +
    '<div class="ob-section-messages"><div class="ob-messages" role="log" aria-live="polite"></div><div class="ob-task-chips-wrap"><div class="ob-task-chips" role="list"></div></div></div>' +
    '<div class="ob-section-footer">' +
    '<div class="ob-input-row">' +
    '<input type="text" class="ob-input" placeholder="Type your message..." autocomplete="off" />' +
    '<button type="button" class="ob-send" aria-label="Send">' + sendSvg + '</button>' +
    '</div>' +
    '<div class="ob-powered">Powered by <span class="ob-powered-brand">Onboard io</span></div>' +
    '</div></div>' +
    '<button id="onboard-widget-btn" type="button" aria-label="Open chat">' + defaultWidgetLogoSvg + '</button>' +
    '</div>';

  var host = document.createElement('div');
  host.id = 'onboard-widget-host';
  host.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;';
  var shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = html;

  var conversationId = null;
  var open = false;
  var WELCOME = 'Welcome to Onboard Support! Ask me anything about our products.';
  var widgetConfig = null;
  var bootLoading = false;
  var socket = null;
  var socketSendBound = false;
  var ioFactory = null;
  var inputLocked = false;
  var pendingUserBubbles = {};
  var pendingUserBubblesByMessageId = {};
  var pendingUserQueue = [];
  var pendingCounter = 0;
  var botPendingBubble = null;
  var botPendingTimer = null;
  var botTypingInterval = null;
  var botStreamBubble = null;
  var botStreamText = '';
  var conversationLoading = false;
  var panelCloseTimer = null;
  var taskChips = [];
  var widgetBlocked = false;

  function q(sel) { return shadow.querySelector(sel); }

  function setBootLoading(loading) {
    bootLoading = !!loading;
    var launcher = q('#onboard-widget-btn');
    if (!launcher) return;
    if (bootLoading) launcher.classList.add('loading');
    else launcher.classList.remove('loading');
  }

  function setInputLocked(locked) {
    inputLocked = !!locked;
    var panel = q('#onboard-widget-panel');
    if (!panel) return;
    var inputEl = panel.querySelector('.ob-input');
    var sendBtn = panel.querySelector('.ob-send');
    if (inputEl) inputEl.disabled = inputLocked;
    if (sendBtn) sendBtn.disabled = inputLocked;
    var chips = panel.querySelectorAll('.ob-task-chip');
    if (chips && chips.length) {
      for (var i = 0; i < chips.length; i++) chips[i].disabled = inputLocked;
    }
  }

  function setWidgetBlocked(blocked) {
    widgetBlocked = !!blocked;
    setInputLocked(widgetBlocked);
    setBootLoading(false);
    if (widgetBlocked) {
      try { closePanel(); } catch (e) {}
      try { disconnectSocket(); } catch (e) {}
    }
    var launcher = q('#onboard-widget-btn');
    if (launcher) {
      launcher.disabled = widgetBlocked;
      launcher.style.display = widgetBlocked ? 'none' : '';
    }
    if (host) {
      host.style.display = widgetBlocked ? 'none' : '';
    }
  }

  function shouldHardDisable(err) {
    var status = err && err.status;
    if (status === 401 || status === 403) return true;
    var msg = (err && err.message) ? String(err.message).toLowerCase() : '';
    return (
      msg.indexOf('widget token') >= 0 ||
      msg.indexOf('unauthorized') >= 0 ||
      msg.indexOf('not allowed on this site or url') >= 0 ||
      msg.indexOf('bot is disabled') >= 0 ||
      msg.indexOf('bot is archived') >= 0
    );
  }

  function sendUserMessage(text) {
    var messagesEl = q('.ob-messages');
    var inputEl = q('.ob-input');
    var value = (text || '').trim();
    if (widgetBlocked || inputLocked || !conversationId || !value || !messagesEl) return;
    if (inputEl && (!text || text === inputEl.value)) inputEl.value = '';
    var pendingKey = 'tmp_' + (++pendingCounter);
    var pendingBubble = appendBubble(messagesEl, 'USER', value, null, 'PENDING');
    pendingUserBubbles[pendingKey] = pendingBubble;
    pendingUserQueue.push(pendingBubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    addMessageToConversation(value)
      .then(function(res) {
        var data = res && res.data ? res.data : res;
        if (data && data.id) pendingUserBubblesByMessageId[data.id] = pendingBubble;
        delete pendingUserBubbles[pendingKey];
      })
      .catch(function(err) {
        updateUserBubbleStatus(pendingBubble, 'ERROR', new Date().toISOString());
        var idx = pendingUserQueue.indexOf(pendingBubble);
        if (idx >= 0) {
          pendingUserQueue.splice(idx, 1);
        }
        delete pendingUserBubbles[pendingKey];
        clearBotPending();
        showWidgetError(humanizeError(err, 'Message failed to send. Please try again.'));
        if (shouldHardDisable(err)) setWidgetBlocked(true);
        console.warn('[Onboard widget]', err);
      });
  }

  function renderTaskChips() {
    var container = q('.ob-task-chips');
    if (!container) return;
    container.innerHTML = '';
    if (!taskChips || !taskChips.length) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';
    taskChips.forEach(function(chip) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ob-task-chip';
      btn.textContent = chip.label;
      btn.disabled = inputLocked;
      btn.onclick = function() {
        if (chip.type === 'link' && chip.url) {
          if (chip.newTab) window.open(chip.url, '_blank', 'noopener,noreferrer');
          else window.location.href = chip.url;
          return;
        }
        if (chip.question) sendUserMessage(chip.question);
      };
      container.appendChild(btn);
    });
  }

  function formatTime(iso) {
    try {
      var d = iso ? new Date(iso) : new Date();
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) { return ''; }
  }

  function api(path, opts) {
    opts = opts || {};
    var url = apiBase + path;
    var init = { method: opts.method || 'GET', headers: opts.headers || {} };
    init.headers['X-WIDGET-ACCESS-TOKEN'] = token;
    init.headers['X-EMBED-PAGE-URL'] = window.location.href;
    if (opts.body) {
      init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
      if (!init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';
    }
    return fetch(url, init).then(function(r) {
      return r.text().then(function(t) {
        var data = null;
        try { data = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) {
          var msg =
            (data && (data.message || data.error) && String(data.message || data.error)) ||
            (r.status === 401 ? 'Unauthorized' : r.status >= 500 ? 'Server error' : 'Request failed');
          var err = new Error(msg);
          err.status = r.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    }).catch(function(err) {
      if (err && err.name === 'TypeError') {
        var e2 = new Error('Network error');
        e2.cause = err;
        throw e2;
      }
      throw err;
    });
  }

  function loadSocketIoClient() {
    if (ioFactory) return Promise.resolve(ioFactory);
    return new Promise(function(resolve, reject) {
      var existing = document.getElementById('onboard-socketio-client');
      if (existing && window.io) {
        ioFactory = window.io;
        return resolve(ioFactory);
      }
      var tag = existing || document.createElement('script');
      tag.id = 'onboard-socketio-client';
      tag.src = socketBase + '/socket.io/socket.io.js';
      tag.async = true;
      tag.onload = function() {
        if (!window.io) return reject(new Error('socket.io client unavailable'));
        ioFactory = window.io;
        resolve(ioFactory);
      };
      tag.onerror = function() { reject(new Error('socket.io client failed to load')); };
      if (!existing) document.head.appendChild(tag);
    });
  }

  function connectSocket() {
    if (socket && socket.connected) return Promise.resolve(socket);
    return loadSocketIoClient().then(function(io) {
      socket = io(socketBase + '/chat', {
        transports: ['websocket'],
        withCredentials: true,
      });
      if (!socketSendBound) {
        socket.on('connect_error', function(err) {
          showWidgetError(humanizeError(err, 'Connection issue. Please try again.'));
          console.warn('[Onboard widget] socket connect error', err);
        });
        socket.on('SEND_MESSAGE', function(payload) {
          var data = payload && payload.message ? payload.message : null;
          if (!data) return;
          if (payload.conversationId !== conversationId) return;
          var messagesEl = q('.ob-messages');
          if (!messagesEl) return;
          var sender = data.sender === 'USER' ? 'USER' : 'BOT';
          if (sender === 'USER') return;
          if (botStreamBubble && botStreamBubble.parentNode) {
            botStreamBubble.parentNode.removeChild(botStreamBubble);
          }
          botStreamBubble = null;
          botStreamText = '';
          clearBotPending(false);
          var wrap = appendBubble(messagesEl, sender, data.content, data.createdAt, data.status || 'SENT');
          renderTaskChips();
          messagesEl.scrollTop = messagesEl.scrollHeight;
          setInputLocked(false);
        });
        socket.on('BOT_STREAM_DELTA', function(payload) {
          if (!payload) return;
          if (payload.conversationId !== conversationId) return;
          if (!payload.delta) return;
          applyBotStreamDelta(payload.delta);
        });
        socket.on('WIDGET_ERROR', function(payload) {
          if (!payload) return;
          if (payload.conversationId && payload.conversationId !== conversationId) return;
          showWidgetError(humanizeError(payload, 'Something went wrong. Please try again.'));
        });
        socket.on('MESSAGE_STATUS_UPDATED', function(payload) {
          if (!payload) return;
          if (payload.conversationId !== conversationId) return;
          if (payload.sender !== 'USER') return;
          var bubble = null;
          if (payload.messageId && pendingUserBubblesByMessageId[payload.messageId]) {
            bubble = pendingUserBubblesByMessageId[payload.messageId];
          } else if (pendingUserQueue.length > 0) {
            bubble = pendingUserQueue.shift();
          }
          if (!bubble) return;
          updateUserBubbleStatus(bubble, payload.status || 'SENT', payload.updatedAt);
          if (payload.status === 'ERROR') {
            clearBotPending();
          }
        });
        socket.on('BOT_STATUS_CHANGED', function(payload) {
          if (!payload) return;
          if (payload.conversationId !== conversationId) return;
          if (payload.status === 'THINKING') {
            startBotPending();
            return;
          }
          if (payload.status === 'DONE') {
            clearBotPending(false);
            setInputLocked(false);
            return;
          }
          if (payload.status === 'ERROR') {
            showWidgetError('Bot response failed. Please try again.');
          }
        });
        socketSendBound = true;
      }
      return socket;
    });
  }

  function joinRoom() {
    if (!conversationId || !token) return Promise.resolve();
    return connectSocket().then(function(s) {
      return new Promise(function(resolve, reject) {
        var done = false;
        var timer = setTimeout(function() {
          if (done) return;
          done = true;
          reject(new Error('Join room timeout'));
        }, 3000);
        try {
          s.emit('JOIN_ROOM', { conversationId: conversationId, token: token, pageUrl: window.location.href }, function(ack) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            if (ack && ack.ok === false) {
              reject(new Error(ack.error || 'Unable to join chat room'));
              return;
            }
            resolve();
          });
        } catch (e) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          reject(e);
        }
      });
    }).catch(function(err) {
      showWidgetError(humanizeError(err, 'Unable to connect right now. Please try again.'));
      if (shouldHardDisable(err)) setWidgetBlocked(true);
      console.warn('[Onboard widget] socket connect failed', err);
    });
  }

  function disconnectSocket() {
    try {
      if (socket) socket.disconnect();
      socket = null;
      socketSendBound = false;
      clearBotPending();
    } catch (e) {}
  }

  function getConfigValue(key, fallback) {
    if (!widgetConfig || widgetConfig[key] == null) return fallback;
    return widgetConfig[key];
  }

  function escapeAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function resolveLogoUrl(url) {
    var s = url && String(url).trim();
    if (!s) return '';
    var lower = s.toLowerCase();
    if (
      lower.indexOf('http://') === 0 ||
      lower.indexOf('https://') === 0 ||
      s.indexOf('data:') === 0 ||
      s.indexOf('//') === 0
    ) {
      return s;
    }
    var base = apiBase;
    if (base.slice(-7) === '/embed/') base = base.slice(0, -7);
    else if (base.slice(-6) === '/embed') base = base.slice(0, -6);
    return base + (s.indexOf('/') === 0 ? s : '/' + s);
  }

  function applyLogoToElement(el, logoUrl, opts) {
    if (!el) return;
    var resolved = resolveLogoUrl(logoUrl);
    var launcher = opts && opts.launcher;
    var imgStyle = launcher
      ? 'width:27px;height:27px;max-width:27px;max-height:27px;object-fit:cover;border-radius:50%;'
      : 'width:21px;height:21px;object-fit:cover;border-radius:50%;';
    if (resolved) {
      el.innerHTML =
        '<img src="' +
        escapeAttr(resolved) +
        '" alt="Bot logo" class="ob-header-logo-img" style="' +
        imgStyle +
        '" />';
    } else {
      el.innerHTML = defaultWidgetLogoSvg;
    }
  }

  function applyWidgetConfig(raw) {
    var cfg = raw && raw.data ? raw.data : raw;
    if (!cfg || typeof cfg !== 'object') return;
    widgetConfig = cfg;
    taskChips = Array.isArray(cfg.taskChips) ? cfg.taskChips
      .filter(function(c) {
        if (!c || !c.label) return false;
        if (c.type === 'link') return !!c.url;
        return !!c.question;
      })
      .map(function(c) {
        return {
          id: c.id || '',
          type: c.type === 'link' ? 'link' : 'query',
          label: String(c.label),
          question: c.question ? String(c.question) : null,
          url: c.url ? String(c.url) : null,
          newTab: !!c.newTab
        };
      })
      : [];

    var hostPos = String(getConfigValue('position', 'bottom_right')).toLowerCase();
    host.style.left = '';
    host.style.right = '';
    if (hostPos === 'bottom_left') host.style.left = '20px';
    else host.style.right = '20px';

    var primaryColor = getConfigValue('primaryColor', '#7B61FF');
    var headerTextColor = getConfigValue('headerTextColor', '#FEFEFE');
    var panelBackground = getConfigValue('background', '#ffffff');
    var botMessageBg = getConfigValue('botMessageBg', '#F2EFFF');
    var botMessageText = getConfigValue('botMessageText', '#7B61FF');
    var userMessageBg = getConfigValue('userMessageBg', '#7B61FF');
    var userMessageText = getConfigValue('userMessageText', '#FEFEFE');

    var panel = q('#onboard-widget-panel');
    var header = q('.ob-section-header');
    var headerTitle = q('.ob-header-title');
    var headerStatus = q('.ob-header-status');
    var closeBtn = q('.ob-close');
    var launcherBtn = q('#onboard-widget-btn');
    var sendBtn = q('.ob-send');
    var inputEl = q('.ob-input');
    var messagesSection = q('.ob-section-messages');
    var footerSection = q('.ob-section-footer');
    var poweredBy = q('.ob-powered');

    if (panel) panel.style.background = panelBackground;
    if (header) header.style.background = primaryColor;
    if (messagesSection) messagesSection.style.background = panelBackground;
    if (footerSection) footerSection.style.background = panelBackground;
    if (launcherBtn) launcherBtn.style.background = primaryColor;
    if (sendBtn) sendBtn.style.background = primaryColor;
    if (inputEl) inputEl.style.borderColor = '#E5E7EB';
    if (headerTitle) {
      headerTitle.style.color = headerTextColor;
      headerTitle.textContent = getConfigValue('headerText', 'Hi, how can I help?');
    }
    if (headerStatus) headerStatus.style.color = headerTextColor;
    if (closeBtn) closeBtn.style.color = headerTextColor;

    var logoUrlRaw = getConfigValue('botLogoUrl', null);
    applyLogoToElement(q('.ob-header-logo'), logoUrlRaw);
    applyLogoToElement(q('#onboard-widget-btn'), logoUrlRaw, { launcher: true });

    if (poweredBy) {
      var showPoweredBy = !!getConfigValue('showPoweredBy', true);
      poweredBy.style.display = showPoweredBy ? 'block' : 'none';
    }

    WELCOME = getConfigValue('welcomeMessage', WELCOME);
    if (!WELCOME || !String(WELCOME).trim()) {
      WELCOME = getConfigValue('introMessage', WELCOME);
    }

    var dynamic = shadow.getElementById('onboard-widget-dynamic-style');
    if (!dynamic) {
      dynamic = document.createElement('style');
      dynamic.id = 'onboard-widget-dynamic-style';
      shadow.appendChild(dynamic);
    }
    dynamic.textContent =
      '.ob-msg-bot .ob-bubble{background:' + botMessageBg + ';color:' + botMessageText + ';}' +
      '.ob-msg-user .ob-bubble{background:' + userMessageBg + ';color:' + userMessageText + ';}' +
      '.ob-send:hover{filter:brightness(0.95);background:' + primaryColor + ';}' +
      '#onboard-widget-btn:hover{filter:brightness(0.95);background:' + primaryColor + ';}' +
      '.ob-input:focus{border-color:' + primaryColor + ';}';
    renderTaskChips();
  }

  function getPreferredColorSchemeMode() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch (e) {
      return 'light';
    }
  }

  function loadConfig() {
    var scheme = getPreferredColorSchemeMode();
    return api('/config?mode=' + encodeURIComponent(scheme))
      .then(function(res) {
        applyWidgetConfig(res);
        return res;
      })
      .catch(function(err) {
        if (shouldHardDisable(err)) {
          setWidgetBlocked(true);
          showWidgetError(humanizeError(err, 'Widget is not available on this site.'));
        }
        console.warn('[Onboard widget] config fallback', err);
        return null;
      });
  }

  function createConversationOnLoad() {
    return api('/conversations', { method: 'POST', body: { visitorId: visitorId } }).then(function(c) {
      var convo = c && c.data ? c.data : c;
      conversationId = convo && convo.id;
      return c;
    });
  }

  function ensureConversationReady() {
    if (widgetBlocked || conversationId || conversationLoading) return Promise.resolve();
    conversationLoading = true;
    setBootLoading(true);
    return createConversationOnLoad()
      .then(function() { return joinRoom(); })
      .then(function() { return loadMessages(); })
      .then(renderMessages)
      .catch(function(err) {
        showWidgetError(humanizeError(err, 'Unable to start chat right now. Please try again.'));
        if (shouldHardDisable(err)) setWidgetBlocked(true);
        console.warn('[Onboard widget]', err);
      })
      .then(function() {
        conversationLoading = false;
        setBootLoading(false);
      });
  }

  function endConversation() {
    if (!conversationId || !token) return;
    var url = apiBase + '/conversations/' + conversationId + '/end';
    try {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WIDGET-ACCESS-TOKEN': token,
          'X-EMBED-PAGE-URL': window.location.href
        },
        body: '{}',
        keepalive: true
      });
    } catch (e) {}
  }

  function loadMessages() {
    if (!conversationId) return Promise.resolve([]);
    return api('/conversations/' + conversationId + '/messages').then(function(res) {
      return res && Array.isArray(res.data) ? res.data : (res.data || res || []);
    });
  }

  function addMessageToConversation(text, sender) {
    if (!conversationId) return Promise.reject(new Error('No conversation'));
    return api('/conversations/' + conversationId + '/messages', {
      method: 'POST',
      body: sender ? { content: text, sender: sender } : { content: text }
    });
  }

  function statusText(status) {
    if (status === 'PENDING') return 'Sending...';
    if (status === 'ERROR') return 'Failed';
    return 'Sent';
  }

  function appendBubble(messagesEl, sender, text, timeIso, status) {
    var wrap = document.createElement('div');
    wrap.className = 'ob-msg ob-msg-' + (sender === 'USER' ? 'user' : 'bot');
    var bubble = document.createElement('div');
    bubble.className = 'ob-bubble';
    var textSpan = document.createElement('span');
    textSpan.className = 'ob-bubble-text';
    textSpan.textContent = text;
    var meta = document.createElement('div');
    meta.className = 'ob-msg-meta';
    var time = document.createElement('span');
    time.className = 'ob-msg-time';
    time.textContent = formatTime(timeIso);
    meta.appendChild(time);
    if (sender === 'USER') {
      var statusEl = document.createElement('span');
      var safeStatus = status === 'PENDING' || status === 'ERROR' ? status : 'SENT';
      statusEl.className = 'ob-msg-status ob-msg-status-' + safeStatus.toLowerCase();
      statusEl.textContent = statusText(safeStatus);
      meta.appendChild(statusEl);
      if (safeStatus === 'PENDING') wrap.classList.add('pending');
    }
    bubble.appendChild(textSpan);
    bubble.appendChild(meta);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    return wrap;
  }

  function showWidgetError(message) {
    var messagesEl = q('.ob-messages');
    if (!messagesEl) return;
    clearBotPending(false);
    appendBubble(
      messagesEl,
      'BOT',
      message || 'Something went wrong. Please try again.',
      new Date().toISOString(),
      'SENT'
    );
    messagesEl.scrollTop = messagesEl.scrollHeight;
    setInputLocked(false);
  }

  function humanizeError(err, fallback) {
    var msg = (err && err.message) ? String(err.message) : '';
    var lower = msg.toLowerCase();
    if (lower.indexOf('bot is disabled') >= 0) return 'Bot is disabled.';
    if (lower.indexOf('bot is archived') >= 0) return 'Bot is archived.';
    if (lower.indexOf('bot is deleted') >= 0) return 'Bot is deleted.';
    if (lower.indexOf('not allowed on this site or url') >= 0) return 'Widget is not allowed on this site or URL.';
    if (lower.indexOf('invalid widget token') >= 0 || lower.indexOf('widget token') >= 0) return 'Unauthorized widget token.';
    if (lower.indexOf('network error') >= 0) return 'Network error. Please check your connection and try again.';
    if (lower.indexOf('server error') >= 0) return 'Server error. Please try again.';
    if (msg) return msg;
    return fallback || 'Something went wrong. Please try again.';
  }

  function updateUserBubbleStatus(wrap, status, timeIso) {
    if (!wrap) return;
    var safeStatus = status === 'PENDING' || status === 'ERROR' ? status : 'SENT';
    var timeEl = wrap.querySelector('.ob-msg-time');
    if (timeEl) timeEl.textContent = formatTime(timeIso);
    var statusEl = wrap.querySelector('.ob-msg-status');
    if (statusEl) {
      statusEl.className = 'ob-msg-status ob-msg-status-' + safeStatus.toLowerCase();
      statusEl.textContent = statusText(safeStatus);
    }
    if (safeStatus === 'PENDING') wrap.classList.add('pending');
    else wrap.classList.remove('pending');
  }

  function startBotPending() {
    clearBotPending();
    setInputLocked(true);
    var messagesEl = q('.ob-messages');
    if (!messagesEl) return;
    botPendingBubble = appendBubble(
      messagesEl,
      'BOT',
      '.',
      null,
      'SENT'
    );
    botPendingBubble.classList.add('ob-msg-bot-loading');
    var typingTextEl = botPendingBubble && botPendingBubble.querySelector('.ob-bubble-text');
    if (typingTextEl) {
      var frame = 0;
      var timeEl = botPendingBubble.querySelector('.ob-msg-time');
      if (timeEl) timeEl.style.display = 'none';
      botTypingInterval = setInterval(function() {
        frame = (frame + 1) % 3;
        var dots = frame === 0 ? '.' : frame === 1 ? '..' : '...';
        typingTextEl.textContent = dots;
      }, 450);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
    botPendingTimer = setTimeout(function() {
      if (!botPendingBubble) return;
      var textEl = botPendingBubble.querySelector('.ob-bubble-text');
      if (textEl) textEl.textContent = 'Bot response failed. Please try again.';
      if (botTypingInterval) {
        clearInterval(botTypingInterval);
        botTypingInterval = null;
      }
      setInputLocked(false);
    }, 25000);
  }

  function applyBotStreamDelta(delta) {
    var messagesEl = q('.ob-messages');
    if (!messagesEl) return;
    if (botPendingBubble) {
      clearBotPending(false);
    }
    if (!botStreamBubble) {
      botStreamText = '';
      botStreamBubble = appendBubble(messagesEl, 'BOT', '', new Date().toISOString(), 'SENT');
    }
    botStreamText += String(delta);
    var textEl = botStreamBubble.querySelector('.ob-bubble-text');
    if (textEl) textEl.textContent = botStreamText;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function clearBotPending(unlockInput) {
    var shouldUnlock = unlockInput !== false;
    if (botPendingTimer) {
      clearTimeout(botPendingTimer);
      botPendingTimer = null;
    }
    if (botTypingInterval) {
      clearInterval(botTypingInterval);
      botTypingInterval = null;
    }
    if (botPendingBubble && botPendingBubble.parentNode) {
      botPendingBubble.parentNode.removeChild(botPendingBubble);
    }
    botPendingBubble = null;
    if (botStreamBubble && botStreamBubble.parentNode) {
      botStreamBubble.parentNode.removeChild(botStreamBubble);
    }
    botStreamBubble = null;
    botStreamText = '';
    if (shouldUnlock) setInputLocked(false);
  }

  function renderMessages(list) {
    var messagesEl = q('.ob-messages');
    if (!messagesEl) return;
    messagesEl.innerHTML = '';
    if (!list || list.length === 0) {
      appendBubble(messagesEl, 'BOT', WELCOME, null);
    }
    pendingUserBubbles = {};
    pendingUserBubblesByMessageId = {};
    pendingUserQueue = [];
    (list || []).forEach(function(m) {
      var sender = m.sender === 'USER' ? 'USER' : 'BOT';
      appendBubble(messagesEl, sender, m.content, m.createdAt, m.status || 'SENT');
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function openPanel() {
    if (widgetBlocked || open) return;
    open = true;
    var panel = q('#onboard-widget-panel');
    if (!panel) return;
    if (panelCloseTimer) {
      clearTimeout(panelCloseTimer);
      panelCloseTimer = null;
    }
    panel.classList.remove('closing');
    panel.classList.add('open');
    ensureConversationReady();
  }

  function closePanel() {
    open = false;
    var panel = q('#onboard-widget-panel');
    if (!panel || !panel.classList.contains('open')) return;
    panel.classList.add('closing');
    if (panelCloseTimer) clearTimeout(panelCloseTimer);
    panelCloseTimer = setTimeout(function() {
      panel.classList.remove('open');
      panel.classList.remove('closing');
      panelCloseTimer = null;
    }, 170);
  }

  function togglePanel() {
    if (widgetBlocked || bootLoading) return;
    open ? closePanel() : openPanel();
  }

  function mount() {
    var panel = q('#onboard-widget-panel');
    var transitionStyle = shadow.getElementById('onboard-widget-transition-style');
    if (!transitionStyle) {
      transitionStyle = document.createElement('style');
      transitionStyle.id = 'onboard-widget-transition-style';
      transitionStyle.textContent =
        '#onboard-widget-panel.open{display:flex;animation:ob-panel-in 180ms ease-out both;transform-origin:bottom right;}' +
        '#onboard-widget-panel.open.closing{animation:ob-panel-out 160ms ease-in both;pointer-events:none;}' +
        '@keyframes ob-panel-in{from{opacity:0;transform:translateY(10px) scale(0.98);}to{opacity:1;transform:translateY(0) scale(1);}}' +
        '@keyframes ob-panel-out{from{opacity:1;transform:translateY(0) scale(1);}to{opacity:0;transform:translateY(10px) scale(0.98);}}';
      shadow.appendChild(transitionStyle);
    }
    var inputEl = panel.querySelector('.ob-input');
    q('#onboard-widget-btn').onclick = togglePanel;
    panel.querySelector('.ob-close').onclick = closePanel;
    panel.querySelector('.ob-send').onclick = function() {
      sendUserMessage(inputEl.value || '');
    };
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') panel.querySelector('.ob-send').click();
    });
    setBootLoading(true);
    loadConfig()
      .then(function() { setBootLoading(false); })
      .catch(function(err) {
        setBootLoading(false);
        showWidgetError(humanizeError(err, 'Unable to load chat config. Please refresh and try again.'));
        console.warn('[Onboard widget]', err);
      });
    try {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onSchemeChange = function() {
        loadConfig()
          .catch(function(err) {
            showWidgetError('Unable to refresh chat config right now.');
            console.warn('[Onboard widget]', err);
          });
      };
      if (mq.addEventListener) mq.addEventListener('change', onSchemeChange);
      else if (mq.addListener) mq.addListener(onSchemeChange);
    } catch (e) {}
    window.addEventListener('beforeunload', function() {
      endConversation();
      disconnectSocket();
    });
  }

  function appendHost() {
    if (document.body) document.body.appendChild(host);
    else document.addEventListener('DOMContentLoaded', function() { document.body.appendChild(host); });
  }

  appendHost();
  mount();
})();
`.trim();
