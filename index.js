import axios from "axios";
import cheerio from "cheerio";

async function getR6Rank(username) {
  try {
    const url = `https://r6.tracker.network/r6siege/profile/ubi/${username}/overview`;
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    // Selector para el span del rango
    const rank = $('div.inline-flex.gap-1.overflow-hidden.text-14.text-secondary > span.truncate').text().trim();

    if (!rank) {
      return { error: "No se encontró el rango" };
    }
    return { username, rank };
  } catch (error) {
    return { error: error.message };
  }
}

// Prueba
getR6Rank("Pengu").then(console.log);
