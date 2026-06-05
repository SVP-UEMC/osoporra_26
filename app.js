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
  if (!supabase) throw new Error('Primero debes conectar con Supabase.');
}

function formatDate(dateValue) {
  if (!dateValue) return 'Fecha no indicada';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Fecha no indicada';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function parseInteger(value) {
  const v = String(value || '').trim();
  if (v === '') return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function isDeadlinePassed(deadline) {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
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
  if (error) throw new Error(error.message);
  return data.session || null;
}

async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user || null;
}

async function ensureProfileExists(user) {
  const normalizedEmail = normalizeEmail(user.email);

  const { data: existingProfile, error: existingError } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existingProfile) return existingProfile;

  const { data: insertedProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: normalizedEmail,
      display_name: null
    })
    .select('id, email, display_name')
    .single();

  if (insertError) throw new Error(insertError.message);
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

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(authMessage, 'Error en el registro: ' + error.message, true);
      return;
    }

    setMessage(
      authMessage,
      data.user
        ? 'Registro correcto. Si no entra sesión automáticamente, usa el botón de iniciar sesión.'
        : 'Registro enviado. Revisa si debes confirmar el email.'
    );

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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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
    teamsContainer.innerHTML = '';
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
      displayName ? `Perfil guardado. Nombre visible: ${displayName}` : 'Perfil guardado. Nombre visible vacío.'
    );
  } catch (error) {
    setMessage(profileMessage, 'Error al guardar el perfil: ' + error.message, true);
  }
}

async function loadExistingPrediction(userId, matchId) {
  const { data, error } = await supabase
    .from('match_predictions')
    .select('predicted_home_score, predicted_away_score')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function saveMatchPrediction(match, homeInput, awayInput, messageElement) {
  clearMessage(messageElement);

  try {
    requireSupabase();

    const user = await getCurrentUser();
    if (!user) {
      setMessage(messageElement, 'Debes iniciar sesión para guardar un pronóstico.', true);
      return;
    }

    if (isDeadlinePassed(match.prediction_deadline_at)) {
      setMessage(messageElement, 'El plazo de pronóstico ya ha cerrado.', true);
      return;
    }

    const homeScore = parseInteger(homeInput.value);
    const awayScore = parseInteger(awayInput.value);

    if (homeScore === null || awayScore === null) {
      setMessage(messageElement, 'Introduce dos números válidos.', true);
      return;
    }

    const payload = {
      user_id: user.id,
      match_id: match.id,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      predicted_qualified_team_id: null,
      is_locked: false,
      locked_at: null
    };

    const { error } = await supabase
      .from('match_predictions')
      .upsert(payload, { onConflict: 'user_id,match_id' });

    if (error) {
      setMessage(messageElement, 'Error al guardar el pronóstico: ' + error.message, true);
      return;
    }

    setMessage(messageElement, 'Pronóstico guardado.');
  } catch (error) {
    setMessage(messageElement, 'Error al guardar el pronóstico: ' + error.message, true);
  }
}

function createPredictionCard(match, existingPrediction) {
  const card = document.createElement('article');
  card.className = 'team-card';
  card.dataset.matchId = String(match.id);

  const homeName = match.home_team_name || match.home_team_short_name || 'Equipo local';
  const awayName = match.away_team_name || match.away_team_short_name || 'Equipo visitante';
  const stageName = match.stage_name || match.stage_code || 'Fase no indicada';
  const kickoffText = formatDate(match.kickoff_at);
  const deadlinePassed = isDeadlinePassed(match.prediction_deadline_at);

  card.innerHTML = `
    <h3>${homeName} vs ${awayName}</h3>
    <p>${stageName}</p>
    <p>${kickoffText}</p>
    <p class="deadline-line">${match.prediction_deadline_at ? `Cierre: ${formatDate(match.prediction_deadline_at)}` : 'Sin fecha límite'}</p>
    <div class="button-row">
      <label>Local</label>
      <input type="number" min="0" step="1" class="home-score-input" placeholder="0" />
      <label>Visitante</label>
      <input type="number" min="0" step="1" class="away-score-input" placeholder="0" />
    </div>
    <button class="save-prediction-button">Guardar pronóstico</button>
    <p class="match-message"></p>
  `;

  const homeInput = card.querySelector('.home-score-input');
  const awayInput = card.querySelector('.away-score-input');
  const saveButton = card.querySelector('.save-prediction-button');
  const message = card.querySelector('.match-message');

  if (existingPrediction) {
    homeInput.value = existingPrediction.predicted_home_score ?? '';
    awayInput.value = existingPrediction.predicted_away_score ?? '';
    setMessage(message, 'Pronóstico cargado.');
  }

  if (deadlinePassed) {
    homeInput.disabled = true;
    awayInput.disabled = true;
    saveButton.disabled = true;
    setMessage(message, 'Pronóstico cerrado.', true);
  } else {
    saveButton.addEventListener('click', async () => {
      await saveMatchPrediction(match, homeInput, awayInput, message);
    });
  }

  return card;
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

    const { data, error } = await supabase
      .from('v_matches_full')
      .select('*')
      .order('kickoff_at', { ascending: true })
      .limit(50);

    if (error) {
      setMessage(teamsMessage, 'Error al cargar partidos: ' + error.message, true);
      return;
    }

    const matches = data || [];

    if (matches.length === 0) {
      setMessage(teamsMessage, 'No hay partidos disponibles.', true);
      return;
    }

    setMessage(teamsMessage, `Partidos cargados: ${matches.length}`);

    const list = document.createElement('div');
    list.className = 'match-list';

    for (const match of matches) {
      let existingPrediction = null;
      try {
        existingPrediction = await loadExistingPrediction(user.id, match.id);
      } catch (predictionError) {
        console.warn('No se pudo cargar la predicción existente', predictionError);
      }
      list.appendChild(createPredictionCard(match, existingPrediction));
    }

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
