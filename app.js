// Estado básico
let allQuestions = new Map();       // id -> question object
let availableIds = new Set();       // ids que existem no JSON
let usedIds = new Set();            // ids já utilizados (respondidos) ou traps já exibidas
let currentId = null;
let currentLang = 'pt';

// DOM
const loginPage = document.getElementById('login-page');
const startPage = document.getElementById('start-page');
const quizArea  = document.getElementById('quiz-area');

const languageSelectMenu = document.getElementById('language-select-menu');
const languageSelectQuestion = document.getElementById('language-select-question');

const menuContainer = document.getElementById('menu-options');

const questionNumberEl = document.getElementById('question-number');
const questionTextEl   = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');

const trapArea   = document.getElementById('trap-area');
const trapTextEl = document.getElementById('trap-text');
const trapImgEl  = document.getElementById('trap-image');

const feedbackBox  = document.getElementById('feedback');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackList  = document.getElementById('feedback-list');

const backBtn = document.getElementById('back-to-menu-button');

// LOGIN
document.getElementById('login-button').addEventListener('click', () => {
  const name = document.getElementById('username').value.trim();
  const err  = document.getElementById('login-error');
  if (!name) {
    err.classList.remove('hidden');
    return;
  }
  err.classList.add('hidden');
  // entra
  loginPage.classList.add('hidden');
  startPage.classList.remove('hidden');
});

// Idioma
languageSelectMenu.addEventListener('change', (e) => {
  currentLang = e.target.value;
  // Apenas influencia textos exibidos na pergunta. Menu não tem textos variáveis.
  if (!quizArea.classList.contains('hidden') && currentId) {
    renderQuestion(currentId);
  }
});
languageSelectQuestion.addEventListener('change', (e) => {
  currentLang = e.target.value;
  if (currentId) renderQuestion(currentId);
});

// Voltar SEM marcar como usada (se não respondeu)
backBtn.addEventListener('click', () => {
  // Volta para o menu
  quizArea.classList.add('hidden');
  startPage.classList.remove('hidden');
  // Atualiza menu (para refletir possível resposta já dada)
  renderMenu();
});

// Carrega JSON
fetch('questions.json')
  .then(r => r.json())
  .then(data => {
    // Suporta arquivo com {questions:[...]} ou array direto
    const arr = Array.isArray(data) ? data : (data.questions || []);
    arr.forEach(q => {
      allQuestions.set(q.id, q);
      availableIds.add(q.id);
    });
    renderMenu();
  })
  .catch(() => {
    alert('Erro ao carregar as perguntas. Verifique o questions.json.');
  });

// Renderiza o menu 1..450 com botões roxos
function renderMenu() {
  menuContainer.innerHTML = '';
  for (let i = 1; i <= 450; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'btn-primary menu-item-button';
    const enabled = availableIds.has(i) && !usedIds.has(i);
    btn.disabled = !enabled;

    btn.addEventListener('click', () => {
      openQuestion(i);
    });

    menuContainer.appendChild(btn);
  }
}

// Abre a pergunta
function openQuestion(id) {
  currentId = id;
  startPage.classList.add('hidden');
  quizArea.classList.remove('hidden');
  // mostra número
  questionNumberEl.textContent = `#${id}`;
  renderQuestion(id);
}

// Renderiza pergunta/trap
function renderQuestion(id) {
  feedbackBox.classList.add('hidden');
  feedbackList.innerHTML = '';
  optionsContainer.innerHTML = '';
  trapArea.classList.add('hidden');
  questionTextEl.textContent = '';

  const q = allQuestions.get(id);
  if (!q) return;

  // Trap: remove do menu imediatamente
  if (q.trap) {
    usedIds.add(id); // trap some automaticamente
    trapArea.classList.remove('hidden');

    // mensagem + imagem centralizadas
    const msg = q.trapMessage?.[currentLang] || q.trapMessage?.pt || 'TRAP';
    trapTextEl.textContent = msg;
    if (q.image) {
      trapImgEl.src = q.image;
      trapImgEl.classList.remove('hidden');
    } else {
      trapImgEl.classList.add('hidden');
    }

    questionTextEl.textContent = ''; // sem enunciado
    optionsContainer.innerHTML = '';  // sem opções
    // Atualiza menu (para já sumir)
    renderMenu();
    return;
  }

  // Pergunta normal
  const title = q.q?.[currentLang] || q.q?.pt || '';
  questionTextEl.textContent = title;

  const opts = q.options?.[currentLang] || q.options?.pt || [];
  opts.forEach((optText, idx) => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left border rounded-lg px-4 py-3 hover:bg-gray-50';
    btn.textContent = optText;

    btn.addEventListener('click', () => {
      handleAnswer(q, idx);
    });

    optionsContainer.appendChild(btn);
  });
}

// Resposta
function handleAnswer(q, chosenIndex) {
  const correct = Number(q.correctIndex) === Number(chosenIndex);
  usedIds.add(q.id); // marca como usada APÓS resposta
  renderMenu();

  feedbackBox.classList.remove('hidden');
  feedbackTitle.textContent = correct
    ? (currentLang === 'en' ? 'Correct!' : 'Correto!')
    : (currentLang === 'en' ? 'Incorrect. Review the rationale:' : 'Incorreto. Revise a justificativa:');

  feedbackList.innerHTML = '';
  const rats = q.rationales?.[currentLang] || q.rationales?.pt || [];
  rats.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    feedbackList.appendChild(li);
  });
}
