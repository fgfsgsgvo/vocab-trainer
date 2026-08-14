// ===================== HELPERS =====================
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function extractPOS(zh){
  const prefixes = ['n.','v.','adj.','adv.','vt.','vi.','prep.','conj.','pron.','num.','art.','int.'];
  for(const p of prefixes){
    if(zh.startsWith(p)) return p;
  }
  return '';
}

// Format active word display with level dots
function levelDots(level){
  level = level||0;
  const stages = ['⚪','🟡','🟠','🟢'];
  return stages.slice(0,level).join('')+stages.slice(level,4).join('').replace(/[🟡🟠🟢⚪]/g,'·');
}

function render(){
  if(renderBusy) return;
  renderBusy = true;
  const settings = loadSettings();
  const isDark = settings.theme==='dark';
  document.body.classList.toggle('dark', isDark);

  let html = '';
  // Header
  html += '<div class="app-header">';
  html += '<h1>📚 VocabTrainer</h1>';
  html += '<div class="header-right">';
  if(currentView!=='decks') html += '<button class="btn btn-outline btn-sm" data-action="go-decks">🏠 词库</button>';
  html += '<button class="btn btn-outline btn-sm" data-action="toggle-theme" style="gap:4px">'+(isDark?'☀️ 日间':'🌙 夜间')+'</button>';
  html += '</div></div>';

  // Breadcrumb
  html += '<div class="breadcrumb"><a data-action="go-decks">词库列表</a>';
  if(activeDeckId && currentView!=='decks'){
    const d = getDeck();
    if(currentView==='review') html += ' <span>›</span> <a data-action="go-decks">'+esc(d.title)+'</a> <span>› 筛查</span>';
    else if(currentView==='study') html += ' <span>›</span> <a data-action="go-decks">'+esc(d.title)+'</a> <span>› 背生词</span>';
    else if(currentView==='import-preview') html += ' <span>›</span> <span>导入预览</span>';
  }
  html += '</div>';

  // Main
  switch(currentView){
    case 'decks': html += renderDecksHTML(); break;
    case 'review': html += renderReviewHTML(); break;
    case 'study': html += renderStudyHTML(); break;
    case 'import-preview': html += renderImportPreviewHTML(); break;
  }

  document.getElementById('app').innerHTML = html;

  // Post-render setup
  if(currentView==='decks') setupImportZone();
  if(currentView==='study' && studyMode==='list') setupSearchInput();
  if(currentView==='study' && studyMode==='spell'){
    setTimeout(()=>{
      const id = spellSubMode==='enzh'?'spellInputEn2':'spellInputEn';
      const inp = document.getElementById(id); if(inp) inp.focus();
    }, 100);
  }

  // Auto-speak (immediate, no delay)
  if(getAutoSpeak()){
    if(currentView==='study' && studyMode==='flashcard' && studyWords.length>0) speakWord(studyWords[studyIndex].word);
    if(currentView==='study' && studyMode==='quiz' && quizCur) speakWord(quizCur.word);
    if(currentView==='review' && reviewIndex<reviewWords.length) speakWord(reviewWords[reviewIndex].word);
  }
  setTimeout(()=>{ renderBusy = false; }, 50);
}

// ===================== DECKS =====================
function renderDecksHTML(){
  decks = loadDecks();
  const list = Object.values(decks).sort((a,b)=>b.createdAt-a.createdAt);
  let h = '<h2 style="margin-bottom:12px">📦 导入词库</h2>';
  h += '<div class="import-zone" id="importZone">';
  h += '<div class="icon">📂</div>';
  h += '<p>点击选择 HTML 文件，或拖拽文件到这里</p>';
  h += '<p style="font-size:.8rem;opacity:.7">支持 HTML / CSV（word,中文 格式）/ TXT</p>';
  h += '<button class="btn btn-outline btn-sm" data-action="show-paste" style="margin-top:8px">📋 粘贴 HTML / CSV / TXT 文本</button>';
  h += '</div>';
  h += '<div class="paste-area" id="pasteArea">';
  h += '<textarea id="pasteTextarea" placeholder="粘贴 HTML 源码，或 CSV 格式（每行: 单词,中文释义）..."></textarea>';
  h += '<button class="btn btn-primary btn-sm" data-action="process-paste" style="margin-top:8px">解析并导入</button>';
  h += '</div>';

  if(list.length>0){
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:20px;margin-bottom:10px">';
    h += '<h2>📋 我的词库 ('+list.length+')</h2>';
    h += '<div style="display:flex;gap:8px">';
    h += '<button class="btn btn-outline btn-sm" data-action="export-decks">📤 导出</button>';
    h += '<button class="btn btn-outline btn-sm" data-action="import-decks">📥 导入</button>';
    h += '</div></div>';
    // Quick stats
    const today = getTodayCount();
    const weekDays = getWeekDays();
    const streak = getStreak();
    const chart = getDayChart(7);
    const goal = loadSettings().goal||20;
    const goalPct = Math.min(100, Math.round(today/goal*100));
    h += '<div class="deck-card" style="border-left:3px solid var(--accent)">';
    h += '<div class="deck-info"><h3>📊 学习统计</h3>';
    h += '<div class="deck-meta">';
    h += '<span>🔥 连续 '+streak+' 天</span>';
    h += '<span>📅 本周 '+weekDays+'/7 天</span>';
    h += '</div>';
    h += '<div class="day-goal-bar">';
    h += '<span style="font-size:.85rem">🎯 每日目标 '+today+'/'+goal+'</span>';
    h += '<div class="progress-bar" style="flex:1;height:8px"><div class="progress-fill" style="width:'+goalPct+'%"></div></div>';
    h += '<span class="goal-pct">'+goalPct+'%</span>';
    h += '</div>';
    h += '<div class="chart-wrap">';
    const maxVal = Math.max(MAX_BAR_VAL, ...chart.map(c=>c.val), 1);
    for(const c of chart){
      const height = Math.max(2, (c.val/maxVal)*90);
      h += '<div class="chart-bar-col">';
      h += '<div class="chart-bar" style="height:'+height+'px"></div>';
      h += '<div class="chart-label">'+c.label+'</div>';
      h += '</div>';
    }
    h += '</div></div></div>';
    for(const d of list){
      const known = d.words.filter(w=>w.status==='known').length;
      const total = d.words.length;
      const pct = total>0?Math.round(known/total*100):0;
      const weakWords = d.words.filter(w=>(w.wrongCount||0)>0);
      const weak = weakWords.length;
      h += '<div class="deck-card">';
      h += '<div class="deck-info"><h3>'+esc(d.title)+'</h3>';
      h += '<div class="deck-meta"><span>'+total+' 个单词</span>';
      h += '<span class="progress-pill">✅ '+known+' / '+total+' ('+pct+'%)</span>';
      if(weak>0) h += '<span class="progress-pill" style="background:#fee2e2;color:var(--red)">💪 '+weak+' 弱点</span>';
      h += '</div></div>';
      h += '<div class="deck-actions" style="flex-wrap:wrap">';
      h += '<button class="btn btn-primary btn-sm" data-action="start-review" data-arg="'+esc(d.id)+'">🔍 筛查</button>';
      h += '<button class="btn btn-outline btn-sm" data-action="start-study" data-arg="'+esc(d.id)+'">📖 背生词</button>';
      if(weak>0) h += '<button class="btn btn-outline btn-sm" data-action="start-weak" data-arg="'+esc(d.id)+'" style="border-color:var(--red);color:var(--red)">🎯 弱点专练 ('+weak+')</button>';
      h += '<button class="btn btn-outline btn-sm" data-action="delete-deck" data-arg="'+esc(d.id)+'" style="color:var(--red);border-color:var(--red)">🗑</button>';
      h += '</div></div>';
    }
  }
  return h;
}

