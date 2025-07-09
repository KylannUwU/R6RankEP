import express from "express";
import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/rank/:username", async (req, res) => {
  const { username } = req.params;
  const url = `https://r6.tracker.network/r6siege/profile/ubi/${username}/overview`;

  try {
    console.log(`📥 Buscando rango de: ${username}`);

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

    // Esperar el elemento del rango
    await page.waitForSelector("span.truncate");

    const rank = await page.$eval("span.truncate", el => el.textContent.trim());

    await browser.close();

    if (!rank) {
      console.log("⚠️ Rango no encontrado.");
      return res.status(404).json({ error: "Rango no encontrado" });
    }

    console.log(`✅ Rango de ${username}: ${rank}`);
    res.json({ username, rank });

  } catch (error) {
    console.error("🔥 Error:", error.message);
    res.status(500).json({ error: "Error al obtener datos del perfil" });
  }
});

app.get("/", (req, res) => {
  res.send("🛡️ R6 Rank Puppeteer API corriendo.");
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
