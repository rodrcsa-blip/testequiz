// Caminho do JSON
const QUESTIONS_URL = "./questions.json";

// Estado global
let allQuestions = [];          // array de objetos (cada item tem id + q/en/pt + etc)
let availableIds = new Set();   // ids existentes no JSON
let currentLanguage = "pt";
let currentQuestionIndex = -1;  // índice dentro de allQuestions (não é o id)
const answeredQuestions = new Set(); // ids já respondidos (para desabilitar no menu)

// Referências de elementos
const loginPage = document.getElementById("login-page");
const startPage = document.getElementById("start-page");
const quizArea = document.getElementById("quiz-area");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const loginError = document.getElementById("login-error");
const headerSubtitle = document.getElementById("header-subtitle");

const menuOptions = document.getElementById("menu-options");
const languageSelectMenu = document.getElementById("language-select-menu");
const languageSelectQuestion = document.getElementById("language-select-question");

const questionNumber = document.getElementById("question-number");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const feedbackContainer = document.getElementById("feedback-container");
const feedbackTitle = document.getElementById("feedback-title");
const feedbackRationale = document.getElementById("feedback-rationale");
const backToMenuButton = document.getElementById("back-to-menu-button");
const trapContainer = document.getElementById("trap-container");

// --------------------- Inicialização ---------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Mostra login primeiro
  loginPage.classList.remove("hidden");
  startPage.classList.add("hidden");
  quizArea.classList.add("hidden");

  // Eventos
  loginButton.addEventListener("click", handleLogin);
  languageSelectMenu.addEventListener("change", (e) => {
    currentLanguage = e.target.value;
    if (quizArea.classList.contains("hidden")) {
      renderMenu(); // só refaz o menu se estiver no menu
    } else {
      // dentro da pergunta: sincroniza o seletor de idioma local
      languageSelectQuestion.value = currentLanguage;
      renderQuestion();
    }
  });
  languageSelectQuestion.addEventListener("change", (e) => {
    currentLanguage = e.target.value;
    languageSelectMenu.value = currentLanguage;
    renderQuestion();
  });
  backToMenuButton.addEventListener("click", showStartPage);

  // Carrega perguntas
  await loadQuestions();
});

// --------------------- Login ---------------------
function handleLogin() {
  const username = (usernameInput.value || "").trim();
  // senha pode ser qualquer coisa; só valida o nome
  if (!username) {
    loginError.classList.remove("hidden");
    return;
  }
  loginError.classList.add("hidden");
  headerSubtitle.textContent =
    "Selecione uma pergunta para testar seus conhecimentos.";

  showStartPage();
}

function showStartPage() {
  quizArea.classList.add("hidden");
  startPage.classList.remove("hidden");
  loginPage.classList.add("hidden");
  renderMenu();
}

