// ==UserScript==
// @name         Google Chat Status
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Exibe alerta ao digitar "Até amanhã" & add botão para troca de status para almoço no Google Chat (https://chat.google.com/)
// @author       WarleiC
// @match        https://chat.google.com/*
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const STORAGE_KEY_AT_TOKEN = 'gc_status_at_token';
  const storage = localStorage;
  const CONFIG = {
    SELETOR_CHAT: 'div[jsname="yrriRe"][contenteditable="true"][role="textbox"]',
    LUNCH_URL: 'https://chat.google.com/u/0/_/DynamiteWebUi/data/batchexecute?rpcids=f8a8Te&source-path=%2Fu%2F0%2Fmole%2Fworld&f.sid=8962052064968208759&bl=boq_dynamiteuiserver_20250720.04_p1&hl=pt-BR&soc-app=1&soc-platform=1&soc-device=1&_reqid=1534571&rt=c',
    AWAY_URL:  'https://chat.google.com/u/0/_/DynamiteWebUi/data/batchexecute?rpcids=oBBjl&source-path=%2Fu%2F0%2Fmole%2Fworld&f.sid=-7200601924447778704&bl=boq_dynamiteuiserver_20250720.04_p1&hl=pt-BR&soc-app=1&soc-platform=1&soc-device=1&_reqid=1135082&rt=c',
    AT_TOKEN: storage.getItem(STORAGE_KEY_AT_TOKEN) || ''
  };

  if (CONFIG.AT_TOKEN) {
    window.CONFIG_AT_FROM_PAGE = CONFIG.AT_TOKEN;
  }

  function addLunchButton() {
    const container = document.querySelector('div.mu5alf');
    if (!container) {
      console.warn('❌ Container do botão não encontrado.');
      return;
    } else {
      console.log('✅ Container encontrado.');
    }

    if (document.getElementById('lunch-btn')) return;

    const button = document.createElement('a');
    button.id = 'lunch-btn';
    button.textContent = '🍽';
    button.style.cursor = 'pointer';
    button.style.marginLeft = '10px';
    button.style.fontSize = '30px';
    button.style.color = '#5f6368';
    button.onclick = setLunchRequest;

    container.appendChild(button);
  }


  async function send(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      credentials: 'include',
      body: new URLSearchParams(body).toString()
    });
    return res.text();
  }

  async function setLunchRequest() {
    console.log('🍽 Botão clicado - verificando token...');
    const token = storage.getItem(STORAGE_KEY_AT_TOKEN);
    console.log('🔍 Token no storage:', token ? token.substring(0, 20) + '...' : 'null');
    if (!token) {
      notify('⏳ Aguardando captura automática do token... atualize o status manualmente primeiro.');
      return;
    }

    try {
      await send(CONFIG.LUNCH_URL, {
        'f.req': '[[["f8a8Te","[null,[\\"Almoço\\",null,null,[\\"🍴\\"]],\\"3600000000\\"]",null,"generic"]]]',
        'at': token
      });
    } catch (e) {
      console.error(e);
    }

    try {
      await send(CONFIG.AWAY_URL, {
        'f.req': '[[["oBBjl","[0]",null,"generic"]]]',
        'at': token
      });
    } catch (e) {
      console.error(e);
    } finally {
      notify('✅ Status alterado para Almoço');
    }
  }

  function captureToken(token, source) {
    console.log('🎯 Tentando capturar token:', token ? token.substring(0, 20) + '...' : 'null');
    const currentStorageToken = storage.getItem(STORAGE_KEY_AT_TOKEN);
    console.log('📊 Storage atual:', currentStorageToken ? currentStorageToken.substring(0, 20) + '...' : 'null/vazio');

    if (!token || token.length < 10) {
      console.log('❌ Token inválido ou muito curto');
      return;
    }

    // Sempre salvar se não estiver no storage, independente do window
    if (!currentStorageToken || currentStorageToken !== token) {
      console.log('💾 Salvando token no storage...');
      storage.setItem(STORAGE_KEY_AT_TOKEN, token);
      const saved = storage.getItem(STORAGE_KEY_AT_TOKEN);
      console.log('✅ Token salvo no storage:', saved ? saved.substring(0, 20) + '...' : 'ERRO - não salvou!');
    } else {
      console.log('🔄 Token já está no storage');
    }

    // Atualizar window sempre
    if (window.CONFIG_AT_FROM_PAGE !== token) {
      window.CONFIG_AT_FROM_PAGE = token;
    }
  }

  // Interceptar XMLHttpRequest para capturar at_token
  const OriginalXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OriginalXHR();
    let requestUrl = '';
    const originalOpen = xhr.open;
    const originalSend = xhr.send;

    xhr.open = function(method, url) {
      requestUrl = url?.toString() || '';
      return originalOpen.apply(this, arguments);
    };

    xhr.send = function(body) {
      if (requestUrl.includes('DynamiteWebUi/data/batchexecute')) {
        console.log('📡 Interceptando batchexecute:', requestUrl.substring(0, 80) + '...');
        if (body) {
          try {
            const bodyStr = body.toString();
            const urlParams = new URLSearchParams(bodyStr);
            const atToken = urlParams.get('at');
            console.log('🔍 Parâmetro "at" encontrado:', atToken ? 'sim' : 'não');
            if (atToken && atToken.length > 10) {
              captureToken(atToken, 'xhr');
            }
          } catch (e) {
            console.error('Erro processando body:', e);
          }
        } else {
          console.log('⚠️ Sem body na requisição');
        }
      }
      return originalSend.apply(this, arguments);
    };

    return xhr;
  }
  PatchedXHR.prototype = OriginalXHR.prototype;
  window.XMLHttpRequest = PatchedXHR;

  // Sincronizar CONFIG.AT_TOKEN com storage
  setInterval(() => {
    const storedToken = storage.getItem(STORAGE_KEY_AT_TOKEN);
    if (storedToken && CONFIG.AT_TOKEN !== storedToken) {
      CONFIG.AT_TOKEN = storedToken;
    }
  }, 1000);

  function monitorChat() {
    const campo = document.querySelector(CONFIG.SELETOR_CHAT);
    if (!campo || campo.dataset.monitorado) return;
    campo.dataset.monitorado = 'true';

    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const texto = campo.innerText.trim().toLowerCase();
        if (texto.includes('até amanhã')) {
          setTimeout(() => alert('🔔 Bater Ponto!'), 100);
        }
      }
    });
  }

  const observer = new MutationObserver(() => monitorChat());

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  monitorChat();

  window.addEventListener('load', () => {
    setTimeout(addLunchButton, 5000); // wait DOM load
  });

  function notify(msg) {
    if (Notification.permission === 'granted') {
      new Notification(msg);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => p === 'granted' && new Notification(msg));
    } else {
      alert(msg);
    }
  }

})();
