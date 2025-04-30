// — Dragging —
function makeDraggable(el) {
  let dx, dy, down=false;
  const hdr = el.querySelector('.header');
  hdr.onmousedown = e => {
    down = true;
    dx = e.clientX - el.offsetLeft;
    dy = e.clientY - el.offsetTop;
    document.body.style.userSelect = 'none';
  };
  document.onmousemove = e => {
    if (!down) return;
    el.style.left = (e.clientX - dx) + 'px';
    el.style.top  = (e.clientY - dy) + 'px';
  };
  document.onmouseup = () => {
    down = false;
    document.body.style.userSelect = '';
  };
}

// — Widget shell —
function createWidget(type, cfg) {
  const w = document.createElement('div');
  w.className = 'widget'; w.dataset.type = type;
  if (cfg) {
    w.style.left   = cfg.left;
    w.style.top    = cfg.top;
    w.style.width  = cfg.width;
    w.style.height = cfg.height;
  } else {
    w.style.left = '20px'; w.style.top = '20px';
  }
  w.innerHTML = `
    <div class="header">
      <span>${type}</span>
      <span class="edit" title="Edit">✎</span>
      <span class="close" title="Close">✖</span>
    </div>
    <div class="content"></div>
  `;
  w.querySelector('.close').onclick = () => w.remove();
  document.getElementById('canvas').appendChild(w);
  makeDraggable(w);
  const cont = w.querySelector('.content');
  return { w, cont };
}

// — Save/load layout —
function saveLayout() {
  const data = [];
  document.querySelectorAll('.widget').forEach(w => {
    data.push({
      type: w.dataset.type,
      left:   w.style.left,
      top:    w.style.top,
      width:  w.style.width,
      height: w.style.height,
      html:   w.querySelector('.content').innerHTML,
      // persist widget-specific state
      ...w.dataset
    });
  });
  localStorage.setItem('layout', JSON.stringify(data));
  alert('Layout saved!');
}

function loadLayout() {
  const raw = localStorage.getItem('layout');
  if (!raw) return;
  JSON.parse(raw).forEach(o => {
    const { w, cont } = widgetRegistry[o.type](o);
    cont.innerHTML = o.html;
  });
}

// — Annotation overlay —
let annoCanvas, annoCtx, annotating=false, drawing=false, history=[];
function initAnnotation() {
  if (!annoCanvas) {
    const cv = document.getElementById('canvas');
    annoCanvas = document.createElement('canvas');
    annoCanvas.width  = cv.clientWidth;
    annoCanvas.height = cv.clientHeight;
    Object.assign(annoCanvas.style, {
      position:'absolute', top:0, left:0, zIndex:400,
      pointerEvents:'none'
    });
    cv.appendChild(annoCanvas);
    annoCtx = annoCanvas.getContext('2d');
    annoCtx.lineCap = 'round';
    annoCanvas.onmousedown = e => {
      drawing = true;
      annoCtx.beginPath();
      annoCtx.moveTo(e.offsetX, e.offsetY);
    };
    annoCanvas.onmousemove = e => {
      if (!drawing) return;
      annoCtx.lineTo(e.offsetX, e.offsetY);
      annoCtx.stroke();
    };
    document.onmouseup = () => {
      if (!drawing) return;
      drawing = false;
      history.push(annoCanvas.toDataURL());
    };
  }
}

