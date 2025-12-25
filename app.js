document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  const authCard = document.getElementById("authCard");
  const appSection = document.getElementById("app");
  const userEmailEl = document.getElementById("userEmail");
  const btnLogin = document.getElementById("btnLogin");
  const btnSignup = document.getElementById("btnSignup");
  const btnLogout = document.getElementById("btnLogout");
  const authErr = document.getElementById("authErr");

  const discContainer = document.getElementById("discContainer");
  const overallBar = document.getElementById("overallBar");
  const overallPct = document.getElementById("overallPct");

  let currentUser = null;
  let edital = null;

  async function carregarEdital() {
    try {
      const r = await fetch("edital_auditor.json");
      if (!r.ok) throw new Error("Erro HTTP: " + r.status);
      return await r.json();
    } catch (e) {
      console.error(e);
      discContainer.textContent = "Não foi possível carregar o edital.";
      return null;
    }
  }

  edital = await carregarEdital();
  if (!edital) return;

  function renderEdital() {
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
    atualizarProgresso();
  }

  async function salvarEstudo(topico, estado) {
    if (!currentUser) return;
    try {
      await supabase.from("estudo").upsert({
        user_id: currentUser.id,
        topico,
        estudado: estado
      });
    } catch (e) {
      console.error("Erro ao salvar estudo:", e);
    }
  }

  async function marcarTopico(item) {
    const topico = item.getAttribute("data-topico");
    const novoEstado = !item.classList.contains("done");
    item.classList.toggle("done", novoEstado);
    await salvarEstudo(topico, novoEstado);
    atualizarProgresso();
  }

  btnLogin.onclick = async () => {
    authErr.classList.add("hide");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      authErr.textContent = "Falha no login. Credenciais inválidas.";
      authErr.classList.remove("hide");
      return;
    }

    currentUser = data.user;
    currentUser.id = data.user.id;
    userEmailEl.textContent = currentUser.email;

    authCard.classList.add("hide");
    appSection.classList.remove("hide");

    renderEdital();
  };

  btnSignup.onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      authErr.textContent = "Erro ao criar conta.";
      authErr.classList.remove("hide");
    }
  };

  btnLogout.onclick = () => location.reload();

  document.addEventListener("click", (e) => {
    const topicEl = e.target.closest(".topic");
    if (topicEl) marcarTopico(topicEl);
  });

  async function renderMarcados() {
    if (!currentUser) return;
    try {
      const { data } = await supabase
        .from("estudo")
        .select("topico, estudado")
        .eq("user_id", currentUser.id);

      for (const r of data || []) {
        const el = document.querySelector(`.topic[data-topico="${CSS.escape(r.topico)}"]`);
        if (el && r.estudado) el.classList.add("done");
      }
      atualizarProgresso();
    } catch (e) {
      console.error("Erro ao carregar tópicos marcados:", e);
    }
  }

  function atualizarProgresso() {
    const feitos = document.querySelectorAll(".topic.done").length;
    const total = document.querySelectorAll(".topic").length;
    const pct = total ? Math.round((feitos / total) * 100) : 0;
    overallBar.style.width = pct + "%";
    overallPct.textContent = pct + "%";
  }

  async function renderEdital() {
    renderEdital();
    await renderMarcados();
  }

  const sess = await supabase.auth.getSession();
  if (sess.data.session?.user) {
    currentUser = sess.data.session.user;
    userEmailEl.textContent = currentUser.email;
    authCard.classList.add("hide");
    appSection.classList.remove("hide");
    renderEdital();
  }
});
