// — Utility: make an element draggable by its .header —
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
    autoSaveScreen();
  };
}

// — Widget shell: title + edit/close + content area —
function createWidget(type, cfg) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = type;
  // restore position & size
  if (cfg) {
    ['left','top','width','height'].forEach(p=>{ if(cfg[p]) w.style[p]=cfg[p]; });
  } else {
    w.style.left='20px'; w.style.top='20px';
    w.style.width='200px'; w.style.height='200px';
  }
  w.innerHTML = `
    <div class="header">
      <span>${type}</span>
      <span class="edit" title="Edit">✎</span>
      <span class="close" title="Close">✖</span>
    </div>
    <div class="content"></div>
  `;
  w.querySelector('.close').onclick = () => { w.remove(); autoSaveScreen(); };
  document.getElementById('canvas').appendChild(w);
  makeDraggable(w);
  const cont = w.querySelector('.content');
  return { w, cont };
}

// — Current screen/tab data —
let screens = {}, activeScreen = null;

// — Initialize screens from localStorage or default —
function initScreens() {
  const raw = localStorage.getItem('screens');
  if (raw) {
    screens = JSON.parse(raw);
    activeScreen = localStorage.getItem('activeScreen') || Object.keys(screens)[0];
  } else {
    screens = { 'Screen 1': [] };
    activeScreen = 'Screen 1';
    persistScreens();
  }
  renderScreenTabs();
  loadScreen(activeScreen);
}

// — Persist screens object & activeScreen to localStorage —
function persistScreens() {
  localStorage.setItem('screens', JSON.stringify(screens));
  localStorage.setItem('activeScreen', activeScreen);
}

// — Render the tabs in #screenTabs —
function renderScreenTabs() {
  const tabs = document.getElementById('screenTabs');
  tabs.innerHTML = '';
  Object.keys(screens).forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'screenTab' + (name===activeScreen?' active':'');
    btn.innerText = name;
    btn.onclick = () => switchScreen(name);
    tabs.append(btn);
  });
  const add = document.createElement('button');
  add.id = 'addScreen'; add.innerText = '+ Screen';
  add.onclick = () => {
    const nm = prompt('New screen name:');
    if (!nm || screens[nm]) return;
    screens[nm] = [];
    persistScreens();
    renderScreenTabs();
    switchScreen(nm);
  };
  tabs.append(add);
}

// — Save current canvas widgets into screens[activeScreen] —
function saveCurrentLayout() {
  const arr = [];
  document.querySelectorAll('.widget').forEach(w => {
    arr.push({
      type: w.dataset.type,
      left:   w.style.left,
      top:    w.style.top,
      width:  w.style.width,
      height: w.style.height,
      html:   w.querySelector('.content').innerHTML,
      // persist any dataset props
      ...Array.from(w.attributes)
        .filter(a=>a.name.startsWith('data-'))
        .reduce((o,a)=>{
          o[a.name.slice(5)] = a.value;
          return o;
        }, {})
    });
  });
  screens[activeScreen] = arr;
  persistScreens();
}

// — Clear canvas and instantiate widgets for screen `name` —
function loadScreen(name) {
  document.getElementById('canvas').innerHTML = '';
  screens[name].forEach(cfg => {
    const { w, cont } = widgetRegistry[cfg.type](cfg);
    cont.innerHTML = cfg.html;
  });
  highlightActiveTab();
}

// — Switch to a different screen/tab, saving first —
function switchScreen(name) {
  saveCurrentLayout();
  activeScreen = name;
  persistScreens();
  loadScreen(name);
}

// — Auto-save when widgets move, close, or window unloads —
function autoSaveScreen() {
  saveCurrentLayout();
}
window.addEventListener('beforeunload', autoSaveScreen);

// — Annotation overlay setup —
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

// — Quick helper to highlight the active tab —
function highlightActiveTab() {
  document.querySelectorAll('.screenTab').forEach(btn => {
    btn.classList.toggle('active', btn.innerText===activeScreen);
  });
}

