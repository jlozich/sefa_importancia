document.addEventListener("DOMContentLoaded", async () => {
  // Inicializar cliente Supabase
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // Elementos da UI
  const authCard = document.getElementById("authCard");
  const appSection = document.getElementById("app");
  const userEmail = document.getElementById("userEmail");
  const discContainer = document.getElementById("discContainer");
  const overallBar = document.getElementById("overallBar");
  const overallPct = document.getElementById("overallPct");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const btnLogin = document.getElementById("btnLogin");
  const btnSignup = document.getElementById("btnSignup");
  const btnLogout = document.getElementById("btnLogout");

  let currentUser = null;

  // =============== CARREGAR EDITAL JSON LOCAL ===============
  async function carregarEdital() {
    try {
      const r = await fetch("edital_auditor.json");
      return await r.json();
    } catch (e) {
      console.error("Erro ao carregar edital JSON:", e);
      return null;
    }
  }

  const edital = await carregarEdital();
  if (!edital) {
    discContainer.textContent = "Erro: não foi possível carregar o edital.";
    return;
  }

  // =============== RENDERIZAR DISCIPLINAS E TÓPICOS ===============
  async function renderUI(user) {
    discContainer.innerHTML = "";

    let totalTopicos = 0;
    let totalEstudados = 0;

    for (const d of edital.disciplinas) {
      let bloco = `<div class="card section"><div class="disc-head"><strong>${d.nome}</strong></div>`;

      if (d.subsecoes) {
        for (const s of d.subsecoes) {
          bloco += `<div class="group"><h3>${s.nome}</h3><ul class="topics">`;
          for (const t of s.topicos) {
            totalTopicos++;
            const { data } = await sb
              .from("estudo")
              .select("estudado")
              .eq("user_id", user.id)
              .eq("topico", t)
              .single();

            const estudado = data?.estudado === true;
            if (estudado) totalEstudados++;

            bloco += `<li class="topic ${estudado ? "done" : ""}" data-topico="${t}">
                        <span class="text">${t}</span>
                      </li>`;
          }
          bloco += `</ul></div>`;
        }
      } else if (d.topicos) {
        bloco += `<ul class="topics">`;
        for (const t of d.topicos) {
          totalTopicos++;
          const { data } = await sb
            .from("estudo")
            .select("estudado")
            .eq("user_id", user.id)
            .eq("topico", t)
            .single();

          const estudado = data?.estudado === true;
          if (estudado) totalEstudados++;

          bloco += `<li class="topic ${estudado ? "done" : ""}" data-topico="${t}">
                      <span class="text">${t}</span>
                    </li>`;
        }
        bloco += `</ul>`;
      }

      bloco += `</div></div>`;
      discContainer.innerHTML += bloco;
    }

    const pct = totalTopicos ? Math.round((totalEstudados / totalTopicos) * 100) : 0;
    overallBar.style.width = pct + "%";
    overallPct.textContent = pct;
  }

  // =============== LOGIN ===============
  btnLogin.onclick = async () => {
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value.trim()
    });

    if (error) {
      console.error("Erro login Supabase:", error);
      alert("Erro 400: usuário ou senha inválidos, ou projeto mal configurado.");
      return;
    }

    currentUser = data.user;
    userEmail.textContent = currentUser.email;
    authCard.classList.add("hide");
    appSection.classList.remove("hide");
    btnLogout.classList.remove("hide");

    await renderUI(currentUser);
  };

  // =============== SIGNUP ===============
  btnSignup.onclick = async () => {
    const { error } = await sb.auth.signUp({
      email: email.value.trim(),
      password: password.value.trim()
    });
    if (error) alert("Erro ao criar conta: " + error.message);
    else alert("Conta criada! Confirme seu e-mail antes de entrar.");
  };

  // =============== MARCAR ESTUDO AO CLICAR ===============
  document.addEventListener("click", async (e) => {
    const item = e.target.closest(".topic");
    if (!item || !currentUser) return;

    const topico = item.getAttribute("data-topico");
    const novoEstado = !item.classList.contains("done");

    try {
      const { error } = await sb.from("estudo").upsert({
        user_id: currentUser.id,
        topico: topico,
        estudado: novoEstado
      });

      if (!error) {
        item.classList.toggle("done", novoEstado);
        atualizarProgresso();
      }
    } catch (err) {
      console.error("Erro ao salvar tópico estudado:", err);
    }
  });

  function atualizarProgresso() {
    const feitos = document.querySelectorAll(".topic.done").length;
    const total = document.querySelectorAll(".topic").length;
    const pct = total ? Math.round((feitos / total) * 100) : 0;
    overallBar.style.width = pct + "%";
    overallPct.textContent = pct;
  }

  // Logout apenas recarrega a página
  btnLogout.onclick = () => location.reload();

  // Auto-login se sessão ativa
  const sess = await sb.auth.getSession();
  if (sess.data.session?.user) {
    currentUser = sess.data.session.user;
    userEmail.textContent = currentUser.email;
    authCard.classList.add("hide");
    appSection.classList.remove("hide");
    btnLogout.classList.remove("hide");
    await renderUI(currentUser);
  }
});
