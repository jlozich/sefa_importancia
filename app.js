document.addEventListener("DOMContentLoaded", async () => {
  // Verificar configuração do Supabase
  if (typeof window.SUPABASE_URL === "undefined" || typeof window.SUPABASE_ANON_KEY === "undefined") {
    console.error("Config do Supabase não carregada.");
    alert("Erro de configuração: chave não carregada.");
    return;
  }

  // Inicializar cliente Supabase
  const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // Elementos do DOM
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
  const authErr = document.getElementById("authErr");

  let usuarioAtual = null;
  let editalJSON = null;

  // Carregar o JSON do edital
  async function carregarEdital() {
    try {
      const response = await fetch('edital_auditor.json');
      editalJSON = await response.json();
      console.log("Edital carregado:", editalJSON);
    } catch (e) {
      console.error("Erro ao carregar edital:", e);
      alert("Erro ao carregar dados do edital");
    }
  }

  // Atualizar barra de progresso geral
  function atualizarProgresso() {
    const done = document.querySelectorAll(".topic.done").length;
    const total = document.querySelectorAll(".topic").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    
    if (overallBar) overallBar.style.width = pct + "%";
    if (overallPct) overallPct.textContent = pct;
  }

  // Salvar marcação no Supabase
  async function salvarMarcacao(topico, estado) {
    if (!usuarioAtual) return;
    
    try {
      const { error } = await sb.from("estudo").upsert({
        user_id: usuarioAtual.id,
        topico,
        estudado: estado
      });
      
      if (error) {
        console.error("Erro ao salvar:", error.message);
      }
    } catch (e) {
      console.error("Erro inesperado:", e);
    }
  }

  // Marcar/desmarcar tópico
  async function marcarTopico(elemento, checked) {
    const topico = elemento.getAttribute("data-topico");
    elemento.classList.toggle("done", checked);
    await salvarMarcacao(topico, checked);
    atualizarProgresso();
  }

  // Carregar marcações salvas do Supabase
  async function carregarMarcados() {
    if (!usuarioAtual) return;
    
    try {
      const { data, error } = await sb.from("estudo")
        .select("topico, estudado")
        .eq("user_id", usuarioAtual.id);

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

  // Renderizar checklist do edital
  async function renderChecklist(edital) {
    if (!discContainer || !edital) return;
    
    discContainer.innerHTML = "";

    for (const d of edital.disciplinas) {
      let bloco = `
        <div class="card section">
          <div class="disc-head">
            <div>
              <h2>${d.nome}</h2>
              <p class="muted small">${d.questoes} questões</p>
            </div>
          </div>
      `;

      // Se tem subseções
      if (d.subsecoes) {
        for (const s of d.subsecoes) {
          bloco += `
            <div class="group">
              <h3>${s.nome}</h3>
              <ul class="topics">
          `;
          for (const t of s.topicos) {
            bloco += `
              <li class="topic" data-topico="${t}">
                <input type="checkbox" class="check">
                <span class="text">${t}</span>
              </li>
            `;
          }
          bloco += `</ul></div>`;
        }
      } 
      // Se tem tópicos diretos
      else if (d.topicos) {
        bloco += `<ul class="topics">`;
        for (const t of d.topicos) {
          bloco += `
            <li class="topic" data-topico="${t}">
              <input type="checkbox" class="check">
              <span class="text">${t}</span>
            </li>
          `;
        }
        bloco += `</ul>`;
      }

      bloco += `</div>`;
      discContainer.innerHTML += bloco;
    }

    // Adicionar event listeners nos checkboxes
    document.querySelectorAll(".topic").forEach(li => {
      const cb = li.querySelector("input[type='checkbox']");
      cb.addEventListener("change", () => marcarTopico(li, cb.checked));
    });

    await carregarMarcados();
  }

  // Login
  async function login() {
    const email = emailInput.value.trim();
    const password = passInput.value.trim();

    if (!email || !password) {
      mostrarErro("Preencha email e senha");
      return;
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("Erro login:", error.message);
      mostrarErro("Login falhou. Verifique email e senha.");
      return;
    }

    usuarioAtual = data.user;
    mostrarApp();
  }

  // Criar conta
  async function signup() {
    const email = emailInput.value.trim();
    const password = passInput.value.trim();

    if (!email || !password) {
      mostrarErro("Preencha email e senha");
      return;
    }

    if (password.length < 6) {
      mostrarErro("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    const { error } = await sb.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error("Erro signup:", error.message);
      mostrarErro("Erro ao criar conta: " + error.message);
      return;
    }

    mostrarErro("Conta criada! Verifique seu email para confirmar.", false);
  }

  // Mostrar mensagem de erro
  function mostrarErro(msg, isError = true) {
    if (authErr) {
      authErr.textContent = msg;
      authErr.className = isError ? "alert" : "alert success";
      authErr.classList.remove("hide");
    }
  }

  // Mostrar área do app após login
  async function mostrarApp() {
    emailLabel.textContent = usuarioAtual.email;
    authCard.style.display = "none";
    appSection.classList.remove("hide");
    btnLogout.classList.remove("hide");
    
    await renderChecklist(editalJSON);
  }

  // Logout
  async function logout() {
    await sb.auth.signOut();
    location.reload();
  }

  // Event listeners
  btnLogin.addEventListener("click", login);
  btnSignup.addEventListener("click", signup);
  btnLogout.addEventListener("click", logout);

  // Permitir login com Enter
  emailInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });
  passInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });

  // Verificar sessão existente
  const { data: { session } } = await sb.auth.getSession();
  
  // Carregar edital
  await carregarEdital();
  
  if (session) {
    usuarioAtual = session.user;
    mostrarApp();
  }
});
