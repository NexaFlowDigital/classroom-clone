// drag & drop
function makeDraggable(el) {
  let ox, oy, down = false;
  const hdr = el.querySelector('.header');
  hdr.addEventListener('mousedown', e => {
    down = true;
    ox = e.clientX - el.offsetLeft;
    oy = e.clientY - el.offsetTop;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!down) return;
    el.style.left = (e.clientX - ox) + 'px';
    el.style.top = (e.clientY - oy) + 'px';
  });
  document.addEventListener('mouseup', () => {
    down = false;
    document.body.style.userSelect = '';
  });
}

// widget wrapper
function createWidget(title) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.style.left = '20px';
  w.style.top = '20px';
  w.innerHTML = `<div class="header">${title} <span class="close">✖</span></div>`;
  w.querySelector('.close').onclick = () => w.remove();
  document.getElementById('canvas').appendChild(w);
  makeDraggable(w);
  return w;
}

// annotation overlay & history
let annoMode = false, drawing = false, ctx, canvasA, history = [];
function initAnnotation() {
  canvasA = document.createElement('canvas');
  canvasA.width = window.innerWidth;
  canvasA.height = window.innerHeight;
  canvasA.style.position = 'fixed';
  canvasA.style.top = canvasA.style.left = '0';
  canvasA.style.zIndex = 999;
  document.body.appendChild(canvasA);
  ctx = canvasA.getContext('2d');
  ctx.lineCap = 'round';
  canvasA.addEventListener('mousedown', e => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
  });
  canvasA.addEventListener('mousemove', e => {
    if (!drawing) return;
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
  });
  window.addEventListener('mouseup', () => {
    if (!drawing) return;
    drawing = false;
    history.push(canvasA.toDataURL());
  });
}

// toolbar elements
const toolbar = document.getElementById('toolbar');
const tools = document.getElementById('tools');
const collapseBtn = document.getElementById('collapseBtn');
const annoControls = document.getElementById('annoControls');
const penColor = document.getElementById('penColor');
const penSize = document.getElementById('penSize');
const eraserBtn = document.getElementById('eraserBtn');
const undoBtn = document.getElementById('undoBtn');
const saveBtn = document.getElementById('saveBtn');
const settingsBtn = document.getElementById('settingsBtn');
const annotateTool = document.getElementById('annotateTool');

// collapse / expand toolbar
let collapsed = false;
collapseBtn.onclick = () => {
  collapsed = !collapsed;
  tools.style.display = collapsed ? 'none' : 'flex';
  collapseBtn.innerText = collapsed ? '⬇' : '⬆';
};

// Annotate toggle
annotateTool.onclick = () => {
  annoMode = !annoMode;
  annotateTool.style.background = annoMode ? '#008800' : '#666';
  annoControls.style.display = annoMode ? 'flex' : 'none';
  if (annoMode && !canvasA) initAnnotation();
};

// eraser
eraserBtn.onclick = () => {
  ctx.globalCompositeOperation = 'destination-out';
};

// pen settings
penColor.onchange = () => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = penColor.value;
};
penSize.oninput = () => ctx.lineWidth = penSize.value;

// undo annotation
undoBtn.onclick = () => {
  if (!history.length) return;
  const img = new Image();
  history.pop();
  const data = history[history.length - 1];
  ctx.clearRect(0,0,canvasA.width,canvasA.height);
  if (data) {
    img.onload = () => ctx.drawImage(img,0,0);
    img.src = data;
  }
};

// save screen
saveBtn.onclick = () => {
  html2canvas(document.getElementById('canvas')).then(c => {
    // overlay annotation
    if (canvasA) c.getContext('2d').drawImage(canvasA, 0, 0);
    c.toBlob(blob => {
      const a = document.createElement('a');
      a.download = 'screenshot.png';
      a.href = URL.createObjectURL(blob);
      a.click();
    });
  });
};

// settings placeholder
settingsBtn.onclick = () => {
  alert('Settings panel – customize features here.');
};

