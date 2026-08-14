// ===================== SINGLE EVENT DELEGATION =====================
document.getElementById('app').addEventListener('click', function(e){
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const action = btn.dataset.action;
  const arg = btn.dataset.arg;
  const arg2 = btn.dataset.arg2;

  e.stopPropagation();

  switch(action){
    // Import preview editing
    case 'pe-add-row': previewData.words.push({word:'',phonetic:'',zh:'',en:'',example:'',status:'unknown'}); render(); break;
    case 'pe-del-row': previewData.words.splice(parseInt(arg),1); render(); break;
    case 'pe-restore': if(previewData.originalWords) previewData.words = JSON.parse(JSON.stringify(previewData.originalWords)); render(); break;
    // Global
    case 'go-decks': currentView='decks'; activeDeckId=null; updateHash(); render(); break;
    case 'toggle-theme': toggleTheme(); break;
    // Decks
    case 'start-review': startReview(arg); updateHash(); render(); break;
    case 'start-study': startStudy(arg); updateHash(); render(); break;
    case 'start-weak': startWeakStudy(arg); updateHash(); render(); break;
    case 'delete-deck': deleteDeck(arg); break;
    case 'show-paste': document.getElementById('pasteArea').classList.toggle('show'); break;
    case 'process-paste': processPaste(); break;
    // Import preview
    case 'cancel-import': previewData=null; currentView='decks'; render(); break;
    case 'confirm-import': confirmImport(); break;
    // Review
    case 'review-know': reviewAnswer(true); break;
    case 'review-dunno': reviewAnswer(false); break;
    case 'review-peek': reviewPeek(); return; // update DOM directly, no re-render
    case 'finish-review': finishReview(); break;
    // Study tabs
    case 'study-flashcard': studyMode='flashcard'; render(); break;
    case 'study-zh2en': studyMode='zh2en'; render(); break;
    case 'study-quiz': studyMode='quiz'; initQuiz(); render(); break;
    case 'study-list': studyMode='list'; render(); break;
    // Flashcard
    case 'fc-flip': flipFC(); break;
    case 'fc-prev': studyIndex=(studyIndex-1+studyWords.length)%studyWords.length; cardFlipped=false; render(); break;
    case 'fc-next': studyIndex=(studyIndex+1)%studyWords.length; cardFlipped=false; render(); break;
    case 'fc-known': markStudyWord(true); recordSuccess(); break;
    case 'fc-reset-all': resetAllStudy(); break;
    // Quiz
    case 'quiz-answer': quizAnswer(parseInt(arg)); return; // quizAnswer updates DOM directly
    case 'quiz-next': nextQuiz(); return; // nextQuiz calls render() internally via setTimeout
    case 'quiz-retry': initQuiz(); render(); break;
    case 'quiz-back-card': studyMode='flashcard'; render(); break;
    // Quiz size
    case 'set-quiz-size': quizSize = parseInt(arg); if(studyMode==='quiz'){ initQuiz(); } break;
    // Study list
    case 'sl-known': markStudyListWord(parseInt(arg)); recordSuccess(); break;
    // Weak filter toggle
    case 'toggle-weak-filter': studyWeakOnly = !studyWeakOnly; break;
    // Shortcuts toggle
    case 'toggle-shortcuts': document.getElementById(arg).style.display='none'; return;
    // Review done
    case 'review-done-back': currentView='decks'; updateHash(); render(); break;
    case 'review-done-study': startStudy(activeDeckId); updateHash(); render(); break;
    // Audio
    case 'speak': e.stopPropagation(); speakWord(arg); return; // don't re-render
    case 'toggle-auto-speak': toggleAutoSpeak(); return;
    // Export/Import
    case 'export-decks': exportDecks(); return;
    case 'import-decks': document.getElementById('jsonFileInput').click(); return;
    // Quiz wrong review
    case 'quiz-review-wrong':
      quizWords=[...quizWrong]; quizWrong=[]; quizIdx=0; quizCorrect=0; quizAnswered=false; isWrongReview=true; break;
    case 'save-goal':
      const goal = parseInt(document.getElementById('goalInput')?.value)||20;
      const gs = loadSettings(); gs.goal=goal; saveSettings(gs);
      toast('目标设为 '+goal+' 词/天'); return;
    // Spelling
    case 'study-spell': studyMode='spell'; initSpell(); break;
    case 'spell-check': checkSpelling(); return;
    case 'spell-next': nextSpell(); break;
    case 'spell-replay': e.stopPropagation(); speakWord(spellWords[spellIndex].word); return;
    case 'spell-submode-en': spellSubMode='en'; break;
    case 'spell-submode-enzh': spellSubMode='enzh'; break;
    case 'spell-zh-check': checkSpellZh(); return;
  }
  render();
});

// Import preview: live-edit inputs write straight into previewData
// (single source of truth → theme toggle / any re-render keeps edits)
document.getElementById('app').addEventListener('input', function(e){
  if(!previewData) return;
  const t = e.target;
  if(t.id==='peTitle'){ previewData.title = t.value; return; }
  if(t.dataset && t.dataset.idx!==undefined && t.dataset.field){
    const idx = +t.dataset.idx;
    if(previewData.words[idx]) previewData.words[idx][t.dataset.field] = t.value;
  }
});

// File input change
document.getElementById('fileInput').addEventListener('change', function(e){
  const f = e.target.files[0];
  if(f) processFile(f);
  this.value = '';
});
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
// ===================== TOUCH SWIPE =====================
let touchStartX=0, touchStartY=0;
document.addEventListener('touchstart', function(e){
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, {passive:true});
document.addEventListener('touchend', function(e){
  const dx = e.changedTouches[0].screenX - touchStartX;
  const dy = e.changedTouches[0].screenY - touchStartY;
  if(Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)*2) return;
  if(currentView==='study' && (studyMode==='flashcard'||studyMode==='zh2en') && studyWords.length>0){
    if(dx>0){ studyIndex=(studyIndex-1+studyWords.length)%studyWords.length; cardFlipped=false; render(); }
    else { studyIndex=(studyIndex+1)%studyWords.length; cardFlipped=false; render(); }
  }
  if(currentView==='review'){
    if(dx<0 && reviewIndex>0){ reviewIndex--; render(); }
  }
}, {passive:true});
// ===================== INIT =====================
function updateHash(){
  if(!activeDeckId){ window.location.hash = ''; return; }
  window.location.hash = currentView+'-'+activeDeckId;
}

function loadFromHash(){
  const h = window.location.hash.slice(1);
  if(!h) return;
  const dash = h.indexOf('-');
  if(dash<0) return;
  const view = h.slice(0,dash);
  const deckId = h.slice(dash+1);
  const validViews = ['review','study'];
  if(!validViews.includes(view)) return;
  decks = loadDecks();
  if(!decks[deckId]) return;
  activeDeckId = deckId;
  if(view==='review'){ startReview(deckId); }
  else if(view==='study'){ startStudy(deckId); }
}

if('speechSynthesis' in window){ loadVoices(); warmUpSpeech(); }
ensurePreset();
loadFromHash();
render();

window.addEventListener('hashchange', function(){
  loadFromHash();
  if(!activeDeckId){ currentView='decks'; render(); }
});
