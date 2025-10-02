/* app.js — versão completa */

let questions = [];                 // array carregado do questions.json (cada item pode ser 'quiz' ou 'trap')
let questionById = new Map();       // id -> objeto questão
let availableIds = [];              // ids existentes no JSON (ordenados)
let answeredQuestions = new Set();  // ids já respondidos (ou clicados, no caso de trap)
let currentQuestionId = null;
let currentLanguage = 'pt';         // 'pt' ou 'en'

// Referências de DOM (garantir que existam no HTML)
const loginPage = document.getElementById('login-page');
const startPage = document.getElementById('start-page');
const quizArea = document.getElementById('quiz-area');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedbackContainer = document.getElementById('feedback-container');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackRationale = document.getElementById('feedback-rationale');
const backToMenuButton = document.getElementById('back-to-menu-button');

const headerSubtitle = document.getElementById('header-subtitle');

// Idioma (os selects podem existir ou não; o código trata os dois)
const langSelectMenu = document.getElementById('language-select-menu');
const langSelectQuestion = document.getElementById('language-select-question');

// Número da pergunta (coloque um span com id="question-number" no HTML onde quer exibir)
const questionNumberEl = document.getElementById('question-number');

// Login
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');

// Utilidades
function setLanguage(lang) {
  currentLanguage = (lang === 'en') ? 'en' : 'pt';
  // Sincroniza selects se existirem
  if (langSelectMenu) langSelectMenu.value = currentLanguage;
  if (langSelectQuestion) langSelectQuestion.value = currentLanguage;

  // Re-renderiza a tela atual
  if (!startPage.classList.contains('hidden')) {
    showStartPage();
  } else if (!quizArea.classList.contains('hidden') && currentQuestionId != null) {
    // Recarrega a pergunta/trap atual no novo idioma
    loadQuestion(currentQuestionId, /*fromLanguageChange*/ true);
  }
}