// --- widget implementations ---
const widgetRegistry = {
  screenShare: () => {
    const w = createWidget('Screen Share');
    navigator.mediaDevices.getDisplayMedia({ video: true })
      .then(s => {
        const v = document.createElement('video');
        v.srcObject = s; v.autoplay = true;
        v.width=320; v.height=180;
        w.appendChild(v);
      })
      .catch(e=> w.append('❌ '+e.message));
    return w;
  },

  setBackground: () => {
    const c = prompt('Background (color or image URL):');
    if (!c) return;
    const can = document.getElementById('canvas');
    can.style.background = c.startsWith('http')
      ? `url('${c}') center/cover no-repeat`
      : c;
  },

  text: () => {
    const w = createWidget('Text');
    const d = document.createElement('div');
    d.contentEditable = true;
    d.innerText = 'Click to edit…';
    w.appendChild(d);
    return w;
  },

  clock: () => {
    const w = createWidget('Clock');
    const d = document.createElement('div');
    d.style.fontSize='1.2em';
    w.appendChild(d);
    setInterval(()=> d.innerText=new Date().toLocaleTimeString(),500);
    return w;
  },

  timer: () => {
    const w = createWidget('Timer');
    let s = parseInt(prompt('Start seconds:'),10)||0;
    const d = document.createElement('div');
    d.innerText = `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
    w.appendChild(d);
    const btn = document.createElement('button');
    btn.innerText='Start/Stop';
    let id;
    btn.onclick = () => {
      if (id) clearInterval(id), id=null;
      else id = setInterval(()=>{ s++; d.innerText=`${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; },1000);
    };
    w.appendChild(btn);
    return w;
  },

  visualTimer: () => {
    const w = createWidget('Visual Timer');
    const total = parseInt(prompt('Total seconds:'),10)||60;
    let rem = total;
    const c = document.createElement('canvas');
    c.width=c.height=120;
    w.appendChild(c);
    const x = c.getContext('2d');
    function draw(){
      x.clearRect(0,0,120,120);
      const pct = rem/total;
      x.beginPath();
      x.arc(60,60,54,-Math.PI/2,(-Math.PI/2)+2*Math.PI*pct);
      x.lineWidth=10; x.stroke();
      x.font='16px sans-serif';
      x.textAlign='center'; x.textBaseline='middle';
      x.fillText(`${Math.floor(rem/60)}:${(rem%60).toString().padStart(2,'0')}`,60,60);
    }
    draw();
    const id = setInterval(()=>{
      if(rem>0){ rem--; draw(); }
      else clearInterval(id);
    },1000);
    return w;
  },

  eventCountdown: () => {
    const w = createWidget('Event Countdown');
    const when = new Date(prompt('Target date/time (YYYY-MM-DD HH:MM):'));
    const d = document.createElement('div');
    w.appendChild(d);
    function upd(){
      const diff = when - new Date();
      if(diff<=0){ d.innerText='🎉'; return; }
      const days = Math.floor(diff/864e5);
      const hrs  = Math.floor(diff%864e5/36e5);
      const mins = Math.floor(diff%36e5/6e4);
      const secs = Math.floor(diff%6e4/1000);
      d.innerText = `${days}d ${hrs}h ${mins}m ${secs}s`;
    }
    upd(); setInterval(upd,1000);
    return w;
  },

  poll: () => {
    const w = createWidget('Poll');
    const q = prompt('Question:')||'...?';
    const opts = prompt('Options (comma):','Yes,No').split(',');
    const d = document.createElement('div');
    d.innerHTML = `<strong>${q}</strong><br>`;
    const counts = opts.map(_=>0);
    opts.forEach((o,i)=>{
      const btn = document.createElement('button');
      btn.innerText = `${o.trim()} (0)`;
      btn.onclick = ()=>{
        counts[i]++; btn.innerText=`${o.trim()} (${counts[i]})`;
      };
      d.appendChild(btn);
      d.appendChild(document.createElement('br'));
    });
    w.appendChild(d);
    return w;
  },

  timetable: () => {
    const w = createWidget('Timetable');
    const tbl = document.createElement('table');
    tbl.border=1;
    tbl.contentEditable=true;
    tbl.innerHTML = `
      <tr><th>Time</th><th>Activity</th></tr>
      <tr><td>8:00</td><td>…</td></tr>
      <tr><td>9:00</td><td>…</td></tr>
    `;
    w.appendChild(tbl);
    return w;
  },

  randomizer: () => {
    const w = createWidget('Randomizer');
    const items = prompt('Items, comma:','Alice,Bob,Carol').split(',');
    const btn = document.createElement('button');
    const d = document.createElement('div');
    btn.innerText='Pick one';
    btn.onclick = ()=> d.innerText = items[Math.floor(Math.random()*items.length)].trim();
    w.appendChild(btn);
    w.appendChild(d);
    return w;
  },

  groupMaker: () => {
    const w = createWidget('Group Maker');
    const names = prompt('Names, comma:','A,B,C,D').split(',');
    const size = parseInt(prompt('Group size:'),10)||2;
    const btn = document.createElement('button');
    const d = document.createElement('div');
    btn.innerText='Make groups';
    btn.onclick = ()=>{
      const arr = names.slice(), out=[];
      while(arr.length) out.push(arr.splice(0,size));
      d.innerHTML = out.map(g=>g.join(', ')).join('<br>');
    };
    w.appendChild(btn);
    w.appendChild(d);
    return w;
  },

  dice: () => {
    const w = createWidget('Dice');
    const btn = document.createElement('button');
    const d = document.createElement('div');
    btn.innerText='Roll 🎲';
    btn.onclick = ()=> d.innerText = Math.floor(Math.random()*6)+1;
    w.appendChild(btn);
    w.appendChild(d);
    return w;
  },

  trafficLight: () => {
    const w = createWidget('Traffic Light');
    const box = document.createElement('div');
    box.className='traffic-box';
    const circles = [];
    ['red','yellow','green'].forEach(c=>{
      const cEl = document.createElement('div');
      cEl.className='traffic-light-circle';
      box.appendChild(cEl);
      circles.push(cEl);
    });
    let idx=0;
    const btn = document.createElement('button');
    btn.innerText='Next';
    btn.onclick = ()=>{
      circles.forEach(c=>c.style.background='#333');
      circles[idx].style.background=['red','yellow','green'][idx];
      idx=(idx+1)%3;
    };
    w.appendChild(box);
    w.appendChild(btn);
    return w;
  },

  scoreboard: () => {
    const w = createWidget('Scoreboard');
    const teams = prompt('Teams, comma:','A,B').split(',');
    const cont = document.createElement('div');
    teams.forEach(t=>{
      let score=0;
      const row = document.createElement('div');
      const lbl = document.createElement('span');
      const disp = document.createElement('span');
      const plus = document.createElement('button');
      const minus = document.createElement('button');
      lbl.innerText = t.trim()+': ';
      disp.innerText = score;
      plus.innerText = '+';
      minus.innerText = '-';
      plus.onclick = ()=> disp.innerText = ++score;
      minus.onclick = ()=> disp.innerText = --score;
      row.append(lbl, disp, plus, minus);
      cont.appendChild(row);
    });
    w.appendChild(cont);
    return w;
  },

  soundLevel: () => {
    const w = createWidget('Sound Level');
    const threshold = parseFloat(prompt('Threshold 0–1:'),10)||0.2;
    const bar = document.createElement('div');
    bar.style.height='20px'; bar.style.width='0'; bar.style.background='green';
    w.appendChild(bar);
    navigator.mediaDevices.getUserMedia({ audio:true }).then(stream=>{
      const aCtx = new AudioContext();
      const src = aCtx.createMediaStreamSource(stream);
      const analyser = aCtx.createAnalyser();
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      function upd(){
        analyser.getByteTimeDomainData(data);
        let sum=0; data.forEach(v=>sum+=Math.abs(v-128));
        const vol = Math.min(1, sum/data.length/128);
        bar.style.width = (vol*100)+'%';
        bar.style.background = vol>=threshold ? 'green':'red';
        requestAnimationFrame(upd);
      }
      upd();
    });
    return w;
  },

  workSymbols: () => {
    const w = createWidget('Work Symbols');
    const syms=['✏️','☕️','✅','🔴'];
    let idx=0;
    const btn = document.createElement('button');
    const d = document.createElement('div');
    d.style.fontSize='2rem';
    btn.innerText='Next';
    btn.onclick = ()=>{ d.innerText=syms[idx]; idx=(idx+1)%syms.length; };
    w.appendChild(d);
    w.appendChild(btn);
    return w;
  },

  stickers: () => {
    const w = createWidget('Stickers');
    const url = prompt('Sticker URL:');
    if(!url) return;
    const img = document.createElement('img');
    img.src=url;
    w.appendChild(img);
    return w;
  },

  image: () => {
    const w = createWidget('Image');
    const url = prompt('Image URL:');
    if(!url) return;
    const img = document.createElement('img');
    img.src=url;
    w.appendChild(img);
    return w;
  },

  video: () => {
    const w = createWidget('Video');
    const url = prompt('Video embed URL:');
    if(!url) return;
    const ifr = document.createElement('iframe');
    ifr.src=url; ifr.width=300; ifr.height=200;
    w.appendChild(ifr);
    return w;
  },

  embed: () => {
    const w = createWidget('Embed');
    let url = prompt('URL to embed:');
    if(!url) return;
    const ifr = document.createElement('iframe');
    ifr.src=url; ifr.width=300; ifr.height=200;
    w.appendChild(ifr);
    // allow double-click to change
    w.ondblclick = () => {
      const nu = prompt('New URL:', ifr.src);
      if(nu) ifr.src = nu;
    };
    return w;
  },

  hyperlink: () => {
    const w = createWidget('Hyperlink');
    const url = prompt('URL:');
    if(!url) return w;
    const text = prompt('Link text:') || url;
    const a = document.createElement('a');
    a.href=url; a.target='_blank'; a.innerText=text;
    w.appendChild(a);
    return w;
  },

  restroom: () => {
    const w = createWidget('Rest Room');
    let allowed = false;
    const disp = document.createElement('div');
    disp.style.fontSize='1.5em';
    disp.style.textAlign='center';
    const btn = document.createElement('button');
    btn.innerText='Toggle';
    function render(){
      disp.innerText = allowed ? '✅ Restroom Allowed' : '❌ Restroom Closed';
      disp.style.color = allowed ? 'green' : 'red';
    }
    btn.onclick = ()=>{ allowed = !allowed; render(); };
    w.appendChild(disp);
    w.appendChild(btn);
    render();
    return w;
  }
};

// hook up widget picker
document.getElementById('widgetSelect').onchange = e => {
  const t = e.target.value;
  if (t && widgetRegistry[t]) widgetRegistry[t]();
  e.target.value = '';
};
