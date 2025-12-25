// app.js
// Site estático + Supabase (Auth + Postgres) para salvar progresso por usuário.

// -------------------- ELEMENTOS --------------------
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

// -------------------- HELPERS UI --------------------
function show(el){ el.classList.remove("hide"); }
function hide(el){ el.classList.add("hide"); }

function setErr(msg){
  authErr.textContent = msg || "";
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
  return total ? (done / total) * 100 : 0;
}

// -------------------- CONFIG SUPABASE --------------------
function ensureConfig(){
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;

  if(!url || !key || url.includes("COLE_AQUI") || key.includes("COLE_AQUI")){
    cfgWarn.innerHTML = `
      <strong>Configuração pendente:</strong><br>
      Edite <code>config.js</code> e informe:
      <ul>
        <li><code>SUPABASE_URL</code></li>
        <li><code>SUPABASE_ANON_KEY</code></li>
      </ul>
    `;
    show(cfgWarn);
    return null;
  }

  hide(cfgWarn);
  return { url, key };
}

const cfg = ensureConfig();

// 👉 instância do cliente (NÃO usar nome "supabase")
const sb = cfg ? window.supabase.createClient(cfg.url, cfg.key) : null;

// -------------------- ORDEM DE IMPORTÂNCIA --------------------
const ORDERED_IDS = ["D7","D8","D4","D9","D10","D5","D2","D1","D3","D6","D11"];

// -------------------- LOAD EDITAL --------------------
async function loadEdital(){
  const res = await fetch("edital_auditor.json", { cache: "no-store" });
  if(!res.ok) throw new Error("Falha ao carregar edital_auditor.json");

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
      ? d.subsecoes.map(s => ({
          nome: s.nome || "Tópicos",
          topicos: s.topicos || []
        }))
      : [{ nome: "Tópicos", topicos: d.topicos || [] }]
  }));
}

// -------------------- PROGRESSO --------------------
async function fetchProgressMap(userId){
  const map = new Map();

  const { data, error } = await sb
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
  const { error } = await sb
    .from("progress")
    .upsert({
      user_id: userId,
      item_id: itemId,
      done: !!done,
      updated_at: new Date().toISOString()
    });

  if(error) throw error;
}

// -------------------- RENDER UI --------------------
function renderUI(edital, progMap){
  discContainer.innerHTML = "";

  let total = 0, done = 0;

  for(const d of edital){
    let discTotal = 0, discDone = 0;

    const section = document.createElement("section");
    section.className = "section card";

    section.innerHTML = `
      <div class="disc-head">
        <div>
          <h2>${d.nome}</h2>
          ${d.questoes ? `<div class="muted">Peso: ${d.questoes} questões</div>` : ""}
        </div>
        <div class="disc-progress">
          <div class="muted small" id="stat-${d.id}">0/0 • 0%</div>
          <div class="progress thin"><div class="bar" id="bar-${d.id}"></div></div>
        </div>
      </div>
    `;

    for(const g of d.grupos){
      const group = document.createElement("div");
      group.className = "group";
      group.innerHTML = `<h3>${g.nome}</h3>`;

      const ul = document.createElement("ul");
      ul.className = "topics";

      for(const t of g.topicos){
        const itemId = `${d.id}:${slug(g.nome)}:${slug(t)}`;
        const isDone = progMap.get(itemId) === true;

        discTotal++; total++;
        if(isDone){ discDone++; done++; }

        const li = document.createElement("li");
        li.className = `topic ${isDone ? "done" : ""}`;
        li.innerHTML = `
          <span class="check">${isDone ? "✔" : "○"}</span>
          <span class="text">${t}</span>
        `;

        li.addEventListener("click", async () => {
          const next = !li.classList.contains("done");

          li.classList.toggle("done", next);
          li.querySelector(".check").textContent = next ? "✔" : "○";

          try{
            const { data } = await sb.auth.getUser();
            await upsertProgress(data.user.id, itemId, next);
            progMap.set(itemId, next);
            renderUI(edital, progMap);
          }catch{
            alert("Erro ao salvar progresso.");
          }
        });

        ul.appendChild(li);
      }

      group.appendChild(ul);
      section.appendChild(group);
    }

    const pct = percent(discDone, discTotal);
    section.querySelector(`#stat-${d.id}`).textContent =
      `${discDone}/${discTotal} • ${pct.toFixed(1)}%`;
    section.querySelector(`#bar-${d.id}`).style.width = `${pct}%`;

    discContainer.appendChild(section);
  }

  const overall = percent(done, total);
  overallBar.style.width = `${overall}%`;
  overallPct.textContent = overall.toFixed(1);
}

// -------------------- AUTH FLOW --------------------
async function setLoggedInUI(user){
  if(user){
    userEmail.textContent = user.email;
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
  if(!sb) return;

  const { data: { session } } = await sb.auth.getSession();
  await setLoggedInUI(session?.user || null);

  sb.auth.onAuthStateChange(async (_evt, session2) => {
    await setLoggedInUI(session2?.user || null);
  });

  btnLogin.onclick = async () => {
    setErr("");
    const { error } = await sb.auth.signInWithPassword({
      email: emailEl.value.trim(),
      password: passEl.value
    });
    if(error) setErr(error.message);
  };

  btnSignup.onclick = async () => {
    setErr("");
    const { error } = await sb.auth.signUp({
      email: emailEl.value.trim(),
      password: passEl.value
    });
    if(error) setErr(error.message);
    else setErr("Cadastro criado. Verifique seu email se houver confirmação.");
  };

  btnLogout.onclick = async () => {
    await sb.auth.signOut();
  };
}

init();
