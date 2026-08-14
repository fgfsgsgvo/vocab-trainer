// ===================== APP STATE =====================
let decks = {};
let currentView = 'decks';
let activeDeckId = null;
let renderBusy = false;
let reviewIndex = 0, reviewWords = [];
let studyIndex = 0, studyWords = [], cardFlipped = false;
let studyMode = 'flashcard';
let quizWords=[], quizIdx=0, quizCorrect=0, quizAnswered=false, quizCur=null, quizOpts=[], quizWrong=[], isWrongReview=false, quizSize = 20;
let previewData = null, studyListFilter = '', studyWeakOnly = false;
let spellWords=[], spellIndex=0, spellCorrect=0, spellResult=null, spellSubMode='en'; // 'en' | 'enzh'

function getDeck(){ return decks[activeDeckId]; }
function save(){ saveDecks(decks); }
