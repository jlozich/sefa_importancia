document.addEventListener("DOMContentLoaded", async () => {

  // Garante que a key foi carregada do config.js
  if (typeof window.SUPABASE_URL === "undefined" || typeof window.SUPABASE_ANON_KEY === "undefined") {
    console.error("Config do Supabase não carregada.");
    alert("Erro de configuração: chave não carregada.");
    return;
  }

  // Inicializa o cliente corretamente (única declaração!)
  const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  const authCard = document.getElementById("authCard");
  const appSection = document.getElementById("app");
  const emailLabel = document.getElementById("userEmail");
  const btnLogin = document.getElementById("btnLogin");
  const btnSignup = document.getElementById("btnSignup");
  const btnLogout = document.getElementById("btnLogout");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("password");
  const discContainer = document.getElementById("discContainer");
  const overallBar = document.getElementById("overallBar");
  const overallPct = document.getElementById("overallPct");

  const USER_UUID = "e98f4067-8f32-4596-8fe5-7a673136217f";

  function atualizarProgresso() {
    const done = document.querySelectorAll(".topic input:checked").length;
    const total = document.querySelectorAll(".topic input[type='checkbox']").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    if (overallBar) overallBar.style.width = pct + "%";
    if (overallPct) overallPct.textContent = pct;
  }

  async function salvarMarcacao(topico, estado) {
    try {
      const { error } = await sb.from("estudo").upsert({
        user_id: USER_UUID,
        topico,
        estudado: estado
      });
      if (error) console.error("Erro ao salvar:", error.message);
    } catch (e) {
      console.error("Erro inesperado:", e);
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

  async function carregarMarcados() {
    try {
      const { data, error } = await sb.from("estudo")
        .select("topico, estudado")
        .eq("user_id", USER_UUID);

      if (error) {
        console.error("Erro ao restaurar:", error.message);
        return;
      }

      for (const r of data || []) {
        const li = document.querySelector(`.topic[data-topico="${CSS.escape(r.topico)}"]`);
        const cb = li?.querySelector("input[type='checkbox']");
        if (cb) cb.checked = r.estudado;
        if (li) li.classList.toggle("done", r.estudado);
      }

      atualizarProgresso();
    } catch (e) {
      console.error("Erro carregarMarcados:", e);
    }
  }

  async function renderChecklist(edital) {
    if (!discContainer || !edital) return;
    discContainer.innerHTML = "";

    for (const d of edital.disciplinas) {
      let bloco = `<div class="card section"><h2>${d.nome}</h2>`;
      if (d.subsecoes) {
        for (const s of d.subsecoes) {
          bloco += `<h3>${s.nome}</h3><ul class="topics">`;
          for (const t of s.topicos) {
            bloco += `<li class="topic flex items-center" data-topico="${t}">
              <input type="checkbox" class="mr-2">
              <span>${t}</span>
            </li>`;
          }
          bloco += `</ul>`;
        }
      } else if (d.topicos) {
        bloco += `<ul class="topics">`;
        for (const t of d.topicos) {
          bloco += `<li class="topic flex items-center" data-topico="${t}">
            <input type="checkbox" class="mr-2">
            <span>${t}</span>
          </li>`;
        }
        bloco += `</ul>`;
      }
      bloco += `</div>`;
      discContainer.innerHTML += bloco;
    }

    injetarCheckboxes();
    await carregarMarcados();
  }

  async function login() {
    const { data, error } = await sb.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passInput.value.trim()
    });

    if (error) {
      console.error("Erro login:", error.message);
      alert("Login falhou. Confirme o e-mail e a senha.");
      return;
    }

    usuarioAtual = data.user;
    emailLabel.textContent = usuarioAtual.email;

    authCard.style.display = "none";
    appSection.style.display = "block";
    btnLogout.classList.remove("hide");

    const edital = await sb.from("disciplinas").select("*").limit(1);
    await renderChecklist(editalJSON);
  }

  btnLogin.addEventListener("click", login);
  btnSignup.addEventListener("click", async () => {
    const { error } = await sb.auth.signUp({
      email: emailInput.value.trim(),
      password: passInput.value.trim()
    });
    if (error) console.error("Erro signup:", error.message);
  });

  btnLogout.addEventListener("click", () => location.reload());

});
