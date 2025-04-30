// — Utility: make any element draggable by its .header —
function makeDraggable(w){
  let dx,dy,down=false;
  const hdr=w.querySelector('.header');
  hdr.onmousedown=e=>{
    down=true;
    dx=e.clientX-w.offsetLeft;
    dy=e.clientY-w.offsetTop;
    document.body.style.userSelect='none';
  };
  document.onmousemove=e=>{
    if(!down)return;
    w.style.left=(e.clientX-dx)+'px';
    w.style.top=(e.clientY-dy)+'px';
  };
  document.onmouseup=e=>{
    down=false; document.body.style.userSelect='';
  };
}

// — Widget factory: wraps a title + edit/close controls —
function createWidget(type,config){
  const w=document.createElement('div');
  w.className='widget';
  w.dataset.type=type;
  w.innerHTML=`
    <div class="header">
      <span>${type}</span>
      <span class="edit" title="Edit">✎</span>
      <span class="close" title="Close">✖</span>
    </div>
    <div class="content"></div>
  `;
  const cont=w.querySelector('.content');
  w.querySelector('.close').onclick=()=>{w.remove();};
  makeDraggable(w);
  document.getElementById('canvas').appendChild(w);
  // apply config if provided
  if(config){
    if(config.left) w.style.left=config.left;
    if(config.top)  w.style.top=config.top;
    if(config.width) w.style.width=config.width;
    if(config.height)w.style.height=config.height;
  } else {
    w.style.left='20px'; w.style.top='20px';
  }
  return {w,cont,config};
}

// — Persist & restore layout —
function saveLayout(){
  const data=[];
  document.querySelectorAll('.widget').forEach(w=>{
    data.push({
      type:w.dataset.type,
      left:w.style.left,
      top:w.style.top,
      width:w.style.width,
      height:w.style.height,
      html:w.querySelector('.content').innerHTML
    });
  });
  localStorage.setItem('layout',JSON.stringify(data));
  alert('Layout saved!');
}
function loadLayout(){
  const raw=localStorage.getItem('layout');
  if(!raw)return;
  JSON.parse(raw).forEach(o=>{
    const {w,cont} = widgetRegistry[o.type](o);
    cont.innerHTML=o.html;
    w.style.width=o.width; w.style.height=o.height;
    w.style.left=o.left; w.style.top=o.top;
  });
}

// — Annotation overlay —
let annoCanvas,annoCtx,annotating=false,draw=false,history=[];
function initAnnotation(){
  if(annoCanvas)return;
  const cv=document.getElementById('canvas');
  annoCanvas=document.createElement('canvas');
  annoCanvas.width=cv.clientWidth; annoCanvas.height=cv.clientHeight;
  Object.assign(annoCanvas.style,{position:'absolute',top:0,left:0,zIndex:400});
  cv.appendChild(annoCanvas);
  annoCtx=annoCanvas.getContext('2d');
  annoCtx.lineCap='round';
  annoCanvas.onmousedown=e=>{
    draw=true; annoCtx.beginPath();
    annoCtx.moveTo(e.offsetX,e.offsetY);
  };
  annoCanvas.onmousemove=e=>{
    if(!draw)return;
    annoCtx.lineTo(e.offsetX,e.offsetY);
    annoCtx.stroke();
  };
  document.onmouseup=e=>{
    if(!draw)return;
    draw=false; history.push(annoCanvas.toDataURL());
  };
}

