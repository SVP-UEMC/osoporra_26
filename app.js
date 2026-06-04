import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

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

const loadButton = document.getElementById('loadTeamsButton');
const resultMessage = document.getElementById('teamsMessage');
const resultContainer = document.getElementById('teamsContainer');

let supabase = null;

connectButton.addEventListener('click', async () => {
  const url = supabaseUrlInput.value.trim();
  const key = supabaseKeyInput.value.trim();

  if (!url || !key) {
    connectMessage.textContent = 'Debes rellenar Project URL y Anon key.';
    return;
  }

  try {
    supabase = createClient(url, key);
    connectMessage.textContent = 'Conexión creada correctamente.';
    await refreshSessionInfo();
  } catch (error) {
    connectMessage.textContent = 'Error al crear la conexión: ' + error.message;
  }
});

registerButton.addEventListener('click', async () => {
  if (!supabase) {
    authMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const passwordConfirm = passwordConfirmInput.value;

  if (!email || !password || !passwordConfirm) {
    authMessage.textContent = 'Para registrarte debes rellenar email, contraseña y confirmación.';
    return;
  }

  if (password !== passwordConfirm) {
    authMessage.textContent = 'Las contraseñas no coinciden.';
    return;
  }

  if (password.length < 8) {
    authMessage.textContent = 'La contraseña debe tener al menos 8 caracteres.';
    return;
  }

  try {
    authMessage.textContent = 'Comprobando autorización del email...';

    const { data: isAuthorized, error: authCheckError } = await supabase.rpc('is_email_authorized', {
      p_email: email
    });

    if (authCheckError) {
      authMessage.textContent = 'Error al comprobar email autorizado: ' + authCheckError.message;
      return;
    }

    if (!isAuthorized) {
      authMessage.textContent = 'Tu correo no está autorizado para registrarse.';
      return;
    }

    authMessage.textContent = 'Creando cuenta...';

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      authMessage.textContent = 'Error en el registro: ' + error.message;
      return;
    }

    if (data.user && !data.session) {
      authMessage.textContent = 'Cuenta creada. Revisa tu correo para confirmar el registro antes de iniciar sesión.';
      return;
    }

    authMessage.textContent = 'Cuenta creada e inicio de sesión completado.';
    await refreshSessionInfo();
    await loadOwnProfile();
  } catch (error) {
    authMessage.textContent = 'Error inesperado en el registro: ' + error.message;
  }
});

loginButton.addEventListener('click', async () => {
  if (!supabase) {
    authMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!email || !password) {
    authMessage.textContent = 'Para iniciar sesión debes rellenar email y contraseña.';
    return;
  }

  try {
    authMessage.textContent = 'Iniciando sesión...';

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      authMessage.textContent = 'Error al iniciar sesión: ' + error.message;
      return;
    }

    authMessage.textContent = 'Sesión iniciada correctamente.';
    await refreshSessionInfo();
    await loadOwnProfile();
  } catch (error) {
    authMessage.textContent = 'Error inesperado al iniciar sesión: ' + error.message;
  }
});

logoutButton.addEventListener('click', async () => {
  if (!supabase) {
    sessionMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    sessionMessage.textContent = 'Error al cerrar sesión: ' + error.message;
    return;
  }

  sessionMessage.textContent = 'Sesión cerrada.';
  authMessage.textContent = '';
  profileMessage.textContent = '';
  displayNameInput.value = '';
});

loadProfileButton.addEventListener('click', async () => {
  if (!supabase) {
    profileMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  await loadOwnProfile();
});

saveProfileButton.addEventListener('click', async () => {
  if (!supabase) {
    profileMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    profileMessage.textContent = 'Error al obtener usuario: ' + userError.message;
    return;
  }

  if (!userData.user) {
    profileMessage.textContent = 'Debes iniciar sesión para guardar tu perfil.';
    return;
  }

  const displayName = displayNameInput.value.trim();

  if (displayName.length < 3 || displayName.length > 30) {
    profileMessage.textContent = 'El nombre visible debe tener entre 3 y 30 caracteres.';
    return;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName
      })
      .eq('id', userData.user.id);

    if (error) {
      profileMessage.textContent = 'Error al guardar el nombre visible: ' + error.message;
      return;
    }

    profileMessage.textContent = 'Nombre visible guardado correctamente.';
  } catch (error) {
    profileMessage.textContent = 'Error inesperado al guardar el perfil: ' + error.message;
  }
});

async function refreshSessionInfo() {
  if (!supabase) return;

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      sessionMessage.textContent = 'Error al comprobar sesión: ' + error.message;
      return;
    }

    if (!data.user) {
      sessionMessage.textContent = 'No hay ninguna sesión iniciada.';
      return;
    }

    sessionMessage.textContent = `Sesión iniciada como: ${data.user.email}`;
  } catch (error) {
    sessionMessage.textContent = 'Error inesperado al comprobar sesión: ' + error.message;
  }
}

async function loadOwnProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    profileMessage.textContent = 'Error al obtener usuario: ' + userError.message;
    return;
  }

  if (!userData.user) {
    profileMessage.textContent = 'Debes iniciar sesión para cargar tu perfil.';
    return;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, is_active')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (error) {
      profileMessage.textContent = 'Error al cargar el perfil: ' + error.message;
      return;
    }

    if (!data) {
      profileMessage.textContent = 'No se ha encontrado perfil para este usuario.';
      return;
    }

    displayNameInput.value = data.display_name || '';
    profileMessage.textContent = data.display_name
      ? `Perfil cargado. Nombre visible actual: ${data.display_name}`
      : 'Perfil cargado. Aún no has definido nombre visible.';
  } catch (error) {
    profileMessage.textContent = 'Error inesperado al cargar el perfil: ' + error.message;
  }
}

