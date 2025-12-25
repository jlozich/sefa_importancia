document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_SERVICE_KEY);

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

  const USER_UUID = "e98f4067-8f32-4596-8fe5-7a673136217f";

  let editalJSON = null;
  let renderEmAndamento = false;

  async function carregarEdital() {
    try {
      const r = await fetch("edital_auditor.json");
      if (!r.ok) throw new Error("Erro HTTP: " + r.status);
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
    if (overallPct) overallPct.textContent = pct + "%";
  }

  async function salvarMarcacao(topico, estado) {
    try {
      const { error } = await supabase
        .from("estudo")
        .upsert({ user_id: USER_UUID, topico, estudado: estado });

      if (error?.code === "23505") {
        console.warn("Registro já existe, atualizando...");
      } else if (error) {
        console.error("Erro ao salvar marcação:", error);
      }
    } catch (e) {
      console.error("Erro inesperado ao salvar:", e);
    }
  }

  async function marcarTopico(el, estado) {
    const topico = el.getAttribute("data-topico");
    el.classList.toggle("done", estado);
    await salvarMarcacao(topico, estado);
    atualizarProgresso();
  }

  async function carregarMarcadosDoBanco() {
    try {
      const { data, error } = await supabase
        .from("estudo")
        .select("topico, estudado")
        .eq("user_id", USER_UUID);

      if (error) {
        console.error("Erro ao restaurar marcações:", error);
        return;
      }

      for (const r of data || []) {
        const el = document.querySelector(`.topic[data-topico="${CSS.escape(r.topico)}"]`);
        if (!el) continue;
        r.estudado ? el.classList.add("done") : el.classList.remove("done");
        const cb = el.querySelector("input[type='checkbox']");
        if (cb) cb.checked = r.estudado;
      }

      atualizarProgresso();
    } catch (e) {
      console.error("Erro inesperado ao carregar marcados:", e);
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
              bloco += `<li class="topic ${t.estudado ? "done" : ""}" data-topico="${t}">${t}</li>`;
            }
            bloco += `</ul>`;
          }
        } else if (disc.topicos) {
          bloco += `<ul class="topics">`;
          for (const t of disc.topicos) {
            bloco += `<li class="topic ${t.estudado ? "done" : ""}" data-topico="${t}">${t}</li>`;
          }
          bloco += `</ul>`;
        }

        bloco += `</div>`;
        discContainer.innerHTML += bloco;
      }

      injetarCheckboxes();
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
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passInput.value.trim()
    });

    if (error && authErr) {
      authErr.textContent = "Erro ao fazer login.";
      authErr.classList.remove("hide");
      return;
    }

    emailLabel.textContent = emailInput.value.trim();
    authCard.style.display = "none";
    appSection.style.display = "block";

    editalJSON = await carregarEdital();
    if (editalJSON) {
      await renderChecklist(editalJSON);
      atualizarProgresso();
      await carregarMarcadosDoBanco();
    }
  });

  // SIGNUP
  btnSignup.addEventListener("click", async () => {
    const { error } = await supabase.auth.signUp({
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

  // AUTO-LOGIN SESSION
  const s = await supabase.auth.getSession();
  if (s.data.session?.user) {
    emailLabel.textContent = s.data.session.user.email;
    authCard.style.display = "none";
    appSection.style.display = "block";
    editalJSON = await carregarEdital();
    if (editalJSON) await renderChecklist(editalJSON);
  }
});
