/* =========================
   Estado
========================= */
let QUESTIONS = [];
const QUESTIONS_MAP = new Map();
let currentLang = 'pt';
let currentQuestionId = null;
let answeredThisQuestion = false; // para não marcar como usada ao voltar sem responder
const usedIds = new Set();        // traps viram usadas imediatamente

/* =========================
   Util
========================= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showPage(id){
  $$('.page').forEach(p => p.classList.remove('active'));
  $(id).classList.add('active');
}

function byId(id){ return QUESTIONS_MAP.get(id) || null; }

function renderQidGrid(){
  const grid = $('#qid-grid');
  grid.innerHTML = '';
  for(let i=1;i<=450;i++){
    const exists = QUESTIONS_MAP.has(i);
    const btn = document.createElement('button');
    btn.className = `qid-btn ${exists ? 'enabled' : 'disabled'}`;
    btn.textContent = i;
    btn.disabled = !exists || usedIds.has(i);
    btn.style.borderColor = usedIds.has(i) ? '#e5e7eb' : 'var(--accent)';
    btn.onclick = () => openQuestion(i);
    grid.appendChild(btn);
  }
}

function setLang(lang){
  currentLang = lang;
  $('#menu-lang').value = lang;
  $('#question-lang').value = lang;
  if(currentQuestionId !== null){
    renderQuestion(currentQuestionId);
  }
}

/* =========================
   Carregar perguntas
========================= */
async function loadQuestions(){
  const res = await fetch('./questions.json', {cache:'no-store'});
  if(!res.ok) throw new Error('Erro ao carregar questions.json');
  const data = await res.json();
  QUESTIONS = Array.isArray(data) ? data : data.questions;

  QUESTIONS_MAP.clear();
  for(const q of QUESTIONS){
    if(q && typeof q.id === 'number'){
      QUESTIONS_MAP.set(q.id, q);
    }
  }
}

/* =========================
   Login
========================= */
function setupLogin(){
  $('#login-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = $('#login-username').value.trim();
    // senha pode ser qualquer coisa; apenas não bloquear
    if(!name){
      alert('Informe um nome de usuário.');
      return;
    }
    showPage('#start-page');
  });
}

/* =========================
   Abrir pergunta
========================= */
function openQuestion(id){
  const q = byId(id);
  if(!q) return;
  currentQuestionId = id;
  answeredThisQuestion = false;

  // cabeçalho
  $('#question-number-badge').textContent = `#${id}`;
  $('#question-lang').value = currentLang;

  // render
  renderQuestion(id);

  // ir para a página da pergunta
  showPage('#question-page');
}

/* =========================
   Render Pergunta / Trap
========================= */
function clearQuestionUI(){
  $('#question-text').textContent = '';
  $('#options-container').innerHTML = '';
  $('#feedback').textContent = '';
  $('#trap-container').classList.add('hidden');
  $('#trap-image').src = '';
  $('#trap-image').alt = 'Trap';
}

function renderQuestion(id){
  clearQuestionUI();
  const q = byId(id);
  if(!q) return;

  // Trap
  if(q.trap){
    const msg = q.trapMessage?.[currentLang] || q.trapMessage?.pt || 'VOCÊ CAIU NA ARMADILHA! ESSA QUESTÃO É UMA TRAP!';
    $('#trap-container').classList.remove('hidden');
    $('#trap-message').textContent = msg;
    if(q.image){
      $('#trap-image').src = q.image;
      $('#trap-image').classList.remove('hidden');
    }else{
      $('#trap-image').classList.add('hidden');
    }
    $('#question-text').textContent = ''; // sem enunciado
    // marcar como usada (trap some do menu após clicar)
    usedIds.add(id);
    renderQidGrid();
    return;
  }

  // Pergunta normal
  const text = q.q?.[currentLang] || q.q?.pt || '';
  $('#question-text').textContent = text;

  const opts = q.options?.[currentLang] || q.options?.pt || [];
  const correctIndex = q.correctIndex ?? 0;
  const ration = q.rationales?.[currentLang] || q.rationales?.pt || [];

  const container = $('#options-container');
  opts.forEach((opt, idx)=>{
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = ()=>{
      if(answeredThisQuestion) return;
      answeredThisQuestion = true;

      // feedback
      const isCorrect = idx === correctIndex;
      if(isCorrect){
        $('#feedback').innerHTML = `<span class="text-green-700 font-semibold">Correto!</span>${ration[idx] ? ' — ' + ration[idx] : ''}`;
      }else{
        $('#feedback').innerHTML = `<span class="text-red-700 font-semibold">Incorreto.</span>${ration[idx] ? ' — ' + ration[idx] : ''}`;
      }

      // marcar como usada apenas após responder
      usedIds.add(id);
      renderQidGrid();
    };
    container.appendChild(btn);
  });
}

/* =========================
   Voltar ao menu
========================= */
function backToMenu(){
  // Se não respondeu e não é trap, NÃO marca como usada
  showPage('#start-page');
}

/* =========================
   Bindings
========================= */
function setupBindings(){
  // linguagem
  $('#menu-lang').addEventListener('change', (e)=> setLang(e.target.value));
  $('#question-lang').addEventListener('change', (e)=> setLang(e.target.value));

  // voltar
  $('#back-to-menu').addEventListener('click', backToMenu);
}

/* =========================
   Bootstrap
========================= */
(async function init(){
  try{
    setupLogin();
    setupBindings();
    await loadQuestions();
    renderQidGrid(); // popula grade 1–450
    setLang('pt');   // idioma padrão
  }catch(err){
    alert('Erro ao carregar as perguntas. Verifique o questions.json.');
    console.error(err);
  }
})();
