import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrlInput = document.getElementById('supabaseUrl');
const supabaseKeyInput = document.getElementById('supabaseKey');
const connectButton = document.getElementById('connectButton');
const connectMessage = document.getElementById('connectMessage');

const loadTeamsButton = document.getElementById('loadTeamsButton');
const teamsMessage = document.getElementById('teamsMessage');
const teamsContainer = document.getElementById('teamsContainer');

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

loadTeamsButton.addEventListener('click', async () => {
  if (!supabase) {
    teamsMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  teamsMessage.textContent = 'Cargando equipos...';
  teamsContainer.innerHTML = '';

  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      teamsMessage.textContent = 'Error al cargar equipos: ' + error.message;
      return;
    }

    if (!data || data.length === 0) {
      teamsMessage.textContent = 'La tabla teams no devuelve datos.';
      return;
    }

    teamsMessage.textContent = `Equipos cargados: ${data.length}`;

    data.forEach((team) => {
      const card = document.createElement('div');
      card.className = 'team-card';

      card.innerHTML = `
        <h3>${team.name ?? 'Sin nombre'}</h3>
        <p><strong>ID:</strong> ${team.id ?? 'Sin dato'}</p>
        <p><strong>Código:</strong> ${team.code ?? 'Sin dato'}</p>
        <p><strong>Grupo:</strong> ${team.group_name ?? team.group_code ?? 'Sin dato'}</p>
      `;

      teamsContainer.appendChild(card);
    });
  } catch (error) {
    teamsMessage.textContent = 'Error inesperado: ' + error.message;
  }
});
