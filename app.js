// ===============================
// app.js — Quiz PT/EN com JSON
// ===============================

let rawQuestions = [];
let currentLang = 'pt';
let currentQuestionIndex = -1;
const answeredQuestions = new Set();

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
  // NOVOS: seletor de idioma dentro da pergunta
  langLabelInQuestion: document.getElementById('lang-label-in-question'),
  langSelectInQuestion: document.getElementById('lang-select-in-question'),
};

// Textos de interface por idioma
function t() {
  return currentLang === 'en'
    ? {
        select: "Select a question",
        subtitle: "Pick a question to test your knowledge.",
        correct: "Correct!",
        incorrect: "Incorrect. Review the rationale:",
        back: "Back to Menu",
        loginError: "Please enter a username.",
        lang: "Language",
        comingSoon: "Coming soon",
      }
    : {
        select: "Selecione a Pergunta",
        subtitle: "Selecione uma pergunta para testar seus conhecimentos.",
        correct: "Correto!",
        incorrect: "Incorreto. Revise a justificativa:",
        back: "Voltar ao Menu",
        loginError: "Por favor, insira um nome de usuário.",
        lang: "Idioma",
        comingSoon: "Em breve",
      };
}

function updateUIStrings() {
  const tt = t();
  if (els.menuTitle) els.menuTitle.textContent = tt.select;
  if (els.menuRange) els.menuRange.textContent = '(1–450)'; // faixa fixa
  if (els.headerSubtitle) els.headerSubtitle.textContent = tt.subtitle;
  if (els.backBtn) els.backBtn.textContent = tt.back;
  if (els.langLabel) els.langLabel.textContent = tt.lang;
  if (els.langLabelInQuestion) els.langLabelInQuestion.textContent = tt.lang;
}

// Converte questão crua → formato interno
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

// Carrega JSON
async function loadQuestions() {
  const res = await fetch('./questions.json?v=1');
  if (!res.ok) throw new Error('Falha ao carregar questions.json');
  rawQuestions = await res.json();
  if (!Array.isArray(rawQuestions)) throw new Error('questions.json inválido: esperado um array');
}

// Mostra menu 1..450, habilitando só as existentes
function showStartPage() {
  els.loginPage?.classList.add('hidden');
  els.quizArea.classList.add('hidden');
  els.startPage.classList.remove('hidden');
  els.feedbackContainer.classList.add('hidden');
  // Importante: botão de voltar não some do DOM na página da pergunta,
  // mas aqui garantimos que o usuário está no menu.
  currentQuestionIndex = -1;

  els.menuOptions.innerHTML = '';
  const totalButtons = 450;
  const available = rawQuestions.length;
  const tt = t();

  for (let i = 1; i <= totalButtons; i++) {
    const button = document.createElement('button');
    const questionIndex = i - 1;
    const isAnswered = answeredQuestions.has(questionIndex);
    const isAvailable = i <= available;

    button.textContent = String(i);
    button.className =
      'menu-item-button py-2 text-center text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-4';

    if (isAvailable) {
      if (isAnswered) {
        button.classList.add('bg-gray-400', 'text-white', 'cursor-not-allowed', 'shadow-inner');
        button.disabled = true;
      } else {
        button.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600', 'focus:ring-blue-300');
        button.onclick = () => loadQuestion(questionIndex);
      }
    } else {
      button.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed', 'shadow-inner');
      button.disabled = true;
      button.title = tt.comingSoon;
    }

    els.menuOptions.appendChild(button);
  }

  updateUIStrings();
}

// Carrega e exibe a questão
function loadQuestion(index) {
  currentQuestionIndex = index;
  const currentRaw = rawQuestions[index];
  if (!currentRaw) return showStartPage();

  const currentQuiz = qToInternal(currentRaw);

  els.startPage.classList.add('hidden');
  els.quizArea.classList.remove('hidden');

  // mantém os seletores de idioma sincronizados
  syncLanguageSelectors();

  els.questionText.textContent = currentQuiz.question;
  els.optionsContainer.innerHTML = '';
  els.feedbackContainer.classList.add('hidden');

  const shuffled = [...currentQuiz.options].sort(() => Math.random() - 0.5);
  shuffled.forEach((option) => {
    const btn = document.createElement('button');
    btn.textContent = option.text;
    btn.className =
      'answer-button w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500';
    btn.onclick = () => checkAnswer(btn, option, currentQuiz.options);
    els.optionsContainer.appendChild(btn);
  });
}

