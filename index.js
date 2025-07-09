const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/rank/:username/:platform/:region', async (req, res) => {
  const { username, platform, region } = req.params;

  try {
    // 1. Obtener userId
    const profileRes = await axios.get('https://r6stats.esportsapp.gg/api/v1/profile', {
      params: {
        platform,
        username,
        region
      }
    });

    const userId = profileRes.data?.userId;
    if (!userId) return res.send('❌ Usuario no encontrado');

    // 2. Obtener rango
    const rankRes = await axios.get('https://r6stats.esportsapp.gg/api/v1/rank', {
      params: {
        userId,
        platform
      }
    });

    const rankName = rankRes.data?.ranked?.rank_name || 'Desconocido';
    res.send(rankName);

  } catch (err) {
    console.error(err.message);
    res.send('❌ Error al obtener el rango');
  }
});

app.get('/', (req, res) => {
  res.send('API de rango R6 lista 🎮');
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
