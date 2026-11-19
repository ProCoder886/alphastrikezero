// Dev helper: layout audit. Load on the dev page (script tag), then
//   AUD.check(label)  -> { n, issues: [...] }   checks what is on screen right now
//   AUD.scene(name)   -> sets a screen up (menu:tdm, menu:campaign, win:settings:c, armory:a, pause, death, hud:...)
// Issues: out (element outside the window), clip (content cut off by an overflow:hidden box), overlap (two
// elements of the UI overlap), small (touch target under 36 px), scroll (a scrollbar-capable box that scrolls).
window.AUD = {
  SEL: 'button,.chip,.tab,.tb,.ts,input,select,.brk,#joyBase,.armCard,.iconBtn,.pagerBar,.subtabs,h1,h2,.tag,.grpTitle,#modeDesc,#mapInfo,#briefing,#deathStats,.winHead,#armName,#armLock,#armStats,#armAtt,#armView,#interactHint,#holdBar,#breathBar,#nvgHint,#waveBanner h2,#respawn h2,#loadText,#killfeed div,#pgToasts .pgToast,#intelList>*,.row,#touchFree,#tcluster,.howCols>div>*,.ctrls,#armPick,#armEquip,#grenadeHUD,#nvgStatus,#fps,#inventoryUI,#touchSlots,#minimapWrap,#topBox,#ammoBox,#hpBox,#objPanel',
  vis(el) {
    if (!(el.getClientRects().length)) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
    for (let p = el.parentElement; p; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden') return false; }
    return true;
  },
  name(el) { return (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') || el.tagName.toLowerCase(); },
  txt(el) { return (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 22); },
  check(label, opt = {}) {
    const W = innerWidth, H = innerHeight, issues = [], rs = [];
    const q = (sel) => [...document.querySelectorAll(sel)].some(e => this.vis(e));
    // only the topmost layer is audited (the menu stays rendered under its windows)
    const roots = opt.roots || (q('#loadingScreen:not(.hidden)') ? ['#loadingScreen'] : q('.win:not(.hidden)') ? ['.win:not(.hidden)'] : q('#pause:not(.hidden)') ? ['#pause'] : q('#death:not(.hidden)') ? ['#death']
      : q('#armory:not(.hidden)') ? ['#armory'] : q('#menu:not(.hidden)') ? ['#menu'] : ['#hud:not(.hidden)', '#touchUI:not(.hidden)', '#pgToasts', '#respawn:not(.hidden)', '#waveBanner']);
    const rootEls = roots.map(s => [...document.querySelectorAll(s)]).flat().filter(r => this.vis(r) || r.id === 'hud' || r.id === 'touchUI');
    const seen = new Set();
    for (const root of rootEls) {
      for (const el of [root, ...root.querySelectorAll(this.SEL)]) {
        if (seen.has(el) || !this.vis(el)) continue; seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        rs.push({ el, r });
        const o = opt.tol ?? 1;
        if (r.left < -o || r.top < -o || r.right > W + o || r.bottom > H + o) issues.push({ t: 'out', a: this.name(el), tx: this.txt(el), r: [r.left, r.top, r.right, r.bottom].map(Math.round) });
      }
      // clipped content
      for (const el of [root, ...root.querySelectorAll('*')]) {
        if (!this.vis(el)) continue;
        const cs = getComputedStyle(el);
        if (/(hidden|auto|scroll|clip)/.test(cs.overflowY + cs.overflowX) && el !== document.body) {
          if (el.id === 'game' || el.id === 'minimapMask' || el.id === 'waypoints' || el.classList.contains('lens')) continue;
          const dy = el.scrollHeight - el.clientHeight, dx = el.scrollWidth - el.clientWidth;
          const ell = cs.textOverflow === 'ellipsis';
          if ((dy > 2 || dx > 2) && !(ell && dy <= 2)) issues.push({ t: /(auto|scroll)/.test(cs.overflowY) ? 'scroll' : 'clip', a: this.name(el), tx: this.txt(el), d: [dx, dy] });
        }
      }
    }
    // touch targets
    if (!opt.noSmall) for (const { el, r } of rs) if (el.matches('button,.tb,.ts,.chip,.tab,.iconBtn') && (r.width < (opt.smallMin || 30) || r.height < (opt.smallMin || 30)) && !el.matches('#armPick .pickHead button')) issues.push({ t: 'small', a: this.name(el), tx: this.txt(el), r: [Math.round(r.width), Math.round(r.height)] });
    // overlaps between sibling-level elements
    const items = rs.filter(({ el }) => !el.matches('.row,.howCols>div>*,#intelList>*,#touchFree,#tcluster,.armCard,#armView,#armPick,#hud,#touchUI,.win,.screen,#menu,#armory,.winBox,.subtabs,.pagerBar') || el.matches('.armCard,.pagerBar,.subtabs'));
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const A = items[i], B = items[j];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      const ix = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left), iy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
      if (ix > 2 && iy > 2) {
        // allowed: things drawn over the 3D view / full-size layers
        if (A.el.matches('#armView,#tzLook,#tzMove') || B.el.matches('#armView,#tzLook,#tzMove')) continue;
        issues.push({ t: 'overlap', a: this.name(A.el) + ' "' + this.txt(A.el) + '"', b: this.name(B.el) + ' "' + this.txt(B.el) + '"', px: [Math.round(ix), Math.round(iy)] });
      }
    }
    return { label, W, H, s: UIFIT.s, rsp: UIFIT.rsp, n: rs.length, issues };
  },
  show(id) { for (const w of document.querySelectorAll('.win')) w.classList.toggle('hidden', w.id !== id); },
  // ----- scenes -----
  scene(name) {
    const [k, a, b] = name.split(':');
    if (k !== 'hud' && G.playing) { try { toMenu(); } catch (e) { } }
    if (k === 'hud') this.clearHud && 0;
    const hide = (...ids) => ids.forEach(i => { const e = document.getElementById(i); if (e) e.classList.add('hidden'); });
    if (k === 'menu') {
      if (ARMORY.open) ARMORY.hide(); closeWins(); hide('pause', 'death'); document.getElementById('menu').classList.remove('hidden'); selectMode(a || 'tdm');
      if (b === 'last') { }
    } else if (k === 'win') {
      if (ARMORY.open) ARMORY.hide(); document.getElementById('menu').classList.remove('hidden');
      const id = { settings: 'settingsWin', how: 'howWin', intel: 'intelWin' }[a];
      openWin(id);
      const bar = { settings: 'setTabs', how: 'howTabs' }[a];
      if (bar && b) { const btn = document.querySelector('#' + bar + ' button[data-t="' + b + '"]'); if (btn) btn.click(); }
      if (a === 'intel' && b) { INTEL_PAGER.go(parseInt(b)); }
    } else if (k === 'armory') {
      closeWins(); ARMORY.sub = a || 'w'; ARMORY.cat = ARSENAL.CATS.some(c => c.key === b) ? b : 'assault'; const list = ARSENAL.list(ARMORY.cat); ARMORY.sel = list[0].id;
      if (!ARMORY.open) ARMORY.show(); else ARMORY.render();
      ARMORY._closePick();
      if (name.endsWith(':pick')) { ARMORY.sub = 'a'; ARMORY.sel = 'ar_kestrel'; ARMORY.cat = 'assault'; ARMORY.render(); ARMORY._openPick('ar_kestrel', 'optic'); }
    } else if (k === 'pause') {
      if (ARMORY.open) ARMORY.hide(); closeWins(); document.getElementById('menu').classList.add('hidden'); document.getElementById('pause').classList.remove('hidden');
    } else if (k === 'death') {
      closeWins(); document.getElementById('menu').classList.add('hidden'); hide('pause');
      document.getElementById('resultTitle').textContent = 'MISSION COMPLETE'; document.getElementById('resultTag').textContent = 'ALL OBJECTIVES ACHIEVED · OPERATION FIRESTORM';
      document.getElementById('deathStats').innerHTML = 'SCORE 12450 · 48 KILLS · 6 OBJECTIVES · 62% ACCURACY<br><span class="mut">★★★ · BEST TIME 07:42 · NEW BEST</span>';
      document.getElementById('death').classList.remove('hidden');
    } else if (k === 'hud') {
      this.hudReset();
      const E = (id) => document.getElementById(id);
      if (a === 'base') {
        for (let i = 0; i < 4; i++) addKillFeed(['HOSTILE ELIMINATED · HEADSHOT', 'BRAVO-2 DOWN', 'OBSIDIAN GHOST · +3', 'HVT ELIMINATED +3'][i], i === 0);
        E('ammoRes').textContent = '/ 120'; E('weaponName').textContent = 'GUARDIAN LONGSLIDE';
        try { if (MODE.impl && MODE.impl.renderPanel) MODE.impl.renderPanel(); } catch (e) { }
        E('objPanel').classList.toggle('hidden', !['campaign', 'tdm', 'survival'].includes(MODE.id));
      } else if (a === 'prompts') {
        E('interactHint').style.display = 'block'; E('interactHint').textContent = 'PRESS E · HAMMERFALL .50 ANTI-MATERIEL RIFLE';
        E('holdBar').classList.remove('hidden'); E('breathBar').style.opacity = 1; E('nvgHint').classList.add('show');
      } else if (a === 'banner') {
        E('waveBanner').style.opacity = 1; E('bannerH').textContent = 'TEAM DEATHMATCH'; E('bannerP').textContent = 'FIRST TO 50 · HOLD THE HARDPOINT · DESERT VILLAGE';
      } else if (a === 'toast') {
        const t = document.createElement('div'); t.className = 'pgToast'; t.style.animation = 'none'; t.style.opacity = 1; t.innerHTML = '<div>NEW WEAPON UNLOCKED · <b>HAMMERFALL .50</b><span>MARKSMAN & SNIPER RIFLES · LEVEL 12</span></div>'; E('pgToasts').appendChild(t);
      } else if (a === 'killcam') {
        E('kcTitle').textContent = 'HEADSHOT'; E('kcSub').textContent = '112 M · SNIPER · KILL CAM'; E('killcam').classList.add('show');
      } else if (a === 'free') {
        E('touchFree').classList.remove('hidden');
      }
      for (let i = 0; i < 4; i++) frame(1 / 30);
    } else if (k === 'load') {
      document.getElementById('menu').classList.add('hidden'); document.getElementById('loadingScreen').classList.remove('hidden');
      document.getElementById('loadText').textContent = 'BUILDING A NEW BATTLEFIELD...';
    }
  },
  hudReset() {
    const E = (id) => document.getElementById(id);
    E('killfeed').innerHTML = ''; E('interactHint').style.display = 'none'; E('holdBar').classList.add('hidden'); E('breathBar').style.opacity = 0; E('nvgHint').classList.remove('show');
    E('waveBanner').style.opacity = 0; E('killcam').classList.remove('show'); E('pgToasts').innerHTML = '';
  },
  async play(mode, touch) {
    if (G.playing) toMenu();
    S.touchMode = touch === false ? 'off' : 'on'; TOUCH.refresh(); closeWins(); if (ARMORY.open) ARMORY.hide();
    selectMode(mode); G.devSync = true; startGame(); G.paused = false; await INVENTORY.curW().ready;
    for (let i = 0; i < 40; i++) frame(1 / 30);
    return MODE.id + ' ' + (WORLD.name || '') + ' touchUI=' + !document.getElementById('touchUI').classList.contains('hidden');
  },
  clearScenes() { for (const i of ['pause', 'death', 'loadingScreen']) document.getElementById(i).classList.add('hidden'); },
  // sample content for the HUD (killfeed, toasts, banners, prompts)
  hudFill(opt = {}) {
    for (let i = 0; i < 5; i++) addKillFeed(['HOSTILE ELIMINATED · HEADSHOT', 'BRAVO-2 DOWN', 'OBSIDIAN GHOST · +3', 'HVT ELIMINATED +3', 'AREA CLEARED'][i], i === 0);
    document.getElementById('interactHint').style.display = opt.noHint ? 'none' : 'block'; document.getElementById('interactHint').textContent = 'PRESS E · KESTREL C4 ASSAULT RIFLE';
    document.getElementById('nvgHint').classList.add('show');
    document.getElementById('waveBanner').style.opacity = 1; document.getElementById('bannerH').textContent = 'TEAM DEATHMATCH'; document.getElementById('bannerP').textContent = 'FIRST TO 50 · HOLD THE HARDPOINT · DESERT VILLAGE';
  }
,
  // run scenes, looping over pager pages; returns only the scenes with issues (plus counts)
  run(names, opt = {}) {
    const out = [], summary = {};
    let st = document.getElementById('audNoTrans'); if (!st) { st = document.createElement('style'); st.id = 'audNoTrans'; st.textContent = '*,*::before,*::after{transition:none!important}'; document.head.appendChild(st); }
    for (const nm of names) {
      this.clearScenes();
      this.scene(nm);
      UIFIT.apply(true);
      const pages = nm.startsWith('win:intel') ? INTEL_PAGER : nm.startsWith('armory:w') && !nm.endsWith('pick') ? ARMORY.gridPager : nm.endsWith(':pick') ? ARMORY.pickPager : null;
      const np = pages ? Math.min(pages.pages.length, 8) : 1;
      for (let p = 0; p < np; p++) {
        if (pages) pages.go(p);
        const r = this.check(nm + (pages ? '#' + (p + 1) + '/' + pages.pages.length : ''), opt);
        summary[r.label] = r.n;
        if (r.issues.length) out.push({ label: r.label, issues: r.issues.slice(0, 8), more: Math.max(0, r.issues.length - 8) });
      }
    }
    this.clearScenes();
    return { W: innerWidth, H: innerHeight, s: UIFIT.s, scenes: Object.keys(summary).length, bad: out };
  }
,
  ALL: ['menu:campaign', 'menu:tdm', 'menu:survival', 'menu:endless', 'menu:free', 'win:settings:c', 'win:settings:a', 'win:settings:g', 'win:settings:h', 'win:how:c', 'win:how:w', 'win:how:m', 'win:how:t', 'win:intel',
    'armory:w:assault', 'armory:w:smg', 'armory:w:lmg', 'armory:w:rifle', 'armory:w:shotgun', 'armory:w:pistol', 'armory:w:launcher', 'armory:w:melee', 'armory:a', 'armory:l', 'armory:a:pick', 'pause', 'death', 'load'],
  // one line per problem; scenes with identical problems (pager pages, tabs) are merged
  go(names, opt) {
    const r = this.run(names || this.ALL, opt || {}), groups = {};
    for (const b of r.bad) for (const i of b.issues) {
      const sig = i.t + ':' + i.a + (i.b ? ' x ' + i.b : '') + (i.d ? ' d' + i.d : '') + (i.r ? ' ' + i.r : '') + (i.px ? ' px' + i.px : '');
      (groups[sig] = groups[sig] || []).push(b.label.replace(/#\d+\/\d+$/, ''));
    }
    const lines = Object.entries(groups).map(([sig, labels]) => sig + ' <- ' + [...new Set(labels)].join(','));
    return r.W + 'x' + r.H + ' s=' + r.s + ' scenes=' + r.scenes + (lines.length ? ' BAD(' + lines.length + '): ' + lines.slice(0, 14).join(' ;; ') : ' OK');
  }
};
