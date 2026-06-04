const SUPABASE_URL = 'TU_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const sessionButton = document.getElementById('check-session-btn');
const logoutButton = document.getElementById('logout-btn');
const loadProfileButton = document.getElementById('load-profile-btn');
const saveProfileButton = document.getElementById('save-profile-btn');

const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');
const registerMessage = document.getElementById('register-message');

const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginMessage = document.getElementById('login-message');

const sessionMessage = document.getElementById('session-message');

const displayNameInput = document.getElementById('display-name');
const profileMessage = document.getElementById('profile-message');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? '#b42318' : '#067647';
}

async function ensureProfileExists(user) {
  const normalizedEmail = normalizeEmail(user.email);

  const { data: existingProfile, error: existingError } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingProfile) {
    return existingProfile;
  }

  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: normalizedEmail,
      display_name: null
    })
    .select('id, email, display_name')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return newProfile;
}

async function registerUser(event) {
  event.preventDefault();

  const email = normalizeEmail(registerEmailInput.value);
  const password = registerPasswordInput.value;

  registerMessage.textContent = '';

  if (!email || !password) {
    setMessage(registerMessage, 'Introduce email y contraseña.', true);
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setMessage(registerMessage, 'Error en el registro: ' + error.message, true);
      return;
    }

    if (data.user) {
      setMessage(
        registerMessage,
        'Registro correcto. Si no entra sesión automáticamente, inicia sesión manualmente.'
      );
      return;
    }

    setMessage(registerMessage, 'Registro enviado. Revisa si necesitas confirmar el email.');
  } catch (error) {
    setMessage(registerMessage, 'Error inesperado en el registro: ' + error.message, true);
  }
}

async function loginUser(event) {
  event.preventDefault();

  const email = normalizeEmail(loginEmailInput.value);
  const password = loginPasswordInput.value;

  loginMessage.textContent = '';

  if (!email || !password) {
    setMessage(loginMessage, 'Introduce email y contraseña.', true);
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(loginMessage, 'Error al iniciar sesión: ' + error.message, true);
      return;
    }

    if (!data.session || !data.user) {
      setMessage(loginMessage, 'Login incompleto: no se recibió sesión.', true);
      return;
    }

    setMessage(loginMessage, 'Sesión iniciada correctamente.');
  } catch (error) {
    setMessage(loginMessage, 'Error inesperado al iniciar sesión: ' + error.message, true);
  }
}

async function checkSession() {
  sessionMessage.textContent = '';

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setMessage(sessionMessage, 'Error al comprobar sesión: ' + error.message, true);
      return;
    }

    if (!data.session) {
      setMessage(sessionMessage, 'No hay sesión activa.', true);
      return;
    }

    const user = data.session.user;
    setMessage(
      sessionMessage,
      `Sesión activa: ${user.email} (${user.id})`
    );
  } catch (error) {
    setMessage(sessionMessage, 'Error inesperado al comprobar sesión: ' + error.message, true);
  }
}

async function loadOwnProfile() {
  profileMessage.textContent = '';

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      setMessage(profileMessage, 'Error al comprobar sesión: ' + sessionError.message, true);
      return;
    }

    if (!sessionData.session || !sessionData.session.user) {
      setMessage(profileMessage, 'Debes iniciar sesión para cargar tu perfil.', true);
      return;
    }

    const user = sessionData.session.user;
    const profile = await ensureProfileExists(user);

    displayNameInput.value = profile.display_name || '';

    if (profile.display_name) {
      setMessage(profileMessage, `Perfil cargado. Nombre visible actual: ${profile.display_name}`);
    } else {
      setMessage(profileMessage, 'Perfil cargado. Aún no has definido nombre visible.');
    }
  } catch (error) {
    setMessage(profileMessage, 'Error al cargar el perfil: ' + error.message, true);
  }
}

async function saveOwnProfile() {
  profileMessage.textContent = '';

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      setMessage(profileMessage, 'Error al comprobar sesión: ' + sessionError.message, true);
      return;
    }

    if (!sessionData.session || !sessionData.session.user) {
      setMessage(profileMessage, 'Debes iniciar sesión para guardar tu perfil.', true);
      return;
    }

    const user = sessionData.session.user;
    const displayName = String(displayNameInput.value || '').trim();

    await ensureProfileExists(user);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName || null,
        email: normalizeEmail(user.email)
      })
      .eq('id', user.id);

    if (updateError) {
      setMessage(profileMessage, 'Error al guardar el perfil: ' + updateError.message, true);
      return;
    }

    setMessage(
      profileMessage,
      displayName
        ? `Perfil guardado. Nombre visible: ${displayName}`
        : 'Perfil guardado. Nombre visible vacío.'
    );
  } catch (error) {
    setMessage(profileMessage, 'Error inesperado al guardar el perfil: ' + error.message, true);
  }
}

async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(sessionMessage, 'Error al cerrar sesión: ' + error.message, true);
      return;
    }

    displayNameInput.value = '';
    setMessage(sessionMessage, 'Sesión cerrada.');
    profileMessage.textContent = '';
  } catch (error) {
    setMessage(sessionMessage, 'Error inesperado al cerrar sesión: ' + error.message, true);
  }
}

registerForm?.addEventListener('submit', registerUser);
loginForm?.addEventListener('submit', loginUser);
sessionButton?.addEventListener('click', checkSession);
loadProfileButton?.addEventListener('click', loadOwnProfile);
saveProfileButton?.addEventListener('click', saveOwnProfile);
logoutButton?.addEventListener('click', logoutUser);

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    setMessage(sessionMessage, `Sesión activa: ${session.user.email}`);
  }

  if (event === 'SIGNED_OUT') {
    displayNameInput.value = '';
    setMessage(sessionMessage, 'Sesión cerrada.');
    profileMessage.textContent = '';
  }
});
