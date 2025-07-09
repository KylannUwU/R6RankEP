const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("API de R6 con SwiftCODA");
});

app.get("/rank/:platform/:username", async (req, res) => {
  const { platform, username } = req.params;

  try {
    const response = await axios.get(`https://api.r6stats.com/api/v1/players/${username}?platform=${platform}`);
    const data = response.data;

    if (!data || !data.player) {
      return res.status(404).json({ error: "Jugador no encontrado" });
    }

    const { rank, level, mmr, kd, wins, losses } = data.player.stats.general;

    res.json({
      username,
      platform,
      level,
      rank,
      mmr,
      kd,
      wins,
      losses,
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Error al consultar los datos" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en el puerto ${PORT}`);
});