function setupImportZone(){
  const zone = document.getElementById('importZone');
  if(!zone) return;
  zone.addEventListener('click', function(){ document.getElementById('fileInput').click(); });
  zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', function(){ zone.classList.remove('dragover'); });
  zone.addEventListener('drop', function(e){
    e.preventDefault(); zone.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if(f) processFile(f);
  });
}

function deleteDeck(id){
  if(!confirm('确定删除这个词库吗？此操作不可撤销。')) return;
  decks = loadDecks();
  delete decks[id];
  saveDecks(decks);
  render();
}

// ===================== IMPORT =====================
function setPreview(title, words){
  previewData = {title, words, originalWords: JSON.parse(JSON.stringify(words))};
}

function processPaste(){
  const raw = document.getElementById('pasteTextarea').value.trim();
  if(!raw){ alert('请先粘贴内容'); return; }
  // Try CSV first, then HTML
  if(!raw.toLowerCase().startsWith('<') && raw.includes(',')){
    parseCSV(raw);
  } else if(isPlainText(raw)){
    parsePlainText(raw);
  } else {
    parseAndPreview(raw);
  }
}

function isPlainText(str){
  return !str.trim().startsWith('<') && !str.includes(',');
}

function parseCSV(input){
  const lines = input.split('\n').filter(l=>l.trim());
  const words = [];
  for(const line of lines){
    const parts = line.split(',');
    if(parts.length<2) continue;
    words.push({word:parts[0].trim(),phonetic:'',zh:parts[1].trim(),en:'',example:'',status:'unknown'});
  }
  if(words.length===0){ alert('未能解析 CSV 内容'); return; }
  setPreview('CSV 导入词库', words);
  currentView = 'import-preview';
  render();
}

function parsePlainText(input){
  const lines = input.split('\n').filter(l=>l.trim());
  const words = [];
  for(const line of lines){
    let word, zh;
    // 优先按制表符切分
    let sep = line.indexOf('\t');
    if(sep>=0){
      word = line.slice(0,sep).trim(); zh = line.slice(sep+1).trim();
    } else {
      // 英文短语在前、中文在最后，且英文可能含空格。
      // 以第一个中文字符为边界切分，兼容“英文...中文”无空格的情况。
      const m = line.search(/[一-鿿　-〿＀-￯]/);
      if(m>=0){
        word = line.slice(0,m).trim(); zh = line.slice(m).trim();
      } else {
        // 没有中文则退回按最后一个空格切分
        sep = line.lastIndexOf(' ');
        if(sep<0) continue;
        word = line.slice(0,sep).trim(); zh = line.slice(sep+1).trim();
      }
    }
    if(word && zh) words.push({word,phonetic:'',zh,en:'',example:'',status:'unknown'});
  }
  if(words.length===0){ alert('未能解析纯文本内容'); return; }
  setPreview('文本导入词库', words);
  currentView = 'import-preview';
  render();
}

function processFile(file){
  const reader = new FileReader();
  reader.onload = function(){
    const txt = reader.result;
    if(file.name.endsWith('.csv')){ parseCSV(txt); }
    else if(file.name.endsWith('.txt')||file.name.endsWith('.text')){ parsePlainText(txt); }
    else { parseAndPreview(txt); }
  };
  reader.readAsText(file);
}

