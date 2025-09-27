// Estado global simples
let rawQuestions = [];
let currentLang = 'pt';
let currentQuestionIndex = -1;
const answeredQuestions = new Set();

// Referências de elementos
const els = {
  headerSubtitle: document.getElementById('header-subtitle'),
  loginPage: document.getElementById('login-page'),
  startPage: document.getElementById('start-page'),
  quizArea: document.getElementById('quiz-area'),
  menuOptions: document.getElementById('menu-options'),
  optionsContainer: document.getElementById('options-container'),
  feedbackContainer: document.getElementById('feedback-container'),
  feedbackTitle: document.getElementById('feedback-title'),
  feedbackRationale: document.getElementById('feedback-rationale'),
  backBtn: document.getElementById('back-to-menu-button'),
  loginButton: document.getElementById('login-button'),
  loginError: document.getElementById('login-error'),
  questionText: document.getElementById('question-text'),
  menuTitle: document.getElementById('menu-title'),
  menuRange: document.getElementById('menu-range'),
  langLabel: document.getElementById('lang-label'),
  langSelect: document.getElementById('lang-select'),
};

// Textos da interface (PT/EN)
function t() {
  return currentLang === 'en'
    ? {
        select: "Select a question",
        range: rawQuestions.length ? `(1–${rawQuestions.length})` : "(1–?)",
        subtitle: "Pick a question to test your knowledge.",
        correct: "Correct!",
        incorrect: "Incorrect. Review the rationale:",
        back: "Back to Menu",
        loginError: "Please enter a username.",
        lang: "Language",
      }
    : {
        select: "Selecione a Pergunta",
        range: rawQuestions.length ? `(1–${rawQuestions.length})` : "(1–?)",
        subtitle: "Selecione uma pergunta para testar seus conhecimentos.",
        correct: "Correto!",
        incorrect: "Incorreto. Revise a justificativa:",
        back: "Voltar ao Menu",
        loginError: "Por favor, insira um nome de usuário.",
        lang: "Idioma",
      };
}

function updateUIStrings() {
  const tt = t();
  els.menuTitle.textContent = tt.select;
  els.menuRange.textContent = tt.range;
  els.headerSubtitle.textContent = tt.subtitle;
  els.backBtn.textContent = tt.back;
  els.langLabel.textContent = tt.lang;
  // loginError só aparece quando necessário
}

// Converte 1 questão crua → formato interno (para renderizar)
function qToInternal(q) {
  const opts = (q.options && (q.options[currentLang] || q.options.pt)) || [];
  const rats = (q.rationales && (q.rationales[currentLang] || q.rationales.pt)) || [];
  return {
    id: q.id,
    question: (q.q && (q.q[currentLang] || q.q.pt)) || '',
    options: opts.map((text, i) => ({
      text,
      isCorrect: i === q.correctIndex,
      rationale: rats[i] || ''
    }))
  };
}

// Carrega o JSON
async function loadQuestions() {
  // querystring simples ajuda a “furar” cache do navegador ao atualizar conteúdo
  const res = await fetch('./questions.json?v=1');
  if (!res.ok) throw new Error('Falha ao carregar questions.json');
  rawQuestions = await res.json();
}

// Lógica de telas
function handleLogin() {
  const username = document.getElementById('username').value;
  if (username.trim()) {
    els.loginPage.classList.add('hidden');
    showStartPage();
  } else {
    els.loginError.textContent = t().loginError;
    els.loginError.classList.remove('hidden');
  }
}