// Clicar numa alternativa (aqui sim marca como respondida)
function checkAnswer(selectedButton, selectedOption, allOptions) {
  if (currentQuestionIndex !== -1) {
    answeredQuestions.add(currentQuestionIndex);
  }

  document.querySelectorAll('.answer-button').forEach((b) => {
    b.disabled = true;
    b.classList.remove('hover:bg-blue-50');
  });

  const tt = t();

  if (selectedOption.isCorrect) {
    selectedButton.classList.remove('border-gray-300');
    selectedButton.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-semibold');
    els.feedbackContainer.className =
      'mt-6 p-4 rounded-lg border-l-4 bg-green-50 border-green-500';
    els.feedbackTitle.textContent = tt.correct;
    els.feedbackTitle.className = 'text-lg font-bold text-green-700';
  } else {
    selectedButton.classList.remove('border-gray-300');
    selectedButton.classList.add('bg-red-100', 'border-red-500', 'text-red-800', 'font-semibold');

    const correct = allOptions.find((o) => o.isCorrect);
    document.querySelectorAll('.answer-button').forEach((b) => {
      if (b.textContent === correct.text) {
        b.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-semibold');
      }
    });

    els.feedbackContainer.className =
      'mt-6 p-4 rounded-lg border-l-4 bg-red-50 border-red-500';
    els.feedbackTitle.textContent = tt.incorrect;
    els.feedbackTitle.className = 'text-lg font-bold text-red-700';
  }

  els.feedbackRationale.textContent = selectedOption.rationale || '';
  els.feedbackContainer.classList.remove('hidden');
}

// Botão Voltar ao Menu (não marca como respondida caso não tenha respondido)
els.backBtn?.addEventListener('click', showStartPage);

// (Opcional) Login
function handleLogin() {
  const username = document.getElementById('username')?.value || '';
  if (username.trim()) {
    els.loginError?.classList.add('hidden');
    showStartPage();
  } else {
    if (els.loginError) {
      els.loginError.textContent = t().loginError;
      els.loginError.classList.remove('hidden');
    }
  }
}
els.loginButton?.addEventListener('click', handleLogin);

// Sincroniza os dois seletores de idioma e aplica mudança
function setLanguage(lang) {
  if (lang !== 'pt' && lang !== 'en') return;
  currentLang = lang;
  // Sincroniza selects
  if (els.langSelect && els.langSelect.value !== lang) els.langSelect.value = lang;
  if (els.langSelectInQuestion && els.langSelectInQuestion.value !== lang) els.langSelectInQuestion.value = lang;

  // Atualiza labels gerais
  updateUIStrings();

  // Se estiver no menu, só atualiza; se estiver numa questão, recarrega a questão atual
  if (!els.startPage.classList.contains('hidden')) {
    // nada além das labels
  } else if (!els.quizArea.classList.contains('hidden') && currentQuestionIndex >= 0) {
    loadQuestion(currentQuestionIndex);
  }
}

function syncLanguageSelectors() {
  if (els.langSelect && els.langSelectInQuestion) {
    els.langSelect.value = currentLang;
    els.langSelectInQuestion.value = currentLang;
  }
}

// Eventos dos dois seletores
els.langSelect?.addEventListener('change', (e) => setLanguage(e.target.value));
els.langSelectInQuestion?.addEventListener('change', (e) => setLanguage(e.target.value));

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadQuestions();
    updateUIStrings();
    showStartPage(); // entra direto no menu 1–450
  } catch (e) {
    if (els.headerSubtitle) {
      els.headerSubtitle.textContent =
        currentLang === 'en'
          ? 'Failed to load questions. Check questions.json.'
          : 'Erro ao carregar as perguntas. Verifique o questions.json.';
    }
    console.error(e);
  }
});
