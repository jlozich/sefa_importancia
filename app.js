const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
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

  async function carregarEdital() {
    try {
      const r = await fetch("edital_auditor.json");
      if (!r.ok) throw new Error("Erro HTTP: " + r.status);
      return await r.json();
    } catch (e) {
      console.error(e);
      discContainer.textContent = "Erro ao carregar edital.";
      return null;
    }
  }

  function atualizarProgresso() {
    const done = document.querySelectorAll(".topic input:checked").length;
    const total = document.querySelectorAll(".topic input[type='checkbox']").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    overallBar.style.width = pct + "%";
    overallPct.textContent = pct;
  }

  async function salvarMarcacao(topico, estado) {
    try {
      const { error } = await sb.from("estudo").upsert({
        user_id: USER_UUID,
        topico,
        estudado: estado
      });
      if (error) console.error(error);
    } catch (e) {
      console.error(e);
    }
  }

  async function carregarMarcados() {
    try {
      const { data, error } = await sb.from("estudo")
        .select("topico, estudado")
        .eq("user_id", USER_UUID);

      if (error) {
        console.error(error);
        return;
      }

      for (const r of data || []) {
        const cb = document.querySelector(`.topic[data-topico="${CSS.escape(r.topico)}"] input`);
        if (cb) cb.checked = r.estudado;
      }

      atualizarProgresso();
    } catch (e) {
      console.error(e);
    }
  }

  async function renderizar() {
    const edital = await carregarEdital();
    if (!edital) return;

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

    document.querySelectorAll(".topic").forEach(li => {
      const cb = li.querySelector("input");
      li.addEventListener("click", async (ev) => {
        if (ev.target !== cb) cb.checked = !cb.checked;
        await salvarMarcacao(li.getAttribute("data-topico"), cb.checked);
        atualizarProgresso();
      });
    });

    await carregarMarcados();
  }

  async function login() {
    const { data, error } = await sb.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passInput.value.trim()
    });

    if (error) {
      alert("Login falhou");
      return;
    }

    usuarioAtual = data.user;
    emailLabel.textContent = usuarioAtual.email;

    authCard.style.display = "none";
    appSection.style.display = "block";
    btnLogout.classList.remove("hide");

    await renderizar();
  }

  btnLogin.addEventListener("click", login);
  btnSignup.addEventListener("click", async () => {
    const { error } = await sb.auth.signUp({
      email: emailInput.value.trim(),
      password: passInput.value.trim()
    });
    if (error) alert("Erro ao criar conta");
  });

  btnLogout.addEventListener("click", () => location.reload());
  await renderizar();
});