function parseAndPreview(htmlString){
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString,'text/html');
  const title = doc.querySelector('.practice-vocabulary__title')?.textContent?.trim()||'未命名词库';
  const words = [];
  const wordEls = doc.querySelectorAll('.practice-vocabulary__word');
  wordEls.forEach(el=>{
    const item = el.closest('.practice-vocabulary__item');
    if(!item) return;
    // Get only the UK phonetic (first .practice-vocabulary__phonetic-text in this item)
    const phoneticEl = item.querySelector('.practice-vocabulary__phonetic-text');
    words.push({
      word: el.textContent.trim(), phonetic: phoneticEl?phoneticEl.textContent.trim():'',
      zh: item.querySelector('.practice-vocabulary__meaning-zh')?.textContent?.trim()||'',
      en: item.querySelector('.practice-vocabulary__meaning-en')?.textContent?.trim()||'',
      example: item.querySelector('.practice-vocabulary__meaning-example')?.textContent?.trim()||'',
      status:'unknown'
    });
  });

  if(words.length===0){
    // Also try parsing plain CSV/TSV/TXT (word,meaning format)
    const csvMatch = htmlString.match(/([\w\-']+)\s*[,\t;]\s*(.+?)(?:\n|$)/g);
    if(csvMatch){
      const csvWords = csvMatch.map(line=>{
        const parts = line.split(/[,;\t]/);
        return {
          word: parts[0].trim(),
          phonetic:'', zh: parts[1]?parts[1].trim():'',
          en:'', example:'', status:'unknown'
        };
      });
      if(csvWords.length>0){
        setPreview('粘贴导入', csvWords);
        currentView='import-preview';
        render();
        return;
      }
    }
    alert('未能从该文件中识别出单词。请确认文件格式与「基础练习.html」一致，或粘贴 CSV 格式（单词,中文）。');
    return;
  }
  setPreview(title, words);
  currentView = 'import-preview';
  render();
}

function renderImportPreviewHTML(){
  if(!previewData) { currentView='decks'; return renderDecksHTML(); }
  const {title, words} = previewData;
  let h = '<div class="card">';
  h += '<h2>📥 导入预览</h2>';
  h += '<p style="color:var(--text2);margin-bottom:8px">词库名: <input id="peTitle" class="pe-in" style="max-width:260px" value="'+esc(title)+'"></p>';
  h += '<p style="color:var(--text2);margin-bottom:12px">共 '+words.length+' 个单词 — 可直接修改内容，解析有误的话在这里修正</p>';
  h += '<div class="table-wrap" style="max-height:420px;overflow-y:auto;margin-bottom:12px"><table>';
  h += '<thead><tr><th style="width:36%">单词</th><th style="width:22%">音标</th><th>中文释义</th><th style="width:44px">操作</th></tr></thead><tbody>';
  words.forEach((w,i)=>{
    h += '<tr>';
    h += '<td><input class="pe-in" data-idx="'+i+'" data-field="word" value="'+esc(w.word)+'"></td>';
    h += '<td><input class="pe-in" data-idx="'+i+'" data-field="phonetic" value="'+esc(w.phonetic||'')+'"></td>';
    h += '<td><input class="pe-in" data-idx="'+i+'" data-field="zh" value="'+esc(w.zh)+'"></td>';
    h += '<td style="text-align:center"><button class="btn btn-sm" data-action="pe-del-row" data-arg="'+i+'" style="color:var(--red);border:1px solid var(--red);background:transparent;padding:2px 8px;font-size:.75rem;border-radius:8px" title="删除此行">🗑</button></td>';
    h += '</tr>';
  });
  h += '</tbody></table></div>';
  h += '<div style="display:flex;gap:8px;margin-bottom:16px">';
  h += '<button class="btn btn-outline btn-sm" data-action="pe-add-row">➕ 添加一行</button>';
  h += '<button class="btn btn-outline btn-sm" data-action="pe-restore">♻️ 还原初始解析</button>';
  h += '</div>';
  h += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">';
  h += '<button class="btn btn-outline" data-action="cancel-import">取消</button>';
  h += '<button class="btn btn-primary" data-action="confirm-import">确认导入 ('+words.length+' 词)</button>';
  h += '</div></div>';
  return h;
}

function confirmImport(){
  if(!previewData) return;
  let skipped = 0;
  const words = [];
  for(const w of previewData.words){
    const word = (w.word||'').trim();
    if(!word){ skipped++; continue; }
    words.push({...w, word, zh:(w.zh||'').trim(), phonetic:(w.phonetic||'').trim()});
  }
  if(words.length===0){ alert('没有可导入的单词（单词列不能为空）'); return; }
  decks = loadDecks();
  const id = 'deck-'+Date.now();
  decks[id] = { id, title:(previewData.title||'').trim()||'未命名词库', createdAt:Date.now(), words };
  saveDecks(decks);
  previewData = null;
  currentView = 'decks';
  toast('已导入 '+words.length+' 词'+(skipped>0?'（跳过 '+skipped+' 个空行）':''));
}

// ===================== REVIEW =====================
function startReview(deckId){
  activeDeckId = deckId;
  decks = loadDecks();
  const d = getDeck();
  if(!d) return;
  reviewWords = d.words.filter(w=>w.status==='unknown');
  reviewIndex = 0;
  currentView = 'review';
  updateHash();
}

function reviewAnswer(known){
  const w = reviewWords[reviewIndex];
  w.status = known?'known':'unknown';
  w.level = known?Math.min(3,(w.level||0)+1):Math.max(0,(w.level||0)-1);
  reviewIndex++;
  save();
  recordStudyAction();
}

function reviewPeek(){
  const d = document.getElementById('reviewMeanings');
  if(d){ d.style.display = d.style.display==='none'?'block':'none'; }
}

function finishReview(){
  for(let i=reviewIndex; i<reviewWords.length; i++) reviewWords[i].status='unknown';
  save();
  currentView = 'decks';
}

function renderReviewHTML(){
  if(reviewIndex >= reviewWords.length){
    const d = getDeck();
    const known = d.words.filter(w=>w.status==='known').length;
    const total = d.words.length;
    const pct = Math.round(known/total*100);
    const fresh = d.words.filter(w=>w.status==='unknown').length;
    let h = '<div class="card" style="text-align:center">';
    h += '<div style="font-size:3rem;margin-bottom:8px">🎉</div>';
    h += '<h2>筛查完成！</h2>';
    h += '<p style="margin-bottom:4px">✅ 认识: '+known+' 个</p>';
    h += '<p style="margin-bottom:4px">📖 生词: '+fresh+' 个</p>';
    h += '<p style="margin-bottom:16px"><span class="progress-pill">掌握率 '+pct+'%</span></p>';
    h += '<div style="display:flex;gap:10px;justify-content:center">';
    h += '<button class="btn btn-outline" data-action="review-done-back">返回词库</button>';
    h += '<button class="btn btn-primary" data-action="review-done-study">开始背生词 ('+fresh+' 词)</button>';
    h += '</div></div>';
    return h;
  }
  const w = reviewWords[reviewIndex];
  const total = reviewWords.length;
  const done = reviewIndex;
  const pct = Math.round(done/total*100);
  let h = '<div class="review-card">';
  h += '<div class="big-word">'+esc(w.word)+' <button class="speak-btn" data-action="speak" data-arg="'+esc(w.word)+'" title="朗读">🔊</button></div>';
  h += '<div class="phonetic">'+esc(w.phonetic||'')+'</div>';
  h += '<button class="btn btn-outline btn-sm" data-action="review-peek" style="margin-bottom:16px">👁 偷看</button>';
  h += '<div id="reviewMeanings" style="display:none;margin-bottom:16px;text-align:center">';
  h += '<div style="font-size:1.1rem;font-weight:600;margin-bottom:4px">'+esc(w.zh)+'</div>';
  h += '<div style="font-size:.9rem;color:var(--text2);font-style:italic">'+esc(w.en)+'</div>';
  if(w.example) h += '<div style="font-size:.85rem;color:var(--accent);margin-top:4px">📝 '+esc(w.example)+'</div>';
  h += '</div>';
  h += '<div class="review-actions">';
  h += '<button class="btn btn-dunno" data-action="review-dunno" style="background:var(--red);color:#fff;border:none;padding:14px 36px;font-size:1rem;border-radius:28px">❌ 不认识</button>';
  h += '<button class="btn btn-know" data-action="review-know" style="background:var(--green);color:#fff;border:none;padding:14px 36px;font-size:1rem;border-radius:28px">✅ 认识</button>';
  h += '</div>';
  h += '<div class="review-progress"><div class="progress-wrap">';
  h += '<span>筛查进度</span>';
  h += '<div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%"></div></div>';
  h += '<span>'+done+'/'+total+'</span>';
  h += '</div></div></div>';
  h += '<div class="shortcuts" id="shortcutsReview">⌨ 按 1=认识  2=不认识  3=偷看  ← 返回上一个 &nbsp;<span class="shortcuts-toggle" data-action="toggle-shortcuts" data-arg="shortcutsReview">收起</span></div>';
  const autoOnR = getAutoSpeak();
  h += '<div style="text-align:center;margin-top:8px">';
  h += '<button class="auto-speak-btn'+(autoOnR?' on':'')+'" data-action="toggle-auto-speak">'+(autoOnR?'🔊 自动朗读：开':'🔇 自动朗读：关')+'</button>';
  h += ' <button class="btn btn-outline btn-sm" data-action="finish-review">结束筛查</button>';
  h += '</div>';
  return h;
}

// ===================== STUDY =====================
function startStudy(deckId){
  activeDeckId = deckId;
  decks = loadDecks();
  const d = getDeck();
  if(!d) return;
  studyWords = d.words.filter(w=>w.status==='unknown');
  studyIndex = 0;
  studyMode = 'flashcard';
  cardFlipped = false;
  quizWords=[]; quizIdx=0; quizCorrect=0; quizAnswered=false; quizWrong=[]; isWrongReview=false;
  spellWords=[]; spellIndex=0; spellCorrect=0; spellResult=null; spellSubMode='en';
  currentView = 'study';
  updateHash();
}

// Weak-word focused study: only words with wrongCount>0, sorted by wrongCount desc
function startWeakStudy(deckId){
  activeDeckId = deckId;
  decks = loadDecks();
  const d = getDeck();
  if(!d) return;
  studyWords = d.words.filter(w=>(w.wrongCount||0)>0).sort((a,b)=>(b.wrongCount||0)-(a.wrongCount||0));
  studyIndex = 0;
  studyMode = 'flashcard';
  cardFlipped = false;
  quizWords=[]; quizIdx=0; quizCorrect=0; quizAnswered=false; quizWrong=[]; isWrongReview=false;
  spellWords=[]; spellIndex=0; spellCorrect=0; spellResult=null; spellSubMode='en';
  currentView = 'study';
  updateHash();
}

function renderStudyHTML(){
  if(studyWords.length===0){
    const d = getDeck();
    const known = d.words.filter(w=>w.status==='known').length;
    let h = '<div class="card" style="text-align:center">';
    h += '<div style="font-size:3rem">🏆</div><h2>全部掌握！</h2>';
    h += '<p>这个词库的 '+d.words.length+' 个单词中，你已掌握 '+known+' 个</p>';
    h += '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">';
    h += '<button class="btn btn-primary" data-action="go-decks">返回词库</button>';
    h += '<button class="btn btn-outline" data-action="fc-reset-all" style="color:var(--orange);border-color:var(--orange)">🔄 全部重学</button>';
    h += '</div></div>';
    return h;
  }
  const known = getDeck().words.filter(w=>w.status==='known').length;
  const total = getDeck().words.length;
  const pct = Math.round(known/total*100);

  let h = '';

  // Tabs
  const autoOn = getAutoSpeak();
  h += '<div class="tabs" style="margin-bottom:8px">';
  h += '<button class="tab'+(studyMode==='flashcard'?' active':'')+'" data-action="study-flashcard">🎴 卡片</button>';
  h += '<button class="tab'+(studyMode==='zh2en'?' active':'')+'" data-action="study-zh2en">🔁 中→英</button>';
  h += '<button class="tab'+(studyMode==='quiz'?' active':'')+'" data-action="study-quiz">✅ 测验</button>';
  h += '<button class="tab'+(studyMode==='spell'?' active':'')+'" data-action="study-spell">✏️ 拼写</button>';
  h += '<button class="tab'+(studyMode==='list'?' active':'')+'" data-action="study-list">📋 列表</button>';
  h += '</div>';
  h += '<div style="text-align:center;margin-bottom:12px"><button class="auto-speak-btn'+(autoOn?' on':'')+'" data-action="toggle-auto-speak">'+(autoOn?'🔊 自动朗读：开':'🔇 自动朗读：关')+'</button></div>';

  // Quiz size selector
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;font-size:.8rem;color:var(--text2);flex-wrap:wrap">';
  h += '测验题数：';
  [10,20,30,-1].forEach(n=>{
    h += '<button class="auto-speak-btn'+(quizSize===n?' on':'')+'" data-action="set-quiz-size" data-arg="'+n+'" style="font-size:.7rem;padding:3px 10px">'+(n===-1?'全部':n)+'</button>';
  });
  h += '</div>';

  // Stats
  h += '<div class="progress-wrap" style="margin-bottom:16px">';
  h += '<span>掌握 '+known+'/'+total+'</span>';
  h += '<div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%"></div></div>';
  h += '<span>生词 '+studyWords.length+' 个</span>';
  if(studyWords[0]&&(studyWords[0].wrongCount||0)>0) h += '<span style="font-size:.75rem;color:var(--red);white-space:nowrap">🎯 弱点专练</span>';
  h += '</div>';

  switch(studyMode){
    case 'flashcard': h += renderFlashcardHTML(); break;
    case 'zh2en': h += renderZh2EnHTML(); break;
    case 'quiz': h += renderQuizHTML(); break;
    case 'spell': h += renderSpellHTML(); break;
    case 'list': h += renderStudyListHTML(); break;
  }
  return h;
}

// ===== FLASHCARD =====
function renderFlashcardHTML(){
  if(studyIndex >= studyWords.length) studyIndex = 0;
  const w = studyWords[studyIndex];
  cardFlipped = false;
  let h = '';
  h += '<div class="flashcard-wrap" data-action="fc-flip">';
  h += '<div class="flashcard" id="flashcardEl">';
  h += '<div class="fc-face fc-front">';
  h += '<div class="fc-word">'+esc(w.word)+' <button class="speak-btn" data-action="speak" data-arg="'+esc(w.word)+'" title="朗读">🔊</button></div>';
  h += '<div class="fc-phonetic">'+esc(w.phonetic||'')+'</div>';
  h += '<div style="font-size:.75rem;color:var(--text2);margin-bottom:6px">'+levelDots(w.level)+'</div>';
  h += '<div class="fc-hint">👆 点击或按空格翻转</div>';
  h += '</div>';
  h += '<div class="fc-face fc-back">';
  h += '<div class="fc-zh">'+esc(w.zh)+'</div>';
  h += '<div class="fc-en">'+esc(w.en)+'</div>';
  if(w.example) h += '<div class="fc-example">📝 '+esc(w.example)+'</div>';
  h += '</div></div></div>';
  h += '<div class="fc-nav">';
  h += '<button class="fc-nav-btn" data-action="fc-prev">◀</button>';
  h += '<span class="fc-counter">'+(studyIndex+1)+'/'+studyWords.length+'</span>';
  h += '<button class="fc-nav-btn" data-action="fc-next">▶</button>';
  h += '</div>';
  h += '<div class="fc-actions">';
  h += '<button class="btn btn-outline btn-sm" data-action="fc-known" style="border-color:var(--green);color:var(--green)">✅ 已掌握</button>';
  h += '<button class="btn btn-outline btn-sm" data-action="fc-reset-all" style="color:var(--orange);border-color:var(--orange)">🔄 全部重学</button>';
  h += '</div>';
  h += '<div class="shortcuts" id="shortcutsFC">⌨ 空格翻卡  ←→ 切换  1=已掌握 &nbsp;<span class="shortcuts-toggle" data-action="toggle-shortcuts" data-arg="shortcutsFC">收起</span></div>';
  h += '<div class="touch-hint">📱 左右滑动切换单词</div>';
  return h;
}

// ===== 中→英 (看中文背英文) =====
function renderZh2EnHTML(){
  if(studyIndex >= studyWords.length) studyIndex = 0;
  const w = studyWords[studyIndex];
  cardFlipped = false;
  let h = '';
  h += '<div class="flashcard-wrap" data-action="fc-flip">';
  h += '<div class="flashcard" id="flashcardEl">';
  h += '<div class="fc-face fc-front">';
  h += '<div style="position:absolute;top:12px;left:16px;font-size:.7rem;color:var(--text2)">🔁 中→英</div>';
  h += '<div class="fc-zh" style="font-size:1.6rem">'+esc(w.zh)+'</div>';
  h += '<div class="fc-hint">💭 回想英文 → 点击/空格看答案</div>';
  h += '</div>';
  h += '<div class="fc-face fc-back">';
  h += '<div class="fc-word">'+esc(w.word)+' <button class="speak-btn" data-action="speak" data-arg="'+esc(w.word)+'" title="朗读">🔊</button></div>';
  h += '<div class="fc-phonetic">'+esc(w.phonetic||'')+'</div>';
  h += '<div style="font-size:.75rem;color:var(--text2);margin-bottom:6px">'+levelDots(w.level)+'</div>';
  h += '<div class="fc-zh" style="font-size:1rem">'+esc(w.zh)+'</div>';
  if(w.en) h += '<div class="fc-en">'+esc(w.en)+'</div>';
  if(w.example) h += '<div class="fc-example">📝 '+esc(w.example)+'</div>';
  h += '</div></div></div>';
  h += '<div class="fc-nav">';
  h += '<button class="fc-nav-btn" data-action="fc-prev">◀</button>';
  h += '<span class="fc-counter">'+(studyIndex+1)+'/'+studyWords.length+'</span>';
  h += '<button class="fc-nav-btn" data-action="fc-next">▶</button>';
  h += '</div>';
  h += '<div class="fc-actions">';
  h += '<button class="btn btn-outline btn-sm" data-action="fc-known" style="border-color:var(--green);color:var(--green)">✅ 已掌握</button>';
  h += '<button class="btn btn-outline btn-sm" data-action="fc-reset-all" style="color:var(--orange);border-color:var(--orange)">🔄 全部重学</button>';
  h += '</div>';
  h += '<div class="shortcuts" id="shortcutsFC">⌨ 空格翻卡  ←→ 切换  1=已掌握 &nbsp;<span class="shortcuts-toggle" data-action="toggle-shortcuts" data-arg="shortcutsFC">收起</span></div>';
  h += '<div class="touch-hint">📱 左右滑动切换单词</div>';
  return h;
}

function flipFC(){
  cardFlipped = !cardFlipped;
  const el = document.getElementById('flashcardEl');
  if(el) el.classList.toggle('flipped', cardFlipped);
  // 中→英模式：翻开答案时自动朗读英文（只在打开自动朗读时）
  if(studyMode==='zh2en' && cardFlipped && getAutoSpeak() && studyWords[studyIndex]){
    speakWord(studyWords[studyIndex].word);
  }
}

function markStudyWord(known){
  if(known){ studyWords[studyIndex].status='known'; studyWords[studyIndex].level=Math.min(3,(studyWords[studyIndex].level||0)+1); }
  studyWords.splice(studyIndex, 1);
  if(studyIndex >= studyWords.length) studyIndex = 0;
  cardFlipped = false;
  save();
}

function refreshStudyWords(){
  const d = getDeck();
  if(!d) return;
  // If we came from weak study (first word has wrongCount>0), stay in weak mode
  if(studyWords.length>0 && studyWords[0]&&(studyWords[0].wrongCount||0)>0){
    studyWords = d.words.filter(w=>(w.wrongCount||0)>0).sort((a,b)=>(b.wrongCount||0)-(a.wrongCount||0));
  } else {
    studyWords = d.words.filter(w=>w.status==='unknown');
  }
}

function resetAllStudy(){
  if(!confirm('确定将这个词库的所有单词重置为"不认识"吗？')) return;
  const d = getDeck();
  d.words.forEach(w=>w.status='unknown');
  save();
  studyWords = d.words.filter(w=>w.status==='unknown');
  studyIndex = 0;
}

// ===== QUIZ =====
function initQuiz(){
  // Sort: weak words (wrongCount>0) first, then random
  const sorted = [...studyWords].sort((a,b)=>{
    const wa = a.wrongCount||0, wb = b.wrongCount||0;
    if(wa>0&&wb===0) return -1; if(wb>0&&wa===0) return 1;
    return Math.random()-.5;
  });
  quizWords = sorted.slice(0, quizSize===-1 ? sorted.length : Math.min(quizSize, sorted.length));
  quizIdx = 0; quizCorrect = 0; quizAnswered = false; quizCur = null; quizOpts = []; quizWrong = []; isWrongReview = false;
}

function renderQuizHTML(){
  if(quizWords.length===0) initQuiz();
  if(quizIdx >= quizWords.length){
    const pct = quizWords.length>0?Math.round(quizCorrect/quizWords.length*100):0;
    let emoji = pct>=90?'🎉':pct>=70?'👍':pct>=50?'📖':'💪';
    refreshStudyWords();
    let h = '<div class="card" style="text-align:center">';
    h += '<div style="font-size:3rem">'+emoji+'</div><h2>测验完成！</h2>';
    h += '<p>正确 '+quizCorrect+' / '+quizWords.length+' （'+pct+'%）</p>';
    if(quizWrong.length>0) h += '<p style="color:var(--red);margin-bottom:8px">❌ 错题: '+quizWrong.length+' 道</p>';
    h += '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">';
    h += '<button class="btn btn-primary" data-action="quiz-back-card">回到卡片</button>';
    h += '<button class="btn btn-outline" data-action="quiz-retry">🔄 再来一轮</button>';
    if(quizWrong.length>0) h += '<button class="btn btn-outline" data-action="quiz-review-wrong" style="border-color:var(--red);color:var(--red)">🔁 复习错题 ('+quizWrong.length+')</button>';
    h += '</div></div>';
    return h;
  }
  // Preserve answered state - don't allow re-randomization by re-render
  const wasAnswered = quizAnswered;
  if(!wasAnswered){
    quizCur = quizWords[quizIdx];
    const deckAll = getDeck().words.filter(w=>w.word!==quizCur.word);
    const correctPOS = extractPOS(quizCur.zh);
    // Smart distractors: prefer same POS, then random
    const samePOS = deckAll.filter(w=>extractPOS(w.zh)===correctPOS&&correctPOS!=='');
    const others = deckAll.filter(w=>extractPOS(w.zh)!==correctPOS||correctPOS==='');
    const candidates = [...samePOS.sort(()=>Math.random()-.5), ...others.sort(()=>Math.random()-.5)];
    const distractors = candidates.slice(0,3).map(w=>w.zh);
    quizOpts = [...distractors, quizCur.zh].sort(()=>Math.random()-.5);
  }

  let h = '<div class="quiz-wrap">';
  h += '<div style="text-align:center;color:var(--text2);font-size:.85rem;margin-bottom:8px">第 '+(quizIdx+1)+' 题 / 共 '+quizWords.length+' 题 | 正确 '+quizCorrect+(quizIdx>0?' ('+Math.round(quizCorrect/quizIdx*100)+'%)':' (第1题)')+'</div>';
  h += '<div class="quiz-q-word">'+esc(quizCur.word)+' <button class="speak-btn" data-action="speak" data-arg="'+esc(quizCur.word)+'" title="朗读">🔊</button></div>';
  h += '<div class="quiz-q-phonetic">'+esc(quizCur.phonetic||'')+'</div>';
  h += '<div class="quiz-opts">';
  quizOpts.forEach((opt,i)=>{
    h += '<button class="quiz-opt" data-action="quiz-answer" data-arg="'+i+'">'+(String.fromCharCode(65+i))+'. '+esc(opt)+'</button>';
  });
  h += '</div>';
  h += '<div class="quiz-fb" id="quizFeedback"></div>';
  h += '<button class="btn btn-primary" id="quizNext" data-action="quiz-next" style="display:none;margin:12px auto 0">下一题 ▶</button>';
  h += '</div>';
  return h;
}

function quizAnswer(idx){
  if(quizAnswered) return;
  quizAnswered = true;
  const correctZh = quizCur.zh;
  const isCorrect = quizOpts[idx] === correctZh;
  if(isCorrect){ quizCorrect++; quizCur.status='known'; quizCur.level = Math.min(3,(quizCur.level||0)+1); recordSuccess(); }
  else { quizWrong.push(quizCur); quizCur.wrongCount=(quizCur.wrongCount||0)+1; quizCur.level = Math.max(0,(quizCur.level||0)-1); }
  save();

  // Update DOM directly for feedback (avoids re-render)
  const opts = document.querySelectorAll('.quiz-opt');
  opts.forEach((opt,i)=>{
    opt.style.pointerEvents = 'none';
    if(quizOpts[i]===correctZh) opt.classList.add('correct');
    else if(i===idx && !isCorrect) opt.classList.add('wrong');
  });
  const fb = document.getElementById('quizFeedback');
  fb.textContent = isCorrect?'✅ 正确！':'❌ 错误！正确答案是: '+correctZh;
  fb.style.color = isCorrect?'var(--green)':'var(--red)';
  document.getElementById('quizNext').style.display = '';
  // Auto-speak correct word on wrong answer
  if(!isCorrect) setTimeout(()=>speakWord(quizCur.word), 400);
}

function nextQuiz(){ quizIdx++; quizAnswered = false; quizOpts = []; render(); }

// ===== STUDY LIST =====
function renderStudyListHTML(){
  let list = studyWords;
  if(studyListFilter){
    const q = studyListFilter.toLowerCase();
    list = list.filter(w=>w.word.includes(q)||w.zh.includes(q)||w.en.includes(q));
  }
  if(studyWeakOnly){ list = list.filter(w=>(w.wrongCount||0)>0); }
  let h = '<div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">';
  h += '<input class="search-box" id="studySearch" placeholder="🔍 搜索生词..." value="'+esc(studyListFilter)+'" style="flex:1;margin-bottom:0">';
  h += '<button class="auto-speak-btn'+(studyWeakOnly?' on':'')+'" data-action="toggle-weak-filter" style="white-space:nowrap">💪 '+(studyWeakOnly?'全部词':'仅弱点')+'</button>';
  h += '</div>';
  h += '<p style="font-size:.85rem;color:var(--text2);margin-bottom:8px">生词: '+list.length+' / '+studyWords.length+'</p>';
  h += '<div class="table-wrap"><table>';
  h += '<thead><tr><th>单词</th><th>音标</th><th>中文释义</th><th>操作</th></tr></thead><tbody>';
  list.forEach((w,i)=>{
    h += '<tr>';
    h += '<td class="word-col">'+esc(w.word)+'</td>';
    h += '<td style="color:var(--text2);font-size:.82rem">'+esc(w.phonetic||'')+'</td>';
    h += '<td class="zh-col">'+esc(w.zh)+'</td>';
    h += '<td><button class="btn btn-sm" data-action="sl-known" data-arg="'+studyWords.indexOf(w)+'" style="background:var(--green);color:#fff;padding:4px 12px;font-size:.75rem;border-radius:12px">✅ 掌握</button></td>';
    h += '</tr>';
  });
  h += '</tbody></table></div>';
  return h;
}

function setupSearchInput(){
  const inp = document.getElementById('studySearch');
  if(inp) inp.addEventListener('input', function(){ studyListFilter = this.value; render(); });
}

function markStudyListWord(idx){
  if(idx>=0 && idx<studyWords.length){
    studyWords[idx].status = 'known';
    studyWords[idx].level = Math.min(3,(studyWords[idx].level||0)+1);
    save();
    refreshStudyWords();
  }
}

// ===== SPELLING =====
function initSpell(){
  spellWords = [...studyWords].sort(()=>Math.random()-.5).slice(0, Math.min(20, studyWords.length));
  spellIndex = 0; spellCorrect = 0; spellResult = null;
}

function renderSpellHTML(){
  if(spellWords.length===0) initSpell();
  if(spellIndex >= spellWords.length){
    const pct = spellWords.length>0?Math.round(spellCorrect/spellWords.length*100):0;
    let emoji = pct>=90?'🎉':pct>=70?'👍':pct>=50?'📖':'💪';
    refreshStudyWords();
    let h = '<div class="card" style="text-align:center">';
    h += '<div style="font-size:3rem">'+emoji+'</div><h2>'+((spellSubMode==='enzh')?'听写':'拼写')+'完成！</h2>';
    h += '<p>正确 '+spellCorrect+' / '+spellWords.length+' （'+pct+'%）</p>';
    h += '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">';
    h += '<button class="btn btn-primary" data-action="quiz-back-card">回到卡片</button>';
    h += '<button class="btn btn-outline" data-action="study-spell">🔄 再来一轮</button>';
    h += '</div></div>';
    return h;
  }
  const w = spellWords[spellIndex];
  spellResult = null;
  let h = '<div class="spell-wrap">';
  h += '<div style="text-align:center;color:var(--text2);font-size:.85rem;margin-bottom:12px">';
  h += '第 '+(spellIndex+1)+' 题 / 共 '+spellWords.length+' 题 | 正确 '+spellCorrect;
  h += ' &nbsp;<button class="speak-btn" data-action="spell-replay" title="再读一遍">🔊</button>';
  h += '</div>';

  // Sub-mode switcher
  h += '<div class="tabs" style="margin-bottom:16px;justify-content:center">';
  h += '<button class="tab'+(spellSubMode==='en'?' active':'')+'" data-action="spell-submode-en">✏️ 拼英文</button>';
  h += '<button class="tab'+(spellSubMode==='enzh'?' active':'')+'" data-action="spell-submode-enzh">📝 英文+中文</button>';
  h += '</div>';

  if(spellSubMode==='en'){
    // Original: show zh meaning, type English
    h += '<div class="spell-zh">'+esc(w.zh)+'</div>';
    if(w.en) h += '<div class="spell-en-hint">'+esc(w.en)+'</div>';
    h += '<div class="spell-input-row">';
    h += '<input class="spell-input" id="spellInputEn" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="输入英文单词...">';
    h += '<button type="button" class="btn btn-primary" data-action="spell-check">检查</button>';
    h += '</div>';
    h += '<div class="spell-fb" id="spellFeedbackEn"></div>';
    h += '<button class="btn btn-primary" id="spellNextEn" data-action="spell-next" style="display:none;margin:12px auto 0">下一题 ▶</button>';
  } else {
    // Dictation: hear audio, type English + Chinese (no hints shown)
    h += '<div style="text-align:center;font-size:1.1rem;color:var(--text2);margin-bottom:16px">🔊 听发音，输入英文和中文</div>';
    h += '<input class="spell-input" id="spellInputEn2" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="输入英文单词..." style="margin-bottom:8px">';
    h += '<br>';
    h += '<input class="dictate-zh-input" id="spellInputZh2" type="text" autocomplete="off" autocorrect="off" placeholder="输入中文释义...">';
    h += '<div style="margin-top:12px"><button type="button" class="btn btn-primary" data-action="spell-zh-check">检查</button></div>';
    h += '<div class="spell-fb" id="spellFeedbackEn2"></div>';
    h += '<button class="btn btn-primary" id="spellNextEn2" data-action="spell-next" style="display:none;margin:12px auto 0">下一题 ▶</button>';
  }
  h += '</div>';

  // Auto-speak for dictation — render is done, DOM is in place
  if(spellSubMode==='enzh') setTimeout(()=>speakWord(w.word), 300);

  return h;
}

function checkSpellZh(){
  const inpEn = document.getElementById('spellInputEn2');
  const inpZh = document.getElementById('spellInputZh2');
  if(!inpEn || !inpZh || spellResult!==null) return;
  const answerEn = inpEn.value.trim();
  const answerZh = inpZh.value.trim();
  const correctEn = spellWords[spellIndex].word;
  const correctZh = spellWords[spellIndex].zh;
  const enOk = answerEn.toLowerCase().replace(/\s+/g,'') === correctEn.toLowerCase().replace(/\s+/g,'');
  // For zh: do a simple substring match (loose, user might type subset of meanings)
  const zhOk = answerZh.length>0 && (correctZh.includes(answerZh) || answerZh.includes(correctZh.split('；')[0]));
  const isCorrect = enOk && zhOk;
  spellResult = isCorrect;
  if(isCorrect){ spellCorrect++; spellWords[spellIndex].status='known'; spellWords[spellIndex].level=Math.min(3,(spellWords[spellIndex].level||0)+1); save(); recordSuccess(); }
  else { spellWords[spellIndex].wrongCount=(spellWords[spellIndex].wrongCount||0)+1; spellWords[spellIndex].level=Math.max(0,(spellWords[spellIndex].level||0)-1); recordStudyAction(); }
  inpEn.value=''; inpZh.value='';
  inpEn.classList.add(enOk?'correct':'wrong'); inpEn.disabled=true;
  inpZh.classList.add(zhOk?'correct':'wrong'); inpZh.disabled=true;
  const fb=document.getElementById('spellFeedbackEn2');
  if(isCorrect){
    fb.textContent='✅ 全对！'; fb.style.color='var(--green)';
  } else {
    let msg='❌ ';
    if(!enOk) msg+='英文错误，正解: <b>'+esc(correctEn)+'</b> ';
    if(!zhOk) msg+='中文错误，正解: <b>'+esc(correctZh)+'</b> ';
    fb.innerHTML=msg; fb.style.color='var(--red)';
  }
  document.getElementById('spellNextEn2').style.display='';
}

function checkSpelling(){
  const inp = document.getElementById('spellInputEn');
  if(!inp || spellResult!==null) return;
  const answer = inp.value.trim();
  const correct = spellWords[spellIndex].word;
  // Normalize: case insensitive
  const isCorrect = answer.toLowerCase() === correct.toLowerCase();
  spellResult = isCorrect;
  if(isCorrect){ spellCorrect++; spellWords[spellIndex].status='known'; spellWords[spellIndex].level = Math.min(3,(spellWords[spellIndex].level||0)+1); save(); recordSuccess(); }
  else {
    spellWords[spellIndex].wrongCount=(spellWords[spellIndex].wrongCount||0)+1; spellWords[spellIndex].level = Math.max(0,(spellWords[spellIndex].level||0)-1); recordStudyAction();
    setTimeout(()=>speakWord(spellWords[spellIndex].word), 400);
  }

  inp.value='';
  inp.classList.add(isCorrect?'correct':'wrong');
  inp.disabled = true;
  const fb = document.getElementById('spellFeedbackEn');
  if(isCorrect){
    fb.textContent = '✅ 正确！';
    fb.style.color = 'var(--green)';
  } else {
    const diff = diffChars(answer.toLowerCase(), correct.toLowerCase());
    fb.innerHTML = '❌ 错误！正确答案: <b>'+esc(correct)+'</b><br><span style="font-size:.9rem;opacity:.7">你的答案: '+diff+'</span>';
    fb.style.color = 'var(--red)';
  }
  document.getElementById('spellNextEn').style.display = '';
}

function diffChars(input, correct){
  let result = '';
  const maxLen = Math.max(input.length, correct.length);
  for(let i=0;i<maxLen;i++){
    if(input[i]===correct[i]) result += '<span style="color:var(--green)">'+(input[i]?esc(input[i]):'')+'</span>';
    else {
      result += '<span style="color:var(--red);text-decoration:underline">'+(input[i]?esc(input[i]):'_')+'</span>';
    }
  }
  if(input.length<correct.length){
    result += '<span style="color:var(--red);text-decoration:underline">'+esc(correct.slice(input.length))+'</span>';
  }
  return result||'_';
}

function nextSpell(){
  spellIndex++;
  spellResult = null;
  render();
}

document.addEventListener('keydown', function(e){
  if(currentView==='review'){
    if(e.key==='1'){ e.preventDefault(); reviewAnswer(true); render(); }
    else if(e.key==='2'){ e.preventDefault(); reviewAnswer(false); render(); }
    else if(e.key==='3'){ e.preventDefault(); reviewPeek(); }
    else if(e.key==='ArrowLeft' && reviewIndex>0){ e.preventDefault(); reviewIndex--; render(); }
  }
  if(currentView==='study' && (studyMode==='flashcard'||studyMode==='zh2en') && studyWords.length>0){
    if(e.key===' ' || e.code==='Space'){ e.preventDefault(); flipFC(); }
    else if(e.key==='ArrowLeft'){ e.preventDefault(); studyIndex=(studyIndex-1+studyWords.length)%studyWords.length; cardFlipped=false; render(); }
    else if(e.key==='ArrowRight'){ e.preventDefault(); studyIndex=(studyIndex+1)%studyWords.length; cardFlipped=false; render(); }
    else if(e.key==='1'){ e.preventDefault(); markStudyWord(true); render(); }
  }
  if(currentView==='study' && studyMode==='quiz' && !quizAnswered && quizCur){
    const map = {'1':0,'2':1,'3':2,'4':3};
    if(e.key in map){ e.preventDefault(); quizAnswer(map[e.key]); }
  }
  if(currentView==='study' && studyMode==='quiz' && quizAnswered && e.key==='Enter'){ e.preventDefault(); nextQuiz(); }
  if(currentView==='study' && studyMode==='spell'){
    if(spellSubMode==='en'){
      if(spellResult===null && e.key==='Enter'){ e.preventDefault(); checkSpelling(); }
      else if(spellResult!==null && e.key==='Enter'){ e.preventDefault(); nextSpell(); }
    } else if(spellSubMode==='enzh'){
      if(spellResult===null && e.key==='Enter'){ e.preventDefault(); checkSpellZh(); }
      else if(spellResult!==null && e.key==='Enter'){ e.preventDefault(); nextSpell(); }
    }
  }
});
// ===================== TOAST =====================
function toast(msg, duration=2000){
  let t = document.getElementById('vtToast');
  if(!t){
    t = document.createElement('div');
    t.id = 'vtToast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 20px;border-radius:24px;font-size:.85rem;font-weight:600;z-index:9999;opacity:0;transition:opacity .25s;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.15);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(()=>{ t.style.opacity = '1'; });
  setTimeout(()=>{ t.style.opacity = '0'; }, duration);
}
