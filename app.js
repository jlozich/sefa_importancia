document.addEventListener("DOMContentLoaded", async () => {
  // Inicializar Supabase
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // Elementos da UI (declarados 1 única vez)
  const authCard = document.getElementById("authCard");
  const appSection = document.getElementById("app");
  const userEmailEl = document.getElementById("userEmail");
  const discContainer = document.getElementById("discContainer");
  const overallBar = document.getElementById("overallBar");
  const overallPct = document.getElementById("overallPct");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("password");
  const btnLogin = document.getElementById("btnLogin");
  const btnSignup = document.getElementById("btnSignup");
  const btnLogout = document.getElementById("btnLogout");
  const errEl = document.getElementById("authErr");

  let currentUser = null;

  // Carregar JSON do edital
  async function carregarEdital() {
    try {
      const r = await fetch("edital_auditor.json");
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      console.error("Erro ao carregar JSON:", e);
      return null;
    }
  }

  const edital = await carregarEdital();
  if (!edital) {
    discContainer.textContent = "Falha ao carregar edital.";
    return;
  }

  // Renderizar todas as matérias e tópicos do JSON
  async function renderUI(user) {
    discContainer.innerHTML = "";

    let total = 0;
    let feitos = 0;

    for (const d of edital.disciplinas) {
      let bloco = `<div class="card section"><h2>${d.nome}</h>`;
      
      if (d.subsecoes) {
        for (const s of d.subsecoes) {
          bloco += `<h3>${s.nome}</h3><ul class="topics">`;
          for (const t of s.topicos) {
            total++;
            bloco += `<li class="topic" data-topico="${t}">${t}</li>`;
          }
          bloco += `</ul>`;
        }
      } else if (d.topicos) {
        bloco += `<ul class="topics">`;
        for (const t of d.topicos) {
          total++;
          bloco += `<li class="topic" data-topico="${t}">${t}</li>`;
        }
        bloco += `</ul>`;
      }

      bloco += `</div>`;
      discContainer.innerHTML += bloco;
    }

    // Calcular progresso geral
    const pct = total ? Math.round((feitos / total) * 100) : 0;
    overallBar.style.width = pct + "%";
    overallPct.textContent = pct;
  }

  // Login
  btnLogin.onclick = async () => {
    errEl.classList.add("hide");
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passInput.value.trim()
      });

      if (error) {
        errEl.textContent = "Falha no login.";
        errEl.classList.remove("hide");
        return;
      }

      currentUser = data.user;
      currentUser = data.user;
      userEmailEl.textContent = currentUser.email;
      authCard.classList.add("hide");
      appSection.classList.remove("hide");
      btnLogout.classList.remove("hide");

      await renderUI(currentUser);
    } catch (e) {
      errEl.textContent = "Erro inesperado no login.";
      errEl.classList.remove("hide");
      console.error(e);
    }
  };

  // Signup
  btnSignup.onclick = async () => {
    try {
      const { error } = await sb.auth.signUp({
        email: emailInput.value.trim(),
        password: passInput.value.trim()
      });
      if (error) alert(error.message);
      else alert("Conta criada. Confirme o e-mail antes de entrar.");
    } catch (e) {
      alert("Falha ao criar conta.");
      console.error(e);
    }
  };

  // Marcar estudo ao clicar e salvar no banco
  document.addEventListener("click", async (e) => {
    const item = e.target.closest(".topic");
    if (!item || !currentUser) return;

    const topico = item.getAttribute("data-topico");
    const novoEstado = !item.classList.contains("done");

    try {
      const { error } = await sb.from("estudo").upsert({
        user_id: currentUser.id,
        topico,
        estudado: novoEstado
      });

      if (!error) {
        item.classList.toggle("done", novoEstado);
        atualizarProgresso();
      }
    } catch (err) {
      console.error("Erro ao salvar estudo:", err);
    }
  });

  function atualizarProgresso() {
    const feitos = document.querySelectorAll(".topic.done").length;
    const total = document.querySelectorAll(".topic").length;
    const pct = total ? Math.round((feitos / total) * 100) : 0;
    overallBar.style.width = pct + "%";
    overallPct.textContent = pct;
  }

  // Logout recarrega
  btnLogout.onclick = () => location.reload();

  // Auto-login se sessão ativa
  const sess = await sb.auth.getSession();
  if (sess.data.session?.user) {
    currentUser = sess.data.session.user;
    userEmailEl.textContent = currentUser.email;
    authCard.classList.add("hide");
    appSection.classList.remove("hide");
    btnLogout.classList.remove("hide");
    await renderUI(currentUser);
  }
});
