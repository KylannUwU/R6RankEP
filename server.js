const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Configuración de headers para evitar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Mapeo de rangos de R6 Siege
const rankMap = {
  0: "Unranked",
  1: "Copper V",
  2: "Copper IV", 
  3: "Copper III",
  4: "Copper II",
  5: "Copper I",
  6: "Bronze V",
  7: "Bronze IV",
  8: "Bronze III", 
  9: "Bronze II",
  10: "Bronze I",
  11: "Silver V",
  12: "Silver IV",
  13: "Silver III",
  14: "Silver II", 
  15: "Silver I",
  16: "Gold V",
  17: "Gold IV",
  18: "Gold III",
  19: "Gold II",
  20: "Gold I",
  21: "Platinum V",
  22: "Platinum IV",
  23: "Platinum III",
  24: "Platinum II",
  25: "Platinum I",
  26: "Diamond V",
  27: "Diamond IV",
  28: "Diamond III",
  29: "Diamond II",
  30: "Diamond I",
  31: "Champion"
};

// Función para obtener el rango usando la API no oficial de R6
async function getR6Rank(username) {
  try {
    // Usamos la API pública de R6Stats
    const response = await axios.get(`https://r6stats.com/api/player-search/${username}/pc`);
    
    if (response.data && response.data.length > 0) {
      const player = response.data[0];
      const playerId = player.id;
      
      // Obtenemos las estadísticas del jugador
      const statsResponse = await axios.get(`https://r6stats.com/api/player/${playerId}`);
      
      if (statsResponse.data && statsResponse.data.player) {
        const seasonStats = statsResponse.data.player.seasons;
        
        // Obtenemos la temporada más reciente
        const latestSeason = Object.keys(seasonStats).pop();
        const currentSeason = seasonStats[latestSeason];
        
        if (currentSeason && currentSeason.ranked) {
          const rankId = currentSeason.ranked.rank;
          const mmr = currentSeason.ranked.mmr;
          const rankName = rankMap[rankId] || "Unknown";
          
          return {
            success: true,
            username: player.username,
            rank: rankName,
            mmr: mmr,
            season: latestSeason
          };
        }
      }
    }
    
    return { success: false, message: "Player not found or no ranked data available" };
    
  } catch (error) {
    console.error('Error fetching R6 stats:', error.message);
    return { success: false, message: "Error fetching player data" };
  }
}

// Endpoint principal para obtener el rango
app.get('/rank/:username', async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({ 
      success: false, 
      message: "Username is required" 
    });
  }
  
  try {
    const result = await getR6Rank(username);
    
    if (result.success) {
      // Formato para StreamElements
      res.json({
        success: true,
        message: `${result.username}: ${result.rank} (${result.mmr} MMR)`,
        data: result
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Endpoint alternativo para StreamElements (formato más simple)
app.get('/se/:username', async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).send("Username required");
  }
  
  try {
    const result = await getR6Rank(username);
    
    if (result.success) {
      // Respuesta simple para StreamElements
      res.send(`${result.rank}`);
    } else {
      res.status(404).send("Player not found");
    }
    
  } catch (error) {
    res.status(500).send("Error fetching data");
  }
});

// Endpoint de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: "R6 Siege Rank API",
    endpoints: {
      "/rank/:username": "Get detailed rank info",
      "/se/:username": "Get simple rank for StreamElements"
    }
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Something went wrong!" 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
