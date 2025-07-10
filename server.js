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

// Mapeo de rangos de R6 Siege (actualizado 2025)
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

// Función principal para obtener el rango
async function getR6Rank(username) {
  console.log(`Buscando jugador: ${username}`);
  
  // Método 1: Tracker.gg (más confiable)
  const trackerResult = await tryTrackerGG(username);
  if (trackerResult.success) {
    return trackerResult;
  }
  
  // Método 2: R6Tab como respaldo
  const r6tabResult = await tryR6Tab(username);
  if (r6tabResult.success) {
    return r6tabResult;
  }
  
  // Método 3: API no oficial
  const unofficialResult = await tryUnofficialAPI(username);
  if (unofficialResult.success) {
    return unofficialResult;
  }
  
  // Si todo falla, error
  return {
    success: false,
    message: "No se pudo encontrar el jugador o las APIs están fuera de servicio"
  };
}

// Método 1: Tracker.gg (scraping de la web)
async function tryTrackerGG(username) {
  try {
    console.log(`Intentando Tracker.gg para: ${username}`);
    
    // Usando la URL pública de Tracker.gg
    const url = `https://r6.tracker.network/r6siege/profile/ubi/${username}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    // Buscar el rango en el HTML (scraping básico)
    const html = response.data;
    
    // Buscar patrones de rango en el HTML
    const rankPatterns = [
      /Rank.*?([A-Z][a-z]+ [IVX]+)/g,
      /Current Rank.*?([A-Z][a-z]+ [IVX]+)/g,
      /class="rank-text"[^>]*>([^<]+)/g
    ];
    
    for (const pattern of rankPatterns) {
      const match = html.match(pattern);
      if (match) {
        const rankText = match[1] || match[0];
        const cleanRank = rankText.replace(/[^a-zA-Z\s]/g, '').trim();
        
        if (cleanRank && cleanRank !== 'Rank') {
          return {
            success: true,
            username: username,
            rank: cleanRank,
            mmr: 0,
            source: 'tracker.gg-scraping'
          };
        }
      }
    }
    
    return { success: false, message: 'No se pudo extraer el rango del HTML' };
    
  } catch (error) {
    console.error('Error con Tracker.gg:', error.message);
    return { success: false, message: 'Error con Tracker.gg' };
  }
}

// Método 2: R6Tab (mejorado)
async function tryR6Tab(username) {
  try {
    console.log(`Intentando R6Tab para: ${username}`);
    
    // Buscar jugador
    const searchUrl = `https://r6tab.com/api/search.php?platform=uplay&search=${encodeURIComponent(username)}`;
    const searchResponse = await axios.get(searchUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (searchResponse.data?.results?.length > 0) {
      const player = searchResponse.data.results[0];
      
      // Obtener detalles del jugador
      const detailUrl = `https://r6tab.com/api/player.php?p_id=${player.p_id}`;
      const detailResponse = await axios.get(detailUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      const playerData = detailResponse.data;
      
      // Verificar datos de ranked
      if (playerData?.ranked?.rank !== undefined) {
        const rankId = playerData.ranked.rank;
        const mmr = playerData.ranked.mmr || 0;
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
    
    return { success: false, message: 'No se encontraron datos en R6Tab' };
    
  } catch (error) {
    console.error('Error con R6Tab:', error.message);
    return { success: false, message: 'Error con R6Tab' };
  }
}

// Método 3: API no oficial (como último recurso)
async function tryUnofficialAPI(username) {
  try {
    console.log(`Intentando API no oficial para: ${username}`);
    
    // Usando R6Stats API (si está disponible)
    const response = await axios.get(`https://r6stats.com/api/v1/players/${username}`, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.data?.player) {
      const player = response.data.player;
      if (player.rank) {
        return {
          success: true,
          username: username,
          rank: player.rank.name || "Unknown",
          mmr: player.rank.mmr || 0,
          source: 'r6stats'
        };
      }
    }
    
    return { success: false, message: 'No se encontraron datos en API no oficial' };
    
  } catch (error) {
    console.error('Error con API no oficial:', error.message);
    return { success: false, message: 'Error con API no oficial' };
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
      res.json({
        success: true,
        message: `${result.username}: ${result.rank}${result.mmr ? ` (${result.mmr} MMR)` : ''}`,
        data: result
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('Error inesperado:', error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

// Endpoint para StreamElements (formato simple)
app.get('/se/:username', async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).send("Username required");
  }
  
  console.log(`Petición de StreamElements para: ${username}`);
  
  try {
    const result = await getR6Rank(username);
    
    if (result.success) {
      console.log(`Éxito: ${username} -> ${result.rank}`);
      res.send(result.rank);
    } else {
      console.log(`Fallo: ${username} -> ${result.message}`);
      res.status(404).send("Player not found");
    }
    
  } catch (error) {
    console.error('Error inesperado:', error);
    res.status(500).send("Error fetching data");
  }
});

// Endpoint de debug
app.get('/debug/:username', async (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }
  
  console.log(`Petición de debug para: ${username}`);
  
  try {
    const result = await getR6Rank(username);
    
    res.json({
      username: username,
      timestamp: new Date().toISOString(),
      result: result,
      debug: true,
      availableMethods: ['tracker.gg', 'r6tab', 'unofficial-api']
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

// Endpoint de prueba de conectividad
app.get('/test', async (req, res) => {
  const testUsername = "Test.Player";
  
  try {
    // Probar cada método
    const trackerTest = await tryTrackerGG(testUsername);
    const r6tabTest = await tryR6Tab(testUsername);
    const unofficialTest = await tryUnofficialAPI(testUsername);
    
    res.json({
      timestamp: new Date().toISOString(),
      apiStatus: {
        trackerGG: trackerTest.success ? 'Working' : 'Failed',
        r6tab: r6tabTest.success ? 'Working' : 'Failed',
        unofficial: unofficialTest.success ? 'Working' : 'Failed'
      },
      details: {
        trackerGG: trackerTest.message,
        r6tab: r6tabTest.message,
        unofficial: unofficialTest.message
      }
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Página de inicio
app.get('/', (req, res) => {
  res.json({ 
    message: "R6 Siege Rank API - Versión Mejorada",
    status: "online",
    timestamp: new Date().toISOString(),
    endpoints: {
      "/rank/:username": "Obtener información detallada del rango",
      "/se/:username": "Obtener rango simple para StreamElements",
      "/debug/:username": "Endpoint de debug con respuesta completa",
      "/test": "Probar conectividad con todas las APIs"
    },
    example: {
      streamElements: `/se/${req.get('host') ? req.get('host') : 'localhost:3000'}/dedreviil12`,
      debug: `/debug/${req.get('host') ? req.get('host') : 'localhost:3000'}/dedreviil12`,
      test: `/test`
    },
    instructions: {
      streamElements: "Usa el endpoint /se/:username en tu comando de StreamElements",
      note: "El sistema probará múltiples APIs automáticamente"
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
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Prueba la API en: http://localhost:${PORT}/test`);
});