function isPlaceholderTeam(team) {
  if (!team) return true;
  const name = String(team.name || '').toLowerCase();
  return name.includes('tbc');
}

function getMatchState(match, homeTeam, awayTeam) {
  const hasFinalScore = match.home_score !== null && match.away_score !== null;

  if (hasFinalScore || match.status === 'finished') return 'played';
  if (!homeTeam || !awayTeam) return 'locked';
  if (isPlaceholderTeam(homeTeam) || isPlaceholderTeam(awayTeam)) return 'locked';
  return 'ready';
}

function getStateLabel(state) {
  if (state === 'played') return 'Jugado';
  if (state === 'ready') return 'Pronóstico habilitado';
  return 'Pendiente de confirmar';
}

function formatDate(dateString) {
  if (!dateString) return 'Sin fecha';

  return new Date(dateString).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderPhaseSection(phaseName, matches, teamsMap) {
  const section = document.createElement('section');
  section.className = 'team-card';
  section.style.marginBottom = '16px';

  const header = document.createElement('h2');
  header.textContent = phaseName;
  section.appendChild(header);

  matches.forEach((match) => {
    const homeTeam = teamsMap.get(Number(match.home_team_id));
    const awayTeam = teamsMap.get(Number(match.away_team_id));

    const homeName = homeTeam?.name ?? `Equipo ${match.home_team_id}`;
    const awayName = awayTeam?.name ?? `Equipo ${match.away_team_id}`;
    const state = getMatchState(match, homeTeam, awayTeam);
    const stateLabel = getStateLabel(state);

    const item = document.createElement('div');
    item.style.padding = '12px 0';
    item.innerHTML = `
      <h3>${homeName} vs ${awayName}</h3>
      <p><strong>Partido:</strong> ${match.match_number ?? 'Sin dato'}</p>
      <p><strong>Grupo:</strong> ${match.group_code ?? 'Eliminatoria'}</p>
      <p><strong>Inicio:</strong> ${formatDate(match.kickoff_at)}</p>
      <p><strong>Límite pronóstico:</strong> ${formatDate(match.prediction_deadline_at)}</p>
      <p><strong>Estado partido:</strong> ${match.status ?? 'Sin dato'}</p>
      <p><strong>Estado pronóstico:</strong> ${stateLabel}</p>
      <button ${state === 'ready' ? '' : 'disabled'}>${state === 'ready' ? 'Hacer pronóstico' : 'Pronóstico no disponible'}</button>
    `;

    section.appendChild(item);
  });

  return section;
}

loadButton.addEventListener('click', async () => {
  if (!supabase) {
    resultMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    resultMessage.textContent = 'Debes iniciar sesión antes de cargar partidos.';
    return;
  }

  resultMessage.textContent = 'Cargando partidos...';
  resultContainer.innerHTML = '';

  try {
    const [
      { data: teams, error: teamsError },
      { data: matches, error: matchesError },
      { data: stages, error: stagesError }
    ] = await Promise.all([
      supabase
        .from('teams')
        .select('id, name, short_name, fifa_code, group_code, is_active'),
      supabase
        .from('matches')
        .select(`
          id,
          match_number,
          stage_id,
          group_code,
          kickoff_at,
          prediction_deadline_at,
          venue_id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          home_score_et,
          away_score_et,
          home_penalties,
          away_penalties,
          winner_team_id,
          status
        `)
        .order('kickoff_at', { ascending: true })
        .order('match_number', { ascending: true })
        .limit(24),
      supabase
        .from('stages')
        .select('id, code, name, sort_order, is_knockout')
        .order('sort_order', { ascending: true })
    ]);

    if (teamsError) {
      resultMessage.textContent = 'Error al cargar teams: ' + teamsError.message;
      return;
    }

    if (matchesError) {
      resultMessage.textContent = 'Error al cargar matches: ' + matchesError.message;
      return;
    }

    if (stagesError) {
      resultMessage.textContent = 'Error al cargar stages: ' + stagesError.message;
      return;
    }

    if (!matches || matches.length === 0) {
      resultMessage.textContent = 'La tabla matches no devuelve datos.';
      return;
    }

    const teamsMap = new Map();
    teams.forEach((team) => teamsMap.set(Number(team.id), team));

    const stagesMap = new Map();
    stages.forEach((stage) => stagesMap.set(Number(stage.id), stage));

    const phaseOrder = stages.map(stage => ({
      id: Number(stage.id),
      name: stage.name,
      sort_order: Number(stage.sort_order ?? 9999)
    })).sort((a, b) => a.sort_order - b.sort_order);

    const grouped = new Map();
    matches.forEach((match) => {
      const stage = stagesMap.get(Number(match.stage_id));
      const phaseName = stage?.name || `Fase ${match.stage_id}`;
      if (!grouped.has(phaseName)) grouped.set(phaseName, []);
      grouped.get(phaseName).push(match);
    });

    resultMessage.textContent = `Partidos cargados: ${matches.length}`;

    phaseOrder.forEach(({ name }) => {
      const phaseMatches = grouped.get(name);
      if (phaseMatches && phaseMatches.length) {
        resultContainer.appendChild(renderPhaseSection(name, phaseMatches, teamsMap));
      }
    });

    grouped.forEach((phaseMatches, phaseName) => {
      if (!phaseOrder.some(phase => phase.name === phaseName)) {
        resultContainer.appendChild(renderPhaseSection(phaseName, phaseMatches, teamsMap));
      }
    });
  } catch (error) {
    resultMessage.textContent = 'Error inesperado: ' + error.message;
  }
});