function setupLanguageSelects() {
  if (langSelectMenu) {
    langSelectMenu.addEventListener('change', (e) => setLanguage(e.target.value));
  }
  if (langSelectQuestion) {
    langSelectQuestion.addEventListener('change', (e) => setLanguage(e.target.value));
  }
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Login
function handleLogin() {
  const username = document.getElementById('username').value;
  if (username.trim() !== '') {
    loginPage.classList.add('hidden');
    headerSubtitle.textContent = currentLanguage === 'en'
      ? 'Select a question to test your knowledge.'
      : 'Selecione uma pergunta para testar seus conhecimentos.';
    showStartPage();
    loginError.classList.add('hidden');
  } else {
    loginError.classList.remove('hidden');
  }
}

// Carrega JSON
async function loadQuestionsJSON() {
  try {
    const res = await fetch('./questions.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    questions = await res.json();

    // Normaliza e indexa
    questionById.clear();
    availableIds = [];
    for (const q of questions) {
      // tipos: quiz padrão => tem "q", "options", "rationales", "correctIndex"
      // trap => tem "trap", "trapMessage", "image"
      if (typeof q.id !== 'number') continue;
      questionById.set(q.id, q);
      availableIds.push(q.id);
    }
    availableIds.sort((a, b) => a - b);

    // Monta menu
    showStartPage();
  } catch (err) {
    console.error('Erro ao carregar questions.json:', err);
    alert('Erro ao carregar as perguntas. Verifique o questions.json.');
  }
}

// Mostra menu
function showStartPage() {
  startPage.classList.remove('hidden');
  quizArea.classList.add('hidden');
  feedbackContainer.classList.add('hidden');
  backToMenuButton.classList.add('hidden');

  // Limpa feedback e opções
  optionsContainer.innerHTML = '';
  questionText.textContent = '';

  // Atualiza subtítulo
  headerSubtitle.textContent = currentLanguage === 'en'
    ? 'Select a question to test your knowledge about security strategy and responsibilities.'
    : 'Selecione uma pergunta para testar seus conhecimentos sobre estratégia e responsabilidades de segurança da informação.';

  // Constrói os 450 botões, habilitando apenas os IDs que existem
  const menuOptions = document.getElementById('menu-options');
  if (!menuOptions) return;
  menuOptions.innerHTML = '';

  const totalQuestions = 450;

  for (let i = 1; i <= totalQuestions; i++) {
    const button = document.createElement('button');
    button.textContent = i.toString();
    button.className = 'menu-item-button py-2 text-center text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-4';

    const hasContent = questionById.has(i);
    const isAnswered = answeredQuestions.has(i);

    if (hasContent) {
      if (isAnswered) {
        button.classList.add('bg-gray-400', 'text-white', 'cursor-not-allowed', 'shadow-inner');
        button.disabled = true;
      } else {
        button.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600', 'focus:ring-blue-300');
        button.onclick = () => loadQuestion(i);
      }
    } else {
      button.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed', 'shadow-inner');
      button.disabled = true;
    }

    menuOptions.appendChild(button);
  }
  // Se existir seletor de idioma no menu, deixa visível; o da questão ficará visível só na questão
  if (langSelectMenu) langSelectMenu.classList.remove('hidden');
  if (langSelectQuestion) langSelectQuestion.classList.add('hidden');
  // Zera número da pergunta
  if (questionNumberEl) questionNumberEl.textContent = '';
}

// Cria/mostra um trap
function renderTrap(q) {
  // Limpa área
  optionsContainer.innerHTML = '';
  feedbackContainer.classList.add('hidden');

  // Mensagem
  const msg = q.trapMessage?.[currentLanguage] || q.trapMessage?.pt || 'TRAP!';
  questionText.textContent = msg;

  // Estiliza trap (vermelho)
  questionText.classList.add('text-red-700');

  // Adiciona imagem centralizada
  let trapDiv = document.getElementById('trap-container');
  if (!trapDiv) {
    trapDiv = document.createElement('div');
    trapDiv.id = 'trap-container';
    quizArea.insertBefore(trapDiv, feedbackContainer);
  }
  trapDiv.innerHTML = '';
  trapDiv.className = 'w-full flex justify-center items-center mt-4';

  const img = document.createElement('img');
  img.src = q.image || './images/phishing.jpg';
  img.alt = 'Trap';
  img.className = 'max-w-xs md:max-w-sm rounded-lg shadow';
  trapDiv.appendChild(img);

  // Botão voltar
  backToMenuButton.classList.remove('hidden');
}

// Limpa estilo de trap ao sair / ao carregar pergunta comum
function clearTrapRender() {
  const trapDiv = document.getElementById('trap-container');
  if (trapDiv) trapDiv.innerHTML = '';
  questionText.classList.remove('text-red-700');
}

// Carregar pergunta/trap por ID
function loadQuestion(id, fromLanguageChange = false) {
  const q = questionById.get(id);
  if (!q) return;

  currentQuestionId = id;

  startPage.classList.add('hidden');
  quizArea.classList.remove('hidden');
  backToMenuButton.classList.add('hidden');

  // Atualiza número da pergunta
  if (questionNumberEl) {
    questionNumberEl.textContent = `#${id}`;
  }

  // Mostrar seletor de idioma da pergunta e esconder o do menu (se existirem)
  if (langSelectQuestion) langSelectQuestion.classList.remove('hidden');
  if (langSelectMenu) langSelectMenu.classList.add('hidden');

  // Se for TRAP
  if (q.trap) {
    clearTrapRender();
    renderTrap(q);

    // Marca como respondida apenas se NÃO veio de mudança de idioma
    if (!fromLanguageChange) {
      answeredQuestions.add(id); // trap some do menu após clicar
    }
    return;
  }

  // Pergunta normal
  clearTrapRender();

  const lang = currentLanguage;
  questionText.textContent = q.q?.[lang] || q.q?.pt || '';
  optionsContainer.innerHTML = '';
  feedbackContainer.classList.add('hidden');

  // Monta objetos de opção (texto + correto + rationale), DEPOIS embaralha
  const optionTexts = q.options?.[lang] || q.options?.pt || [];
  const optionRats = q.rationales?.[lang] || q.rationales?.pt || [];

  const optionObjs = optionTexts.map((text, idx) => ({
    text,
    isCorrect: idx === q.correctIndex,
    rationale: optionRats[idx] ??
      (idx === q.correctIndex
        ? (lang === 'en' ? 'Correct.' : 'Correto.')
        : (lang === 'en' ? 'Incorrect.' : 'Incorreto.'))
  }));

  shuffleInPlace(optionObjs);

  optionObjs.forEach((opt) => {
    const btn = document.createElement('button');
    btn.textContent = opt.text;
    btn.className =
      'answer-button w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500';
    btn.onclick = () => checkAnswer(btn, opt, optionObjs, id);
    optionsContainer.appendChild(btn);
  });
}

// Checar resposta
function checkAnswer(selectedButton, selectedOption, allOptions, id) {
  // Marca como respondida (apenas agora para perguntas normais)
  answeredQuestions.add(id);

  // Desabilita botões / remove hover
  const buttons = Array.from(document.querySelectorAll('.answer-button'));
  buttons.forEach((btn) => {
    btn.disabled = true;
    btn.classList.remove('hover:bg-blue-50');
  });

  if (selectedOption.isCorrect) {
    selectedButton.classList.remove('border-gray-300');
    selectedButton.classList.add(
      'bg-green-100',
      'border-green-500',
      'text-green-800',
      'font-semibold'
    );
    feedbackContainer.className =
      'mt-6 p-4 rounded-lg border-l-4 bg-green-50 border-green-500';
    feedbackTitle.textContent =
      currentLanguage === 'en' ? 'Correct!' : 'Correto!';
    feedbackTitle.className = 'text-lg font-bold text-green-700';
  } else {
    selectedButton.classList.remove('border-gray-300');
    selectedButton.classList.add(
      'bg-red-100',
      'border-red-500',
      'text-red-800',
      'font-semibold'
    );

    const correctOption = allOptions.find((o) => o.isCorrect);
    // Destaca o botão da correta pelo texto correspondente
    buttons.forEach((btn) => {
      if (btn.textContent === correctOption.text) {
        btn.classList.add(
          'bg-green-100',
          'border-green-500',
          'text-green-800',
          'font-semibold'
        );
      }
    });

    feedbackContainer.className =
      'mt-6 p-4 rounded-lg border-l-4 bg-red-50 border-red-500';
    feedbackTitle.textContent =
      currentLanguage === 'en'
        ? 'Incorrect. Review the rationale:'
        : 'Incorreto. Revise a justificativa:';
    feedbackTitle.className = 'text-lg font-bold text-red-700';
  }

  // Mostra justificativa da alternativa selecionada (em português/inglês)
  feedbackRationale.textContent = selectedOption.rationale;
  feedbackContainer.classList.remove('hidden');
  backToMenuButton.classList.remove('hidden');
}

// Voltar ao menu (sem marcar como respondida se a pessoa não respondeu)
function backToMenu() {
  currentQuestionId = null;
  showStartPage();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Login se existir
  if (loginButton) loginButton.addEventListener('click', handleLogin);

  // Botão voltar ao menu
  if (backToMenuButton) {
    backToMenuButton.addEventListener('click', backToMenu);
  }

  // Idioma
  setupLanguageSelects();

  // Se houver página de login, mostra login; caso contrário, já carrega o menu
  if (loginPage) {
    loginPage.classList.remove('hidden');
    startPage.classList.add('hidden');
    quizArea.classList.add('hidden');
  }

  loadQuestionsJSON();
});
