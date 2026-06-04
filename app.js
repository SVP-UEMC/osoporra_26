import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

let supabase = null;

const supabaseUrlInput = document.getElementById('supabaseUrl');
const supabaseKeyInput = document.getElementById('supabaseKey');
const connectButton = document.getElementById('connectButton');
const connectMessage = document.getElementById('connectMessage');

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const passwordConfirmInput = document.getElementById('passwordConfirmInput');

const registerButton = document.getElementById('registerButton');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');

const authMessage = document.getElementById('authMessage');
const sessionMessage = document.getElementById('sessionMessage');

const displayNameInput = document.getElementById('displayNameInput');
const loadProfileButton = document.getElementById('loadProfileButton');
const saveProfileButton = document.getElementById('saveProfileButton');
const profileMessage = document.getElementById('profileMessage');

const loadTeamsButton = document.getElementById('loadTeamsButton');
const teamsMessage = document.getElementById('teamsMessage');
const teamsContainer = document.getElementById('teamsContainer');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? '#b42318' : '#067647';
}

function clearMessage(element) {
  element.textContent = '';
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Primero debes conectar con Supabase.');
  }
}

async function connectSupabase() {
  clearMessage(connectMessage);
  clearMessage(sessionMessage);
  clearMessage(authMessage);
  clearMessage(profileMessage);

  const url = String(supabaseUrlInput.value || '').trim();
  const key = String(supabaseKeyInput.value || '').trim();

  if (!url || !key) {
    setMessage(connectMessage, 'Introduce la Project URL y la anon key.', true);
    return;
  }

  try {
    supabase = createClient(url, key);

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setMessage(connectMessage, 'Conectado, pero error al comprobar sesión: ' + error.message, true);
      return;
    }

    setMessage(connectMessage, 'Conexión correcta con Supabase.');

    if (data.session?.user) {
      setMessage(sessionMessage, `Sesión activa: ${data.session.user.email}`);
    } else {
      setMessage(sessionMessage, 'No hay sesión activa.', true);
    }

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setMessage(sessionMessage, `Sesión activa: ${session.user.email}`);
      }

      if (event === 'SIGNED_OUT') {
        displayNameInput.value = '';
        setMessage(sessionMessage, 'Sesión cerrada.');
        clearMessage(profileMessage);
      }
    });
  } catch (error) {
    setMessage(connectMessage, 'Error al conectar: ' + error.message, true);
  }
}

async function getCurrentSession() {
  requireSupabase();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session || null;
}

async function getCurrentUser() {
  const session = await getCurrentSession();

  if (!session || !session.user) {
    return null;
  }

  return session.user;
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

  const { data: insertedProfile, error: insertError } = await supabase
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

  return insertedProfile;
}

async function registerUser() {
  clearMessage(authMessage);

  try {
    requireSupabase();

    const email = normalizeEmail(emailInput.value);
    const password = String(passwordInput.value || '');
    const passwordConfirm = String(passwordConfirmInput.value || '');

    if (!email || !password || !passwordConfirm) {
      setMessage(authMessage, 'Completa email, contraseña y confirmación.', true);
      return;
    }

    if (password !== passwordConfirm) {
      setMessage(authMessage, 'Las contraseñas no coinciden.', true);
      return;
    }

    if (password.length < 6) {
      setMessage(authMessage, 'La contraseña debe tener al menos 6 caracteres.', true);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setMessage(authMessage, 'Error en el registro: ' + error.message, true);
      return;
    }

    if (data.user) {
      setMessage(
        authMessage,
        'Registro correcto. Si no entra sesión automáticamente, usa el botón de iniciar sesión.'
      );
    } else {
      setMessage(authMessage, 'Registro enviado. Revisa si debes confirmar el email.');
    }

    const session = await getCurrentSession();

    if (session?.user) {
      setMessage(sessionMessage, `Sesión activa: ${session.user.email}`);
    } else {
      setMessage(sessionMessage, 'No hay sesión activa tras el registro.', true);
    }
  } catch (error) {
    setMessage(authMessage, 'Error inesperado en el registro: ' + error.message, true);
  }
}

async function loginUser() {
  clearMessage(authMessage);

  try {
    requireSupabase();

    const email = normalizeEmail(emailInput.value);
    const password = String(passwordInput.value || '');

    if (!email || !password) {
      setMessage(authMessage, 'Introduce email y contraseña.', true);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(authMessage, 'Error al iniciar sesión: ' + error.message, true);
      return;
    }

    if (!data.session || !data.user) {
      setMessage(authMessage, 'Login incompleto: no se recibió sesión.', true);
      return;
    }

    setMessage(authMessage, 'Sesión iniciada correctamente.');
    setMessage(sessionMessage, `Sesión activa: ${data.user.email}`);
  } catch (error) {
    setMessage(authMessage, 'Error inesperado al iniciar sesión: ' + error.message, true);
  }
}

