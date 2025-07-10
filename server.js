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

// Función para obtener el rango usando múltiples APIs
async function getR6Rank(username) {
  try {
    // Primero intentamos con R6Stats
    console.log(`Searching for player: ${username}`);
    
    const searchResponse = await axios.get(`https://r6stats.com/api/player-search/${username}/pc`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('Search response:', searchResponse.data);
    
    if (searchResponse.data && searchResponse.data.length > 0) {
      const player = searchResponse.data[0];
      const playerId = player.id;
      
      console.log(`Found player: ${player.username} (ID: ${playerId})`);
      
      // Obtenemos las estadísticas del jugador
      const statsResponse = await axios.get(`https://r6stats.com/api/player/${playerId}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log('Stats response status:', statsResponse.status);
      
      if (statsResponse.data && statsResponse.data.player) {
        const playerData = statsResponse.data.player;
        
        // Verificamos si tiene datos de ranked
        if (playerData.ranked && playerData.ranked.rank !== undefined) {
          const rankId = playerData.ranked.rank;
          const mmr = playerData.ranked.mmr || 0;
          const rankName = rankMap[rankId] || "Unknown";
          
          return {
            success: true,
            username: player.username,
            rank: rankName,
            mmr: mmr,
            source: 'r6stats'
          };
        }
        
        // Si no tiene datos de ranked, intentamos con seasons
        if (playerData.seasons) {
          const seasonKeys = Object.keys(playerData.seasons);
          const latestSeason = seasonKeys[seasonKeys.length - 1];
          const currentSeason = playerData.seasons[latestSeason];
          
          if (currentSeason && currentSeason.ranked) {
            const rankId = currentSeason.ranked.rank;
            const mmr = currentSeason.ranked.mmr || 0;
            const rankName = rankMap[rankId] || "Unknown";
            
            return {
              success: true,
              username: player.username,
              rank: rankName,
              mmr: mmr,
              season: latestSeason,
              source: 'r6stats'
            };
          }
        }
      }
    }
    
    // Si R6Stats no funciona, intentamos con API alternativa
    return await getR6RankAlternative(username);
    
  } catch (error) {
    console.error('Error with R6Stats:', error.message);
    // Intentamos con API alternativa
    return await getR6RankAlternative(username);
  }
}

// Función alternativa usando otra API
async function getR6RankAlternative(username) {
  try {
    console.log(`Trying alternative API for: ${username}`);
    
    // Usamos la API de R6Tab como backup
    const response = await axios.get(`https://r6tab.com/api/search.php?platform=uplay&search=${username}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      const player = response.data.results[0];
      
      // Obtenemos datos detallados del jugador
      const detailResponse = await axios.get(`https://r6tab.com/api/player.php?p_id=${player.p_id}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (detailResponse.data && detailResponse.data.ranked) {
        const rankId = detailResponse.data.ranked.rank;
        const mmr = detailResponse.data.ranked.mmr || 0;
        const rankName = rankMap[rankId] || "Unknown";
        
        return {
          success: true,
          username: player.p_name,
          rank: rankName,
          mmr: mmr,
          source: 'r6tab'
        };
      }
    }
    
    return { success: false, message: "Player not found in any database" };
    
  } catch (error) {
    console.error('Error with alternative API:', error.message);
    return { success: false, message: "All APIs failed" };
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
  
  console.log(`StreamElements request for: ${username}`);
  
  try {
    const result = await getR6Rank(username);
    
    if (result.success) {
      // Respuesta simple para StreamElements
      console.log(`Success: ${username} -> ${result.rank}`);
      res.send(`${result.rank}`);
    } else {
      console.log(`Failed: ${username} -> ${result.message}`);
      res.status(404).send("Player not found");
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send("Error fetching data");
  }
});

// Endpoint de debug para probar manualmente
app.get('/debug/:username', async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }
  
  console.log(`Debug request for: ${username}`);
  
  try {
    const result = await getR6Rank(username);
    
    res.json({
      username: username,
      timestamp: new Date().toISOString(),
      result: result,
      debug: true
    });
    
  } catch (error) {
    res.status(500).json({
      username: username,
      timestamp: new Date().toISOString(),
      error: error.message,
      debug: true
    });
  }
});

// Endpoint de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: "R6 Siege Rank API",
    status: "online",
    timestamp: new Date().toISOString(),
    endpoints: {
      "/rank/:username": "Get detailed rank info",
      "/se/:username": "Get simple rank for StreamElements",
      "/debug/:username": "Debug endpoint with full response"
    },
    example: {
      streamElements: "https://r6rank.up.railway.app/se/dedreviil12",
      debug: "https://r6rank.up.railway.app/debug/dedreviil12"
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
