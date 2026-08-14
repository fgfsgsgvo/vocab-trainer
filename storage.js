// ===================== STORAGE =====================
const LS_DECKS = 'vt_decks';
const LS_SETTINGS = 'vt_settings';
const LS_STATS = 'vt_stats';

function loadDecks(){ try{return JSON.parse(localStorage.getItem(LS_DECKS))||{};}catch(e){return{};} }
function saveDecks(d){localStorage.setItem(LS_DECKS,JSON.stringify(d));}
function loadSettings(){
  try{
    const s = JSON.parse(localStorage.getItem(LS_SETTINGS))||{};
    if(s.theme===undefined && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
      s.theme = 'dark';
    }
    return s;
  }catch(e){return{};}
}
function saveSettings(s){localStorage.setItem(LS_SETTINGS,JSON.stringify(s));}
function loadStats(){ try{return JSON.parse(localStorage.getItem(LS_STATS))||{};}catch(e){return{};} }
function saveStats(s){localStorage.setItem(LS_STATS,JSON.stringify(s));}

function recordStudyAction(){
  const s = loadStats();
  const today = new Date().toISOString().slice(0,10);
  s[today] = (s[today]||0)+1;
  // Keep only last 90 days
  const keys = Object.keys(s).sort();
  while(keys.length>90){ delete s[keys.shift()]; }
  saveStats(s);
}
function recordSuccess(){
  recordStudyAction();
  const s = loadSettings();
  const today = new Date().toISOString().slice(0,10);
  s[today+'-correct'] = (s[today+'-correct']||0)+1;
  saveSettings(s);
  // Check goal
  const goal = s.goal||20;
  if(s[today+'-correct']>=goal && s[today+'-goal-done']!==true){
    s[today+'-goal-done'] = true;
    saveSettings(s);
    toast('🎉 每日目标达成！');
  }
}

function getWeekDays(){
  const s = loadStats();
  const now = new Date();
  let days=0;
  for(let i=0;i<7;i++){
    const d = new Date(now); d.setDate(d.getDate()-i);
    if(s[d.toISOString().slice(0,10)]) days++;
  }
  return days;
}

function getTodayCount(){
  return loadStats()[new Date().toISOString().slice(0,10)]||0;
}
function getAutoSpeak(){ return loadSettings().autoSpeak!==false; } // default ON
function toggleAutoSpeak(){ const s=loadSettings(); s.autoSpeak=!getAutoSpeak(); saveSettings(s); render(); }
function toggleTheme(){ const s=loadSettings(); s.theme=s.theme==='dark'?'light':'dark'; s.themeManuallySet=true; saveSettings(s); render(); }

function ensurePreset(){
  const decks = loadDecks();
  if(Object.keys(decks).length===0){
    const id = 'preset-list7';
    decks[id] = { id, title:'雅思词汇（完整版）(List 7)', createdAt:Date.now(), words: PRESET_WORDS.map(w=>({...w,status:'unknown'})) };
    saveDecks(decks);
  }
  // Ensure settings exist
  const settings = loadSettings();
  if(settings.goal===undefined) settings.goal=20;
  saveSettings(settings);
}
// ===================== EXPORT / IMPORT =====================
function exportDecks(){
  const data = { version:1, exportedAt:new Date().toISOString(), decks:loadDecks() };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'vocab-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  URL.revokeObjectURL(url);
}

// JSON file input
const jsonInput = document.createElement('input');
jsonInput.type = 'file'; jsonInput.accept = '.json'; jsonInput.id = 'jsonFileInput'; jsonInput.style.display = 'none';
document.body.appendChild(jsonInput);
jsonInput.addEventListener('change', function(e){
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = function(){
    try{
      const data = JSON.parse(reader.result);
      if(!data.decks){ alert('无效的备份文件。'); return; }
      const current = loadDecks();
      let imported = 0, merged = 0;
      for(const [id, deck] of Object.entries(data.decks)){
        if(current[id]){
          // Merge: update known statuses
          const existing = current[id];
          for(const w of deck.words){
            const exw = existing.words.find(ew=>ew.word===w.word);
            if(exw && w.status==='known' && exw.status==='unknown') exw.status='known';
          }
          merged++;
        } else {
          current[id] = deck;
          imported++;
        }
      }
      saveDecks(current);
      alert('导入完成！新增 '+imported+' 个词库，合并 '+merged+' 个。');
      render();
    }catch(e){ alert('文件解析失败。'); }
  };
  reader.readAsText(f);
  this.value = '';
});

// Follow system theme changes (only if user hasn't manually set preference)
if(window.matchMedia){
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e){
    const s = loadSettings();
    if(!s.themeManuallySet){
      s.theme = e.matches?'dark':'light';
      saveSettings(s);
      render();
    }
  });
}
