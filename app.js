// ===============================
// app.js — Quiz PT/EN com JSON
// ===============================

// Estado global
let rawQuestions = [];            // Dados como vêm do questions.json
let currentLang = 'pt';           // 'pt' | 'en'
let currentQuestionIndex = -1;    // Índice da questão atual
const answeredQuestions = new Set(); // Guarda índices respondidos nesta sessão

// Referências de elementos (cada id precisa existir no index.html)
const els = {
  headerSubtitle: document.getElementById('header-subtitle'),
  loginPage: document.getElementById('login-page'),          // pode não existir; tratamos com "?"
  startPage: document.getElementById('start-page'),
  quizArea: document.getElementById('quiz-area'),
  menuOptions: document.getElementById('menu-options'),
  optionsContainer: document.getElementById('options-container'),
  feedbackContainer: document.getElementById('feedback-container'),
  feedbackTitle: document.getElementById('feedback-title'),
  feedbackRationale: document.getElementById('feedback-rationale'),
  backBtn: document.getElementById('back-to-menu-button'),
  loginButton: document.getElementById('login-button'),      // pode não existir; tratamos com "?"
  loginError: document.getElementById('login-error'),        // pode não existir; tratamos com "?"
  questionText: document.getElementById('question-text'),
  menuTitle: document.getElementById('menu-title'),
  menuRange: document.getElementById('menu-range'),
  langLabel: document.getElementById('lang-label'),
  langSelect: document.getElementById('lang-select'),
};

// Textos da interface por idioma
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
        comingSoon: "Coming soon",
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
        comingSoon: "Em breve",
      };
}

function updateUIStrings() {
  const tt = t();
  if (els.menuTitle) els.menuTitle.textContent = tt.select;
  if (els.menuRange) els.menuRange.textContent = '(1–450)'; // faixa fixa na página inicial
  if (els.headerSubtitle) els.headerSubtitle.textContent = tt.subtitle;
  if (els.backBtn) els.backBtn.textContent = tt.back;
  if (els.langLabel) els.langLabel.textContent = tt.lang;
}

// Converte 1 questão crua → formato interno para renderização
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

// Carrega o JSON das questões
async function loadQuestions() {
  // "v" ajuda a forçar o navegador a baixar de novo se você atualizar o arquivo
  const res = await fetch('./questions.json?v=1');
  if (!res.ok) throw new Error('Falha ao carregar questions.json');
  rawQuestions = await res.json();

  // Validação leve (opcional)
  if (!Array.isArray(rawQuestions)) {
    throw new Error('questions.json inválido: esperado um array');
  }
}

// Mostra a tela de seleção: 1..450 botões; habilita só até o número de questões existentes
function showStartPage() {
  els.loginPage?.classList.add('hidden'); // caso exista, fica escondido
  els.quizArea.classList.add('hidden');
  els.startPage.classList.remove('hidden');
  els.feedbackContainer.classList.add('hidden');
  els.backBtn.classList.add('hidden');
  currentQuestionIndex = -1;

  els.menuOptions.innerHTML = '';

  const totalButtons = 450;               // sempre mostra 1..450
  const available = rawQuestions.length;  // quantas existem de fato no JSON
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
  // Na página inicial, queremos exibir a faixa fixa (1–450)
  if (els.menuRange) els.menuRange.textContent = '(1–450)';
}

// Carrega e exibe uma questão
function loadQuestion(index) {
  currentQuestionIndex = index;
  const currentRaw = rawQuestions[index];
  if (!currentRaw) {
    // Se por algum motivo não existir, volta ao menu
    showStartPage();
    return;
  }

  const currentQuiz = qToInternal(currentRaw);

  els.startPage.classList.add('hidden');
  els.quizArea.classList.remove('hidden');

  els.questionText.textContent = currentQuiz.question;
  els.optionsContainer.innerHTML = '';
  els.feedbackContainer.classList.add('hidden');
  els.backBtn.classList.add('hidden');

  // Embaralha alternativas ao exibir
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

// Trata o clique em uma alternativa
function checkAnswer(selectedButton, selectedOption, allOptions) {
  if (currentQuestionIndex !== -1) {
    answeredQuestions.add(currentQuestionIndex);
  }

  // Desabilita todas as alternativas
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

    // Destaca a correta
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
  els.backBtn.classList.remove('hidden');
}

// Voltar ao menu
els.backBtn?.addEventListener('click', showStartPage);

// (Opcional) Se você mantiver a tela de login no HTML e quiser usá-la,
// pode habilitar esta função e o botão de login:
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

// Seleção de idioma
els.langSelect?.addEventListener('change', (e) => {
  currentLang = e.target.value;
  // Se estiver no menu, só atualiza labels; se estiver em uma pergunta, recarrega a questão no novo idioma
  if (!els.startPage.classList.contains('hidden')) {
    updateUIStrings();
  } else if (!els.quizArea.classList.contains('hidden') && currentQuestionIndex >= 0) {
    loadQuestion(currentQuestionIndex);
  }
});

// Inicialização — carrega o JSON e abre o menu diretamente (sem tela de login)
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadQuestions();
    updateUIStrings();
    showStartPage(); // Mostra 1..450 com habilitadas até o total de questões no JSON
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
