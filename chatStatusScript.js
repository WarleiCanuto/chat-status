// ==UserScript==
// @name         Google Chat Status
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add botão para troca de status no Google Chat (https://chat.google.com/)
// @author       WarleiC
// @match        https://chat.google.com/*
// @match        https://mail.google.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const CONFIG = {
    // Fill w/ the sniffed values
    LUNCH_URL: '', // SNIFFED "lunch status url"
    AWAY_URL:  '', // SNIFFED "away url"
    AT_TOKEN:  ''  // SNIFFED "at"
  };

  function addLunchButton() {
    const container = document.querySelector('div.gb_v.gb_ke.bGJ');
    if (!container) {
      console.warn('❌ Container do botão não encontrado.');
      return;
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
    try {
      await send(CONFIG.LUNCH_URL, {
        'f.req': '[[["f8a8Te","[null,[\\\"Almoço\\\",null,null,[\\\"🍴\\\"]],\\\"3600000000\\\"]",null,"generic"]]]',
        'at': CONFIG.AT_TOKEN
      });
    } catch (e) {
      console.error(e);
    }

    try {
      await send(CONFIG.AWAY_URL, {
        'f.req': '[[["oBBjl","[0]",null,"generic"]]]',
        'at': CONFIG.AT_TOKEN
      });
    } catch (e) {
      console.error(e);
    } finally { //skip CORS STATUS 200
      notify('✅ Status alterado para Almoço');
    }
  }

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