// — Utilities —
function formatTime(s) {
  const m = Math.floor(s/60), sec = s%60;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

// — On DOM ready —
document.addEventListener('DOMContentLoaded', () => {
  // Toolbar collapse
  const collapseBtn = document.getElementById('collapseBtn');
  const tools = document.getElementById('tools');
  collapseBtn.onclick = () => {
    const hidden = tools.style.display==='none';
    tools.style.display = hidden?'flex':'none';
    collapseBtn.innerText = hidden?'▲':'▼';
  };

  // Settings panel
  const panel = document.getElementById('settingsPanel');
  document.getElementById('settingsBtn').onclick = () => panel.style.display='block';
  document.getElementById('closeSettings').onclick = () => panel.style.display='none';
  document.getElementById('themeToolbar').oninput = e =>
    document.documentElement.style.setProperty('--toolbar-bg', e.target.value);
  document.getElementById('themeWidget').oninput = e =>
    document.documentElement.style.setProperty('--widget-header-bg', e.target.value);

  // Annotation toggle
  const annoBtn = document.getElementById('annotateTool');
  annoBtn.onclick = () => {
    annotating = !annotating;
    annoBtn.style.opacity = annotating?1:0.6;
    document.getElementById('annoControls').style.display = annotating?'flex':'none';
    initAnnotation();
    annoCanvas.style.pointerEvents = annotating?'auto':'none';
    annoCtx.globalCompositeOperation = 'source-over';
  };

  // Pen/Eraser
  document.getElementById('penBtn').onclick = () =>
    annoCtx.globalCompositeOperation = 'source-over';
  document.getElementById('penColor').oninput = e =>
    annoCtx.strokeStyle = e.target.value;
  document.getElementById('penSize').oninput = e =>
    annoCtx.lineWidth = e.target.value;
  document.getElementById('eraserBtn').onclick = () =>
    annoCtx.globalCompositeOperation = 'destination-out';

  // Undo drawing
  document.getElementById('undoBtn').onclick = () => {
    if (!history.length) return;
    history.pop();
    annoCtx.clearRect(0,0,annoCanvas.width,annoCanvas.height);
    const last = history[history.length-1];
    if (last) {
      const img = new Image();
      img.onload = () => annoCtx.drawImage(img,0,0);
      img.src = last;
    }
  };

  // Save/load layout
  document.getElementById('saveBtn').onclick = saveLayout;
  loadLayout();

  // Widget picker
  document.getElementById('widgetSelect').onchange = e => {
    const type = e.target.value;
    if (type && widgetRegistry[type]) widgetRegistry[type]();
    e.target.value = '';
  };
});

// — Widget implementations —
const widgetRegistry = {
  screenShare: cfg => {
    const { w, cont } = createWidget('Screen Share', cfg);
    navigator.mediaDevices.getDisplayMedia({ video:true })
      .then(stream => {
        const v = document.createElement('video');
        v.srcObject = stream; v.autoplay = true;
        Object.assign(v.style, {
          width:'100%', height:'100%', objectFit:'cover'
        });
        cont.appendChild(v);
      })
      .catch(err => cont.innerText = '❌ '+err.message);
    return { w, cont };
  },

  setBackground: () => {
    const c = prompt('Color or image URL:');
    if (!c) return;
    document.getElementById('canvas').style.background =
      c.startsWith('http') ? `url('${c}')center/cover no-repeat` : c;
  },

  text: cfg => {
    const { w, cont } = createWidget('Text', cfg);
    const d = document.createElement('div');
    d.contentEditable = true;
    d.style.minHeight = '50px';
    d.innerHTML = cfg?.html || 'Click to edit…';
    d.oninput = () => w.dataset.html = d.innerHTML;
    cont.appendChild(d);
    return { w, cont };
  },

  clock: () => {
    const { w, cont } = createWidget('Clock');
    const d = document.createElement('div');
    d.style.fontSize = '1.2em';
    cont.appendChild(d);
    setInterval(()=> d.innerText = new Date().toLocaleTimeString(), 500);
    return { w, cont };
  },

  timer: cfg => {
    const { w, cont } = createWidget('Timer', cfg);
    let seconds = parseInt(cfg?.seconds) || 0;
    const disp = document.createElement('div');
    disp.innerText = formatTime(seconds);
    const btnStart = document.createElement('button'); btnStart.innerText = '▶️';
    const btnPause = document.createElement('button'); btnPause.innerText = '⏸️';
    const btnReset = document.createElement('button'); btnReset.innerText = '↺';
    let intervalId;
    btnStart.onclick = () => {
      if (!intervalId) intervalId = setInterval(()=>{
        seconds++; disp.innerText = formatTime(seconds);
        w.dataset.seconds = seconds;
      },1000);
    };
    btnPause.onclick = () => { clearInterval(intervalId); intervalId=null; };
    btnReset.onclick = () => {
      clearInterval(intervalId); intervalId=null;
      seconds = 0; disp.innerText = formatTime(seconds);
      w.dataset.seconds = seconds;
    };
    cont.append(disp, btnStart, btnPause, btnReset);
    return { w, cont };
  },

  visualTimer: cfg => {
    const { w, cont } = createWidget('Visual Timer', cfg);
    const total = parseInt(cfg?.total) || 60;
    let rem = parseInt(cfg?.remaining) || total;
    const c = document.createElement('canvas');
    c.width = c.height = 120; cont.appendChild(c);
    const x = c.getContext('2d');
    function draw(){
      x.clearRect(0,0,120,120);
      const pct = rem / total;
      x.beginPath();
      x.arc(60,60,54,-Math.PI/2, -Math.PI/2 + 2*Math.PI*pct);
      x.lineWidth = 10; x.stroke();
      x.font = '16px sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(formatTime(rem),60,60);
      w.dataset.remaining = rem;
    }
    draw();
    const id = setInterval(()=>{
      if (rem>0) { rem--; draw(); }
      else clearInterval(id);
    },1000);
    return { w, cont };
  },

  eventCountdown: cfg => {
    const { w, cont } = createWidget('Countdown', cfg);
    const when = cfg?.when ? new Date(cfg.when)
      : new Date(prompt('Target (YYYY-MM-DD HH:MM):'));
    w.dataset.when = when;
    const d = document.createElement('div'); cont.appendChild(d);
    function upd(){
      const diff = when - new Date();
      if (diff<=0) { d.innerText='🎉'; return; }
      const days = Math.floor(diff/864e5),
            hrs  = Math.floor(diff%864e5/36e5),
            mins = Math.floor(diff%36e5/6e4),
            secs = Math.floor(diff%6e4/1000);
      d.innerText = `${days}d ${hrs}h ${mins}m ${secs}s`;
    }
    upd(); setInterval(upd,1000);
    return { w, cont };
  },

  poll: cfg => {
    const { w, cont } = createWidget('Poll', cfg);
    const q = cfg?.q || prompt('Question:') || '...?';
    const opts = cfg?.opts ? cfg.opts.split(',') :
      prompt('Options, comma:','Yes,No').split(',');
    w.dataset.q = q; w.dataset.opts = opts.join(',');
    const box = document.createElement('div');
    box.innerHTML = `<strong>${q}</strong><br>`;
    const counts = cfg?.counts ? cfg.counts.split(',').map(Number) :
      opts.map(_=>0);
    opts.forEach((o,i) => {
      const btn = document.createElement('button');
      function update(){ btn.innerText = `${o.trim()} (${counts[i]})`; }
      btn.onclick = ()=>{ counts[i]++; w.dataset.counts=counts.join(','); update(); };
      update();
      box.append(btn, document.createElement('br'));
    });
    cont.append(box); return { w, cont };
  },

  timetable: cfg => {
    const { w, cont } = createWidget('Timetable', cfg);
    const tbl = document.createElement('table');
    tbl.border = 1; tbl.contentEditable = true;
    tbl.innerHTML = cfg?.html || `
      <tr><th>Time</th><th>Activity</th></tr>
      <tr><td>8:00</td><td>…</td></tr>`;
    tbl.oninput = () => w.dataset.html = tbl.innerHTML;
    cont.append(tbl); return { w, cont };
  },

  randomizer: cfg => {
    const { w, cont } = createWidget('Randomizer', cfg);
    const items = cfg?.items ? cfg.items.split(',') :
      prompt('Items, comma:','Alice,Bob,Carol').split(',');
    w.dataset.items = items.join(',');
    const btn = document.createElement('button'), d=document.createElement('div');
    btn.innerText = 'Pick one';
    btn.onclick=()=>d.innerText=items[Math.floor(Math.random()*items.length)].trim();
    cont.append(btn,d); return { w, cont };
  },

  groupMaker: cfg => {
    const { w, cont } = createWidget('Group Maker', cfg);
    const names = cfg?.names ? cfg.names.split(',') :
      prompt('Names, comma:','A,B,C').split(',');
    const size  = cfg?.size || parseInt(prompt('Group size:'),10) || 2;
    w.dataset.names = names.join(',');
    w.dataset.size  = size;
    const btn=document.createElement('button'), d=document.createElement('div');
    btn.innerText='Make groups';
    btn.onclick=()=>{
      const arr=names.slice(), out=[];
      while(arr.length) out.push(arr.splice(0,size));
      d.innerHTML = out.map(g=>g.join(', ')).join('<br>');
    };
    cont.append(btn,d); return { w, cont };
  },

  dice: ()=> {
    const { w, cont } = createWidget('Dice');
    const btn = document.createElement('button'), d=document.createElement('div');
    btn.innerText='🎲'; d.style.fontSize='3rem';
    btn.onclick=()=>d.innerText = Math.floor(Math.random()*6)+1;
    cont.append(btn,d); return { w, cont };
  },

  trafficLight: ()=> {
    const { w, cont } = createWidget('Traffic Light');
    const box = document.createElement('div'), circs=[];
    box.className='traffic-box';
    ['red','yellow','green'].forEach(c=>{
      const cc=document.createElement('div');
      cc.className='traffic-light-circle';
      box.append(cc); circs.push(cc);
    });
    let idx=0;
    const btn=document.createElement('button');
    btn.innerText='Next';
    btn.onclick=()=>{
      circs.forEach(c=>c.style.background='#444');
      circs[idx].style.background=['red','yellow','green'][idx];
      idx=(idx+1)%3;
    };
    cont.append(box,btn); return { w, cont };
  },

  scoreboard: ()=> {
    const { w, cont } = createWidget('Scoreboard');
    const teams = prompt('Teams, comma:','A,B').split(',');
    teams.forEach(t=>{
      let sc=0;
      const row=document.createElement('div');
      const lbl=document.createElement('span'), disp=document.createElement('span');
      const plus=document.createElement('button'), minus=document.createElement('button');
      lbl.innerText = t.trim()+': ';
      disp.innerText = sc;
      plus.innerText = '+'; minus.innerText = '-';
      plus.onclick = ()=>disp.innerText = ++sc;
      minus.onclick= ()=>disp.innerText = --sc;
      row.append(lbl,disp,plus,minus);
      cont.append(row);
    });
    return { w, cont };
  },

  soundLevel: cfg => {
    const { w, cont } = createWidget('Sound Level', cfg);
    let g = parseFloat(cfg?.gThreshold) || 0.2;
    let y = parseFloat(cfg?.yThreshold) || 0.5;
    cont.innerHTML = `
      <label>✅ up to <input type="number" min=0 max=1 step=0.01 value="${g}" id="gIn"/></label>
      <label>🟡 up to <input type="number" min=0 max=1 step=0.01 value="${y}" id="yIn"/></label>
      <div id="bar" style="height:20px;margin-top:8px;"></div>
    `;
    const bar = cont.querySelector('#bar');
    const gIn = cont.querySelector('#gIn'), yIn = cont.querySelector('#yIn');
    gIn.oninput = e=> g = parseFloat(e.target.value), w.dataset.gThreshold=g;
    yIn.oninput = e=> y = parseFloat(e.target.value), w.dataset.yThreshold=y;
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
      const ac=new AudioContext(),src=ac.createMediaStreamSource(stream),
            an=ac.createAnalyser(),data=new Uint8Array(an.fftSize);
      src.connect(an);
      (function upd(){
        an.getByteTimeDomainData(data);
        let sum=0; data.forEach(v=>sum+=Math.abs(v-128));
        const vol=Math.min(1,sum/data.length/128);
        bar.style.width=(vol*100)+'%';
        bar.style.background = vol<=g?'green':vol<=y?'yellow':'red';
        requestAnimationFrame(upd);
      })();
    });
    return { w, cont };
  },

  workSymbols: ()=> {
    const { w, cont } = createWidget('Work Symbols');
    const syms=['✏️','☕️','✅','🔴']; let i=0;
    const btn=document.createElement('button'), d=document.createElement('div');
    d.style.fontSize='2rem'; btn.innerText='Next';
    btn.onclick = ()=> { d.innerText=syms[i]; i=(i+1)%syms.length; };
    cont.append(d,btn); return { w, cont };
  },

  stickers: ()=> {
    const { w, cont } = createWidget('Stickers');
    const url=prompt('Sticker URL:'); if(!url) return { w, cont };
    const img=document.createElement('img'); img.src=url; cont.append(img);
    return { w, cont };
  },

  image: ()=> {
    const { w, cont } = createWidget('Image');
    const url=prompt('Image URL:'); if(!url) return { w, cont };
    const img=document.createElement('img'); img.src=url; cont.append(img);
    return { w, cont };
  },

  video: ()=> {
    const { w, cont } = createWidget('Video');
    const url=prompt('Video embed URL:'); if(!url) return { w, cont };
    const ifr=document.createElement('iframe');
    ifr.src=url; Object.assign(ifr.style,{width:'100%',height:'200px',border:'none'});
    cont.append(ifr); return { w, cont };
  },

  embed: cfg => {
    const { w, cont } = createWidget('Embed', cfg);
    const ifr = document.createElement('iframe');
    Object.assign(ifr.style,{width:'100%',height:'100%',border:'none'});
    cont.append(ifr);
    function setURL(u) {
      if (u.includes('docs.google.com/presentation')) {
        u = u.replace('/edit','/embed').split('&')[0];
      }
      ifr.src = u; w.dataset.url = u;
    }
    if (cfg?.url) setURL(cfg.url);
    w.querySelector('.edit').onclick = () => {
      const u = prompt('New URL:', w.dataset.url||'');
      if (u) setURL(u);
    };
    return { w, cont };
  },

  hyperlink: ()=> {
    const { w, cont } = createWidget('Hyperlink');
    const url = prompt('URL:'), text = prompt('Link text:')||url;
    if (url) {
      const a = document.createElement('a');
      a.href = url; a.target='_blank'; a.innerText = text;
      cont.append(a);
    }
    return { w, cont };
  },

  restroom: ()=> {
    const { w, cont } = createWidget('Rest Room');
    let ok = false;
    const d = document.createElement('div');
    d.style.fontSize='1.5em'; d.style.textAlign='center';
    const btn = document.createElement('button');
    btn.innerText='Toggle';
    btn.onclick = ()=>{
      ok = !ok;
      d.innerText = ok ? '✅ Allowed' : '❌ Closed';
      d.style.color = ok ? 'green' : 'red';
    };
    d.innerText='❌ Closed'; cont.append(d,btn);
    return { w, cont };
  }
};
