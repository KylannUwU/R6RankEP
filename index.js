const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("✅ API de Rainbow Six Siege está activa.");
});

app.get("/rank/:platform/:user", async (req, res) => {
  const { platform, user } = req.params;
  const url = `https://r6.tracker.network/r6siege/profile/${platform}/${user}/overview`;

  try {
    console.log(`📥 Buscando a: ${user} en ${platform}`);
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Buscar el primer valor de stats (generalmente el rango)
    const rankText = $("span.trn-defstat__value").first().text().trim();
    console.log("🏅 Rank detectado:", rankText);

    if (!rankText || rankText === "") {
      return res.status(404).json({ error: "No se encontró rango para el usuario." });
    }

    res.json({
      user,
      platform,
      rank: rankText,
    });
  } catch (error) {
    console.error("🔥 Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Fallo en scraping o el usuario no existe." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en puerto ${PORT}`);
});
