// ==UserScript==
// @name         Paragon Mutual Unfollow (iPhone Safari)
// @namespace    https://github.com/thewire1o1/paragon-life-instagram-bot
// @version      0.1.0
// @description  Selectively unfollow mutual Instagram followers using your own export. Never unfollows non-followers.
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const KEY = 'paragon_mutuals_v1';
  const ROOT = 'pl-mutual-tool';
  if (window.top !== window || document.getElementById(ROOT)) return;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
  let data = Object.assign({ followers: [], following: [], queue: [], done: [], skipped: [], running: false, batch: 15, inBatch: 0, delay: 18, pauseReason: '', exportAt: '', owner: '', excludes: [] }, load());
  const save = () => localStorage.setItem(KEY, JSON.stringify(data));
  const normalize = v => String(v || '').replace(/^@/, '').trim().toLowerCase();
  const valid = v => /^[a-z0-9._]{1,30}$/.test(normalize(v));
  const unique = list => [...new Set(list.map(normalize).filter(valid))];
  const common = () => data.following.filter(name => new Set(data.followers).has(name));
  const candidates = () => unique(common()).filter(name => !data.excludes.includes(name) && !data.done.includes(name) && !data.skipped.includes(name));
  const text = value => document.createTextNode(value);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const safe = str => String(str || '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const css = document.createElement('style');
  css.textContent = '#'+ROOT+'{position:fixed;bottom:18px;right:14px;z-index:2147483647;font:14px/1.5 -apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#f4ece0}#'+ROOT+' *{box-sizing:border-box}#'+ROOT+' button,#'+ROOT+' select,#'+ROOT+' input,#'+ROOT+' textarea{font:inherit}#'+ROOT+' .fab{background:#b58b55;color:#15120f;border:0;border-radius:28px;padding:13px 18px;font-weight:750;box-shadow:0 4px 20px #0007}#'+ROOT+' .panel{display:none;position:absolute;right:0;bottom:55px;width:min(92vw,395px);max-height:78dvh;overflow:auto;background:#181713;border:1px solid #766247;border-radius:16px;box-shadow:0 10px 55px #000a;padding:18px}#'+ROOT+'.open .panel{display:block}#'+ROOT+' .heading{font-size:19px;font-weight:800;margin:0 0 5px}#'+ROOT+' .muted{color:#bfb7ab;font-size:12px}#'+ROOT+' .stat{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}#'+ROOT+' .stat div{background:#28241e;border-radius:9px;padding:8px;font-size:12px}#'+ROOT+' .stat strong{display:block;font-size:20px;color:#d5ad76}#'+ROOT+' label{display:block;margin:10px 0 4px;font-size:12px;color:#d8c7ae}#'+ROOT+' textarea,#'+ROOT+' input[type=text],#'+ROOT+' input[type=number],#'+ROOT+' select{width:100%;background:#24221f;border:1px solid #675742;border-radius:8px;padding:8px;color:#fff}#'+ROOT+' input[type=file]{max-width:100%;font-size:12px}#'+ROOT+' button.action{background:#b58b55;border:0;border-radius:8px;color:#17130e;padding:10px 12px;font-weight:700;margin:5px 5px 0 0}#'+ROOT+' button.alt{background:#3a332b;color:#eee2d1}#'+ROOT+' button:disabled{opacity:.35}#'+ROOT+' .msg{padding:8px 0;font-size:12px;color:#dac7ad;white-space:pre-wrap;overflow-wrap:anywhere}#'+ROOT+' .small{font-size:12px}#'+ROOT+' .checks{display:flex;gap:7px;align-items:start;margin:10px 0}#'+ROOT+' .checks input{margin-top:3px}#'+ROOT+' .checks label{margin:0}';
  document.head.appendChild(css);
  const root = document.createElement('div');
  root.id = ROOT;
  root.innerHTML = '<button class="fab" id="pl-toggle" type="button">Mutuals</button><section class="panel"><div class="heading">Mutual Unfollow</div><div class="muted">Keep people who have not followed you. Unfollow only people who follow you back.</div><div class="stat"><div>Followers<strong id="pl-followers">0</strong></div><div>Following<strong id="pl-following">0</strong></div><div>Mutuals<strong id="pl-mutuals">0</strong></div><div>Completed<strong id="pl-done">0</strong></div></div><div id="pl-import"><label>1. Select Instagram JSON files: followers_1.json (and additional parts), following.json</label><input id="pl-files" type="file" accept=".json,application/json" multiple/><div class="muted">Download from Instagram: Accounts Center → Your information and permissions → Download your information → Followers and following → All time → JSON. Unzip in Files, then choose the JSON files. Nothing is uploaded.</div></div><label for="pl-owner">2. Instagram username (account that exported these files)</label><input id="pl-owner" type="text" placeholder="@youraccount" autocapitalize="none" autocomplete="off" spellcheck="false"><label for="pl-keep">3. Never unfollow these accounts (one username per line, optional)</label><textarea id="pl-keep" rows="2" placeholder="@friend&#10;@favoritecreator"></textarea><label for="pl-batch">4. Actions per session</label><select id="pl-batch"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="50">50</option></select><div class="checks"><input id="pl-confirm" type="checkbox"><label for="pl-confirm">I checked the preview and I am signed into the same Instagram account as the export.</label></div><button id="pl-preview" class="action alt" type="button">Preview accounts</button><button id="pl-start" class="action" type="button">Start batch</button><button id="pl-pause" class="action alt" type="button">Pause</button><div id="pl-status" class="msg"></div><details><summary class="small">Preview / history</summary><div id="pl-list" class="msg"></div></details><button id="pl-reset" type="button" class="action alt">Reset saved data</button><div class="muted">Leave Safari open. The script pauses after each batch, on errors, or if Instagram restricts actions. Instagram can change its interface and break automation. Version 0.1.0.</div></section>';
  document.body.appendChild(root);
  const el = id => document.getElementById(id);
  el('pl-toggle').onclick = () => root.classList.toggle('open');
  const status = msg => { data.pauseReason = msg; save(); render(); };
  const preview = () => {
    const set = candidates();
    el('pl-list').textContent = set.length ? set.slice(0,160).map((n,i) => (i+1) + '. @' + n).join('\n') + (set.length>160 ? '\n…' : '') : 'No eligible mutuals loaded.';
  };
  const render = () => {
    el('pl-followers').textContent = data.followers.length.toLocaleString();
    el('pl-following').textContent = data.following.length.toLocaleString();
    el('pl-mutuals').textContent = common().length.toLocaleString();
    el('pl-done').textContent = data.done.length.toLocaleString();
    el('pl-status').textContent = (data.running ? 'RUNNING. ' : 'PAUSED. ') + (data.pauseReason || 'Ready.') + '\nEligible: ' + candidates().length + '. Remaining in batch: ' + Math.max(0,data.batch-data.inBatch) + '.';
  };
  el('pl-preview').onclick = () => { saveOptions(); preview(); render(); root.classList.add('open'); };
  function saveOptions() {
    data.owner = normalize(el('pl-owner').value);
    data.excludes = unique(el('pl-keep').value.split(/[\s,]+/));
    data.batch = Number(el('pl-batch').value) || 15;
    save();
  }
  el('pl-owner').value = data.owner;
  el('pl-keep').value = (data.excludes || []).join('\n');
  el('pl-batch').value = String(data.batch || 15);
  el('pl-pause').onclick = () => { data.running = false; status('Paused by you.'); };
  el('pl-reset').onclick = () => {
    if (!window.confirm('Erase all imported lists, progress, and exclusions?')) return;
    localStorage.removeItem(KEY); data = Object.assign(data,{followers:[],following:[],queue:[],done:[],skipped:[],running:false,inBatch:0,pauseReason:'Reset.',owner:'',excludes:[]}); el('pl-owner').value=''; el('pl-keep').value=''; el('pl-files').value=''; el('pl-confirm').checked=false; preview(); render();
  };
  function extract(entries) {
    if (!Array.isArray(entries)) return [];
    return unique(entries.map(item => {
      const rec = item && item.string_list_data;
      if (Array.isArray(rec) && rec.length) return rec[0].value || '';
      return item && item.title || '';
    }));
  }
  el('pl-files').onchange = async evt => {
    const files = Array.from(evt.target.files || []);
    if (!files.length) return;
    const followers = [], following = [];
    let foundFollowers = 0, foundFollowing = 0, errors = [];
    for (const f of files) {
      try {
        const obj = JSON.parse(await f.text()), name = f.name.toLowerCase();
        if (/^followers(?:_\d+)?\.json$/.test(name) || Array.isArray(obj)) {
          const rows = extract(Array.isArray(obj) ? obj : (obj.relationships_followers || []));
          if (rows.length) { followers.push(...rows); foundFollowers++; }
        } else if (/^(following|following_accounts)\.json$/.test(name) || obj.relationships_following) {
          const rows = extract(obj.relationships_following || []);
          if (rows.length) { following.push(...rows); foundFollowing++; }
        } else { errors.push(f.name + ' is not a recognized follower/following file'); }
      } catch (e) { errors.push(f.name + ': ' + e.message); }
    }
    if (!foundFollowers || !foundFollowing) { status('Import stopped. Choose BOTH followers_1.json and following.json (plus additional follower files, if present). ' + errors.join('; ')); return; }
    data.running = false;
    data.followers = unique(followers);
    data.following = unique(following);
    data.done = [];
    data.skipped = [];
    data.queue = [];
    data.inBatch = 0;
    data.exportAt = new Date().toISOString();
    data.pauseReason = 'Import complete. Review preview, enter account, then start.';
    el('pl-confirm').checked = false;
    save();
    render(); preview();
  };
  el('pl-start').onclick = () => {
    saveOptions();
    if (!data.followers.length || !data.following.length) { status('Import followers and following JSON first.'); return; }
    if (!valid(data.owner)) { status('Enter the account username the files belong to.'); return; }
    if (!el('pl-confirm').checked) { status('Confirm that this is the same signed-in account and you reviewed the preview.'); return; }
    if (data.running) return;
    data.inBatch = 0;
    data.queue = candidates();
    if (!data.queue.length) { status('No eligible mutuals left.'); return; }
    data.running = true; data.pauseReason = 'Starting batch of up to ' + data.batch + '.';
    save(); render(); step();
  };
  function halted(message) { data.running=false; status(message); root.classList.add('open'); }
  function isBlocked() {
    const body = (document.body.innerText || '').slice(-8000).toLowerCase();
    return /try again later|we restrict certain activity|we limit how often|please wait a few minutes|action blocked|temporarily blocked/.test(body);
  }
  function buttons(ctx) {
    return Array.from((ctx || document).querySelectorAll('button,[role="button"]')).filter(e => !root.contains(e));
  }
  const labelOf = e => (e.innerText || e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g,' ').toLowerCase();
  function buttonNamed(ctx, exact) { return buttons(ctx).find(e => labelOf(e) === exact); }
  async function awaitButton(ctx, name, timeout) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (!data.running) return null;
      const b = buttonNamed(typeof ctx === 'function' ? ctx() : ctx, name);
      if (b) return b;
      if (isBlocked()) return null;
      await sleep(400);
    }
    return null;
  }
  function profileHeader() { return document.querySelector('main header') || document.querySelector('header'); }
  function atUsername(name) { return normalize(decodeURIComponent(location.pathname).split('/').filter(Boolean)[0]) === name; }
  function next() {
    if (!data.running) return;
    if (data.inBatch >= data.batch) { halted('Batch complete. Tap Start batch for another.'); return; }
    const pending = candidates();
    if (!pending.length) { halted('All eligible mutuals processed.'); return; }
    const username = pending[0];
    if (!atUsername(username)) {
      data.pauseReason = 'Opening @' + username;
      save(); render();
      location.assign('https://www.instagram.com/' + encodeURIComponent(username) + '/');
      return;
    }
    processProfile(username);
  }
  async function processProfile(username) {
    if (isBlocked()) return halted('Instagram restriction detected. No further actions taken.');
    await sleep(1400);
    let header = profileHeader();
    let following = await awaitButton(() => profileHeader(), 'following', 12000);
    if (!data.running) return;
    if (!atUsername(username)) return halted('Unexpected profile navigation. Stopped.');
    if (!following) {
      const already = buttonNamed(header, 'follow') || buttonNamed(header, 'follow back');
      if (already) {
        data.skipped.push(username); data.inBatch++; data.pauseReason = '@' + username + ' was already unfollowed. Skipped.'; save(); render(); return scheduleNext();
      }
      return halted('Could not verify Following button for @' + username + '. No action taken. Instagram layout may have changed.');
    }
    following.click();
    let un = await awaitButton(() => document.querySelector('[role="dialog"]') || document, 'unfollow', 6500);
    if (!data.running) return;
    if (un) un.click();
    else if (!(buttonNamed(profileHeader(), 'follow') || buttonNamed(profileHeader(), 'follow back'))) return halted('Unfollow confirmation not found for @' + username + '. Stopped to prevent a wrong action.');
    const success = await awaitButton(() => profileHeader(), 'follow', 9500) || await awaitButton(() => profileHeader(), 'follow back', 3000);
    if (!data.running) return;
    if (!success || isBlocked()) return halted('Could not verify unfollow succeeded for @' + username + '. Stopped for review.');
    data.done.push(username);
    data.inBatch++;
    data.pauseReason = 'Verified unfollow @' + username + ' (' + data.inBatch + '/' + data.batch + ' in batch).';
    save(); render(); scheduleNext();
  }
  function scheduleNext() {
    if (!data.running) return;
    if (data.inBatch >= data.batch) { halted('Batch complete. Tap Start batch for another.'); return; }
    const delay = (data.delay + Math.floor(Math.random() * 8)) * 1000;
    setTimeout(() => { if (data.running) next(); }, delay);
  }
  function step() {
    if (!data.running) return;
    if (isBlocked()) return halted('Instagram restriction detected. Stopped.');
    next();
  }
  render();
  if (data.running) setTimeout(step, 2000);
})();