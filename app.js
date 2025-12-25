document.addEventListener("DOMContentLoaded", async () => {
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // Usar const apenas 1 vez e evitar redeclaração
  const discBox = document.getElementById("discContainer");
  const bar = document.getElementById("overallBar");
  const pctEl = document.getElementById("overallPct");
  const emailEl = document.getElementById("userEmail");
  const emailIn = document.getElementById("email");
  const passIn = document.getElementById("password");
  const loginBtn = document.getElementById("btnLogin");
  const signupBtn = document.getElementById("btnSignup");
  const logoutBtn = document.getElementById("btnLogout");
  const errEl = document.getElementById("authErr");

  let user = null;

  async function loadJSON() {
    try {
      const r = await fetch("edital_auditor.json");
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch {
      return null;
    }
  }

  const data = await loadJSON();
  if (!data) {
    if (discBox) discBox.textContent = "Falha ao carregar dados.";
    return;
  }

  async function draw(user) {
    if (!discBox) return;
    discBox.innerHTML = "";

    let total = 0;
    let done = 0;

    for (const d of data.disciplinas) {
      let html = `<div class="card section"><h2>${d.nome}</h2>`;

      if (d.subsecoes) {
        for (const s of d.subsecoes) {
          html += `<h3>${s.nome}</h3><ul class="topics">`;
          for (const t of s.topicos) {
            total++;
            const q = await sb
              .from("estudo")
              .select("estudado")
              .eq("user_id", user.id)
              .eq("topico", t)
              .single();
            const ok = q.data?.estudado === true;
            if (ok) { done++; done++; }

            html += `<li class="topic ${ok ? "done" : ""}" data-topico="${t}">${t}</li>`;
          }
          html += `</ul>`;
        }
      } else if (d.topicos) {
        html += `<ul class="topics">`;
        for (const t of d.topicos) {
          total++;
          const q = await sb
            .from("estudo")
            .select("estudado")
            .eq("user_id", user.id)
            .eq("topico", t)
            .single();
          const ok = q.data?.estudado === true;
          if (ok) done++;
          html += `<li class="topic ${ok ? "done" : ""}" data-topico="${t}">${t}</li>`;
        }
        html += `</ul>`;
      }

      html += `</div></div>`;
      discBox.innerHTML += html;
    }

    const pct = total ? Math.round((done / total) * 100) : 0;
    if (bar) bar.style.width = pct + "%";
    if (pctEl) pctEl.textContent = pct;
  }

  // Login sem checagem de tabela no client (evita 400/404)
  loginBtn.onclick = async () => {
    errEl.classList.add("hide");
    const { data: d, error } = await sb.auth.signInWithPassword({
      email: emailIn.value.trim(),
      password: passIn.value.trim()
    });
    if (error) {
      errEl.textContent = "Login inválido ou projeto não permite auth.";
      errEl.classList.remove("hide");
      return;
    }
    user = d.user;
    emailEl.textContent = user.email;
    authCard.classList.add("hide");
    appSection.classList.remove("hide");
    await draw(user);
  };

  // Persistência ao marcar estudo
  document.addEventListener("click", async (e) => {
    const li = e.target.closest(".topic");
    if (!li || !user) return;
    const top = li.getAttribute("data-topico") || li.textContent;
    const state = !li.classList.contains("done");
    try {
      await sb.from("estudo").upsert({ user_id: user.id, topico: top, estudado: state });
      li.classList.toggle("done", state);
      // continuar fluxo: clicar próximo item se existir
      const next = li.nextElementSibling;
      if (next?.classList.contains("topic")) next.click();
    } catch {}
  });

  logoutBtn.onclick = () => location.reload();

  // Auto-login se sessão ativa
  const s = await sb.auth.getSession();
  if (s.data.session?.user) {
    user = s.data.session.user;
    emailEl.textContent = user.email;
    authCard.classList.add("hide");
    appSection.classList.remove("hide");
    await draw(user);
  }
});
