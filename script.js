// — in‐memory screens (no localStorage) —
let screens = { 'Screen 1': [] };
let activeScreen = 'Screen 1';

// — drag/drop utility —
function makeDraggable(el){
  let dx,dy,down=false;
  const hdr=el.querySelector('.header');
  hdr.onmousedown=e=>{
    down=true; dx=e.clientX-el.offsetLeft; dy=e.clientY-el.offsetTop;
    document.body.style.userSelect='none';
  };
  document.onmousemove=e=>{
    if(!down)return;
    el.style.left=(e.clientX-dx)+'px';
    el.style.top =(e.clientY-dy)+'px';
  };
  document.onmouseup=()=>{
    if(down) saveCurrentScreen();
    down=false;
    document.body.style.userSelect='';
  };
}

// — widget shell —
function createWidget(type,cfg){
  const w=document.createElement('div');
  w.className='widget'; w.dataset.type=type;
  if(cfg){
    ['left','top','width','height'].forEach(p=>{ if(cfg[p]) w.style[p]=cfg[p]; });
  } else {
    w.style.left='20px'; w.style.top='20px';
    w.style.width='200px'; w.style.height='200px';
  }
  w.innerHTML=`
    <div class="header">
      <span>${type}</span>
      <span class="edit">✎</span>
      <span class="close">✖</span>
    </div>
    <div class="content"></div>
  `;
  w.querySelector('.close').onclick=()=>{
    w.remove(); saveCurrentScreen();
  };
  document.getElementById('canvas').appendChild(w);
  makeDraggable(w);
  return { w, cont: w.querySelector('.content') };
}

// — screen/tab management —
function initScreens(){
  renderTabs();
  loadScreen(activeScreen);
}
function persistScreens(){
  // TODO: Save `screens` and `activeScreen` to Firebase
}
function renderTabs(){
  const tabs=document.getElementById('screenTabs');
  tabs.innerHTML='';
  Object.keys(screens).forEach(name=>{
    const btn=document.createElement('button');
    btn.className='screenTab'+(name===activeScreen?' active':'');
    btn.innerText=name;
    btn.onclick=()=>switchScreen(name);
    tabs.append(btn);
  });
  const add=document.createElement('button');
  add.id='addScreen'; add.innerText='+';
  add.onclick=()=>{
    const nm=prompt('New screen name:');
    if(nm && !screens[nm]){
      screens[nm]=[]; persistScreens(); renderTabs(); switchScreen(nm);
    }
  };
  tabs.append(add);
}
function saveCurrentScreen(){
  const arr=[];
  document.querySelectorAll('.widget').forEach(w=>{
    arr.push({
      type: w.dataset.type,
      left: w.style.left,
      top: w.style.top,
      width: w.style.width,
      height: w.style.height,
      html: w.querySelector('.content').innerHTML,
      ...Object.fromEntries(Object.entries(w.dataset))
    });
  });
  screens[activeScreen]=arr;
  persistScreens();
}
function loadScreen(name){
  document.getElementById('canvas').innerHTML='';
  (screens[name]||[]).forEach(cfg=>{
    const { w, cont } = widgetRegistry[cfg.type](cfg);
    cont.innerHTML=cfg.html;
  });
  activeScreen=name;
  persistScreens();
  document.querySelectorAll('.screenTab').forEach(b=>b.classList.toggle('active',b.innerText===name));
}
function switchScreen(name){
  saveCurrentScreen();
  loadScreen(name);
}

// — annotation overlay —
let annoCanvas,annoCtx,annotating=false,history=[];
function initAnnotation(){
  if(annoCanvas)return;
  const cv=document.getElementById('canvas');
  annoCanvas=document.createElement('canvas');
  annoCanvas.width=cv.clientWidth; annoCanvas.height=cv.clientHeight;
  Object.assign(annoCanvas.style,{position:'absolute',top:0,left:0,zIndex:400,pointerEvents:'none'});
  cv.append(annoCanvas);
  annoCtx=annoCanvas.getContext('2d');
  annoCtx.lineCap='round';
  annoCanvas.onmousedown=e=>{
    if(!annotating)return;
    annoCtx.beginPath();
    annoCtx.moveTo(e.offsetX,e.offsetY);
    annoCanvas.onmousemove=ev=>{
      annoCtx.lineTo(ev.offsetX,ev.offsetY);
      annoCtx.stroke();
    };
  };
  document.onmouseup=()=>{
    annoCanvas.onmousemove=null;
    history.push(annoCanvas.toDataURL());
    saveCurrentScreen(); // fire a TODO: Save to Firebase here
  };
}

