import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrlInput = document.getElementById('supabaseUrl');
const supabaseKeyInput = document.getElementById('supabaseKey');
const connectButton = document.getElementById('connectButton');
const connectMessage = document.getElementById('connectMessage');

const emailInput = document.getElementById('emailInput');
const sendOtpButton = document.getElementById('sendOtpButton');
const checkSessionButton = document.getElementById('checkSessionButton');
const logoutButton = document.getElementById('logoutButton');
const authMessage = document.getElementById('authMessage');
const sessionMessage = document.getElementById('sessionMessage');

const loadButton = document.getElementById('loadTeamsButton');
const resultMessage = document.getElementById('teamsMessage');
const resultContainer = document.getElementById('teamsContainer');

let supabase = null;

const allowedEmails = [
  'sulo13@hotmail.com'
  // añade aquí los correos autorizados temporalmente
];

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
    await handleAuthRedirect();
    await refreshSessionInfo();
  } catch (error) {
    connectMessage.textContent = 'Error al crear la conexión: ' + error.message;
  }
});

sendOtpButton.addEventListener('click', async () => {
  if (!supabase) {
    authMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  const email = emailInput.value.trim().toLowerCase();

  if (!email) {
    authMessage.textContent = 'Introduce un correo electrónico.';
    return;
  }

  if (!allowedEmails.includes(email)) {
    authMessage.textContent = 'Este correo no está autorizado para acceder.';
    return;
  }

  authMessage.textContent = 'Enviando acceso...';

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) {
      authMessage.textContent = 'Error al enviar el acceso: ' + error.message;
      return;
    }

    authMessage.textContent = 'Te hemos enviado un enlace de acceso al correo.';
  } catch (error) {
    authMessage.textContent = 'Error inesperado al iniciar acceso: ' + error.message;
  }
});

checkSessionButton.addEventListener('click', async () => {
  if (!supabase) {
    sessionMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  await refreshSessionInfo();
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
});

async function handleAuthRedirect() {
  if (!supabase) return;

  const url = new URL(window.location.href);
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.substring(1)
    : window.location.hash;

  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  const hashError = hashParams.get('error_description') || hashParams.get('error');

  if (accessToken && refreshToken) {
    try {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        authMessage.textContent = 'Error al completar el acceso: ' + error.message;
        return;
      }

      window.history.replaceState({}, document.title, url.pathname);
      authMessage.textContent = 'Acceso completado correctamente.';
      return;
    } catch (error) {
      authMessage.textContent = 'Error inesperado al procesar el acceso: ' + error.message;
      return;
    }
  }

  const code = url.searchParams.get('code');

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        authMessage.textContent = 'Error al completar el acceso: ' + error.message;
        return;
      }

      url.searchParams.delete('code');
      window.history.replaceState({}, document.title, url.pathname);
      authMessage.textContent = 'Acceso completado correctamente.';
      return;
    } catch (error) {
      authMessage.textContent = 'Error inesperado al procesar el código: ' + error.message;
      return;
    }
  }

  if (hashError) {
    authMessage.textContent = 'El enlace de acceso es inválido o ha expirado. Solicita uno nuevo.';
  }
}

async function refreshSessionInfo() {
  if (!supabase) return;

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      sessionMessage.textContent = 'Error al comprobar sesión: ' + error.message;
      return;
    }

    const user = data.user;

    if (!user) {
      sessionMessage.textContent = 'No hay ninguna sesión iniciada.';
      return;
    }

    const email = (user.email || '').toLowerCase();

    if (!allowedEmails.includes(email)) {
      await supabase.auth.signOut();
      sessionMessage.textContent = 'Tu cuenta ha iniciado sesión, pero no está autorizada para usar esta aplicación.';
      return;
    }

    sessionMessage.textContent = `Sesión iniciada como: ${email}`;
  } catch (error) {
    sessionMessage.textContent = 'Error inesperado al comprobar sesión: ' + error.message;
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