// — Format seconds → M:SS —
function formatTime(s) {
  const m = Math.floor(s/60), sec = s%60;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

// — On page load —
document.addEventListener('DOMContentLoaded', ()=>{

  // Initialize screens & UI
  initScreens();

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
  annoBtn.onclick = ()=> {
    annotating = !annotating;
    annoBtn.style.opacity = annotating?1:0.6;
    document.getElementById('annoControls').style.display = annotating?'flex':'none';
    initAnnotation();
    annoCanvas.style.pointerEvents = annotating?'auto':'none';
    annoCtx.globalCompositeOperation = 'source-over';
  };

  // Annotation tools
  document.getElementById('penBtn').onclick = ()=> annoCtx.globalCompositeOperation='source-over';
  document.getElementById('penColor').oninput = e=> annoCtx.strokeStyle=e.target.value;
  document.getElementById('penSize').oninput = e=> annoCtx.lineWidth=e.target.value;
  document.getElementById('eraserBtn').onclick = ()=> annoCtx.globalCompositeOperation='destination-out';
  document.getElementById('undoBtn').onclick = ()=> {
    if (!history.length) return;
    history.pop();
    annoCtx.clearRect(0,0,annoCanvas.width,annoCanvas.height);
    const last = history[history.length-1];
    if (last) {
      const img = new Image();
      img.onload=()=>annoCtx.drawImage(img,0,0);
      img.src = last;
    }
  };

  // Save layout
  document.getElementById('saveBtn').onclick = ()=> {
    saveCurrentLayout();
    alert('Screen saved!');
  };

  // Select tool
  let selecting = false;
  const selectBtn = document.getElementById('selectTool');
  function onSelectClick(e) {
    if (!selecting) return;
    const w = e.target.closest('.widget');
    if (w) {
      w.classList.toggle('selected');
      e.stopPropagation();
    }
  }
  selectBtn.onclick = ()=> {
    selecting = !selecting;
    selectBtn.style.opacity = selecting?1:0.6;
    document.addEventListener('click', onSelectClick, true);
    if (!selecting) document.removeEventListener('click', onSelectClick, true);
  };

  // Widget picker
  document.getElementById('widgetSelect').onchange = e => {
    const type = e.target.value;
    if (type && widgetRegistry[type]) {
      widgetRegistry[type]();
      autoSaveScreen();
    }
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
        v.srcObject=stream; v.autoplay=true;
        Object.assign(v.style,{width:'100%',height:'100%',objectFit:'contain'});
        cont.appendChild(v);
      })
      .catch(err => cont.innerText='❌ '+err.message);
    return { w, cont };
  },

  setBackground: ()=> {
    const c = prompt('Color or image URL:');
    if (!c) return;
    document.getElementById('canvas').style.background =
      c.startsWith('http')? `url('${c}')center/cover no-repeat` : c;
  },

  text: cfg => {
    const { w, cont } = createWidget('Text', cfg);
    const d = document.createElement('div');
    d.contentEditable=true;
    d.style.minHeight='50px';
    d.innerHTML = cfg?.html||'Click to edit…';
    d.oninput = ()=> w.dataset.html=d.innerHTML;
    cont.appendChild(d);
    return { w, cont };
  },

  clock: ()=> {
    const { w, cont } = createWidget('Clock');
    const d = document.createElement('div'); d.style.fontSize='1.2em';
    cont.appendChild(d);
    setInterval(()=> d.innerText=new Date().toLocaleTimeString(),500);
    return { w, cont };
  },

  timer: cfg => {
    const { w, cont } = createWidget('Timer', cfg);
    let seconds = parseInt(cfg?.seconds)||0;
    const input = document.createElement('input');
    input.type='number'; input.value=seconds; input.min=0;
    const btnSet = document.createElement('button'); btnSet.innerText='Set';
    const disp   = document.createElement('div'); disp.innerText=formatTime(seconds);
    const btnStart=document.createElement('button'); btnStart.innerText='▶️';
    const btnPause=document.createElement('button'); btnPause.innerText='⏸️';
    const btnReset=document.createElement('button'); btnReset.innerText='↺';
    let tid;
    btnSet.onclick = ()=>{
      seconds = parseInt(input.value)||0;
      disp.innerText=formatTime(seconds);
      w.dataset.seconds=seconds;
    };
    btnStart.onclick = ()=>{
      if (!tid) tid=setInterval(()=>{
        seconds++; disp.innerText=formatTime(seconds);
        w.dataset.seconds=seconds;
      },1000);
    };
    btnPause.onclick = ()=>{ clearInterval(tid); tid=null; };
    btnReset.onclick = ()=>{
      clearInterval(tid); tid=null;
      seconds=0; disp.innerText=formatTime(seconds);
      w.dataset.seconds=0;
    };
    cont.append(input,btnSet,disp,btnStart,btnPause,btnReset);
    return { w, cont };
  },

  visualTimer: cfg => {
    const { w, cont } = createWidget('Visual Timer', cfg);
    let total = parseInt(cfg?.total)||60;
    let rem   = parseInt(cfg?.remaining)||total;
    const input   = document.createElement('input');
    input.type='number'; input.value=total; input.min=1;
    const btnSet  = document.createElement('button'); btnSet.innerText='Set';
    const c       = document.createElement('canvas'); c.width=c.height=120;
    const x       = c.getContext('2d');
    let tid;
    function draw(){
      x.clearRect(0,0,120,120);
      const pct=rem/total;
      x.beginPath();
      x.arc(60,60,54,-Math.PI/2,-Math.PI/2+2*Math.PI*pct);
      x.lineWidth=10; x.stroke();
      x.font='16px sans-serif';x.textAlign='center';x.textBaseline='middle';
      x.fillText(formatTime(rem),60,60);
      w.dataset.remaining=rem;
      w.dataset.total=total;
    }
    btnSet.onclick = ()=>{
      clearInterval(tid);
      total = parseInt(input.value)||60;
      rem = total;
      draw();
    };
    draw();
    tid=setInterval(()=>{
      if(rem>0){ rem--; draw(); }
      else clearInterval(tid);
    },1000);
    cont.append(input,btnSet,c);
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
      if(diff<=0){ d.innerText='🎉'; return;}
      const days = Math.floor(diff/864e5),
            hrs  = Math.floor(diff%864e5/36e5),
            mins = Math.floor(diff%36e5/6e4),
            secs = Math.floor(diff%6e4/1000);
      d.innerText=`${days}d ${hrs}h ${mins}m ${secs}s`;
    }
    upd(); setInterval(upd,1000);
    return { w, cont };
  },

  poll: cfg => {
    const { w, cont } = createWidget('Poll', cfg);
    const q = cfg?.q || prompt('Question:')||'...?';
    const opts = cfg?.opts ? cfg.opts.split(',') :
      prompt('Options, comma:','Yes,No').split(',');
    const counts = cfg?.counts ? cfg.counts.split(',').map(Number) :
      opts.map(_=>0);
    w.dataset.q=q; w.dataset.opts=opts.join(',');
    const box=document.createElement('div');
    box.innerHTML=`<strong>${q}</strong><br>`;
    opts.forEach((o,i)=>{
      const btn=document.createElement('button');
      function upd(){ btn.innerText=`${o.trim()} (${counts[i]})`; }
      btn.onclick=()=>{
        counts[i]++; w.dataset.counts=counts.join(','); upd();
      };
      upd();
      box.append(btn,document.createElement('br'));
    });
    cont.append(box); return { w, cont };
  },

  timetable: cfg => {
    const { w, cont } = createWidget('Timetable', cfg);
    const tbl=document.createElement('table');
    tbl.border=1; tbl.contentEditable=true;
    tbl.innerHTML=cfg?.html||`
      <tr><th>Time</th><th>Activity</th></tr>
      <tr><td>8:00</td><td>…</td></tr>`;
    tbl.oninput=()=> w.dataset.html=tbl.innerHTML;
    cont.append(tbl); return { w, cont };
  },

  randomizer: cfg => {
    const { w, cont } = createWidget('Randomizer', cfg);
    const items = cfg?.items ? cfg.items.split(',') :
      prompt('Items, comma:','Alice,Bob,Carol').split(',');
    w.dataset.items = items.join(',');
    const btn = document.createElement('button'), d=document.createElement('div');
    btn.innerText='Pick one';
    btn.onclick=()=>d.innerText=items[Math.floor(Math.random()*items.length)].trim();
    cont.append(btn,d); return { w, cont };
  },

  groupMaker: cfg => {
    const { w, cont } = createWidget('Group Maker', cfg);
    const names = cfg?.names ? cfg.names.split(',') :
      prompt('Names, comma:','A,B,C').split(',');
    const size  = parseInt(cfg?.size)||parseInt(prompt('Group size:'),10)||2;
    w.dataset.names=names.join(','); w.dataset.size=size;
    const btn=document.createElement('button'),d=document.createElement('div');
    btn.innerText='Make groups';
    btn.onclick=()=>{
      const arr=names.slice(),out=[];
      while(arr.length) out.push(arr.splice(0,size));
      d.innerHTML=out.map(g=>g.join(', ')).join('<br>');
    };
    cont.append(btn,d); return { w, cont };
  },

  dice: ()=> {
    const { w, cont } = createWidget('Dice');
    const btn=document.createElement('button'), d=document.createElement('div');
    btn.innerText='🎲'; d.style.fontSize='3rem';
    btn.onclick=()=>d.innerText=Math.floor(Math.random()*6)+1;
    cont.append(btn,d); return { w, cont };
  },

  trafficLight: ()=> {
    const { w, cont } = createWidget('Traffic Light');
    const box=document.createElement('div'), circs=[];
    box.className='traffic-box';
    ['red','yellow','green'].forEach(c=>{
      const cc=document.createElement('div');
      cc.className='traffic-light-circle';
      box.append(cc); circs.push(cc);
    });
    let idx=0;
    const btn=document.createElement('button'); btn.innerText='Next';
    btn.onclick=()=>{
      circs.forEach(c=>c.style.background='#444');
      circs[idx].style.background=['red','yellow','green'][idx];
      idx=(idx+1)%3;
    };
    cont.append(box,btn); return { w, cont };
  },

  scoreboard: ()=> {
    const { w, cont } = createWidget('Scoreboard');
    const teams=prompt('Teams, comma:','A,B').split(',');
    teams.forEach(t=>{
      let sc=0;
      const row=document.createElement('div');
      const lbl=document.createElement('span'), disp=document.createElement('span');
      const plus=document.createElement('button'), minus=document.createElement('button');
      lbl.innerText = t.trim()+': ';
      disp.innerText = sc;
      plus.innerText='+'; minus.innerText='-';
      plus.onclick=()=>disp.innerText=++sc;
      minus.onclick=()=>disp.innerText=--sc;
      row.append(lbl,disp,plus,minus); cont.append(row);
    });
    return { w, cont };
  },

  soundLevel: cfg => {
    const { w, cont } = createWidget('Sound Level', cfg);
    let g = parseFloat(cfg?.gThreshold)||0.2;
    let y = parseFloat(cfg?.yThreshold)||0.5;
    cont.innerHTML = `
      <label>✅ ≤<input type="number" min=0 max=1 step=0.01 value="${g}" id="gIn"/></label>
      <label>🟡 ≤<input type="number" min=0 max=1 step=0.01 value="${y}" id="yIn"/></label>
      <div id="bar" style="height:20px;margin-top:8px;"></div>
    `;
    const bar=cont.querySelector('#bar'),
          gIn=cont.querySelector('#gIn'),
          yIn=cont.querySelector('#yIn');
    gIn.oninput = e=>{ g=parseFloat(e.target.value); w.dataset.gThreshold=g; };
    yIn.oninput = e=>{ y=parseFloat(e.target.value); w.dataset.yThreshold=y; };
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
    const btn=document.createElement('button'),d=document.createElement('div');
    d.style.fontSize='2rem'; btn.innerText='Next';
    btn.onclick=()=>{ d.innerText=syms[i]; i=(i+1)%syms.length;};
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
    ifr.src=url; Object.assign(ifr.style,{width:'100%',height:'100%',border:'none'});
    cont.append(ifr); return { w, cont };
  },

  embed: cfg => {
    const { w, cont } = createWidget('Embed', cfg);
    const ifr=document.createElement('iframe');
    Object.assign(ifr.style,{width:'100%',height:'100%',border:'none'});
    cont.append(ifr);
    function setURL(u){
      if(u.includes('docs.google.com/presentation')){
        u=u.replace('/edit','/embed').split('&')[0];
      }
      ifr.src=u; w.dataset.url=u;
    }
    if(cfg?.url) setURL(cfg.url);
    w.querySelector('.edit').onclick = ()=>{
      const u=prompt('New URL:',w.dataset.url||'');
      if(u) setURL(u);
    };
    return { w, cont };
  },

  hyperlink: ()=> {
    const { w, cont } = createWidget('Hyperlink');
    const url=prompt('URL:'), text=prompt('Link text:')||url;
    if(url){
      const a=document.createElement('a');
      a.href=url; a.target='_blank'; a.innerText=text;
      cont.append(a);
    }
    return { w, cont };
  },

  restroom: ()=> {
    const { w, cont } = createWidget('Rest Room');
    let ok=false;
    const d=document.createElement('div');
    d.style.fontSize='1.5em'; d.style.textAlign='center';
    const btn=document.createElement('button');
    btn.innerText='Toggle'; btn.onclick=()=>{
      ok=!ok; d.innerText=ok?'✅ Allowed':'❌ Closed';
      d.style.color=ok?'green':'red';
    };
    d.innerText='❌ Closed'; cont.append(d,btn);
    return { w, cont };
  }
};
