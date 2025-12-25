document.addEventListener("DOMContentLoaded", async () => {
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  const authCard = document.getElementById("authCard");
  const appSection = document.getElementById("app");
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

  let usuarioAtual = null;
  let editalJSON = null;
  let renderEmAndamento = false;

  async function carregarEdital() {
    try {
      const r = await fetch("edital_auditor.json");
      if (!r.ok) throw new Error("Falha ao carregar JSON: " + r.status);
      return await r.json();
    } catch (e) {
      console.error("Erro ao carregar edital:", e);
      if (discContainer) discContainer.textContent = "Erro ao carregar edital.";
      return null;
    }
  }

  function injetarCheckboxes() {
    document.querySelectorAll(".topic").forEach(li => {
      if (!li.querySelector("input[type='checkbox']")) {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "mr-2";
        cb.checked = li.classList.contains("done");
        cb.addEventListener("change", () => marcarTopico(li, cb.checked));
        li.prepend(cb);
      }
    });
  }

  function atualizarProgresso() {
    const marcados = document.querySelectorAll(".topic.done").length;
    const total = document.querySelectorAll(".topic").length;
    const pct = total ? Math.round((marcados / total) * 100) : 0;
    if (overallBar) overallBar.style.width = pct + "%";
    if (overallPct) overallPct.textContent = pct;
  }

  async function salvarMarcacao(topico, estado) {
    if (!usuarioAtual) return;
    try {
      await sb.from("estudo").upsert({
        user_id: usuarioAtual.id,
        topico,
        estudado: estado
      });
    } catch (e) {
      console.error("Erro ao salvar marcação:", e);
    }
  }

  async function marcarTopico(el, estado) {
    const topico = el.getAttribute("data-topico");
    el.classList.toggle("done", estado);
    await salvarMarcado(topico, estado);
    atualizarProgresso();
  }

  async function carregarMarcadosDoBanco() {
    if (!usuarioAtual) return;
    try {
      const { data } = await sb.from("estudo")
        .select("topico, estudado")
        .eq("user_id", usuarioAtual.id);
      for (const r of data || []) {
        const el = document.querySelector(`.topic[data-topico="${CSS.escape(r.topico)}"]`);
        if (el && r.estudado) el.classList.add("done");
        else if (el) el.classList.remove("done");
      }
    } catch (e) {
      console.error("Erro ao carregar tópicos marcados:", e);
    }
  }

  async function renderChecklist(edital) {
    if (renderEmAndamento || !discContainer) return;
    renderEmAndamento = true;

    try {
      discContainer.innerHTML = "";

      for (const disc of edital.disciplinas) {
        let bloco = `<div class="card section"><h2>${disc.nome}</h2>`;

        if (disc.subsecoes) {
          for (const sub of disc.subsecoes) {
            bloco += `<h3>${sub.nome}</h3><ul class="topics">`;
            for (const t of sub.topicos) {
              bloco += `<li class="topic" data-topico="${t}">${t}</li>`;
            }
            bloco += `</ul>`;
          }
        } else if (disc.topicos) {
          bloco += `<ul class="topics">`;
          for (const t of disc.topicos) {
            bloco += `<li class="topic" data-topico="${t}">${t}</li>`;
          }
          bloco += `</ul>`;
        }

        bloco += `</div>`;
        discContainer.innerHTML += bloco;
      }

      // Agora que o DOM foi criado, injeta checkboxes
      injetarCheckboxes();

      // Restaura estado do banco
      await carregarMarcadosDoBanco();
      atualizarProgresso();
    } catch (e) {
      console.error("Erro ao renderizar checklist:", e);
    } finally {
      renderEmAndamento = false;
    }
  }

  // LOGIN
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

    usuarioAtual = data.user;
    emailLabel.textContent = usuarioAtual.email;

    authCard.style.display = "none";
    appSection.style.display = "block";

    editalJSON = await carregarEdital();
    if (editalJSON) {
      await renderChecklist(editalJSON);
    }
  });

  // SIGNUP
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

  // LOGOUT
  btnLogout.addEventListener("click", () => location.reload());

  // AUTO-SESSION
  const s = await sb.auth.getSession();
  if (s.data.session?.user) {
    usuarioAtual = s.data.session.user;
    emailLabel.textContent = usuarioAtual.email;
    authCard.style.display = "none";
    appSection.style.display = "block";
    editalJSON = await carregarEdital();
    if (editalJSON) await renderChecklist(editalJSON);
  }
});
