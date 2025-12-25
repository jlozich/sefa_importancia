const sb = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const btnLogin = document.getElementById("btnLogin");
const btnSignup = document.getElementById("btnSignup");
const btnLogout = document.getElementById("btnLogout");
const authCard = document.getElementById("authCard");
const appSection = document.getElementById("app");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const authErr = document.getElementById("authErr");
const userEmail = document.getElementById("userEmail");
const discContainer = document.getElementById("discContainer");
const overallBar = document.getElementById("overallBar");
const overallPct = document.getElementById("overallPct");

let currentUser = null;

function show(el){ el.classList.remove("hide"); }
function hide(el){ el.classList.add("hide"); }

async function setUser(user){
  currentUser = user;
  if(user){
    userEmail.textContent = user.email;
    hide(authCard); show(appSection); show(btnLogout);
  } else {
    show(authCard); hide(appSection); hide(btnLogout);
  }
}

btnLogin.onclick = async () => {
  const { error, data } = await sb.auth.signInWithPassword({
    email: emailEl.value,
    password: passEl.value
  });
  if(error) authErr.textContent = error.message;
  else setUser(data.user);
};

btnSignup.onclick = async () => {
  const { error } = await sb.auth.signUp({
    email: emailEl.value,
    password: passEl.value
  });
  if(error) authErr.textContent = error.message;
};

btnLogout.onclick = async () => {
  await sb.auth.signOut();
  setUser(null);
};

sb.auth.getSession().then(r => setUser(r.data.session?.user));
sb.auth.onAuthStateChange((_e, s) => setUser(s?.user));
