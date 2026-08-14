// ===================== AUDIO =====================
let cachedVoices = [];
let isSpeaking = false;

function loadVoices(){
  cachedVoices = speechSynthesis.getVoices();
  if(cachedVoices.length===0){
    speechSynthesis.addEventListener('voiceschanged', ()=>{
      cachedVoices = speechSynthesis.getVoices();
    }, {once:true});
  }
}

// Warm up the speech engine — prevents first-speak lag
function warmUpSpeech(){
  if(!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0; u.rate = 2;
  speechSynthesis.speak(u);
}

function speakWord(word){
  if(!('speechSynthesis' in window)) return;
  // Don't cancel if already idle — cancel() itself causes Chrome to pause for ~200ms
  if(isSpeaking) window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  u.rate = 0.85;
  const enVoice = cachedVoices.find(v=>v.lang.startsWith('en-US')) || cachedVoices.find(v=>v.lang.startsWith('en'));
  if(enVoice) u.voice = enVoice;

  const btns = document.querySelectorAll('.speak-btn');
  btns.forEach(b=>b.classList.remove('speaking'));
  const activeBtn = document.querySelector('[data-arg="'+CSS.escape(word)+'"]');
  if(activeBtn) activeBtn.classList.add('speaking');

  isSpeaking = true;
  u.onend = ()=>{ isSpeaking=false; btns.forEach(b=>b.classList.remove('speaking')); };
  u.onerror = ()=>{ isSpeaking=false; btns.forEach(b=>b.classList.remove('speaking')); };
  speechSynthesis.speak(u);
}
