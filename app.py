from flask import Flask, jsonify
import requests
from bs4 import BeautifulSoup
import time
import logging
import os

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
        
        # Headers más realistas para evitar detección
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        }
        
        # Crear sesión para mantener cookies
        session = requests.Session()
        session.headers.update(headers)
        
        # Realizar la petición
        response = session.get(url, timeout=15)
        
        logger.info(f"Status code: {response.status_code}")
        
        if response.status_code == 404:
            return {"error": "Usuario no encontrado", "rank": None}
        
        if response.status_code != 200:
            logger.error(f"Error HTTP: {response.status_code}")
            return {"error": f"Error al acceder a la página: {response.status_code}", "rank": None}
        
        # Parsear el HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Debug: Log parte del HTML para ver la estructura
        logger.info(f"HTML length: {len(response.content)}")
        
        # Buscar el rango con selectores más específicos
        rank = None
        
        # Intentar encontrar el rango en diferentes elementos
        possible_selectors = [
            'span[class*="rank"]',
            'div[class*="rank"]',
            'span[class*="tier"]',
            'div[class*="tier"]',
            '.trn-defstat__value',
            '.segment-stat__value',
            '.stat-value',
            '[data-testid*="rank"]',
            '[class*="current-rank"]'
        ]
        
        for selector in possible_selectors:
            elements = soup.select(selector)
            logger.info(f"Selector '{selector}' encontró {len(elements)} elementos")
            
            for element in elements:
                text = element.get_text(strip=True)
                logger.info(f"Texto encontrado: '{text}'")
                
                # Verificar si contiene palabras clave de rangos
                rank_keywords = ['copper', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion', 'unranked']
                if any(keyword in text.lower() for keyword in rank_keywords) and len(text) < 50:
                    rank = text
                    logger.info(f"Rango encontrado: {rank}")
                    break
            
            if rank:
                break
        
        # Búsqueda más amplia si no encontramos nada
        if not rank:
            logger.info("Búsqueda amplia iniciada...")
            all_text_elements = soup.find_all(['span', 'div', 'p', 'td', 'th'])
            
            for element in all_text_elements:
                text = element.get_text(strip=True)
                if text and len(text) < 50:
                    rank_keywords = ['copper', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion']
                    if any(keyword in text.lower() for keyword in rank_keywords):
                        rank = text
                        logger.info(f"Rango encontrado en búsqueda amplia: {rank}")
                        break
        
        # Si aún no encontramos el rango, buscar patrones específicos
        if not rank:
            logger.info("Búsqueda por patrones específicos...")
            html_content = response.text
            
            # Buscar patrones comunes en el HTML
            import re
            patterns = [
                r'rank["\']?\s*:\s*["\']?([^"\'<>]+)["\']?',
                r'tier["\']?\s*:\s*["\']?([^"\'<>]+)["\']?',
                r'current.*rank["\']?\s*:\s*["\']?([^"\'<>]+)["\']?'
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, html_content, re.IGNORECASE)
                for match in matches:
                    if any(keyword in match.lower() for keyword in ['copper', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion']):
                        rank = match.strip()
                        logger.info(f"Rango encontrado por regex: {rank}")
                        break
                if rank:
                    break
        
        if not rank:
            logger.warning("No se pudo encontrar el rango")
            return {"error": "No se pudo encontrar el rango", "rank": "Unranked"}
        
        return {"rank": rank, "error": None}
        
    except requests.exceptions.Timeout:
        logger.error("Timeout al acceder a R6 Tracker")
        return {"error": "Timeout al acceder a R6 Tracker", "rank": None}
    except requests.exceptions.RequestException as e:
        logger.error(f"Error de conexión: {str(e)}")
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

@app.route('/debug/<username>')
def debug_rank(username):
    """
    Endpoint para debugging - muestra información detallada
    """
    if not username:
        return jsonify({"error": "Username is required"}), 400
    
    try:
        url = f"https://r6.tracker.network/r6siege/profile/ubi/{username}/overview"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Encontrar todos los elementos que contengan texto relacionado con rangos
        debug_info = {
            "status_code": response.status_code,
            "url": url,
            "html_length": len(response.content),
            "found_elements": []
        }
        
        all_elements = soup.find_all(['span', 'div', 'p', 'td', 'th'])
        rank_keywords = ['copper', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion', 'unranked']
        
        for element in all_elements:
            text = element.get_text(strip=True)
            if text and any(keyword in text.lower() for keyword in rank_keywords):
                debug_info["found_elements"].append({
                    "tag": element.name,
                    "class": element.get('class', []),
                    "text": text,
                    "html": str(element)[:200] + "..." if len(str(element)) > 200 else str(element)
                })
        
        return jsonify(debug_info)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
