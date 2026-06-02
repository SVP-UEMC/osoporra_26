import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrlInput = document.getElementById('supabaseUrl');
const supabaseKeyInput = document.getElementById('supabaseKey');
const connectButton = document.getElementById('connectButton');
const connectMessage = document.getElementById('connectMessage');

const emailInput = document.getElementById('email');
const loginButton = document.getElementById('loginButton');
const sessionButton = document.getElementById('sessionButton');
const authMessage = document.getElementById('authMessage');

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

loginButton.addEventListener('click', async () => {
  if (!supabase) {
    authMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  const email = emailInput.value.trim();

  if (!email) {
    authMessage.textContent = 'Debes escribir tu email.';
    return;
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://svp-uemc.github.io/osoporra_26/'
      }
    });

    if (error) {
      authMessage.textContent = 'Error enviando magic link: ' + error.message;
      return;
    }

    authMessage.textContent = 'Magic link enviado. Revisa tu correo.';
  } catch (error) {
    authMessage.textContent = 'Error inesperado: ' + error.message;
  }
});

sessionButton.addEventListener('click', async () => {
  if (!supabase) {
    authMessage.textContent = 'Primero conecta con Supabase.';
    return;
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      authMessage.textContent = 'Error al comprobar sesión: ' + error.message;
      return;
    }

    if (data.session) {
      authMessage.textContent = 'Sesión activa con: ' + data.session.user.email;
    } else {
      authMessage.textContent = 'No hay sesión activa.';
    }
  } catch (error) {
    authMessage.textContent = 'Error inesperado: ' + error.message;
  }
});
