from flask import Flask, jsonify
import requests
from bs4 import BeautifulSoup
import time
import logging

app = Flask(__name__)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_r6_rank(username):
    """
    Obtiene el rango de R6 Siege de un usuario desde R6 Tracker
    """
    try:
        # URL del perfil
        url = f"https://r6.tracker.network/r6siege/profile/ubi/{username}/overview"
        
        # Headers para simular un navegador real
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Realizar la petición
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 404:
            return {"error": "Usuario no encontrado", "rank": None}
        
        if response.status_code != 200:
            return {"error": f"Error al acceder a la página: {response.status_code}", "rank": None}
        
        # Parsear el HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Buscar el rango actual (puede variar según la estructura de la página)
        # Intentar varios selectores posibles
        rank_selectors = [
            '.trn-defstat__value',
            '.rank-text',
            '.current-rank',
            '.trn-text--dimmed',
            '[data-v-tooltip="Current Rank"]',
            '.segment-stat__value'
        ]
        
        rank = None
        
        # Buscar en diferentes secciones de la página
        for selector in rank_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(strip=True)
                # Verificar si contiene palabras clave de rangos
                rank_keywords = ['copper', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion', 'unranked']
                if any(keyword in text.lower() for keyword in rank_keywords):
                    rank = text
                    break
            if rank:
                break
        
        # Si no encontramos el rango con los selectores, buscar por texto
        if not rank:
            # Buscar spans que contengan información de rango
            all_spans = soup.find_all(['span', 'div', 'p'])
            for span in all_spans:
                text = span.get_text(strip=True)
                if any(keyword in text.lower() for keyword in ['copper', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion']):
                    # Verificar que no sea un texto muy largo (probablemente es el rango)
                    if len(text) < 50:
                        rank = text
                        break
        
        if not rank:
            return {"error": "No se pudo encontrar el rango", "rank": "Unranked"}
        
        return {"rank": rank, "error": None}
        
    except requests.exceptions.Timeout:
        return {"error": "Timeout al acceder a R6 Tracker", "rank": None}
    except requests.exceptions.RequestException as e:
        return {"error": f"Error de conexión: {str(e)}", "rank": None}
    except Exception as e:
        logger.error(f"Error inesperado: {str(e)}")
        return {"error": f"Error inesperado: {str(e)}", "rank": None}

@app.route('/')
def home():
    return jsonify({
        "message": "R6 Rank Scraper API",
        "usage": "/rank/<username>",
        "example": "/rank/dedreviil12"
    })

@app.route('/rank/<username>')
def get_rank(username):
    """
    Endpoint para obtener el rango de un usuario
    """
    if not username:
        return jsonify({"error": "Username is required"}), 400
    
    logger.info(f"Obteniendo rango para usuario: {username}")
    
    result = get_r6_rank(username)
    
    if result["error"]:
        return jsonify(result), 400
    
    # Retornar solo el rango como texto plano o JSON según prefieras
    return jsonify({
        "username": username,
        "rank": result["rank"]
    })

@app.route('/rank/<username>/text')
def get_rank_text(username):
    """
    Endpoint que retorna solo el rango como texto plano
    """
    if not username:
        return "Error: Username is required", 400
    
    result = get_r6_rank(username)
    
    if result["error"]:
        return f"Error: {result['error']}", 400
    
    return result["rank"]

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
