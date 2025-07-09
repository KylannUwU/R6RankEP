const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('API R6 funcionando 🎮');
});

app.get('/rank/:platform/:username', async (req, res) => {
  const { platform, username } = req.params;
  const url = `https://r6.tracker.network/r6siege/profile/${platform}/${username}/overview`;

  console.log(`📥 Buscando a: ${username} en ${platform}`);
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(html);
    
    // DEBUG: Verifica si cargó correctamente la página
    const title = $('title').text();
    console.log(`✅ Título de la página: ${title}`);

    // Cambia aquí si los selectores fallan
    const rank = $('[data-v-19b9b93b] .trn-defstat__name').first().text().trim();
    const mmr = $('[data-v-19b9b93b] .trn-defstat__value').first().text().trim();
    const image = $('img.trn-defstat__image').first().attr('src');

    // DEBUG
    console.log(`🔍 Rank: ${rank}, MMR: ${mmr}, Img: ${image}`);

    if (!rank) {
      console.warn('⚠️ Rango no encontrado. Es posible que los selectores estén desactualizados.');
      return res.status(404).json({ error: 'Usuario no encontrado o sin rango' });
    }

    res.json({
      username,
      platform,
      rank,
      mmr,
      image: image?.startsWith('http') ? image : `https://r6.tracker.network${image}`
    });

  } catch (err) {
    console.error('🔥 Error al obtener los datos:', err.message);
    res.status(500).json({ error: 'Error interno al obtener datos', message: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor activo en puerto ${port}`);
});
