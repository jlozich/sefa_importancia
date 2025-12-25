const sb = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const btnLogin = document.getElementById("btnLogin");
const btnSignup = document.getElementById("btnSignup");
const btnLogout = document.getElementById("btnLogout");
const authCard = document.getElementById("authCard");
const appSection = document.getElementById("app");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const authErr = document.getElementById("authErr");
const userEmail = document.getElementById("userEmail");
const discContainer = document.getElementById("discContainer");
const overallBar = document.getElementById("overallBar");
const overallPct = document.getElementById("overallPct");

let currentUser = null;

// Carregar assuntos após login
async function loadConteudo(user) {
  const { data, error } = await sb
    .from("disciplinas")
    .select("*")
    .eq("user_id", user.id);

  if (error || !data) {
    discContainer.textContent = "Erro ao carregar conteúdos.";
    return;
  }

  if (data.length === 0) {
    discContainer.textContent = "Nenhum assunto cadastrado.";
    return;
  }

  discContainer.innerHTML = data.map(d =>
    `<div class="card section"><strong>${d.nome}</strong></div>`
  ).join("");
}

// Alternar seções após login/logout
async function setUser(user) {
  currentUser = user;

  if (user) {
    userEmail.textContent = user.email;
    authCard.classList.add("hide");
    appSection.classList.remove("hide");
    btnLogout.classList.remove("hide");

    await loadConteudo(user);
  } else {
    authCard.classList.remove("hide");
    appSection.classList.add("hide");
    btnLogout.classList.add("hide");
    discContainer.innerHTML = "";
  }
}

// Login
btnLogin.onclick = async () => {
  const { error, data } = await sb.auth.signInWithPassword({
    email: emailEl.value,
    password: passEl.value
  });

  if (error) authErr.textContent = error.message;
  else await setUser(data.user);
};

// Criar conta
btnSignup.onclick = async () => {
  const { error } = await sb.auth.signUp({
    email: emailEl.value,
    password: passEl.value
  });

  if (error) authErr.textContent = error.message;
};

// Logout
btnLogout.onclick = async () => {
  await sb.auth.signOut();
  await setUser(null);
};

// Iniciar sessão se já estiver logado
sb.auth.getSession().then(r => setUser(r.data.session?.user));
sb.auth.onAuthStateChange((_e, s) => setUser(s?.user));
// Atualizar progresso geral
function updateProgresso() {
  if (!currentUser) return;

  const items = document.querySelectorAll(".topic.done").length;
  const total = document.querySelectorAll(".topic").length;
  const pct = total ? Math.round((items / total) * 100) : 0;

  overallBar.style.width = pct + "%";
  overallPct.textContent = pct;
}

document.addEventListener("click", e => {
  if (e.target.closest(".topic")) {
    e.target.closest(".topic").classList.toggle("done");
    e.target.closest(".topic").classList.toggle("topic done");
    updateProgresso();
    updateProgresso();
  }
});

