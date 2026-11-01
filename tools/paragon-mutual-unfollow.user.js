// ==UserScript==
// @name         Paragon Mutual Unfollow (iPhone Safari)
// @namespace    https://github.com/thewire1o1/paragon-life-instagram-bot
// @version      0.3.0
// @updateURL    https://raw.githubusercontent.com/thewire1o1/paragon-life-instagram-bot/main/tools/paragon-mutual-unfollow.user.js
// @downloadURL  https://raw.githubusercontent.com/thewire1o1/paragon-life-instagram-bot/main/tools/paragon-mutual-unfollow.user.js
// @description  Scan Instagram directly in Safari and selectively unfollow mutuals. No export required.
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
  let data = Object.assign({ followers: [], following: [], queue: [], done: [], skipped: [], running: false, batch: 15, inBatch: 0, delay: 18, pauseReason: '', exportAt: '', owner: '', excludes: [], scanning: false, scanStage: '', scanStarted: 0, scanStatus: '' }, load());
  const save = () => localStorage.setItem(KEY, JSON.stringify(data));
  const normalize = v => String(v || '').replace(/^@/, '').trim().toLowerCase();
  const valid = v => /^[a-z0-9._]{1,30}$/.test(normalize(v));
  const unique = list => [...new Set(list.map(normalize).filter(valid))];
  const common = () => { const followerSet = new Set(data.followers); return data.following.filter(name => followerSet.has(name)); };
  const candidates = () => unique(common()).filter(name => !data.excludes.includes(name) && !data.done.includes(name) && !data.skipped.includes(name));
  const text = value => document.createTextNode(value);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const safe = str => String(str || '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const css = document.createElement('style');
  css.textContent = '#'+ROOT+'{position:fixed;bottom:18px;right:14px;z-index:2147483647;font:14px/1.5 -apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#f4ece0}#'+ROOT+' *{box-sizing:border-box}#'+ROOT+' button,#'+ROOT+' select,#'+ROOT+' input,#'+ROOT+' textarea{font:inherit}#'+ROOT+' .fab{background:#b58b55;color:#15120f;border:0;border-radius:28px;padding:13px 18px;font-weight:750;box-shadow:0 4px 20px #0007}#'+ROOT+' .panel{display:none;position:absolute;right:0;bottom:55px;width:min(92vw,395px);max-height:78dvh;overflow:auto;background:#181713;border:1px solid #766247;border-radius:16px;box-shadow:0 10px 55px #000a;padding:18px}#'+ROOT+'.open .panel{display:block}#'+ROOT+' .heading{font-size:19px;font-weight:800;margin:0 0 5px}#'+ROOT+' .muted{color:#bfb7ab;font-size:12px}#'+ROOT+' .stat{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}#'+ROOT+' .stat div{background:#28241e;border-radius:9px;padding:8px;font-size:12px}#'+ROOT+' .stat strong{display:block;font-size:20px;color:#d5ad76}#'+ROOT+' label{display:block;margin:10px 0 4px;font-size:12px;color:#d8c7ae}#'+ROOT+' textarea,#'+ROOT+' input[type=text],#'+ROOT+' input[type=number],#'+ROOT+' select{width:100%;background:#24221f;border:1px solid #675742;border-radius:8px;padding:8px;color:#fff}#'+ROOT+' input[type=file]{max-width:100%;font-size:12px}#'+ROOT+' button.action{background:#b58b55;border:0;border-radius:8px;color:#17130e;padding:10px 12px;font-weight:700;margin:5px 5px 0 0}#'+ROOT+' button.alt{background:#3a332b;color:#eee2d1}#'+ROOT+' button:disabled{opacity:.35}#'+ROOT+' .msg{padding:8px 0;font-size:12px;color:#dac7ad;white-space:pre-wrap;overflow-wrap:anywhere}#'+ROOT+' .small{font-size:12px}#'+ROOT+' .checks{display:flex;gap:7px;align-items:start;margin:10px 0}#'+ROOT+' .checks input{margin-top:3px}#'+ROOT+' .checks label{margin:0}';
  document.head.appendChild(css);
  const root = document.createElement('div');
  root.id = ROOT;
  root.innerHTML = '<button class="fab" id="pl-toggle" type="button">Mutuals</button><section class="panel"><div class="heading">Mutual Unfollow</div><div class="muted">Keep people who have not followed you. Unfollow only people who follow you back.</div><div class="stat"><div>Followers<strong id="pl-followers">0</strong></div><div>Following<strong id="pl-following">0</strong></div><div>Mutuals<strong id="pl-mutuals">0</strong></div><div>Completed<strong id="pl-done">0</strong></div></div><div id="pl-import"><label>1. Choose your downloaded Instagram ZIP file</label><input id="pl-files" type="file" accept=".zip,application/zip,.json,application/json" multiple/><div class="muted">Select the original ZIP from Files. No need to unzip. For extracted files, choose followers_1.json and following.json together. Everything stays on your phone.</div></div><details><summary class="small">Alternative: Scan Instagram directly</summary><div id="pl-direct"><button id="pl-live" class="action alt" type="button">Scan Followers + Following</button><div class="muted">Only if you do not have a JSON export. Leave Safari open.</div></div></details><label for="pl-owner">Instagram username</label><input id="pl-owner" type="text" placeholder="@youraccount" autocapitalize="none" autocomplete="off" spellcheck="false"><label for="pl-keep">Never unfollow these accounts (one username per line, optional)</label><textarea id="pl-keep" rows="2" placeholder="@friend&#10;@favoritecreator"></textarea><label for="pl-batch">Actions per session</label><select id="pl-batch"><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="50">50</option></select><div class="checks"><input id="pl-confirm" type="checkbox"><label for="pl-confirm">I checked the mutuals preview and am signed into the Instagram account shown above.</label></div><button id="pl-preview" class="action alt" type="button">Preview accounts</button><button id="pl-start" class="action" type="button">Start batch</button><button id="pl-pause" class="action alt" type="button">Pause</button><div id="pl-status" class="msg"></div><details><summary class="small">Preview / history</summary><div id="pl-list" class="msg"></div></details><button id="pl-reset" type="button" class="action alt">Reset saved data</button><div class="muted">Leave Safari open. The script pauses after each batch, on errors, or if Instagram restricts actions. Instagram can change its interface and break automation. Version 0.3.0.</div></section>';
  document.body.appendChild(root);
  const el = id => document.getElementById(id);
  el('pl-toggle').onclick = () => root.classList.toggle('open');
  const status = msg => { data.pauseReason = msg; save(); render(); };
  const preview = () => {
    const set = candidates();
    el('pl-list').textContent = set.length ? set.slice(0,160).map((n,i) => (i+1) + '. @' + n).join('\n') + (set.length>160 ? '\n…' : '') : 'No eligible mutuals loaded.';
  };
  const render = () => {
    el('pl-live').disabled = Boolean(data.scanning);
    el('pl-toggle').textContent = data.scanning ? 'Scanning…' : 'Mutuals';
    el('pl-followers').textContent = data.followers.length.toLocaleString();
    el('pl-following').textContent = data.following.length.toLocaleString();
    el('pl-mutuals').textContent = common().length.toLocaleString();
    el('pl-done').textContent = data.done.length.toLocaleString();
    el('pl-status').textContent = (data.scanning ? 'SCANNING. ' : data.running ? 'RUNNING. ' : 'READY. ') + (data.scanStatus || data.pauseReason || 'Ready.') + '\nEligible mutuals: ' + candidates().length + '. Remaining in batch: ' + Math.max(0,data.batch-data.inBatch) + '.';
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
    if (!window.confirm('Erase all scanned/imported lists, progress, and exclusions?')) return;
    localStorage.removeItem(KEY); data = Object.assign(data,{followers:[],following:[],queue:[],done:[],skipped:[],running:false,inBatch:0,pauseReason:'Reset.',owner:'',excludes:[],scanning:false,scanStage:'',scanStarted:0,scanStatus:''}); el('pl-owner').value=''; el('pl-keep').value=''; el('pl-files').value=''; el('pl-confirm').checked=false; preview(); render();
  };

  // Scan Instagram's own visible followers and following lists, without a Meta export.
  // Strictly collect profile links inside the list pane, never from the surrounding site.
  let scanBusy = false;
  const scanWait = async ms => new Promise(resolve => setTimeout(resolve, ms));
  const ignoredProfilePaths = new Set(['accounts','direct','explore','reels','reel','p','stories','about','developer','privacy','legal','web','api','challenge','settings','graphql']);
  function profileNameFromLink(href) {
    try {
      const u = new URL(href, location.origin);
      if (u.hostname !== location.hostname) return '';
      const match = u.pathname.match(/^\/([A-Za-z0-9._]{1,30})\/$/);
      if (!match || ignoredProfilePaths.has(match[1].toLowerCase())) return '';
      return normalize(match[1]);
    } catch (_) { return ''; }
  }
  function paneFor(kind) {
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      const headers = [...dialog.querySelectorAll('h1,h2,h3,[role="heading"]')].map(node => node.textContent.trim().toLowerCase());
      // A dialog with a recognizable opposite list heading is never scanned.
      if (headers.includes(kind === 'followers' ? 'following' : 'followers')) return null;
      if (headers.length && !headers.some(h => h.includes(kind)) &&
          location.pathname.toLowerCase().indexOf('/' + normalize(data.owner) + '/' + kind)===-1) return null;
      return dialog;
    }
    const pathname = location.pathname.toLowerCase().replace(/\/+$/, '');
    const owner = normalize(data.owner);
    if (pathname === '/' + owner + '/' + kind) {
      const main = document.querySelector('main');
      if (!main) return null;
      const headings=[...main.querySelectorAll('h1,h2,h3,[role="heading"]')].map(x => x.textContent.toLowerCase());
      const userLinks=[...main.querySelectorAll('a[href]')].filter(a => profileNameFromLink(a.getAttribute('href'))).length;
      if (headings.some(x => x.includes(kind)) || userLinks >= 4) return main;
    }
    return null;
  }
  function scrollTarget(pane) {
    const all = [pane, ...pane.querySelectorAll('div,section,ul')];
    const candidates = all.filter(node => {
      if (!node || node.clientHeight < 100) return false;
      if (!node.querySelector('a[href]')) return false;
      const css = getComputedStyle(node);
      return node.scrollHeight > node.clientHeight + 20 && /auto|scroll/.test(css.overflowY);
    });
    candidates.sort((a,b) => (a.clientHeight-b.clientHeight));
    return candidates[0] || (pane.getAttribute('role') === 'dialog' ? pane : document.scrollingElement);
  }
  function collectNames(pane, found) {
    if (!pane) return;
    const links = pane.querySelectorAll('a[href]');
    for (const link of links) {
      const username = profileNameFromLink(link.getAttribute('href'));
      if (username && username !== normalize(data.owner)) found.add(username);
    }
  }
  async function findList(kind) {
    for (let i=0; i<25; i++) {
      const scope = paneFor(kind);
      if (scope && scope.querySelector('a[href]')) return scope;
      await scanWait(500);
    }
    return null;
  }
  async function scanOne(kind) {
    const scope = await findList(kind);
    if (!scope) throw Error('Could not open the ' + kind + ' list on this Instagram page.');
    const scroll = scrollTarget(scope);
    if (!scroll) throw Error('Could not identify the list scroll area.');
    const found = new Set();
    let stable=0,lastSize=-1;
    const started=Date.now();
    for (let iteration=0;iteration<450;iteration++) {
      if (!data.scanning || data.scanStage !== kind) throw Error('Scan interrupted.');
      if (!scope.isConnected) throw Error('Instagram closed the ' + kind + ' list during scanning.');
      collectNames(scope,found);
      const atBottom = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 6;
      if (found.size===lastSize && atBottom) stable++;
      else stable=0;
      lastSize=found.size;
      data.scanStatus = 'Reading ' + kind + ': ' + found.size + ' accounts. ' + (atBottom ? 'Checking end of list…' : 'Scrolling…');
      render();
      if (found.size>0 && stable>=9) return [...found];
      if (Date.now()-started>150000) throw Error(kind + ' scan timed out; no partial list was saved.');
      if (scroll === document.scrollingElement) window.scrollBy(0,Math.max(480,window.innerHeight*0.85));
      else {
        const offset=Math.max(350,scroll.clientHeight * 0.85);
        scroll.scrollTop=Math.min(scroll.scrollHeight,scroll.scrollTop + offset);
        scroll.dispatchEvent(new Event('scroll',{bubbles:true}));
      }
      await scanWait(700);
    }
    throw Error('Could not confirm end of ' + kind + ' list.');
  }
  async function runScan() {
    if (scanBusy || !data.scanning) return;
    scanBusy = true;
    try {
      if (Date.now()-data.scanStarted > 12*60*1000) throw Error('Scan session expired; tap Scan again.');
      const kind=data.scanStage;
      if (kind!=='followers' && kind!=='following') throw Error('Invalid scan step.');
      const owner=normalize(data.owner);
      if (!valid(owner)) throw Error('Enter the Instagram username first.');
      const expectedPath='/' + owner + '/' + kind + '/';
      if (location.pathname.toLowerCase().replace(/\/+$/,'/') !== expectedPath) {
        save();
        location.assign('https://www.instagram.com' + expectedPath);
        return;
      }
      data.scanStatus='Opening ' + kind + ' list…';
      render();
      let list = await findList(kind);
      if (!list) {
        const link=[...document.querySelectorAll('a[href]')].find(a => {
          try {return new URL(a.href).pathname.toLowerCase().replace(/\/+$/,'/')===expectedPath;}catch(_){return false;}
        });
        if (link) {
          link.click();
          list = await findList(kind);
        }
      }
      if (!list) throw Error('Instagram did not display the ' + kind + ' list. Take a screenshot of the current page.');
      const captured=await scanOne(kind);
      if (!captured.length) throw Error('The ' + kind + ' list was empty. Stopped.');
      data[kind]=unique(captured);
      data.done=[];
      data.skipped=[];
      data.queue=[];
      el('pl-confirm').checked=false;
      if (kind==='followers') {
        data.scanStage='following';
        data.scanStatus='Captured ' + data.followers.length + ' followers. Opening following…';
        save(); render();
        location.assign('https://www.instagram.com/' + owner + '/following/');
        return;
      }
      data.scanning=false;
      data.scanStage='';
      data.scanStatus='Scan finished: ' + data.followers.length + ' followers, ' + data.following.length + ' following, ' + common().length + ' mutuals. Review the list and confirm before any unfollows.';
      data.pauseReason=data.scanStatus;
      data.exportAt=new Date().toISOString();
      save();
      render(); preview(); root.classList.add('open');
    } catch (err) {
      data.scanning=false;
      data.scanStage='';
      data.scanStatus='';
      status('Scan stopped: ' + err.message + ' No unfollows performed.');
      root.classList.add('open');
    } finally {scanBusy=false;}
  }
  el('pl-live').onclick=() => {
    saveOptions();
    if (!valid(data.owner)) {
      const fromPath=location.pathname.match(/^\/([A-Za-z0-9._]+)\/$/);
      if (fromPath && valid(fromPath[1]) && !ignoredProfilePaths.has(normalize(fromPath[1]))) {
        data.owner=normalize(fromPath[1]);
        el('pl-owner').value=data.owner;
      }
    }
    if (!valid(data.owner)) { status('Enter your Instagram username to scan.'); return; }
    if (data.running) {data.running=false;}
    data.scanning=true;
    data.scanStage='followers';
    data.scanStarted=Date.now();
    data.scanStatus='Opening ' + data.owner + ' followers…';
    data.followers=[];
    data.following=[];
    data.done=[];
    data.skipped=[];
    data.queue=[];
    save();render();runScan();
  };
  function extract(entries) {
    if (!Array.isArray(entries)) return [];
    return unique(entries.map(item => {
      const rec = item && item.string_list_data;
      if (Array.isArray(rec) && rec.length && rec[0].value) return rec[0].value;
      return item && item.title || '';
    }));
  }

  // Read Meta's ZIP locally, without sending it to a server or unzipping in Files.
  // The ZIP central directory provides the actual compressed size, method and file path.
  async function instagramJsonFromZip(file) {
    const buffer=await file.arrayBuffer();
    if (buffer.byteLength > 60000000) throw Error('ZIP exceeds 60 MB limit for this mobile reader.');
    const dv=new DataView(buffer);
    const u8=new Uint8Array(buffer);
    const u16=p=>dv.getUint16(p,true), u32=p=>dv.getUint32(p,true);
    let end=-1;
    for(let i=buffer.byteLength-22;i>=Math.max(0,buffer.byteLength-65557);i--){
      if(u32(i)===0x06054b50){end=i;break;}
    }
    if(end<0)throw Error('ZIP central directory not found.');
    const total=u16(end+10),offset=u32(end+16);
    if(total===65535 || offset===4294967295)throw Error('ZIP64 archives are not supported.');
    if(total>25000)throw Error('ZIP has too many entries.');
    let pos=offset,rows=[];
    for(let index=0;index<total;index++){
      if(pos+46>buffer.byteLength || u32(pos)!==0x02014b50)throw Error('Invalid ZIP directory entry.');
      const flags=u16(pos+8),method=u16(pos+10),compressed=u32(pos+20),uncompressed=u32(pos+24);
      const nameLength=u16(pos+28),extraLength=u16(pos+30),commentLength=u16(pos+32),localOffset=u32(pos+42);
      const name=new TextDecoder().decode(u8.subarray(pos+46,pos+46+nameLength));
      pos+=46+nameLength+extraLength+commentLength;
      if(!/(^|\/)(followers(?:_\d+)?|following|following_accounts)\.json$/i.test(name))continue;
      if(flags&1)throw Error('The ZIP is password protected.');
      if(uncompressed>20000000)throw Error(name+' is too large to process in Safari.');
      if(localOffset+30>buffer.byteLength||u32(localOffset)!==0x04034b50)throw Error('Invalid ZIP file entry: '+name);
      const localNameLength=u16(localOffset+26),localExtraLength=u16(localOffset+28);
      const contentStart=localOffset+30+localNameLength+localExtraLength;
      if(contentStart+compressed>buffer.byteLength)throw Error('Truncated ZIP entry: '+name);
      const bytes=u8.slice(contentStart,contentStart+compressed);
      let plain;
      if(method===0)plain=bytes;
      else if(method===8)plain=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else throw Error('Unsupported ZIP compression for '+name);
      if(plain.length!==uncompressed)throw Error('ZIP size check failed: '+name);
      rows.push({name:name.split('/').pop(),obj:JSON.parse(new TextDecoder().decode(plain))});
    }
    return rows;
  }
  el('pl-files').onchange = async evt => {
    const files=Array.from(evt.target.files || []);
    if(!files.length)return;
    const followers=[],following=[],errors=[];
    let foundFollowers=0,foundFollowing=0,sourceAccount='';
    for(const file of files){
      try {
        if(/\.zip$/i.test(file.name)){
          const m=file.name.match(/^instagram-(.+?)-\d{4}-\d{2}-\d{2}-/i);
          if(m && valid(m[1]))sourceAccount=normalize(m[1]);
        }
        const records=/\.zip$/i.test(file.name)
          ? await instagramJsonFromZip(file)
          : [{name:file.name,obj:JSON.parse(await file.text())}];
        for(const {name,obj} of records){
          const lower=name.toLowerCase();
          if(/^followers(?:_\d+)?\.json$/.test(lower)){
            const rows=extract(Array.isArray(obj)?obj:(obj.relationships_followers||[]));
            if(rows.length){followers.push(...rows);foundFollowers++;}
          }else if(/^(following|following_accounts)\.json$/.test(lower)){
            const rows=extract(obj.relationships_following||[]);
            if(rows.length){following.push(...rows);foundFollowing++;}
          }
        }
      } catch(err){errors.push(file.name+': '+err.message);}
    }
    if(errors.length){status('File could not be fully verified. '+errors.join('; '));return;}
    if(!foundFollowers||!foundFollowing){
      status('Missing followers or following data. Select the original Instagram ZIP or both JSON files.');return;
    }
    data.running=false;
    data.scanning=false;
    data.scanStatus='';
    data.scanStage='';
    data.followers=unique(followers);
    data.following=unique(following);
    data.done=[];
    data.skipped=[];
    data.queue=[];
    data.inBatch=0;
    data.exportAt=new Date().toISOString();
    if(sourceAccount){data.owner=sourceAccount;el('pl-owner').value=sourceAccount;}
    data.pauseReason='Verified import: '+data.followers.length+' followers, '+data.following.length+
      ' following, '+common().length+' mutuals. Check the preview and account before starting.';
    el('pl-confirm').checked=false;
    save();render();preview();root.classList.add('open');
  };

  el('pl-start').onclick = () => {
    saveOptions();
    if (!data.followers.length || !data.following.length) { status('Import the Instagram ZIP or scan the lists first.'); return; }
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
    return ctx ? Array.from(ctx.querySelectorAll('button,[role="button"]')).filter(e => !root.contains(e)) : [];
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
  function profileHeader() { return document.querySelector('main header'); }
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
    let un = await awaitButton(() => document.querySelector('[role="dialog"]'), 'unfollow', 6500);
    if (!data.running) return;
    if (un) un.click();
    else if (!(buttonNamed(profileHeader(), 'follow') || buttonNamed(profileHeader(), 'follow back'))) return halted('Unfollow confirmation not found for @' + username + '. Stopped to prevent a wrong action.');
    const success = await awaitButton(() => profileHeader(), 'follow', 9500) || await awaitButton(() => profileHeader(), 'follow back', 3000);
    if (!data.running) return;
    if (!success || isBlocked()) return halted('Could not verify unfollow succeeded for @' + username + '. Stopped for review.');
    await sleep(1800);
    if (!(buttonNamed(profileHeader(), 'follow') || buttonNamed(profileHeader(), 'follow back')) || isBlocked()) return halted('Unfollow for @' + username + ' did not remain confirmed. Stopped for review.');
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
  if (data.scanning) setTimeout(runScan, 1300);
  else if (data.running) setTimeout(step, 2000);
})();