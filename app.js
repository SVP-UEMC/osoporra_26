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

function getMatchState(match) {
  const hasScore =
    match.home_score !== null &&
    match.away_score !== null;

  if (hasScore || match.status === 'finished') {
    return 'played';
  }

  const homeBlocked = isPlaceholderTeam(match.home_team);
  const awayBlocked = isPlaceholderTeam(match.away_team);

  if (homeBlocked || awayBlocked) {
    return 'locked';
  }

  return 'ready';
}

function getStateLabel(state) {
  if (state === 'played') return 'Jugado';
  if (state === 'ready') return 'Pronóstico habilitado';
  return 'Pendiente de confirmar';
}

loadButton.addEventListener('click', async () => {
  if (!supabase) {
    resultMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  resultMessage.textContent = 'Cargando partidos...';
  resultContainer.innerHTML = '';

  try {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        match_number,
        group_code,
        kickoff_at,
        prediction_deadline_at,
        status,
        home_score,
        away_score,
        home_score_et,
        away_score_et,
        home_penalties,
        away_penalties,
        home_team:home_team_id (
          id,
          name,
          short_name,
          fifa_code,
          group_code
        ),
        away_team:away_team_id (
          id,
          name,
          short_name,
          fifa_code,
          group_code
        )
      `)
      .order('kickoff_at', { ascending: true })
      .limit(20);

    if (error) {
      resultMessage.textContent = 'Error al cargar partidos: ' + error.message;
      return;
    }

    if (!data || data.length === 0) {
      resultMessage.textContent = 'La tabla matches no devuelve datos.';
      return;
    }

    resultMessage.textContent = `Partidos cargados: ${data.length}`;

    data.forEach((match) => {
      const card = document.createElement('div');
      card.className = 'team-card';

      const state = getMatchState(match);
      const homeName = match.home_team?.name ?? 'TBC';
      const awayName = match.away_team?.name ?? 'TBC';

      const button = state === 'ready'
        ? '<button>Hacer pronóstico</button>'
        : '<button disabled>Pronóstico no disponible</button>';

      card.innerHTML = `
        <h3>${homeName} vs ${awayName}</h3>
        <p><strong>Partido:</strong> ${match.match_number ?? 'Sin dato'}</p>
        <p><strong>Grupo:</strong> ${match.group_code ?? 'Eliminatoria'}</p>
        <p><strong>Fecha:</strong> ${match.kickoff_at ?? 'Sin fecha'}</p>
        <p><strong>Estado:</strong> ${getStateLabel(state)}</p>
        ${button}
      `;

      resultContainer.appendChild(card);
    });
  } catch (error) {
    resultMessage.textContent = 'Error inesperado: ' + error.message;
  }
});
