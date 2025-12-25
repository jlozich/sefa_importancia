document.addEventListener("DOMContentLoaded", async () => {
  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  const authCard = document.getElementById("authCard");
  const appSection = document.getElementById("app");
  const userEmail = document.getElementById("userEmail");
  const discContainer = document.getElementById("discContainer");
  const overallBar = document.getElementById("overallBar");
  const overallPct = document.getElementById("overallPct");
  const btnLogout = document.getElementById("btnLogout");

  let currentUser = null;

  async function carregarUI(user) {
    discContainer.innerHTML = "Carregando…";

    const { data: disciplinas } = await sb.from("disciplinas").select("*").eq("user_id", user.id);
    if (!disciplinas || disciplinas.length === 0) {
      discContainer.innerHTML = "Nenhuma disciplina cadastrada.";
      return;
    }

    let html = "";

    for (const d of disciplinas) {
      const { data: topicos } = await sb
        .from("topicos")
        .select("*")
        .eq("disciplina_id", d.id)
        .eq("user_id", user.id);

      html += `
      <div class="card section">
        <div class="disc-head"><strong>${d.nome}</strong></div>
        <ul class="topics">
          ${
            topicos && topicos.length
              ? topicos.map(t => `
                <li class="topic ${t.estudado ? "done" : ""}" data-id="${t.id}">
                  <span class="check">☑</span>
                  <span class="text">${t.nome}</span>
                </li>
              `).join("")
              : "<li>Nenhum tópico cadastrado</li>"
          }
        </ul>
      </div>`;
    }

    discContainer.innerHTML = html;
    atualizarProgresso();
  }

  function atualizarProgresso() {
    const feitos = document.querySelectorAll(".topic.done").length;
    const total = document.querySelectorAll(".topic").length;
    const pct = total ? Math.round((feitos / total) * 100) : 0;
    overallBar.style.width = pct + "%";
    overallPct.textContent = pct;
  }

  async function setUser(user) {
    currentUser = user;
    if (user) {
      userEmail.textContent = user.email;
      authCard.classList.add("hide");
      appSection.classList.remove("hide");
      btnLogout.classList.remove("hide");
      await carregarUI(user);
    }
  }

  document.addEventListener("click", async (e) => {
    const item = e.target.closest(".topic");
    if (!item || !currentUser) return;

    const id = item.getAttribute("data-id");
    const novoEstado = !item.classList.contains("done");

    const { error } = await sb
      .from("topicos")
      .update({ estudado: novoEstado })
      .eq("id", id)
      .eq("user_id", currentUser.id);

    if (!error) {
      item.classList.toggle("done", novoEstado);
      atualizarProgresso();
    }
  });

  btnLogout.onclick = async () => {
    await sb.auth.signOut();
    location.reload();
  };

  const sess = await sb.auth.getSession();
  if (sess.data.session?.user) {
    await setUser(sess.data.session.user);
  }
});