async function logoutUser() {
  clearMessage(authMessage);

  try {
    requireSupabase();

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(authMessage, 'Error al cerrar sesión: ' + error.message, true);
      return;
    }

    displayNameInput.value = '';
    setMessage(authMessage, 'Sesión cerrada.');
    setMessage(sessionMessage, 'No hay sesión activa.', true);
    clearMessage(profileMessage);
  } catch (error) {
    setMessage(authMessage, 'Error inesperado al cerrar sesión: ' + error.message, true);
  }
}

async function loadOwnProfile() {
  clearMessage(profileMessage);

  try {
    requireSupabase();

    const user = await getCurrentUser();

    if (!user) {
      setMessage(profileMessage, 'Debes iniciar sesión para cargar tu perfil.', true);
      return;
    }

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
  clearMessage(profileMessage);

  try {
    requireSupabase();

    const user = await getCurrentUser();

    if (!user) {
      setMessage(profileMessage, 'Debes iniciar sesión para guardar tu perfil.', true);
      return;
    }

    const displayName = String(displayNameInput.value || '').trim();

    await ensureProfileExists(user);

    const { error } = await supabase
      .from('profiles')
      .update({
        email: normalizeEmail(user.email),
        display_name: displayName || null
      })
      .eq('id', user.id);

    if (error) {
      setMessage(profileMessage, 'Error al guardar el perfil: ' + error.message, true);
      return;
    }

    setMessage(
      profileMessage,
      displayName
        ? `Perfil guardado. Nombre visible: ${displayName}`
        : 'Perfil guardado. Nombre visible vacío.'
    );
  } catch (error) {
    setMessage(profileMessage, 'Error al guardar el perfil: ' + error.message, true);
  }
}

async function loadMatches() {
  clearMessage(teamsMessage);
  teamsContainer.innerHTML = '';

  try {
    requireSupabase();

    const user = await getCurrentUser();

    if (!user) {
      setMessage(teamsMessage, 'Debes iniciar sesión para cargar los partidos.', true);
      return;
    }

    const candidateTables = [
      'matches',
      'partidos',
      'fixtures',
      'games'
    ];

    let matches = null;
    let lastError = null;
    let usedTable = null;

    for (const tableName of candidateTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(50);

      if (!error) {
        matches = data || [];
        usedTable = tableName;
        break;
      }

      lastError = error;
    }

    if (!usedTable) {
      setMessage(
        teamsMessage,
        'No se pudo cargar partidos. Aún no encuentro una tabla válida (`matches`, `partidos`, `fixtures` o `games`). Error: ' + (lastError?.message || 'desconocido'),
        true
      );
      return;
    }

    if (!matches || matches.length === 0) {
      setMessage(teamsMessage, `Sin partidos en la tabla ${usedTable}.`, true);
      return;
    }

    setMessage(teamsMessage, `Partidos cargados desde la tabla ${usedTable}: ${matches.length}`);

    const list = document.createElement('div');
    list.className = 'match-list';

    matches.forEach((match) => {
      const item = document.createElement('article');
      item.className = 'team-card';

      const homeTeam =
        match.home_team ||
        match.local_team ||
        match.team_home ||
        match.home ||
        'Equipo local';

      const awayTeam =
        match.away_team ||
        match.visitante_team ||
        match.team_away ||
        match.away ||
        'Equipo visitante';

      const dateValue =
        match.match_date ||
        match.date ||
        match.kickoff ||
        match.start_time ||
        '';

      const stageValue =
        match.stage ||
        match.round ||
        match.phase ||
        '';

      item.innerHTML = `
        <h3>${homeTeam} vs ${awayTeam}</h3>
        <p>${stageValue ? `Fase: ${stageValue}` : 'Fase no indicada'}</p>
        <p>${dateValue ? `Fecha: ${dateValue}` : 'Fecha no indicada'}</p>
      `;

      list.appendChild(item);
    });

    teamsContainer.appendChild(list);
  } catch (error) {
    setMessage(teamsMessage, 'Error al cargar partidos: ' + error.message, true);
  }
}

connectButton?.addEventListener('click', connectSupabase);
registerButton?.addEventListener('click', registerUser);
loginButton?.addEventListener('click', loginUser);
logoutButton?.addEventListener('click', logoutUser);
loadProfileButton?.addEventListener('click', loadOwnProfile);
saveProfileButton?.addEventListener('click', saveOwnProfile);
loadTeamsButton?.addEventListener('click', loadMatches);
