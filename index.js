import express from "express";
import axios from "axios";
import cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/rank/:platform/:username", async (req, res) => {
  const { platform, username } = req.params;
  console.log(`📥 Buscando a: ${username} en ${platform}`);

  const url = `https://r6.tracker.network/r6siege/profile/${platform}/${username}/overview`;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Buscar el texto del rango
    const rankElement = $('[data-v-6b3f4a85]:contains("Ranked")').first().next();
    const rankText = rankElement.text().trim();

    if (!rankText) {
      return res.status(404).json({ error: "No se pudo encontrar el rango." });
    }

    return res.json({
      username,
      platform,
      rank: rankText,
    });

  } catch (error) {
    console.error("🔥 Error al obtener los datos:", error.message);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.get("/", (req, res) => {
  res.send("✅ API de rango de Rainbow Six Siege activa.");
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