// --------------------- Carregamento do JSON ---------------------
async function loadQuestions() {
  try {
    const resp = await fetch(QUESTIONS_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Aceita tanto {questions:[...]} quanto um array direto
    allQuestions = Array.isArray(data) ? data : data.questions || [];
    allQuestions.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

    availableIds = new Set(allQuestions.map((q) => q.id));
  } catch (err) {
    console.error("Erro ao carregar as perguntas:", err);
    alert("Erro ao carregar as perguntas. Verifique o questions.json.");
  }
}

// --------------------- Menu (1–450) ---------------------
function renderMenu() {
  menuOptions.innerHTML = "";
  const TOTAL_BUTTONS = 450;

  for (let i = 1; i <= TOTAL_BUTTONS; i++) {
    const btn = document.createElement("button");
    btn.textContent = i.toString();
    btn.className =
      "menu-item-button py-2 text-center text-sm font-semibold rounded-lg shadow-sm " +
      "focus:outline-none focus:ring-4 disabled:cursor-not-allowed";

    const isAvailable = availableIds.has(i);
    const isAnswered = answeredQuestions.has(i);

    if (isAvailable) {
      if (isAnswered) {
        btn.classList.add("bg-gray-400", "text-white", "shadow-inner");
        btn.disabled = true;
      } else {
        btn.classList.add(
          "bg-purple-600",
          "text-white",
          "hover:bg-purple-700",
          "focus:ring-purple-300"
        );
        btn.addEventListener("click", () => openQuestionById(i));
      }
    } else {
      btn.classList.add("bg-gray-200", "text-gray-500", "shadow-inner");
      btn.disabled = true;
    }

    menuOptions.appendChild(btn);
  }
}

// --------------------- Abrir Pergunta ---------------------
function openQuestionById(id) {
  const idx = allQuestions.findIndex((q) => q.id === id);
  if (idx === -1) return;

  currentQuestionIndex = idx;

  startPage.classList.add("hidden");
  quizArea.classList.remove("hidden");

  // Botão “voltar ao menu” já visível ao abrir a pergunta
  backToMenuButton.classList.remove("hidden");

  renderQuestion();
}

// --------------------- Render da Pergunta ---------------------
function renderQuestion() {
  feedbackContainer.classList.add("hidden");
  feedbackTitle.textContent = "";
  feedbackRationale.textContent = "";
  trapContainer.innerHTML = ""; // limpa trap anterior
  optionsContainer.innerHTML = "";

  const q = allQuestions[currentQuestionIndex];
  if (!q) return;

  // Número da pergunta (id)
  questionNumber.textContent = `#${q.id}`;

  // Se for TRAP
  if (q.trap === "phishing") {
    // Texto centralizado e imagem centralizada
    const wrap = document.createElement("div");
    wrap.className =
      "mt-4 p-6 rounded-xl border text-center bg-red-50 border-red-200";

    const msg = document.createElement("p");
    msg.className = "font-bold text-red-700 text-lg";
    msg.textContent = q.trapMessage?.[currentLanguage] || q.trapMessage?.pt || "TRAP!";

    const img = document.createElement("img");
    img.src = q.image;
    img.alt = "Trap image";
    img.className = "mx-auto mt-4 max-h-64 object-contain";

    wrap.appendChild(msg);
    wrap.appendChild(img);

    trapContainer.appendChild(wrap);

    // marca como “respondida” ao clicar no botão do menu (não aqui),
    // mas como é trap, desabilitamos no menu ao voltar:
    answeredQuestions.add(q.id);
    return;
  }

  // Pergunta normal
  const text = q.q?.[currentLanguage] || q.q?.pt || "";
  questionText.textContent = text;

  // Opções (na língua)
  const opts = q.options?.[currentLanguage] || q.options?.pt || [];
  const rationales =
    q.rationales?.[currentLanguage] || q.rationales?.pt || [];
  const correctIndex = Number(q.correctIndex ?? -1);

  opts.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.textContent = optText;
    btn.className =
      "answer-button w-full text-left p-4 border border-gray-300 rounded-lg " +
      "hover:bg-purple-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500";
    btn.addEventListener("click", () =>
      checkAnswer(btn, idx, correctIndex, rationales)
    );
    optionsContainer.appendChild(btn);
  });
}

// --------------------- Checar Resposta ---------------------
function checkAnswer(selectedBtn, selectedIndex, correctIndex, rationales) {
  const q = allQuestions[currentQuestionIndex];
  if (!q) return;

  // marca como respondida no menu
  answeredQuestions.add(q.id);

  // desabilita todas as opções
  const all = optionsContainer.querySelectorAll(".answer-button");
  all.forEach((b) => {
    b.disabled = true;
    b.classList.remove("hover:bg-purple-50");
  });

  // pinta correto/incorreto
  if (selectedIndex === correctIndex) {
    selectedBtn.classList.remove("border-gray-300");
    selectedBtn.classList.add(
      "bg-green-100",
      "border-green-500",
      "text-green-800",
      "font-semibold"
    );
    feedbackContainer.className =
      "mt-6 p-4 rounded-lg border-l-4 bg-green-50 border-green-500";
    feedbackTitle.textContent = "Correto!";
    feedbackTitle.className = "text-lg font-bold text-green-700";
    feedbackRationale.textContent =
      rationales?.[correctIndex] || "Boa!";
  } else {
    selectedBtn.classList.remove("border-gray-300");
    selectedBtn.classList.add(
      "bg-red-100",
      "border-red-500",
      "text-red-800",
      "font-semibold"
    );

    // destaca a correta
    const correctBtn = all[correctIndex];
    if (correctBtn) {
      correctBtn.classList.add(
        "bg-green-100",
        "border-green-500",
        "text-green-800",
        "font-semibold"
      );
    }

    feedbackContainer.className =
      "mt-6 p-4 rounded-lg border-l-4 bg-red-50 border-red-500";
    feedbackTitle.textContent = "Incorreto. Revise a justificativa:";
    feedbackTitle.className = "text-lg font-bold text-red-700";
    feedbackRationale.textContent =
      rationales?.[selectedIndex] || "Veja a alternativa correta destacada.";
  }

  feedbackContainer.classList.remove("hidden");
}
