// ================= CONFIG =================
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

// ================= HELPERS =================
const show = el => el.classList.remove("hide");
const hide = el => el.classList.add("hide");

function setErr(msg){
  authErr.textContent = msg || "";
  msg ? show(authErr) : hide(authErr);
}

function slug(s){
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");
}

// ================= SUPABASE =================
if(!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY){
  cfgWarn.innerHTML = "Configure o arquivo <b>config.js</b> com as chaves do Supabase.";
  show(cfgWarn);
}

const sb = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// ================= ORDEM EDITAL =================
const ORDER = ["D7","D8","D4","D9","D10","D5","D2","D1","D3","D6","D11"];

// ================= LOAD EDITAL =================
async function loadEdital(){
  const r = await fetch("edital_auditor.json", { cache:"no-store" });
  const j = await r.json();

  const map = new Map(j.disciplinas.map(d => [d.id, d]));
  const ordered = [];

  ORDER.forEach(id => map.has(id) && ordered.push(map.get(id)));
  j.disciplinas.forEach(d => !ORDER.includes(d.id) && ordered.push(d));

  return ordered.map(d => ({
    id: d.id,
    nome: d.nome,
    grupos: d.subsecoes?.length
      ? d.subsecoes.map(s => ({ nome:s.nome, topicos:s.topicos }))
      : [{ nome:"Tópicos", topicos:d.topicos }]
  }));
}

// ================= PROGRESSO =================
async function getProgress(userId){
  const { data } = await sb
    .from("progress")
    .select("item_id, done")
    .eq("user_id", userId);

  return new Map(data.map(r => [r.item_id, r.done]));
}

async function saveProgress(userId, itemId, done){
  await sb.from("progress").upsert({
    user_id: userId,
    item_id: itemId,
    done,
    updated_at: new Date().toISOString()
  });
}

// ================= RENDER =================
function render(edital, prog){
  discContainer.innerHTML = "";

  let total = 0, done = 0;

  edital.forEach(d => {
    const card = document.createElement("div");
    card.className = "card section";

    card.innerHTML = `<h2>${d.nome}</h2>`;
    d.grupos.forEach(g => {
      const ul = document.createElement("ul");
      ul.className = "topics";

      g.topicos.forEach(t => {
        const id = `${d.id}:${slug(g.nome)}:${slug(t)}`;
        const ok = prog.get(id);

        total++; if(ok) done++;

        const li = document.createElement("li");
        li.className = "topic" + (ok ? " done":"");
        li.innerHTML = `<span>${t}</span>`;

        li.onclick = async () => {
          const next = !li.classList.contains("done");
          li.classList.toggle("done", next);
          await saveProgress(currentUser.id, id, next);
          render(edital, prog.set(id,next));
        };

        ul.appendChild(li);
      });

      card.appendChild(ul);
    });

    discContainer.appendChild(card);
  });

  const pct = total ? (done/total)*100 : 0;
  overallBar.style.width = pct+"%";
  overallPct.textContent = pct.toFixed(1);
}

// ================= AUTH =================
let currentUser = null;

async function setUser(user){
  currentUser = user;

  if(user){
    userEmail.textContent = user.email;
    hide(authCard); show(appSection); show(btnLogout);

    const edital = await loadEdital();
    const prog = await getProgress(user.id);
    render(edital, prog);
  }else{
    show(authCard); hide(appSection); hide(btnLogout);
  }
}

btnLogin.onclick = async () => {
  const { error, data } = await sb.auth.signInWithPassword({
    email: emailEl.value,
    password: passEl.value
  });
  if(error) setErr(error.message);
  else setUser(data.user);
};

btnSignup.onclick = async () => {
  const { error } = await sb.auth.signUp({
    email: emailEl.value,
    password: passEl.value
  });
  if(error) setErr(error.message);
};

btnLogout.onclick = async () => {
  await sb.auth.signOut();
  setUser(null);
};

// ================= INIT =================
sb.auth.getSession().then(r => setUser(r.data.session?.user));
sb.auth.onAuthStateChange((_e, s) => setUser(s?.user));
