document.addEventListener("DOMContentLoaded", async () => {
  // ============ SUPABASE ============
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // ============ ELEMENTOS DA UI ============
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
  const authErr = document.getElementById("authErr");

  let currentUser = null;

  // ============ CARREGAR EDITAL JSON ============
  async function carregarEdital() {
    try {
      const res = await fetch("edital_auditor.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      console.error("Falha ao carregar JSON:", e);
      return null;
    }
  }

  const edital = await carregarEdital();
  if (!edital) {
    discContainer.textContent = "Erro ao carregar edital.";
    return;
  }

  // ============ RENDERIZAR MATÉRIAS E TÓPICOS ============
  async function renderUI(user) {
    discContainer.innerHTML = "";
    let total = 0;
    let feitos = 0;

    for (const d of edital.disciplinas) {
      let bloco = `<div class="card section"><h2>${d.nome}</h2>`;

      if (d.subsecoes) {
        for (const s of d.subsecoes) {
          bloco += `<h3>${s.nome}</h3><ul class="topics">`;
          for (const t of s.topicos) {
            total++;
            const { data } = await sb
              .from("estudo")
              .select("estudado")
              .eq("user_id", user.id)
              .eq("topico", t)
              .single();

            const estudado = data?.estudado === true;
            if (estudado) feitos++;

            bloco += `<li class="topic ${estudado ? "done" : ""}" data-topico="${t}">${t}</li>`;
          }
          bloco += `</ul>`;
        }
      } else if (d.topicos) {
        bloco += `<ul class="topics">`;
        for (const t of d.topicos) {
          total++;
          const { data } = await sb
            .from("estudo")
            .select("estudado")
            .eq("user_id", user.id)
            .eq("topico", t)
            .single();

          const estudado = data?.estudado === true;
          if (estudado) feitos++;

          bloco += `<li class="topic ${estudado ? "done" : ""}" data-topico="${t}">${t}</li>`;
        }
        bloco += `</ul>`;
      }

      bloco += `</div>`;
      discContainer.innerHTML += bloco;
    }

    const pct = total ? Math.round((feitos / total) * 100) : 0;
    overallBar.style.width = pct + "%";
    overallPct.textContent = pct;
  }

  // ============ LOGIN ============
  btnLogin.onclick = async () => {
    authErr.classList.add("hide");
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passInput.value.trim()
      });

      if (error) {
        authErr.textContent = error.message;
        authErr.classList.remove("hide");
        return;
      }

      currentUser = data.user;
      userEmailEl.textContent = currentUser.email;
      authCard.classList.add("hide");
      appSection.classList.remove("hide");

      await renderUI(currentUser);
    } catch (e) {
      authErr.textContent = "Falha inesperada no login.";
      authErr.classList.remove("hide");
      console.error(e);
    }
  };

  // ============ SIGNUP ============
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

  // ============ MARCAR ESTUDO ============
  document.addEventListener("click", async (e) => {
    const item = e.target.closest(".topic");
    if (!item || !currentUser) return;

    const topico = item.getAttribute("data-topico");
    const novoEstado = !item.classList.contains("done");

    try {
      await sb.from("estudo").upsert({
        user_id: currentUser.id,
        topico,
        estudado: novoEstado
      });
      item.classList.toggle("done", novoEstado);
      atualizarProgresso();
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

  // ============ LOGOUT ============
  btnLogout.onclick = () => location.reload();

  // ============ AUTO LOGIN SE SESSÃO ATIVA ============
  const sess = await sb.auth.getSession();
  if (sess.data.session?.user) {
    currentUser = sess.data.session.user;
    userEmailEl.textContent = currentUser.email;
    authCard.classList.add("hide");
    appSection.classList.remove("hide");
    await renderUI(currentUser);
  }
});
