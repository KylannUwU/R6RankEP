import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/rank/:username", async (req, res) => {
  const { username } = req.params;

  const profileUrl = `https://r6.tracker.network/r6siege/profile/ubi/${username}/overview`;

  try {
    console.log(`📥 Buscando a: ${username}`);

    const response = await axios.get(profileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const $ = cheerio.load(response.data);

    const rank = $('div.inline-flex.gap-1.overflow-hidden.text-14.text-secondary > span.truncate').text().trim();

    if (!rank) {
      console.log("⚠️ Rango no encontrado.");
      return res.status(404).json({ error: "Rango no encontrado" });
    }

    console.log(`✅ Rango encontrado: ${rank}`);
    res.json({ username, rank });

  } catch (error) {
    console.error("🔥 Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error al obtener datos del perfil" });
  }
});

app.get("/", (req, res) => {
  res.send("🛡️ R6 Rank API está funcionando.");
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en el puerto ${PORT}`);
});