// — Initialization —
document.addEventListener('DOMContentLoaded',()=>{
  // Toolbar controls
  const collapseBtn=document.getElementById('collapseBtn');
  const tools=document.getElementById('tools');
  collapseBtn.onclick=()=>{
    tools.style.display=(tools.style.display==='none')?'flex':'flex';
    collapseBtn.innerText=(collapseBtn.innerText==='▲')?'▼':'▲';
  };

  // Settings panel
  const panel=document.getElementById('settingsPanel');
  document.getElementById('settingsBtn').onclick=()=>panel.style.display='block';
  document.getElementById('closeSettings').onclick=()=>panel.style.display='none';
  document.getElementById('themeToolbar').oninput=e=>{
    document.documentElement.style.setProperty('--toolbar-bg',e.target.value);
  };
  document.getElementById('themeWidget').oninput=e=>{
    document.documentElement.style.setProperty('--widget-header-bg',e.target.value);
  };

  // Annotation toggle
  const annoBtn=document.getElementById('annotateTool');
  annoBtn.onclick=()=>{
    annotating=!annotating;
    annoBtn.style.opacity=annotating?1:0.6;
    document.getElementById('annoControls').style.display=annotating?'flex':'none';
    initAnnotation();
  };
  document.getElementById('penColor').oninput=e=>annoCtx.strokeStyle=e.target.value;
  document.getElementById('penSize').oninput=e=>annoCtx.lineWidth=e.target.value;
  document.getElementById('eraserBtn').onclick=()=>annoCtx.globalCompositeOperation='destination-out';
  document.getElementById('undoBtn').onclick=()=>{
    if(!history.length)return;
    history.pop();
    annoCtx.clearRect(0,0,annoCanvas.width,annoCanvas.height);
    const last=history[history.length-1];
    if(last){
      const img=new Image();
      img.onload=()=>annoCtx.drawImage(img,0,0);
      img.src=last;
    }
  };

  // Save/Load
  document.getElementById('saveBtn').onclick=saveLayout;
  loadLayout();

  // Widget picker
  document.getElementById('widgetSelect').onchange=e=>{
    const type=e.target.value;
    if(type && widgetRegistry[type]) widgetRegistry[type]();
    e.target.value='';
  };
});

