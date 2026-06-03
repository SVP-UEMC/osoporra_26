import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrlInput = document.getElementById('supabaseUrl');
const supabaseKeyInput = document.getElementById('supabaseKey');
const connectButton = document.getElementById('connectButton');
const connectMessage = document.getElementById('connectMessage');

const loadMatchesButton = document.getElementById('loadTeamsButton');
const matchesMessage = document.getElementById('teamsMessage');
const matchesContainer = document.getElementById('teamsContainer');

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

loadMatchesButton.addEventListener('click', async () => {
  if (!supabase) {
    matchesMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  matchesMessage.textContent = 'Cargando partidos...';
  matchesContainer.innerHTML = '';

  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('id', { ascending: true })
      .limit(2);

    if (error) {
      matchesMessage.textContent = 'Error al cargar partidos: ' + error.message;
      return;
    }

    if (!data || data.length === 0) {
      matchesMessage.textContent = 'La tabla matches no devuelve datos.';
      return;
    }

    matchesMessage.textContent = `Partidos cargados: ${data.length}`;

    data.forEach((match) => {
      const card = document.createElement('div');
      card.className = 'team-card';
      card.innerHTML = `<pre>${JSON.stringify(match, null, 2)}</pre>`;
      matchesContainer.appendChild(card);
    });
  } catch (error) {
    matchesMessage.textContent = 'Error inesperado: ' + error.message;
  }
});