function showStartPage() {
  els.loginPage.classList.add('hidden');
  els.quizArea.classList.add('hidden');
  els.startPage.classList.remove('hidden');
  els.feedbackContainer.classList.add('hidden');
  els.backBtn.classList.add('hidden');
  currentQuestionIndex = -1;

  els.menuOptions.innerHTML = '';
  const total = rawQuestions.length; // deve ser 450 quando você completar

  for (let i = 0; i < total; i++) {
    const button = document.createElement('button');
    const isAnswered = answeredQuestions.has(i);

    button.textContent = String(i + 1);
    button.className = 'menu-item-button py-2 text-center text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-4';

    if (isAnswered) {
      button.classList.add('bg-gray-400','text-white','cursor-not-allowed','shadow-inner');
      button.disabled = true;
    } else {
      button.classList.add('bg-blue-500','text-white','hover:bg-blue-600','focus:ring-blue-300');
      button.onclick = () => loadQuestion(i);
    }
    els.menuOptions.appendChild(button);
  }

  updateUIStrings();
}

function loadQuestion(index) {
  currentQuestionIndex = index;
  const currentQuiz = qToInternal(rawQuestions[index]);
  if (!currentQuiz) return showStartPage();

  els.startPage.classList.add('hidden');
  els.quizArea.classList.remove('hidden');

  els.questionText.textContent = currentQuiz.question;
  els.optionsContainer.innerHTML = '';
  els.feedbackContainer.classList.add('hidden');
  els.backBtn.classList.add('hidden');

  const shuffled = [...currentQuiz.options].sort(() => Math.random() - 0.5);
  shuffled.forEach((option) => {
    const btn = document.createElement('button');
    btn.textContent = option.text;
    btn.className = 'answer-button w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500';
    btn.onclick = () => checkAnswer(btn, option, currentQuiz.options);
    els.optionsContainer.appendChild(btn);
  });
}

function checkAnswer(selectedButton, selectedOption, allOptions) {
  if (currentQuestionIndex !== -1) answeredQuestions.add(currentQuestionIndex);

  document.querySelectorAll('.answer-button').forEach(b => {
    b.disabled = true;
    b.classList.remove('hover:bg-blue-50');
  });

  const tt = t();

  if (selectedOption.isCorrect) {
    selectedButton.classList.remove('border-gray-300');
    selectedButton.classList.add('bg-green-100','border-green-500','text-green-800','font-semibold');
    els.feedbackContainer.className = 'mt-6 p-4 rounded-lg border-l-4 bg-green-50 border-green-500';
    els.feedbackTitle.textContent = tt.correct;
    els.feedbackTitle.className = 'text-lg font-bold text-green-700';
  } else {
    selectedButton.classList.remove('border-gray-300');
    selectedButton.classList.add('bg-red-100','border-red-500','text-red-800','font-semibold');

    const correct = allOptions.find(o => o.isCorrect);
    document.querySelectorAll('.answer-button').forEach(b => {
      if (b.textContent === correct.text) {
        b.classList.add('bg-green-100','border-green-500','text-green-800','font-semibold');
      }
    });

    els.feedbackContainer.className = 'mt-6 p-4 rounded-lg border-l-4 bg-red-50 border-red-500';
    els.feedbackTitle.textContent = tt.incorrect;
    els.feedbackTitle.className = 'text-lg font-bold text-red-700';
  }

  els.feedbackRationale.textContent = selectedOption.rationale || '';
  els.feedbackContainer.classList.remove('hidden');
  els.backBtn.classList.remove('hidden');
}

// Navegação
els.backBtn.addEventListener('click', showStartPage);
els.loginButton.addEventListener('click', handleLogin);

// Seletor de idioma
els.langSelect.addEventListener('change', (e) => {
  currentLang = e.target.value;
  // Se no menu, atualiza labels; se no quiz, recarrega a questão atual no novo idioma
  if (!els.startPage.classList.contains('hidden')) {
    updateUIStrings();
  } else if (!els.quizArea.classList.contains('hidden') && currentQuestionIndex >= 0) {
    loadQuestion(currentQuestionIndex);
  }
});

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadQuestions();
    updateUIStrings();
  } catch (e) {
    els.headerSubtitle.textContent = currentLang === 'en'
      ? 'Failed to load questions. Check questions.json.'
      : 'Erro ao carregar as perguntas. Verifique o questions.json.';
  }
});
