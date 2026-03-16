/**
 * Inline embed script for the chat widget. Served as application/javascript.
 * Usage (token): <script src="https://your-api.com/embed/embed.js" data-token="JWT"></script>
 * Usage (legacy): <script src="https://your-api.com/embed/embed.js" data-bot-id="BOT_UUID"></script>
 */
export const EMBED_SCRIPT = `
(function() {
  var script = document.currentScript;
  var token = script && script.getAttribute('data-token');
  var botId = script && script.getAttribute('data-bot-id');
  if (!token && !botId) return;
  var base = script.src.replace(/\\/embed\\.js.*$/, '');
  var botIdForStorage = botId || (token && (function() {
    try {
      var parts = token.split('.');
      if (parts.length !== 3) return null;
      var payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
      return payload.botId || null;
    } catch (e) { return null; }
  })());
  if (!botIdForStorage) return;
  var storageKey = 'onboard_visitor_' + botIdForStorage;
  var visitorId = localStorage.getItem(storageKey);
  if (!visitorId) {
    visitorId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 3 | 8);
      return v.toString(16);
    });
    localStorage.setItem(storageKey, visitorId);
  }

  var conversationId = null;
  var open = false;
  var container = null;
  var panel = null;
  var messagesEl = null;
  var inputEl = null;

  function api(path, opts) {
    opts = opts || {};
    var url = base + path;
    var init = {
      method: opts.method || 'GET',
      headers: opts.headers || {}
    };
    if (token) init.headers['Authorization'] = 'Bearer ' + token;
    if (opts.body) {
      init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
      if (!init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';
    }
    return fetch(url, init).then(function(r) {
      if (!r.ok) throw new Error('Request failed');
      return r.json();
    });
  }

  function createConversationOnLoad() {
    var body = token ? { visitorId: visitorId } : { botId: botId, visitorId: visitorId };
    return api('/conversations', {
      method: 'POST',
      body: body
    }).then(function(c) {
      // API is wrapped in { data: { ...conversation } }
      var convo = c && c.data ? c.data : c;
      conversationId = convo && convo.id;
      console.log('[Onboard widget] Conversation created on page load:', c);
      return c;
    });
  }

  function endConversation() {
    if (!conversationId) return;
    var url = base + '/conversations/' + conversationId + '/end';
    var body = JSON.stringify({ visitorId: visitorId });
    navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
  }

  function loadMessages() {
    if (!conversationId) return Promise.resolve([]);
    return api('/conversations/' + conversationId + '/messages?visitorId=' + encodeURIComponent(visitorId))
      .then(function(res) {
        // ApiResponse<{ messages[] }> but our controller returns Message[]
        // so res.data is the array (or res itself without wrapper in non-wrapped envs)
        return res && Array.isArray(res.data) ? res.data : (res.data || res || []);
      });
  }

  function addMessageToConversation(text) {
    if (!conversationId) return Promise.reject(new Error('No conversation'));
    return api('/conversations/' + conversationId + '/messages', {
      method: 'POST',
      body: { visitorId: visitorId, content: text }
    });
  }

  function renderMessages(list) {
    if (!messagesEl) return;
    messagesEl.innerHTML = '';
    (list || []).forEach(function(m) {
      var div = document.createElement('div');
      div.className = 'ob-msg ob-msg-' + (m.sender === 'USER' ? 'user' : 'bot');
      var p = document.createElement('p');
      p.textContent = m.content;
      div.appendChild(p);
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function openPanel() {
    if (open) return;
    open = true;
    if (!panel) buildPanel();
    panel.style.display = 'block';
  }

  function closePanel() {
    open = false;
    if (panel) panel.style.display = 'none';
  }

  function togglePanel() {
    open ? closePanel() : openPanel();
  }

  function buildPanel() {
    container = document.createElement('div');
    container.id = 'onboard-widget-root';
    container.innerHTML = '<button id="onboard-widget-btn" type="button" aria-label="Open chat">Chat</button>' +
      '<div id="onboard-widget-panel" style="display:none;">' +
      '<div class="ob-header"><span>Chat</span><button type="button" class="ob-close" aria-label="Close">×</button></div>' +
      '<div class="ob-messages"></div>' +
      '<div class="ob-input-wrap"><input type="text" class="ob-input" placeholder="Type a message..." /><button type="button" class="ob-send">Send</button></div>' +
      '</div>';
    var s = document.createElement('style');
    s.textContent = '#onboard-widget-root{position:fixed;bottom:20px;right:20px;font-family:system-ui,sans-serif;z-index:999999;}' +
      '#onboard-widget-btn{width:56px;height:56px;border-radius:50%;border:none;background:#2563eb;color:#fff;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.2);}' +
      '#onboard-widget-btn:hover{background:#1d4ed8;}' +
      '#onboard-widget-panel{width:360px;max-width:calc(100vw - 40px);height:420px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.15);display:flex;flex-direction:column;overflow:hidden;}' +
      '.ob-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#2563eb;color:#fff;}' +
      '.ob-close{background:transparent;border:none;color:#fff;font-size:24px;cursor:pointer;line-height:1;}' +
      '.ob-messages{flex:1;overflow-y:auto;padding:12px;}' +
      '.ob-msg{margin-bottom:8px;}' +
      '.ob-msg p{margin:0;padding:8px 12px;border-radius:8px;max-width:85%;}' +
      '.ob-msg-user p{margin-left:auto;background:#2563eb;color:#fff;}' +
      '.ob-msg-bot p{background:#f1f5f9;color:#1e293b;}' +
      '.ob-input-wrap{display:flex;gap:8px;padding:12px;border-top:1px solid #e2e8f0;}' +
      '.ob-input{flex:1;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;}' +
      '.ob-send{padding:10px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;}';
    document.head.appendChild(s);
    document.body.appendChild(container);
    panel = document.getElementById('onboard-widget-panel');
    messagesEl = panel.querySelector('.ob-messages');
    inputEl = panel.querySelector('.ob-input');
    document.getElementById('onboard-widget-btn').onclick = togglePanel;
    panel.querySelector('.ob-close').onclick = closePanel;
    panel.querySelector('.ob-send').onclick = function() {
      var text = (inputEl.value || '').trim();
      if (!text) return;
      inputEl.value = '';
      addMessageToConversation(text).then(function() {
        return loadMessages();
      }).then(renderMessages).catch(function(err) {
        console.warn('[Onboard widget]', err);
      });
    };
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') panel.querySelector('.ob-send').click();
    });
  }

  function init() {
    buildPanel();
    createConversationOnLoad().catch(function(err) {
      console.warn('[Onboard widget]', err);
    });
    window.addEventListener('beforeunload', endConversation);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`.trim();
