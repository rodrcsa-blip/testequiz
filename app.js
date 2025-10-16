/* ========= Config & estado ========= */
const USERS = {
  // usuário master (não grava/restaura progresso)
  "bombeiro": "🔥",
  // adicione outros se quiser (ex.: "joao": "123")
};

let allQuestions = [];
let questionByIndex = []; // [0..449] -> pergunta ou null
let currentQuestionIndex = -1;
let currentLang = "pt";   // "pt" | "en"
let answeredSet = new Set();     // índices (0-based) já respondidos
let disabledIndices = new Set(); // índices desabilitados (ex.: traps usadas)

// Para relatório detalhado (por usuário):
// { [questionId]: { correct: boolean, selectedText: string, selectedIndex: number, timestamp: string } }
let resultsByQuestionId = {};

/* ========= Helpers de storage ========= */
function storageKeyForUserProgress(username) {
  return `quizProgress:${username}`;
}
function storageKeyForUserResults(username) {
  return `quizResults:${username}`;
}

function loadProgress(username) {
  try {
    const raw = localStorage.getItem(storageKeyForUserProgress(username));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveProgress(username, idArraySorted) {
  try {
    localStorage.setItem(storageKeyForUserProgress(username), JSON.stringify(idArraySorted));
  } catch {}
}

function loadResults(username) {
  try {
    const raw = localStorage.getItem(storageKeyForUserResults(username));
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}
function saveResults(username, resultsObj) {
  try {
    localStorage.setItem(storageKeyForUserResults(username), JSON.stringify(resultsObj));
  } catch {}
}

/* ========= Seletores de DOM ========= */
const loginPage        = document.getElementById('loginPage');
const startPage        = document.getElementById('startPage');
const quizArea         = document.getElementById('quizArea');

const usernameInput    = document.getElementById('username');
const passwordInput    = document.getElementById('password');
const loginButton      = document.getElementById('loginButton');
const loginError       = document.getElementById('loginError');

const logoutButton     = document.getElementById('logoutButton');
const resetButton      = document.getElementById('resetButton');
const exportButton     = document.getElementById('exportButton'); // pode não existir no HTML
const headerSubtitle   = document.getElementById('headerSubtitle');

const globalLangSel    = document.getElementById('globalLangSel');

const menuOptions      = document.getElementById('menuOptions');
const loadErrorEl      = document.getElementById('loadError');

const questionNumberEl = document.getElementById('questionNumber');
const questionText     = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');

const feedbackContainer= document.getElementById('feedbackContainer');
const feedbackTitle    = document.getElementById('feedbackTitle');
const feedbackRationale= document.getElementById('feedbackRationale');

const backTopBtn       = document.getElementById('backTopBtn');
const backBottomBtn    = document.getElementById('backBottomBtn');

/* ========= Utils ========= */
function getDisplayText(objOrString, lang) {
  if (!objOrString) return '';
  if (typeof objOrString === 'string') return objOrString;
  return objOrString[lang] ?? objOrString['pt'] ?? objOrString['en'] ?? '';
}
function getOptionsArray(qObj, lang) {
  if (!qObj?.options) return [];
  const opts = qObj.options[lang] || qObj.options['pt'] || qObj.options['en'] || [];
  return Array.isArray(opts) ? opts : [];
}
function getRationalesArray(qObj, lang) {
  if (!qObj?.rationales) return [];
  const rats = qObj.rationales[lang] || qObj.rationales['pt'] || qObj.rationales['en'] || [];
  return Array.isArray(rats) ? rats : [];
}
function isTrap(qObj) {
  return !!qObj?.trap; // ex.: { trap: "phishing", trapMessage, image }
}

/* ========= Construção do menu 1..450 ========= */
function buildMenu() {
  menuOptions.innerHTML = '';

  for (let i = 1; i <= 450; i++) {
    const idx = i - 1;
    const qObj = questionByIndex[idx];

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'px-3 py-2 rounded-md border text-sm font-medium transition ' +
      // cor roxa para todos os botões, com estados
      'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed';

    btn.textContent = i.toString();

    if (!qObj || disabledIndices.has(idx)) {
      btn.disabled = true;
      btn.classList.add('opacity-40', 'cursor-not-allowed');
    } else {
      btn.addEventListener('click', () => loadQuestion(idx));
    }

    menuOptions.appendChild(btn);
  }
}

/* ========= Login / Logout / Reset ========= */
function handleLogin() {
  const username = (usernameInput?.value || '').trim();
  const password = (passwordInput?.value || '').trim();

  if (username === '' || password === '') {
    loginError.textContent = "Por favor, preencha todos os campos.";
    loginError.classList.remove('hidden');
    return;
  }
  if (USERS[username] && USERS[username] === password) {
    localStorage.setItem('loggedUser', username);

    answeredSet = new Set();
    disabledIndices = new Set();

    // Restaura progresso/resultados para usuário normal
    if (username !== 'bombeiro') {
      // progresso (IDs)
      const answeredIds = loadProgress(username);
      for (const id of answeredIds) {
        const idx = id - 1;
        if (idx >= 0 && idx < questionByIndex.length && questionByIndex[idx]) {
          answeredSet.add(idx);
        }
      }
      // resultados detalhados
      resultsByQuestionId = loadResults(username);
    } else {
      resultsByQuestionId = {}; // master não acumula
    }

    headerSubtitle.textContent =
      "Selecione uma pergunta para testar seus conhecimentos sobre Governança, Compliance, TPRM e as melhores práticas de Segurança da Informação do Nubank";

    resetButton.classList.remove('hidden');
    logoutButton.classList.remove('hidden');
    ensureExportButton(); // deixa pronto

    loginPage.classList.add('hidden');
    showStartPage();
    loginError.classList.add('hidden');
  } else {
    loginError.textContent = "Usuário ou senha incorretos.";
    loginError.classList.remove('hidden');
  }
}

function handleLogout() {
  localStorage.removeItem('loggedUser');

  answeredSet = new Set();
  disabledIndices = new Set();
  resultsByQuestionId = {};

  resetButton.classList.add('hidden');
  logoutButton.classList.add('hidden');
  // export pode ficar, mas vamos esconder se existir
  const exp = document.getElementById('exportButton') || document.getElementById('autoExportBtn');
  if (exp) exp.classList.add('hidden');

  headerSubtitle.textContent = "Por favor, faça o login para começar.";
  loginPage.classList.remove('hidden');
  startPage.classList.add('hidden');
  quizArea.classList.add('hidden');
}

function resetProgress() {
  const username = localStorage.getItem('loggedUser');
  if (!username || username === 'bombeiro') return;

  const confirmReset = confirm("Tem certeza que deseja resetar todas as questões respondidas?");
  if (!confirmReset) return;

  localStorage.removeItem(storageKeyForUserProgress(username));
  localStorage.removeItem(storageKeyForUserResults(username));

  answeredSet = new Set();
  disabledIndices = new Set();
  resultsByQuestionId = {};

  buildMenu();
  feedbackContainer.classList.add('hidden');
}

/* ========= Páginas ========= */
function showStartPage() {
  loginPage.classList.add('hidden');
  startPage.classList.remove('hidden');
  quizArea.classList.add('hidden');
  feedbackContainer.classList.add('hidden');
  currentQuestionIndex = -1;
  buildMenu();
}
function showQuizArea() {
  startPage.classList.add('hidden');
  quizArea.classList.remove('hidden');
}

/* ========= Carregamento das perguntas ========= */
async function loadQuestions() {
  try {
    const resp = await fetch('questions.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('JSON não é um array');

    allQuestions = data;

    questionByIndex = new Array(450).fill(null);
    for (const q of allQuestions) {
      if (typeof q.id === 'number' && q.id >= 1 && q.id <= 450) {
        questionByIndex[q.id - 1] = q;
      }
    }
    loadErrorEl.classList.add('hidden');
  } catch (e) {
    console.error('Falha ao carregar questions.json', e);
    loadErrorEl.classList.remove('hidden');
  }
}

/* ========= Renderização ========= */
function loadQuestion(index) {
  currentQuestionIndex = index;
  const qObj = questionByIndex[index];
  if (!qObj) { showStartPage(); return; }

  const displayId = (typeof qObj.id === 'number') ? qObj.id : (index + 1);
  if (questionNumberEl) {
    questionNumberEl.textContent = (currentLang === 'en')
      ? `Question ${displayId}`
      : `Pergunta ${displayId}`;
  }

  if (isTrap(qObj)) {
    showQuizArea();
    renderTrap(qObj);
    // trap “consome” o slot
    disabledIndices.add(index);
    return;
  }

  showQuizArea();
  renderQuestion(qObj);
}

function renderTrap(qObj) {
  questionText.textContent = '';
  optionsContainer.innerHTML = '';
  feedbackContainer.classList.add('hidden');

  const msg = getDisplayText(qObj.trapMessage, currentLang) || (
    currentLang === 'en'
      ? 'YOU FELL FOR PHISHING! TRY AGAIN LATER!'
      : 'VOCÊ CAIU NO PHISHING! TENTE NOVAMENTE MAIS TARDE!'
  );

  questionText.textContent = msg;
  // texto em vermelho e centralizado
  questionText.className =
    'text-xl font-semibold text-red-600 bg-red-50 p-4 rounded-lg border border-red-300 text-center';

  if (qObj.image) {
    const img = document.createElement('img');
    img.src = qObj.image;
    img.alt = 'trap';
    img.className = 'mt-4 max-h-72 object-contain rounded-lg border mx-auto block';
    optionsContainer.appendChild(img);
  }
}

function renderQuestion(qObj) {
  const qText = getDisplayText(qObj.q, currentLang) || getDisplayText(qObj.question, currentLang) || '';
  questionText.textContent = qText;
  // moldura roxa
  questionText.className = 'text-xl font-semibold text-gray-800 bg-purple-50 p-4 rounded-lg border border-purple-200';

  optionsContainer.innerHTML = '';
  feedbackContainer.classList.add('hidden');
  feedbackTitle.textContent = '';
  feedbackRationale.textContent = '';

  const opts = getOptionsArray(qObj, currentLang);
  const rats = getRationalesArray(qObj, currentLang);
  const correctIndex = (typeof qObj.correctIndex === 'number') ? qObj.correctIndex : -1;

  const correctText = (correctIndex >= 0 && correctIndex < opts.length) ? opts[correctIndex] : '';
  const correctRationale = (correctIndex >= 0 && correctIndex < rats.length) ? rats[correctIndex] : '';

  // mapeia opção -> rationale correspondente
  const rationaleMap = new Map();
  for (let i = 0; i < opts.length; i++) {
    rationaleMap.set(opts[i], rats[i] || '');
  }

  opts.forEach((optText, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    // botões roxos
    btn.className =
      'w-full text-left px-4 py-3 my-2 rounded-lg border transition ' +
      'bg-white border-purple-300 hover:bg-purple-50';

    btn.textContent = optText;
    btn.addEventListener('click', () => {
      handleAnswerSelection({
        correctIndex,
        correctText,
        correctRationale,
        selectedIndex: i,
        selectedText: optText,
        rationaleMap
      });
    });

    optionsContainer.appendChild(btn);
  });
}

function handleAnswerSelection(ctx) {
  // marca pergunta como respondida
  answeredSet.add(currentQuestionIndex);

  // pinta botões
  const allButtons = Array.from(optionsContainer.querySelectorAll('button'));
  allButtons.forEach(b => b.disabled = true);

  const selectedButton = allButtons[ctx.selectedIndex];
  if (ctx.selectedIndex === ctx.correctIndex) {
    selectedButton.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-semibold');
    feedbackContainer.className = 'mt-6 p-4 rounded-lg border-l-4 bg-green-50 border-green-500';
    feedbackTitle.textContent = (currentLang === 'en') ? 'Correct!' : 'Correto!';
    feedbackTitle.className = 'text-lg font-bold text-green-700';
    feedbackRationale.textContent = ctx.correctRationale || '';
  } else {
    selectedButton.classList.add('bg-red-100', 'border-red-500', 'text-red-800', 'font-semibold');
    allButtons.forEach(btn => {
      if (btn.textContent === ctx.correctText) {
        btn.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-semibold');
      }
    });
    feedbackContainer.className = 'mt-6 p-4 rounded-lg border-l-4 bg-red-50 border-red-500';
    feedbackTitle.textContent = (currentLang === 'en')
      ? 'Incorrect. Review the rationale:'
      : 'Incorreto. Revise a justificativa:';
    feedbackTitle.className = 'text-lg font-bold text-red-700';
    const chosenRationale = ctx.rationaleMap.get(ctx.selectedText) || '';
    feedbackRationale.textContent = chosenRationale;
  }

  // Salva progresso + resultado (exceto master)
  const username = localStorage.getItem('loggedUser');
  if (username && username !== 'bombeiro') {
    // progresso: ids ordenados
    const answeredIds = Array.from(answeredSet)
      .map(idx => {
        const qObj = questionByIndex[idx];
        return (qObj && typeof qObj.id === 'number') ? qObj.id : (idx + 1);
      })
      .sort((a, b) => a - b);
    saveProgress(username, answeredIds);

    // resultados detalhados
    const qObj = questionByIndex[currentQuestionIndex];
    const qId = (qObj && typeof qObj.id === 'number') ? qObj.id : (currentQuestionIndex + 1);
    resultsByQuestionId = loadResults(username); // merge não destrutivo
    resultsByQuestionId[qId] = {
      correct: ctx.selectedIndex === ctx.correctIndex,
      selectedText: ctx.selectedText,
      selectedIndex: ctx.selectedIndex,
      correctText: ctx.correctText,
      correctIndex: ctx.correctIndex,
      timestamp: new Date().toISOString()
    };
    saveResults(username, resultsByQuestionId);
  }

  feedbackContainer.classList.remove('hidden');
}

/* ========= Exportar Progresso ========= */
/**
 * Gera um arquivo JSON com:
 * - usuário logado
 * - data/hora
 * - lista de IDs respondidos
 * - resultados detalhados (correto/incorreto por pergunta)
 */
function exportProgress() {
  const username = localStorage.getItem('loggedUser');
  if (!username || !USERS[username]) {
    alert('Faça login para exportar o progresso.');
    return;
  }

  const isMaster = (username === 'bombeiro');

  const answeredIds = isMaster
    ? [] // master não persiste progresso
    : loadProgress(username);

  const results = isMaster
    ? {}
    : loadResults(username);

  const payload = {
    username,
    exportedAt: new Date().toISOString(),
    answeredIds,
    results
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `quiz-progress-${username}-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Garante que o botão exista:
 * - Se já existir <button id="exportButton"> no HTML, só liga o listener
 * - Se não existir, cria um à direita do Logout
 */
function ensureExportButton() {
  let btn = document.getElementById('exportButton');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'autoExportBtn';
    btn.type = 'button';
    // estilo roxinho, igual ao resto
    btn.className =
      'ml-2 px-3 py-2 rounded-md border text-sm font-medium ' +
      'bg-purple-600 text-white border-purple-700 hover:bg-purple-700';
    btn.textContent = 'Exportar Progresso';

    // tenta achar uma área de ações no cabeçalho
    const headerActions = document.getElementById('headerActions') || document.querySelector('#topActions') || document.body;
    headerActions.appendChild(btn);
  }
  btn.classList.remove('hidden');
  btn.onclick = exportProgress;
}

/* ========= Eventos ========= */
function wireEvents() {
  if (loginButton)  loginButton.addEventListener('click', handleLogin);
  if (logoutButton) logoutButton.addEventListener('click', handleLogout);
  if (resetButton)  resetButton.addEventListener('click', resetProgress);

  if (backTopBtn)    backTopBtn.addEventListener('click', () => showStartPage());
  if (backBottomBtn) backBottomBtn.addEventListener('click', () => showStartPage());

  if (exportButton) {
    // caso já exista no HTML
    exportButton.addEventListener('click', exportProgress);
  }

  if (globalLangSel) {
    globalLangSel.addEventListener('change', (e) => {
      currentLang = e.target.value;
      if (!quizArea.classList.contains('hidden') && currentQuestionIndex >= 0) {
        const qObj = questionByIndex[currentQuestionIndex];
        if (qObj) {
          const displayId = (typeof qObj.id === 'number') ? qObj.id : (currentQuestionIndex + 1);
          if (questionNumberEl) {
            questionNumberEl.textContent = (currentLang === 'en')
              ? `Question ${displayId}`
              : `Pergunta ${displayId}`;
          }
          isTrap(qObj) ? renderTrap(qObj) : renderQuestion(qObj);
        }
      }
    });
  }
}

/* ========= Bootstrap ========= */
document.addEventListener('DOMContentLoaded', async () => {
  await loadQuestions();

  const savedUser = localStorage.getItem('loggedUser');
  if (savedUser && USERS[savedUser]) {
    if (savedUser !== 'bombeiro') {
      answeredSet = new Set();
      const answeredIds = loadProgress(savedUser);
      for (const id of answeredIds) {
        const idx = id - 1;
        if (idx >= 0 && idx < questionByIndex.length && questionByIndex[idx]) {
          answeredSet.add(idx);
        }
      }
      resultsByQuestionId = loadResults(savedUser);
    } else {
      resultsByQuestionId = {};
    }

    headerSubtitle.textContent =
      "Selecione uma pergunta para testar seus conhecimentos sobre Governança, Compliance, TPRM e as melhores práticas de Segurança da Informação do Nubank";
    resetButton?.classList.remove('hidden');
    logoutButton?.classList.remove('hidden');
    loginPage?.classList.add('hidden');
    ensureExportButton();
    showStartPage();
  } else {
    headerSubtitle.textContent = "Por favor, faça o login para começar.";
    resetButton?.classList.add('hidden');
    logoutButton?.classList.add('hidden');
    // export permanece escondido enquanto não logar
    const exp = document.getElementById('exportButton') || document.getElementById('autoExportBtn');
    if (exp) exp.classList.add('hidden');

    loginPage?.classList.remove('hidden');
    startPage?.classList.add('hidden');
    quizArea?.classList.add('hidden');
  }

  if (globalLangSel) globalLangSel.value = currentLang;
  wireEvents();
});
