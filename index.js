const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/check/:username/:platform/:region', async (req, res) => {
  const { username, platform, region } = req.params;

  try {
    const response = await axios.get('https://r6stats.esportsapp.gg/api/v1/profile', {
      params: { username, platform, region }
    });

    if (response.data?.userId) {
      return res.send('Información recibida');
    } else {
      return res.send('Usuario no encontrado');
    }
  } catch (error) {
    console.error('Error al consultar API:', error.message);
    res.send('Error al obtener la información');
  }
});

app.get('/', (req, res) => {
  res.send('Servidor simple R6 funcionando');
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
