const express = require('express');
const R6 = require('r6s-stats-api');

const app = express();
const port = process.env.PORT || 8080;

app.get('/rank/:platform/:username', async (req, res) => {
  const { platform, username } = req.params;

  try {
    const general = await R6.general(platform, username);

    if (!general || !general.username) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      username: general.username,
      level: general.level,
      rank_name: general.ranked ? general.ranked.rank_name : 'Unranked',
      rank_points: general.ranked ? general.ranked.rank_points : 0,
      wins: general.ranked ? general.ranked.wins : 0,
      losses: general.ranked ? general.ranked.losses : 0,
      kills: general.ranked ? general.ranked.kills : 0,
      deaths: general.ranked ? general.ranked.deaths : 0,
      rank_image: general.ranked ? general.ranked.rankImage : null,
    });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

app.get('/', (req, res) => {
  res.send('API R6 Rank funcionando');
});

app.listen(port, () => {
  console.log(`Servidor activo en puerto ${port}`);
});