// — helpers —
function formatTime(s){
  const m=Math.floor(s/60),sec=s%60;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

// — on load —
document.addEventListener('DOMContentLoaded',()=>{
  initScreens();

  // Toolbar collapse
  const collapseBtn=document.getElementById('collapseBtn'),
        tools=document.getElementById('tools');
  collapseBtn.onclick=()=>{
    const hidden=tools.style.display==='none';
    tools.style.display=hidden?'flex':'none';
    collapseBtn.innerText=hidden?'▲':'▼';
  };

  // Settings panel
  const panel=document.getElementById('settingsPanel');
  document.getElementById('settingsBtn').onclick=()=>panel.style.display='block';
  document.getElementById('closeSettings').onclick=()=>panel.style.display='none';
  document.getElementById('themeToolbar').oninput=e=>
    document.documentElement.style.setProperty('--toolbar-bg',e.target.value);
  document.getElementById('themeWidget').oninput=e=>
    document.documentElement.style.setProperty('--widget-header-bg',e.target.value);

  // Annotation toggle
  const annoBtn=document.getElementById('annotateTool');
  annoBtn.onclick=()=>{
    annotating=!annotating;
    annoBtn.style.opacity=annotating?1:0.6;
    document.getElementById('annoControls').style.display=annotating?'flex':'none';
    initAnnotation();
    annoCanvas.style.pointerEvents=annotating?'auto':'none';
    annoCtx.globalCompositeOperation='source-over';
  };
  document.getElementById('penBtn').onclick=()=>annoCtx.globalCompositeOperation='source-over';
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
    saveCurrentScreen();
  };

  // Save button
  document.getElementById('saveBtn').onclick=()=>{
    saveCurrentScreen();
    alert('Screen saved! (in-memory only; // TODO: push to Firebase)');
  };

  // Select tool
  let selecting=false;
  const selectBtn=document.getElementById('selectTool');
  function onSelect(e){
    if(!selecting)return;
    const w=e.target.closest('.widget');
    if(w){ w.classList.toggle('selected'); e.stopPropagation(); }
  }
  selectBtn.onclick=()=>{
    selecting=!selecting;
    selectBtn.style.opacity=selecting?1:0.6;
    document.addEventListener('click',onSelect,true);
    if(!selecting)document.removeEventListener('click',onSelect,true);
  };

  // Widget picker
  document.getElementById('widgetSelect').onchange=e=>{
    const t=e.target.value;
    if(t && widgetRegistry[t]){
      widgetRegistry[t]();
      saveCurrentScreen();
    }
    e.target.value='';
  };
});

