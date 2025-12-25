// ================= SUPABASE INIT =================
document.addEventListener("DOMContentLoaded", async () => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window;

  const authErr = document.getElementById("authErr");
  const authCard = document.getElementById("authCard");
  const appSection = document.getElementById("app");
  const userEmail = document.getElementById("userEmail");
  const discContainer = document.getElementById("discContainer");
  const overallBar = document.getElementById("overallBar");
  const overallPct = document.getElementById("overallPct");

  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btnLogin = document.getElementById("btnLogin");
  const btnSignup = document.getElementById("btnSignup");
  const btnLogout = document.getElementById("btnLogout");

  let currentUser = null;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    authErr.textContent = "Erro: chaves do Supabase não carregadas.";
    authErr.classList.remove("hide");
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ================= FUNÇÕES =================
  async function loadConteudo(user) {
    try {
      const { data, error } = await sb
        .from("disciplinas")
        .select("nome, user_id")
        .eq("user_id", user.id);

      if (error) {
        discContainer.textContent = "Erro ao carregar dados.";
        return;
      }

      if (!data || data.length === 0) {
        discContainer.textContent = "Nenhum assunto encontrado.";
        return;
      }

      discContainer.innerHTML = data.map(d =>
        `<div class="card section"><strong>${d.nome}</strong></div>`
      ).join("");

    } catch {
      discContainer.textContent = "Falha ao carregar conteúdos.";
    }
  }

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
      userEmail.textContent = "";
    }
  }

  function updateProgresso() {
    const done = document.querySelectorAll(".topic.done").length;
    const total = document.querySelectorAll(".topic").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    overallBar.style.width = pct + "%";
    overallPct.textContent = pct;
  }

  // ================= EVENTOS =================
  btnLogin.onclick = async () => {
    const { data, error } = await sb.auth.signInWithPassword({
      email: emailEl.value.trim(),
      password: passEl.value.trim()
    });

    if (error) {
      authErr.textContent = "Credenciais inválidas ou usuário não confirmado.";
      authErr.classList.remove("hide");
    } else {
      authErr.classList.add("hide");
      await setUser(data.user);
    }
  };

  btnSignup.onclick = async () => {
    const { error } = await sb.auth.signUp({
      email: emailEl.value.trim(),
      password: passEl.value.trim()
    });
    if (error) {
      authErr.textContent = "Erro ao criar conta.";
      authErr.classList.remove("hide");
    } else {
      authErr.textContent = "Conta criada! Confirme o e-mail antes de entrar.";
      authErr.classList.remove("hide");
    }
  };

  btnLogout.onclick = async () => {
    await sb.auth.signOut();
    await setUser(null);
  };

  const sess = await sb.auth.getSession();
  await setUser(sess.data.session?.user);

  sb.auth.onAuthStateChange((_e, s) => setUser(s?.user));

  document.addEventListener("click", e => {
    const t = e.target.closest(".topic");
    if (t) {
      t.classList.toggle("done");
      updateProgresso();
    }
  });
});
