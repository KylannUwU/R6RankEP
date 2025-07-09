const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para loguear todas las solicitudes entrantes
app.use((req, res, next) => {
  console.log(`[DEBUG] Request URL: ${req.originalUrl}`);
  console.log(`[DEBUG] Method: ${req.method}`);
  next();
});

app.get('/rank/:username/:platform/:region', async (req, res) => {
  const { username, platform, region } = req.params;
  console.log(`[DEBUG] Parámetros recibidos - username: ${username}, platform: ${platform}, region: ${region}`);

  try {
    console.log(`[DEBUG] Consultando userId para usuario ${username} en plataforma ${platform}, región ${region}`);
    const profileRes = await axios.get('https://r6stats.esportsapp.gg/api/v1/profile', {
      params: { platform, username, region }
    });

    console.log('[DEBUG] Respuesta profile:', profileRes.data);

    const userId = profileRes.data?.userId;
    if (!userId) {
      console.log('[DEBUG] userId no encontrado en la respuesta');
      return res.send('❌ Usuario no encontrado');
    }

    console.log(`[DEBUG] userId encontrado: ${userId}. Consultando rango...`);

    const rankRes = await axios.get('https://r6stats.esportsapp.gg/api/v1/rank', {
      params: { userId, platform }
    });

    console.log('[DEBUG] Respuesta rank:', rankRes.data);

    const rankName = rankRes.data?.ranked?.rank_name || 'Desconocido';
    console.log(`[DEBUG] Rango encontrado: ${rankName}`);

    res.send(rankName);

  } catch (err) {
    console.error('[ERROR]', err.message);
    res.send('❌ Error al obtener el rango');
  }
});

app.get('/', (req, res) => {
  console.log('[DEBUG] Ruta raíz llamada');
  res.send('API de rango R6 lista 🎮');
});

app.listen(PORT, () => {
  console.log(`[DEBUG] Servidor activo en puerto ${PORT}`);
});
