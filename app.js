// app.js
// Site estático + Supabase (Auth + Postgres) para salvar progresso por usuário.

const cfgWarn = document.getElementById("cfgWarn");
const authCard = document.getElementById("authCard");
const appSection = document.getElementById("app");
const authErr = document.getElementById("authErr");
const btnLogin = document.getElementById("btnLogin");
const btnSignup = document.getElementById("btnSignup");
const btnLogout = document.getElementById("btnLogout");
const userEmail = document.getElementById("userEmail");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");

const overallBar = document.getElementById("overallBar");
const overallPct = document.getElementById("overallPct");
const discContainer = document.getElementById("discContainer");

function show(el){ el.classList.remove("hide"); }
function hide(el){ el.classList.add("hide"); }
function setErr(msg){
  authErr.textContent = msg;
  msg ? show(authErr) : hide(authErr);
}

function slug(s){
  return String(s || "")
    .trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function percent(done, total){
  if(!total) return 0;
  return (done/total)*100;
}

function ensureConfig(){
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if(!url || !key || url.includes("COLE_AQUI") || key.includes("COLE_AQUI")){
    cfgWarn.innerHTML = `
      <strong>Configuração pendente:</strong> edite <code>config.js</code> e cole
      <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code> do seu projeto Supabase.
    `;
    show(cfgWarn);
    return null;
  }
  hide(cfgWarn);
  return { url, key };
}

const cfg = ensureConfig();
const supabase = cfg ? window.supabase.createClient(cfg.url, cfg.key) : null;

// Ordem de importância (conforme ranking fiscal)
const ORDERED_IDS = ["D7","D8","D4","D9","D10","D5","D2","D1","D3","D6","D11"];

async function loadEdital(){
  const res = await fetch("edital_auditor.json", { cache: "no-store" });
  if(!res.ok) throw new Error("Não consegui carregar edital_auditor.json");
  const data = await res.json();
  const byId = new Map(data.disciplinas.map(d => [d.id, d]));
  const ordered = [];
  for(const id of ORDERED_IDS){
    if(byId.has(id)) ordered.push(byId.get(id));
  }
  for(const d of data.disciplinas){
    if(!ORDERED_IDS.includes(d.id)) ordered.push(d);
  }
  return ordered.map(d => ({
    id: d.id,
    nome: d.nome,
    questoes: d.questoes,
    grupos: (d.subsecoes && d.subsecoes.length)
      ? d.subsecoes.map(s => ({ nome: s.nome || "Tópicos", topicos: s.topicos || [] }))
      : [{ nome: "Tópicos", topicos: d.topicos || [] }]
  }));
}

async function fetchProgressMap(userId){
  const map = new Map();
  const { data, error } = await supabase
    .from("progress")
    .select("item_id, done")
    .eq("user_id", userId);
  if(error) throw error;
  for(const row of (data || [])){
    map.set(row.item_id, !!row.done);
  }
  return map;
}

async function upsertProgress(userId, itemId, done){
  const { error } = await supabase
    .from("progress")
    .upsert({ user_id: userId, item_id: itemId, done: !!done, updated_at: new Date().toISOString() });
  if(error) throw error;
}

function renderUI(edital, progMap){
  discContainer.innerHTML = "";

  let total = 0, done = 0;

  for(const d of edital){
    let discTotal = 0, discDone = 0;

    const section = document.createElement("section");
    section.className = "section card";

    const head = document.createElement("div");
    head.className = "disc-head";

    const left = document.createElement("div");
    left.innerHTML = `
      <h2 style="margin:0 0 6px 0;">${d.nome}</h2>
      ${d.questoes ? `<div class="muted">Peso no edital: ${d.questoes} questões</div>` : ""}
    `;

    const right = document.createElement("div");
    right.className = "disc-progress";
    right.innerHTML = `
      <div class="muted small" id="stat-${d.id}">0/0 • 0.0%</div>
      <div class="progress thin"><div class="bar" id="bar-${d.id}" style="width:0%"></div></div>
    `;

    head.appendChild(left);
    head.appendChild(right);
    section.appendChild(head);

    for(const g of d.grupos){
      const group = document.createElement("div");
      group.className = "group";
      const h3 = document.createElement("h3");
      h3.textContent = g.nome;
      group.appendChild(h3);

      const ul = document.createElement("ul");
      ul.className = "topics";

      for(const t of g.topicos){
        const itemId = `${d.id}:${slug(g.nome)}:${slug(t)}`;
        const isDone = progMap.get(itemId) === true;

        discTotal++; total++;
        if(isDone){ discDone++; done++; }

        const li = document.createElement("li");
        li.className = "topic" + (isDone ? " done" : "");
        li.dataset.itemId = itemId;
        li.dataset.done = isDone ? "1" : "0";

        li.innerHTML = `
          <span class="check">${isDone ? "✔" : "○"}</span>
          <span class="text">${t}</span>
        `;

        li.addEventListener("click", async () => {
          const cur = li.dataset.done === "1";
          const next = !cur;

          // UI otimista
          li.dataset.done = next ? "1" : "0";
          li.classList.toggle("done", next);
          li.querySelector(".check").textContent = next ? "✔" : "○";

          try{
            const user = (await supabase.auth.getUser()).data.user;
            await upsertProgress(user.id, itemId, next);
            // Recalcular barras sem recarregar
            progMap.set(itemId, next);
            renderUI(edital, progMap);
          }catch(e){
            // rollback
            li.dataset.done = cur ? "1" : "0";
            li.classList.toggle("done", cur);
            li.querySelector(".check").textContent = cur ? "✔" : "○";
            alert("Não consegui salvar seu progresso. Verifique configuração do Supabase.");
          }
        });

        ul.appendChild(li);
      }

      group.appendChild(ul);
      section.appendChild(group);
    }

    // atualizar stats disciplina
    const pct = percent(discDone, discTotal);
    section.querySelector(`#stat-${d.id}`).textContent = `${discDone}/${discTotal} • ${pct.toFixed(1)}%`;
    section.querySelector(`#bar-${d.id}`).style.width = `${pct}%`;

    discContainer.appendChild(section);
  }

  // geral
  const op = percent(done, total);
  overallBar.style.width = `${op}%`;
  overallPct.textContent = op.toFixed(1);
}

async function setLoggedInUI(user){
  userEmail.textContent = user?.email || "";
  if(user){
    hide(authCard);
    show(appSection);
    show(btnLogout);

    const edital = await loadEdital();
    const progMap = await fetchProgressMap(user.id);
    renderUI(edital, progMap);
  }else{
    show(authCard);
    hide(appSection);
    hide(btnLogout);
  }
}

async function init(){
  if(!supabase) return;

  // sessão atual
  const { data: { session } } = await supabase.auth.getSession();
  await setLoggedInUI(session?.user || null);

  // listener de mudança de auth
  supabase.auth.onAuthStateChange(async (_event, session2) => {
    await setLoggedInUI(session2?.user || null);
  });

  btnLogin.addEventListener("click", async () => {
    setErr("");
    const email = emailEl.value.trim();
    const password = passEl.value;
    if(!email || !password) return setErr("Preencha email e senha.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) return setErr(error.message);
  });

  btnSignup.addEventListener("click", async () => {
    setErr("");
    const email = emailEl.value.trim();
    const password = passEl.value;
    if(!email || !password) return setErr("Preencha email e senha.");
    const { error } = await supabase.auth.signUp({ email, password });
    if(error) return setErr(error.message);
    setErr("Cadastro enviado. Se o Supabase exigir confirmação, verifique seu email.");
  });

  btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });
}

init();
