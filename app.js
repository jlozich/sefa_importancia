document.addEventListener("DOMContentLoaded", async () => {
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  const authCard = document.getElementById("authCard");
  const app = document.getElementById("app");
  const emailLabel = document.getElementById("userEmail");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("password");
  const btnLogin = document.getElementById("btnLogin");
  const btnSignup = document.getElementById("btnSignup");
  const btnLogout = document.getElementById("btnLogout");
  const authErr = document.getElementById("authErr");
  const discContainer = document.getElementById("discContainer");
  const overallBar = document.getElementById("overallBar");
  const overallPct = document.getElementById("overallPct");

  let usuario = null;
  let edital = null;

  async function carregarEdital() {
    try {
      const r = await fetch("edital_auditor.json");
      if (!r.ok) throw new Error("Falha ao carregar JSON");
      return await r.json();
    } catch (e) {
      console.error("Erro JSON:", e);
      if (discContainer) discContainer.textContent = "Erro ao carregar dados.";
      return null;
    }
  }

  function atualizarProgresso() {
    const marcados = document.querySelectorAll(".topic.done").length;
    const total = document.querySelectorAll(".topic").length;
    const pct = total ? Math.round((marcados / total) * 100) : 0;
    if (overallBar) overallBar.style.width = pct + "%";
    if (overallPct) overallPct.textContent = pct + "%";
  }

  async function salvar(topico, estado) {
    if (!usuario) return;
    try {
      await sb.from("estudo").upsert({
        user_id: usuario.id,
        topico,
        estudado: estado
      });
    } catch (e) {
      console.error("Erro salvar:", e);
    }
  }

  async function marcar(el) {
    const top = el.getAttribute("data-topico");
    const novo = !el.classList.contains("done");
    el.classList.toggle("done", novo);
    await salvar(top, novo);
    atualizarProgresso();
  }

  function renderizar() {
    if (!discContainer || !edital) return;
    discContainer.innerHTML = "";
    for (const d of edital.disciplinas) {
      let bloco = `<div class="card section"><h2>${d.nome}</h2>`;
      if (d.subsecoes) {
        for (const s of d.subsecoes) {
          bloco += `<h3>${s.nome}</h3><ul class="topics">`;
          for (const t of s.topicos) {
            bloco += `<li class="topic" data-topico="${t}">${t}</li>`;
          }
          bloco += `</ul>`;
        }
      } else if (d.topicos) {
        bloco += `<ul class="topics">`;
        for (const t of d.topicos) {
          bloco += `<li class="topic" data-topico="${t}">${t}</li>`;
        }
        bloco += `</ul>`;
      }
      bloco += `</div>`;
      discContainer.innerHTML += bloco;
    }
    document.querySelectorAll(".topic").forEach(el => {
      el.addEventListener("click", () => marcar(el));
    });
    atualizarProgresso();
    carregarMarcados();
  }

  async function carregarMarcados() {
    if (!usuario) return;
    try {
      const { data } = await sb.from("estudo")
        .select("topico, estudado")
        .eq("user_id", usuario.id);
      for (const r of data || []) {
        const el = document.querySelector(`.topic[data-topico="${CSS.escape(r.topico)}"]`);
        if (el && r.estudado) el.classList.add("done");
      }
      atualizarProgresso();
    } catch (e) {
      console.error("Erro carregar marcados:", e);
    }
  }

  btnLogin.addEventListener("click", async () => {
    if (authErr) authErr.classList.add("hide");
    const { data, error } = await sb.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passInput.value.trim()
    });
    if (error) {
      if (authErr) {
        authErr.textContent = "Login falhou.";
        authErr.classList.remove("hide");
      }
      return;
    }
    usuario = data.user;
    emailLabel.textContent = usuario.email;
    authCard.style.display = "none";
    app.style.display = "block";
    edital = await carregarEdital();
    if (edital) renderizar();
  });

  btnSignup.addEventListener("click", async () => {
    const { error } = await sb.auth.signUp({
      email: emailInput.value.trim(),
      password: passInput.value.trim()
    });
    if (error && authErr) {
      authErr.textContent = "Erro ao criar conta.";
      authErr.classList.remove("hide");
    }
  });

  btnLogout.addEventListener("click", () => location.reload());

  const s = await sb.auth.getSession();
  if (s.data.session?.user) {
    usuario = s.data.session.user;
    emailLabel.textContent = usuario.email;
    authCard.style.display = "none";
    app.style.display = "block";
    edital = await carregarEdital();
    if (edital) renderizar();
  }
});
