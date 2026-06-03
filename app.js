import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrlInput = document.getElementById('supabaseUrl');
const supabaseKeyInput = document.getElementById('supabaseKey');
const connectButton = document.getElementById('connectButton');
const connectMessage = document.getElementById('connectMessage');

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
  } catch (error) {
    connectMessage.textContent = 'Error al crear la conexión: ' + error.message;
  }
});

function isPlaceholderTeam(team) {
  if (!team) return true;
  const name = (team.name || '').toLowerCase();
  return name.includes('tbc');
}

function getMatchState(match, homeTeam, awayTeam) {
  const hasFinalScore = match.home_score !== null && match.away_score !== null;

  if (hasFinalScore || match.status === 'finished') {
    return 'played';
  }

  if (!homeTeam || !awayTeam) {
    return 'locked';
  }

  if (isPlaceholderTeam(homeTeam) || isPlaceholderTeam(awayTeam)) {
    return 'locked';
  }

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

loadButton.addEventListener('click', async () => {
  if (!supabase) {
    resultMessage.textContent = 'Primero conecta con Supabase.';
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
        .select('*')
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
    teams.forEach(team => teamsMap.set(team.id, team));

    const stagesMap = new Map();
    stages.forEach(stage => stagesMap.set(stage.id, stage));

    resultMessage.textContent = `Partidos cargados: ${matches.length}`;

    matches.forEach((match) => {
      const card = document.createElement('div');
      card.className = 'team-card';

      const homeTeam = teamsMap.get(match.home_team_id);
      const awayTeam = teamsMap.get(match.away_team_id);
      const stage = stagesMap.get(match.stage_id);

      const homeName = homeTeam?.name ?? `Equipo ${match.home_team_id}`;
      const awayName = awayTeam?.name ?? `Equipo ${match.away_team_id}`;
      const stageName = stage?.name ?? `Fase ${match.stage_id}`;

      const state = getMatchState(match, homeTeam, awayTeam);
      const stateLabel = getStateLabel(state);

      const buttonHtml = state === 'ready'
        ? '<button>Hacer pronóstico</button>'
        : '<button disabled>Pronóstico no disponible</button>';

      card.innerHTML = `
        <h3>${homeName} vs ${awayName}</h3>
        <p><strong>Partido:</strong> ${match.match_number ?? 'Sin dato'}</p>
        <p><strong>Fase:</strong> ${stageName}</p>
        <p><strong>Grupo:</strong> ${match.group_code ?? 'Eliminatoria'}</p>
        <p><strong>Inicio:</strong> ${formatDate(match.kickoff_at)}</p>
        <p><strong>Límite pronóstico:</strong> ${formatDate(match.prediction_deadline_at)}</p>
        <p><strong>Estado partido:</strong> ${match.status ?? 'Sin dato'}</p>
        <p><strong>Estado pronóstico:</strong> ${stateLabel}</p>
        ${buttonHtml}
      `;

      resultContainer.appendChild(card);
    });
  } catch (error) {
    resultMessage.textContent = 'Error inesperado: ' + error.message;
  }
});