// — Widget registry —
// Each entry should set up its own toolbar, use widget.dataset for state,
// and leave TODOs where Firebase saving/loading belongs.
const widgetRegistry = {

  // ─── Text ───
  text: cfg => {
    const {w,cont} = createWidget('Text',cfg);
    // In‐widget formatting toolbar
    const bar = document.createElement('div');
    bar.className = 'widget-toolbar';
    bar.innerHTML = [
      `<button data-cmd="bold"><b>B</b></button>`,
      `<button data-cmd="italic"><i>I</i></button>`,
      `<button data-cmd="underline"><u>U</u></button>`,
      `<button data-cmd="insertUnorderedList">• List</button>`,
      `<button id="formulaBtn">ƒ</button>`,
      `<select id="fontSizeSel"><option value="1">10px</option><option value="3" selected>14px</option><option value="5">18px</option></select>`,
      `<input type="color" id="fontColor" value="#333"/>`,
      `<select id="alignSel"><option value="left">L</option><option value="center">C</option><option value="right">R</option></select>`,
      `<button id="linkBtn">🔗</button>`
    ].join('');
    cont.append(bar);
    const ta = document.createElement('div');
    ta.contentEditable = true;
    ta.style.flex = '1';
    ta.innerHTML = cfg?.html || 'Click to edit…';
    cont.append(ta);

    // Exec commands
    bar.querySelectorAll('button[data-cmd]').forEach(btn=>{
      btn.onclick = ()=>{ document.execCommand(btn.dataset.cmd, false, null); saveCurrentScreen(); };
    });
    bar.querySelector('#formulaBtn').onclick = ()=>{ /* TODO: formula UI */ };
    bar.querySelector('#fontSizeSel').onchange = e=>{
      document.execCommand('fontSize', false, e.target.value);
      w.dataset.fontSize=e.target.value; saveCurrentScreen();
    };
    bar.querySelector('#fontColor').oninput = e=>{
      document.execCommand('foreColor',false,e.target.value);
      w.dataset.fontColor=e.target.value; saveCurrentScreen();
    };
    bar.querySelector('#alignSel').onchange = e=>{
      document.execCommand('justify'+e.target.value, false, null);
      w.dataset.align=e.target.value; saveCurrentScreen();
    };
    bar.querySelector('#linkBtn').onclick = ()=>{
      const url=prompt('Link URL:');
      if(url){ document.execCommand('createLink',false,url); saveCurrentScreen(); }
    };
    ta.oninput = ()=>{ w.dataset.html=ta.innerHTML; saveCurrentScreen(); };

    return {w,cont};
  },

  // ─── Background ───
  setBackground: ()=> {
    // Opens full‐screen panel off‐canvas
    const panel = document.createElement('div');
    panel.className = 'bg-panel';
    panel.innerHTML = `
      <h4>Choose Background</h4>
      <div>
        <button data-color="#FDEBD0">🟨</button>
        <button data-color="#AED6F1">🟦</button>
        <button data-url="https://picsum.photos/800/600">🎴 Random</button>
        <button id="bgClose">Close</button>
      </div>
    `;
    document.body.append(panel);
    panel.querySelectorAll('button[data-color]').forEach(b=>{
      b.onclick = ()=>{
        document.getElementById('canvas').style.background=b.dataset.color;
        panel.remove(); saveCurrentScreen();
      };
    });
    panel.querySelectorAll('button[data-url]').forEach(b=>{
      b.onclick = ()=>{
        document.getElementById('canvas').style.background=`url('${b.dataset.url}')center/cover`;
        panel.remove(); saveCurrentScreen();
      };
    });
    panel.querySelector('#bgClose').onclick = ()=>panel.remove();
  },

  // ─── Timer ───
  timer: cfg => {
    const {w,cont} = createWidget('Timer',cfg);
    // toolbar
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`
      <button id="minusMin">– Min</button>
      <button id="plusMin">+ Min</button>
      <button id="minusSec">– Sec</button>
      <button id="plusSec">+ Sec</button>
    `;
    cont.append(bar);
    // display
    const display=document.createElement('div');
    display.className='timer-display';
    display.style.flex='1';
    cont.append(display);
    // settings
    w.dataset.minutes=cfg?.minutes||0;
    w.dataset.seconds=cfg?.seconds||0;
    let total = (+w.dataset.minutes)*60 + (+w.dataset.seconds);
    let intervalId;

    function updateDisplay(){
      display.innerText = formatTime(total);
      w.dataset.total=total;
    }
    // button logic
    bar.querySelector('#plusMin').onclick = ()=>{
      total += 60; updateDisplay(); saveCurrentScreen();
    };
    bar.querySelector('#minusMin').onclick = ()=>{
      total = Math.max(0, total-60); updateDisplay(); saveCurrentScreen();
    };
    bar.querySelector('#plusSec').onclick = ()=>{
      total +=1; updateDisplay(); saveCurrentScreen();
    };
    bar.querySelector('#minusSec').onclick = ()=>{
      total = Math.max(0, total-1); updateDisplay(); saveCurrentScreen();
    };

    // responsive start/pause/reset
    const ctrl=document.createElement('div');
    ctrl.className='widget-toolbar';
    ctrl.innerHTML=`
      <button id="startBtn">▶️</button>
      <button id="pauseBtn">⏸️</button>
      <button id="resetBtn">↺</button>
    `;
    cont.append(ctrl);

    ctrl.querySelector('#startBtn').onclick = ()=>{
      if(intervalId) return;
      intervalId = setInterval(()=>{
        if(total>0) total--, updateDisplay(), saveCurrentScreen();
        else clearInterval(intervalId);
      },1000);
    };
    ctrl.querySelector('#pauseBtn').onclick = ()=>{ clearInterval(intervalId); intervalId=null; };
    ctrl.querySelector('#resetBtn').onclick = ()=>{
      clearInterval(intervalId); intervalId=null;
      total = (+w.dataset.minutes)*60 + (+w.dataset.seconds);
      updateDisplay(); saveCurrentScreen();
    };

    updateDisplay();
    return {w,cont};
  },

  // ─── Visual Timer ───
  visualTimer: cfg => {
    const {w,cont} = createWidget('Visual Timer',cfg);
    // toolbar
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`
      <label>Total sec: <input type="number" id="vtTotal" min="1" value="${cfg?.total||60}"/></label>
      <button id="vtSet">Set</button>
    `;
    cont.append(bar);
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=120;
    cont.append(canvas);
    const ctx=canvas.getContext('2d');
    let total = +bar.querySelector('#vtTotal').value;
    let rem   = +cfg?.remaining||total;
    let id;

    function draw(){
      ctx.clearRect(0,0,120,120);
      const pct=rem/total;
      ctx.beginPath();
      ctx.arc(60,60,54,-Math.PI/2,-Math.PI/2+2*Math.PI*pct);
      ctx.lineWidth=10; ctx.stroke();
      ctx.font='16px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(formatTime(rem),60,60);
      w.dataset.total=total; w.dataset.remaining=rem;
      saveCurrentScreen();
    }

    bar.querySelector('#vtSet').onclick = ()=>{
      clearInterval(id);
      total = +bar.querySelector('#vtTotal').value;
      rem = total;
      draw();
    };

    draw();
    id=setInterval(()=>{
      if(rem>0){ rem--; draw(); }
      else clearInterval(id);
    },1000);

    return {w,cont};
  },

  // ─── Event Countdown ───
  eventCountdown: cfg => {
    const {w,cont} = createWidget('Countdown',cfg);
    const target = cfg?.when? new Date(cfg.when)
      : new Date(prompt('Target (YYYY-MM-DD HH:MM):'));
    w.dataset.when=target;
    const disp=document.createElement('div');
    disp.style.flex='1'; cont.append(disp);
    function upd(){
      const diff = target - new Date();
      if(diff<=0){ disp.innerText='🎉'; return; }
      const d=Math.floor(diff/864e5),
            h=Math.floor((diff%864e5)/36e5),
            m=Math.floor((diff%36e5)/6e4),
            s=Math.floor((diff%6e4)/1000);
      disp.innerText=`${d}d ${h}h ${m}m ${s}s`;
      saveCurrentScreen();
    }
    upd(); setInterval(upd,1000);
    return {w,cont};
  },

  // ─── Poll ───
  poll: cfg => {
    const {w,cont} = createWidget('Poll',cfg);
    // toolbar: question type switch
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`
      <select id="qType">
        <option value="mc" ${cfg?.qtype==='mc'?'selected':''}>Multiple Choice</option>
        <option value="smiley" ${cfg?.qtype==='smiley'?'selected':''}>Smileys</option>
        <option value="tf" ${cfg?.qtype==='tf'?'selected':''}>True/False</option>
      </select>
      <button id="newQ">New Question</button>
    `;
    cont.append(bar);
    const disp=document.createElement('div');
    disp.style.flex='1'; disp.innerHTML='<em>Configure poll…</em>';
    cont.append(disp);

    // TODO: flesh out poll UI
    bar.querySelector('#newQ').onclick = ()=>{
      const q=prompt('Question:'); 
      if(q) {
        w.dataset.question=q;
        disp.innerHTML=`<strong>${q}</strong><br><button>Option 1</button>`;
        saveCurrentScreen();
      }
    };
    bar.querySelector('#qType').onchange = e=>{
      w.dataset.qtype=e.target.value;
      // TODO: redraw question input UI
      saveCurrentScreen();
    };

    return {w,cont};
  },

  // ─── Timetable ───
  timetable: cfg => {
    const {w,cont} = createWidget('Timetable',cfg);
    // toolbar
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`
      <button id="addAct">+ Activity</button>
      <button id="toggleMode">Toggle Mode</button>
    `;
    cont.append(bar);
    const list=document.createElement('div');
    list.style.flex='1';
    list.innerHTML = cfg?.html||'<div>8:00 – <span contentEditable>Breakfast</span></div>';
    cont.append(list);

    bar.querySelector('#addAct').onclick = ()=>{
      const time=prompt('Time:'),act=prompt('Activity:');
      if(time && act){
        const row=document.createElement('div');
        row.innerHTML=`${time} – <span contentEditable>${act}</span>`;
        list.append(row);
        w.dataset.html=list.innerHTML;
        saveCurrentScreen();
      }
    };
    bar.querySelector('#toggleMode').onclick = ()=>{
      // TODO: switch between checklist / timed
      alert('Mode toggled (stub).');
    };

    return {w,cont};
  },

  // ─── Randomizer ───
  randomizer: cfg => {
    const {w,cont} = createWidget('Randomizer',cfg);
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`<button id="shuffle">Shuffle</button><button id="reset">Reset</button>`;
    cont.append(bar);
    const disp=document.createElement('div');
    disp.style.flex='1';
    cont.append(disp);

    const items = cfg?.items?cfg.items.split(','):prompt('Items, comma:','A,B,C').split(',');
    w.dataset.items=items.join(',');

    bar.querySelector('#shuffle').onclick = ()=>{
      const pick = items[Math.floor(Math.random()*items.length)];
      disp.innerText=pick;
    };
    bar.querySelector('#reset').onclick = ()=>disp.innerText='';

    return {w,cont};
  },

  // ─── Stickers ───
  stickers: cfg => {
    const {w,cont} = createWidget('Stickers',cfg);
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`<button id="addSticker">Add</button>`;
    cont.append(bar);

    const area=document.createElement('div');
    area.style.flex='1'; area.style.display='flex'; area.style.flexWrap='wrap';
    cont.append(area);

    bar.querySelector('#addSticker').onclick = ()=>{
      const url=prompt('Sticker URL:');
      if(url){
        const img=document.createElement('img');
        img.src=url; img.style.width='50px'; img.style.height='50px'; img.style.cursor='move';
        area.append(img);
        w.dataset.html=area.innerHTML; saveCurrentScreen();
        makeDraggable(img);
      }
    };

    return {w,cont};
  },

  // ─── Group Maker ───
  groupMaker: cfg => {
    const {w,cont} = createWidget('Group Maker',cfg);
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`<button id="makeGroups">Make</button>`;
    cont.append(bar);
    const disp=document.createElement('div'); disp.style.flex='1';
    cont.append(disp);

    const names = cfg?.names?cfg.names.split(','):prompt('Names, comma:','A,B,C').split(',');
    const size  = +cfg?.size||2;
    w.dataset.names=names.join(',');
    w.dataset.size=size;

    bar.querySelector('#makeGroups').onclick = ()=>{
      const arr=[...names],groups=[];
      while(arr.length) groups.push(arr.splice(0,size));
      disp.innerHTML=groups.map(g=>g.join(', ')).join('<br>');
      saveCurrentScreen();
    };

    return {w,cont};
  },

  // ─── Embed ───
  embed: cfg => {
    const {w,cont} = createWidget('Embed',cfg);
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`<button id="editEmbed">Edit</button>`;
    cont.append(bar);
    const ifr=document.createElement('iframe');
    ifr.style.flex='1'; ifr.style.border='none';
    cont.append(ifr);

    function setURL(u){
      // auto‐convert Google Slides
      if(u.includes('docs.google.com/presentation')){
        u=u.replace('/edit','/embed').split('&')[0];
      }
      ifr.src=u; w.dataset.url=u; saveCurrentScreen();
    }
    if(cfg?.url) setURL(cfg.url);

    bar.querySelector('#editEmbed').onclick=()=>{
      const u=prompt('Embed URL:',w.dataset.url||'');
      if(u) setURL(u);
    };

    return {w,cont};
  },

  // ─── Clock ───
  clock: ()=> {
    const {w,cont} = createWidget('Clock');
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`<button id="toggleFormat">12/24hr</button>`;
    cont.append(bar);
    const disp=document.createElement('div'); disp.style.flex='1'; cont.append(disp);
    let format24 = !!w.dataset.format24;
    function update(){
      const d=new Date();
      disp.innerText = format24
        ? d.toLocaleTimeString()
        : d.toLocaleTimeString(undefined,{hour12:true});
      saveCurrentScreen();
    }
    bar.querySelector('#toggleFormat').onclick=()=>{
      format24=!format24;
      w.dataset.format24=format24;
      update();
    };
    setInterval(update,500); update();
    return {w,cont};
  },

  // ─── Traffic Light ───
  trafficLight: ()=> {
    const {w,cont} = createWidget('Traffic Light');
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`<button id="cycle">Cycle</button>`;
    cont.append(bar);
    const box=document.createElement('div');
    box.className='traffic-box';
    cont.append(box);
    const circs=[];
    ['red','yellow','green'].forEach(col=>{
      const c=document.createElement('div');
      c.className='traffic-light-circle';
      box.append(c);
      circs.push(c);
    });
    let idx=0;
    function cycle(){
      circs.forEach(c=>c.style.background='#444');
      circs[idx].style.background=['red','yellow','green'][idx];
      w.dataset.idx=idx;
      idx=(idx+1)%3;
      saveCurrentScreen();
    }
    bar.querySelector('#cycle').onclick=cycle;
    if(w.dataset.idx) idx=+w.dataset.idx;
    cycle();
    return {w,cont};
  },

  // ─── Sound Level ───
  soundLevel: cfg=> {
    const {w,cont} = createWidget('Sound Level',cfg);
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`
      <label>Mic: <button id="micToggle">🎤</button></label>
      <label>Sens: <input type="range" min=0 max=1 step=0.01 id="sensIn" value="${cfg?.sens||0.2}"/></label>
    `;
    cont.append(bar);
    const meter=document.createElement('div');
    meter.style.flex='1'; meter.style.width='100%'; meter.style.background='#ccc';
    meter.style.height='20px'; cont.append(meter);

    let sens = +w.dataset.sens ||0.2;
    w.dataset.sens=sens;
    bar.querySelector('#sensIn').oninput=e=>{
      sens=+e.target.value; w.dataset.sens=sens; saveCurrentScreen();
    };
    // TODO: hook up actual mic
    setInterval(()=>{
      // dummy random
      const vol = Math.random();
      meter.style.width=(vol*100)+'%';
      meter.style.background= vol<=sens?'green':'red';
    },200);

    return {w,cont};
  },

  // ─── Work Symbols ───
  workSymbols:()=> {
    const {w,cont}=createWidget('Work Symbols');
    const symbols=['✏️','☕️','✅','🔴'];
    let idx=+w.dataset.idx||0;
    const btn=document.createElement('button');
    const disp=document.createElement('div');
    disp.style.flex='1'; disp.style.fontSize='2rem'; cont.append(disp,btn);
    function show(){
      disp.innerText=symbols[idx];
      w.dataset.idx=idx; saveCurrentScreen();
    }
    btn.innerText='Next'; btn.onclick=()=>{ idx=(idx+1)%symbols.length; show(); };
    show();
    return {w,cont};
  },

  // ─── Image, Video, Hyperlink, QR Code, Stopwatch, Draw, Webcam, Calendar ───
  image: cfg=> {
    const {w,cont}=createWidget('Image',cfg);
    const url=cfg?.url||prompt('Image URL:');
    if(url){
      const img=document.createElement('img');
      img.src=url; cont.append(img);
      w.dataset.url=url; saveCurrentScreen();
    }
    return {w,cont};
  },
  video: cfg=> {
    const {w,cont}=createWidget('Video',cfg);
    const url=cfg?.url||prompt('YouTube URL/ID:');
    if(url){
      const ifr=document.createElement('iframe');
      ifr.src=`https://www.youtube.com/embed/${url.split('v=')[1]||url}`;
      ifr.allowFullscreen=true; cont.append(ifr);
      w.dataset.url=url; saveCurrentScreen();
    }
    return {w,cont};
  },
  hyperlink: cfg=> {
    const {w,cont}=createWidget('Hyperlink',cfg);
    const data = cfg?.links? JSON.parse(cfg.links): [];
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`<button id="addLink">+ Link</button>`;
    cont.append(bar);
    const list=document.createElement('div'); list.style.flex='1'; cont.append(list);

    function render(){
      list.innerHTML='';
      data.forEach((ln,i)=>{
        const row=document.createElement('div');
        row.innerHTML=`<a href="${ln.url}" target="_blank">${ln.text}</a>
          <button data-del="${i}">✖</button>`;
        row.querySelector('button').onclick=e=>{
          data.splice(i,1); render(); w.dataset.links=JSON.stringify(data); saveCurrentScreen();
        };
        list.append(row);
      });
    }
    bar.querySelector('#addLink').onclick=()=>{
      const url=prompt('URL:'),text=prompt('Link text:')||url;
      if(url){ data.push({url,text}); render(); w.dataset.links=JSON.stringify(data); saveCurrentScreen();}
    };
    render();
    return {w,cont};
  },
  qrCode: cfg=> {
    const {w,cont}=createWidget('QR Code',cfg);
    const url=cfg?.url||prompt('Text or URL:');
    if(url){
      const img=document.createElement('img');
      img.src=`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=150x150`;
      cont.append(img);
      w.dataset.url=url; saveCurrentScreen();
    }
    return {w,cont};
  },
  stopwatch: cfg=> {
    const {w,cont}=createWidget('Stopwatch',cfg);
    let running=false, startTime=0, elapsed=+cfg?.elapsed||0;
    const disp=document.createElement('div'); disp.style.flex='1'; cont.append(disp);
    const bar=document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`
      <button id="swStart">▶️</button>
      <button id="swStop">⏸️</button>
      <button id="swLap">🏁</button>
    `;
    cont.append(bar);
    const laps=document.createElement('div'); laps.style.flex='1;overflow:auto';
    cont.append(laps);

    function update(){
      const now=running? Date.now()-startTime+elapsed : elapsed;
      disp.innerText=formatTime(Math.floor(now/1000));
    }
    bar.querySelector('#swStart').onclick=()=>{
      if(!running){ running=true; startTime=Date.now(); interval=setInterval(update,500); }
    };
    bar.querySelector('#swStop').onclick=()=>{
      if(running){ running=false; clearInterval(interval); elapsed += Date.now()-startTime; saveCurrentScreen();}
    };
    bar.querySelector('#swLap').onclick=()=>{
      const lap=document.createElement('div');
      lap.innerText=disp.innerText;
      laps.append(lap);
      // TODO: save laps in dataset
    };
    update(); return {w,cont};
   },

  // ─── Draw ───
  draw: cfg => {
    const { w, cont } = createWidget('Draw', cfg);
    // In‐widget drawing toolbar
    const bar = document.createElement('div');
    bar.className = 'widget-toolbar';
    bar.innerHTML = `
      <button id="drawPen">✏️</button>
      <button id="drawEraser">🧹</button>
      <input type="color" id="drawColor" value="${cfg?.color||'#000000'}"/>
      <input type="range" id="drawSize" min="1" max="20" value="${cfg?.size||4}"/>
      <button id="drawClear">Clear</button>
    `;
    cont.append(bar);

    // Canvas setup
    const canvas = document.createElement('canvas');
    canvas.width = cont.clientWidth;
    canvas.height = cont.clientHeight - bar.offsetHeight;
    Object.assign(canvas.style, { flex: '1', cursor: 'crosshair' });
    cont.append(canvas);
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    let drawing = false;

    function setMode(mode) {
      ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    }
    function resizeCanvas() {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = cont.clientWidth;
      canvas.height = cont.clientHeight - bar.offsetHeight;
      ctx.putImageData(img, 0, 0);
    }
    window.addEventListener('resize', resizeCanvas);

    // Toolbar events
    bar.querySelector('#drawPen').onclick     = () => setMode('draw');
    bar.querySelector('#drawEraser').onclick  = () => setMode('erase');
    bar.querySelector('#drawColor').oninput   = e => { ctx.strokeStyle = e.target.value; w.dataset.color = e.target.value; /* TODO: Save to Firebase */ };
    bar.querySelector('#drawSize').oninput    = e => { ctx.lineWidth = e.target.value; w.dataset.size = e.target.value; /* TODO: Save to Firebase */ };
    bar.querySelector('#drawClear').onclick   = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); /* TODO: Save to Firebase */ };

    // Drawing events
    canvas.onmousedown = e => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
    canvas.onmousemove = e => { if (!drawing) return; ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); };
    document.onmouseup = () => { if (drawing) { drawing = false; /* TODO: Save to Firebase */ } };

    // Initialize
    setMode('draw');
    ctx.strokeStyle = cfg?.color || '#000000';
    ctx.lineWidth   = cfg?.size  || 4;

    return { w, cont };
  },

  // ─── Webcam ───
  webcam: cfg => {
    const { w, cont } = createWidget('Webcam', cfg);
    // Toolbar
    const bar = document.createElement('div');
    bar.className = 'widget-toolbar';
    bar.innerHTML = `
      <button id="camFlip">Flip</button>
      <button id="camRotate">Rotate</button>
    `;
    cont.append(bar);

    // Video element
    const video = document.createElement('video');
    video.autoplay = true;
    Object.assign(video.style, { flex: '1', objectFit: 'cover', transform: cfg?.transform||'' });
    cont.append(video);

    // Access webcam
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => { video.srcObject = stream; })
      .catch(err => { cont.innerText = '❌ ' + err.message; });

    // Toolbar events
    let flipped = cfg?.flipped === 'true';
    let rotated = cfg?.rotated === 'true';
    function applyTransform() {
      let t = '';
      if (flipped) t += 'scaleX(-1) ';
      if (rotated) t += 'rotate(90deg) ';
      video.style.transform = t.trim();
      w.dataset.transform = t.trim();
      w.dataset.flipped = flipped;
      w.dataset.rotated = rotated;
      /* TODO: Save to Firebase */
    }
    bar.querySelector('#camFlip').onclick = () => { flipped = !flipped; applyTransform(); };
    bar.querySelector('#camRotate').onclick = () => { rotated = !rotated; applyTransform(); };

    applyTransform();
    return { w, cont };
  },

  // ─── Calendar ───
  calendar: cfg => {
    const { w, cont } = createWidget('Calendar', cfg);
    // Toolbar
    const bar = document.createElement('div');
    bar.className = 'widget-toolbar';
    bar.innerHTML = `
      <button id="prevMonth">‹</button>
      <span id="calTitle"></span>
      <button id="nextMonth">›</button>
    `;
    cont.append(bar);

    // Calendar grid
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      flex: '1',
      gap: '2px'
    });
    cont.append(grid);

    // State
    let date = cfg?.date ? new Date(cfg.date) : new Date();
    w.dataset.date = date.toISOString();

    function renderCalendar() {
      const year = date.getFullYear(), month = date.getMonth();
      bar.querySelector('#calTitle').innerText = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      grid.innerHTML = '';
      // Weekday headers
      ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
        const hd = document.createElement('div');
        hd.style.fontWeight = 'bold';
        hd.innerText = d;
        grid.append(hd);
      });
      // Days filler
      const firstDay = new Date(year, month, 1).getDay();
      for (let i=0; i<firstDay; i++){
        grid.append(document.createElement('div'));
      }
      // Days
      const daysInMonth = new Date(year, month+1, 0).getDate();
      for (let d=1; d<=daysInMonth; d++){
        const cell = document.createElement('div');
        cell.innerText = d;
        cell.style.cursor = 'pointer';
        cell.onclick = () => {
          w.dataset.selectedDay = d;
          /* TODO: Save selection to Firebase */
        };
        grid.append(cell);
      }
      w.dataset.date = date.toISOString();
      /* TODO: Save to Firebase */
    }

    bar.querySelector('#prevMonth').onclick = () => { date.setMonth(date.getMonth()-1); renderCalendar(); };
    bar.querySelector('#nextMonth').onclick = () => { date.setMonth(date.getMonth()+1); renderCalendar(); };

    renderCalendar();
    return { w, cont };
  }

}; // end of widgetRegistry