// — Widget implementations —
const widgetRegistry = {
  screenShare: cfg=>{
    const {w,cont}=createWidget('Screen Share',cfg);
    navigator.mediaDevices.getDisplayMedia({video:true})
      .then(s=>{
        const v=document.createElement('video');
        v.srcObject=s; v.autoplay=true;
        Object.assign(v.style,{width:'100%',height:'100%',objectFit:'cover'});
        cont.appendChild(v);
      })
      .catch(err=>cont.innerText='❌ '+err.message);
    return {w,cont};
  },

  setBackground: ()=>{  
    const color=prompt('Enter color or image URL:');  
    if(color) document.getElementById('canvas').style.background =
      color.startsWith('http')?`url('${color}')center/cover no-repeat`:color;
  },

  text: cfg=>{
    const {w,cont}=createWidget('Text',cfg);
    const d=document.createElement('div');
    d.contentEditable=true;
    d.style.minHeight='50px';
    d.innerHTML=cfg?.text||'Click to edit…';
    d.oninput=()=>w.dataset.text=d.innerHTML;
    cont.appendChild(d);
    return {w,cont};
  },

  clock: ()=>{  
    const {w,cont}=createWidget('Clock');  
    const d=document.createElement('div');  
    d.style.fontSize='1.2em';  
    cont.appendChild(d);  
    setInterval(()=>d.innerText=new Date().toLocaleTimeString(),500);  
    return {w,cont};  
  },

  timer: cfg=>{
    const {w,cont}=createWidget('Timer',cfg);
    let s=cfg?.seconds||0;
    const d=document.createElement('div');
    d.innerText=formatTime(s);
    cont.appendChild(d);
    const btn=document.createElement('button');
    btn.innerText='▶️/⏸️';
    let tid;
    btn.onclick=()=>{
      if(tid){clearInterval(tid);tid=null;}
      else tid=setInterval(()=>{s++;d.innerText=formatTime(s);w.dataset.seconds=s;},1000);
    };
    cont.appendChild(btn);
    return {w,cont};
  },

  visualTimer: cfg=>{
    const {w,cont}=createWidget('Visual Timer',cfg);
    const total=cfg?.total||60;
    let rem=cfg?.remaining??total;
    const c=document.createElement('canvas');
    c.width=c.height=120; cont.appendChild(c);
    const x=c.getContext('2d');
    function draw(){
      x.clearRect(0,0,120,120);
      const pct=rem/total;
      x.beginPath();
      x.arc(60,60,54,-Math.PI/2,-Math.PI/2+2*Math.PI*pct);
      x.lineWidth=10; x.stroke();
      x.font='16px sans-serif';x.textAlign='center';x.textBaseline='middle';
      x.fillText(formatTime(rem),60,60);
      w.dataset.remaining=rem;
    }
    draw();
    const tid=setInterval(()=>{
      if(rem>0){rem--;draw();}
      else clearInterval(tid);
    },1000);
    return {w,cont};
  },

  eventCountdown: cfg=>{
    const {w,cont}=createWidget('Countdown',cfg);
    const when=cfg?.when?new Date(cfg.when):new Date(prompt('Target (YYYY-MM-DD HH:MM):'));
    w.dataset.when=when;
    const d=document.createElement('div');cont.appendChild(d);
    function upd(){
      const diff=when-new Date();
      if(diff<=0){d.innerText='🎉';return;}
      const d1=Math.floor(diff/864e5),h=Math.floor(diff%864e5/36e5),
            m=Math.floor(diff%36e5/6e4),s=Math.floor(diff%6e4/1000);
      d.innerText=`${d1}d ${h}h ${m}m ${s}s`;
    }
    upd();setInterval(upd,1000);
    return {w,cont};
  },

  poll: cfg=>{
    const {w,cont}=createWidget('Poll',cfg);
    const q=cfg?.q||prompt('Question:')||'...?';
    const opts=cfg?.opts||prompt('Options, comma:','Yes,No').split(',');
    w.dataset.q=q;w.dataset.opts=opts.join(',');
    const out=document.createElement('div');
    out.innerHTML=`<strong>${q}</strong><br>`;
    const counts=(cfg?.counts)||opts.map(_=>0);
    opts.forEach((o,i)=>{
      const btn=document.createElement('button');
      function update(){
        btn.innerText=`${o.trim()} (${counts[i]})`;
      }
      btn.onclick=()=>{
        counts[i]++;w.dataset.counts=counts.join(',');update();
      };
      update();
      out.appendChild(btn);out.appendChild(document.createElement('br'));
    });
    cont.appendChild(out);
    return {w,cont};
  },

  timetable: cfg=>{
    const {w,cont}=createWidget('Timetable',cfg);
    const tbl=document.createElement('table');
    tbl.border=1;tbl.contentEditable=true;
    tbl.innerHTML=cfg?.html||`
      <tr><th>Time</th><th>Activity</th></tr>
      <tr><td>8:00</td><td>…</td></tr>`;
    tbl.oninput=()=>w.dataset.html=tbl.innerHTML;
    cont.appendChild(tbl);
    return {w,cont};
  },

  randomizer: cfg=>{
    const {w,cont}=createWidget('Randomizer',cfg);
    const items=cfg?.items||prompt('Items, comma:','Alice,Bob,Carol').split(',');
    w.dataset.items=items.join(',');
    const btn=document.createElement('button'),d=document.createElement('div');
    btn.innerText='Pick one';
    btn.onclick=()=>d.innerText=items[Math.floor(Math.random()*items.length)].trim();
    cont.append(btn,d);
    return {w,cont};
  },

  groupMaker: cfg=>{
    const {w,cont}=createWidget('Group Maker',cfg);
    const names=cfg?.names||prompt('Names, comma:','A,B,C').split(',');
    const size=cfg?.size||parseInt(prompt('Group size:'),10)||2;
    w.dataset.names=names.join(',');w.dataset.size=size;
    const btn=document.createElement('button'),d=document.createElement('div');
    btn.innerText='Make groups';
    btn.onclick=()=>{
      const arr=names.slice(),out=[];
      while(arr.length)out.push(arr.splice(0,size));
      d.innerHTML=out.map(g=>g.join(', ')).join('<br>');
    };
    cont.append(btn,d);
    return {w,cont};
  },

  dice: ()=>{const {w,cont}=createWidget('Dice');
    const btn=document.createElement('button'),d=document.createElement('div');
    btn.innerText='Roll 🎲';btn.onclick=()=>d.innerText=Math.floor(Math.random()*6)+1;
    cont.append(btn,d);return{w,cont};},

  trafficLight: ()=>{const {w,cont}=createWidget('Traffic Light');
    const box=document.createElement('div'),circs=[];
    box.className='traffic-box';
    ['red','yellow','green'].forEach(c=>{
      const cc=document.createElement('div');cc.className='traffic-light-circle';
      box.append(cc);circs.push(cc);
    });
    let idx=0;const btn=document.createElement('button');
    btn.innerText='Next';btn.onclick=()=>{
      circs.forEach(c=>c.style.background='#444');
      circs[idx].style.background=['red','yellow','green'][idx];
      idx=(idx+1)%3;
    };
    cont.append(box,btn);return{w,cont};},

  scoreboard: ()=>{const {w,cont}=createWidget('Scoreboard');
    const teams=prompt('Teams, comma:','A,B').split(',');
    teams.forEach(t=>{
      let sc=0;
      const row=document.createElement('div');
      const lbl=document.createElement('span'),disp=document.createElement('span');
      const plus=document.createElement('button'),minus=document.createElement('button');
      lbl.innerText=t.trim()+': ';
      disp.innerText=sc;
      plus.innerText='+';minus.innerText='-';
      plus.onclick=()=>disp.innerText=++sc;
      minus.onclick=()=>disp.innerText=--sc;
      row.append(lbl,disp,plus,minus);cont.append(row);
    });
    return{w,cont};},

  soundLevel: cfg=>{
    const {w,cont}=createWidget('Sound Level',cfg);
    let g=cfg?.gThreshold||0.2,y=cfg?.yThreshold||0.5;
    cont.innerHTML=`
      <label>Green up to <input type="number" min=0 max=1 step=0.01 value="${g}" id="gIn"/></label>
      <label>Yellow up to <input type="number" min=0 max=1 step=0.01 value="${y}" id="yIn"/></label>
      <div id="bar"></div>
    `;
    const bar=cont.querySelector('#bar');
    Object.assign(bar.style,{height:'20px',width:'0',marginTop:'8px'});
    cont.querySelector('#gIn').oninput=e=>g=parseFloat(e.target.value);
    cont.querySelector('#yIn').oninput=e=>y=parseFloat(e.target.value);
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
      const ac=new AudioContext(),src=ac.createMediaStreamSource(stream),
            an=ac.createAnalyser(),data=new Uint8Array(an.fftSize);
      src.connect(an);
      (function upd(){
        an.getByteTimeDomainData(data);
        let sum=0;data.forEach(v=>sum+=Math.abs(v-128));
        const vol=Math.min(1,sum/data.length/128);
        bar.style.width=(vol*100)+'%';
        bar.style.background=vol<=g?'green':vol<=y?'yellow':'red';
        requestAnimationFrame(upd);
      })();
    });
    return{w,cont};
  },

  workSymbols: ()=>{const {w,cont}=createWidget('Work Symbols');
    const syms=['✏️','☕️','✅','🔴'];let i=0;
    const btn=document.createElement('button'),d=document.createElement('div');
    d.style.fontSize='2rem';btn.innerText='Next';
    btn.onclick=()=>{d.innerText=syms[i];i=(i+1)%syms.length;};
    cont.append(d,btn);return{w,cont};},

  stickers: ()=>{const {w,cont}=createWidget('Stickers');
    const url=prompt('Sticker URL:');if(!url)return{w,cont};
    const img=document.createElement('img');img.src=url;cont.append(img);
    return{w,cont};},

  image: ()=>{const {w,cont}=createWidget('Image');
    const url=prompt('Image URL:');if(!url)return{w,cont};
    const img=document.createElement('img');img.src=url;cont.append(img);
    return{w,cont};},

  video: ()=>{const {w,cont}=createWidget('Video');
    const url=prompt('Video embed URL:');if(!url)return{w,cont};
    const ifr=document.createElement('iframe');
    ifr.src=url;ifr.style.width='100%';ifr.style.height='200px';ifr.allowFullScreen=false;
    cont.append(ifr);return{w,cont};},

  embed: cfg=>{
    const {w,cont}=createWidget('Embed',cfg);
    const ifr=document.createElement('iframe');
    Object.assign(ifr.style,{width:'100%',height:'200px'});
    cont.append(ifr);
    const setURL=u=>{
      // auto-convert Google Slides
      if(u.includes('docs.google.com/presentation')){
        u=u.replace('/edit','/embed').split('&')[0];
      }
      ifr.src=u;
      w.dataset.url=u;
    };
    if(cfg?.url) setURL(cfg.url);
    w.querySelector('.edit').onclick=()=>{
      const u=prompt('Embed URL:',w.dataset.url||'');
      if(u) setURL(u);
    };
    return{w,cont};
  },

  hyperlink: ()=>{const {w,cont}=createWidget('Hyperlink');
    const url=prompt('URL:'),text=prompt('Link text:')||url;
    if(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.innerText=text;cont.append(a);}
    return{w,cont};},

  restroom: ()=>{const {w,cont}=createWidget('Rest Room');
    let ok=false;
    const d=document.createElement('div');
    d.style.fontSize='1.5em';d.style.textAlign='center';
    const btn=document.createElement('button');
    btn.innerText='Toggle';btn.onclick=()=>{
      ok=!ok;d.innerText=ok?'✅ Allowed':'❌ Closed';d.style.color=ok?'green':'red';
    };
    d.innerText='❌ Closed';cont.append(d,btn);
    return{w,cont};}
};
