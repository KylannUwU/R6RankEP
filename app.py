from flask import Flask
import requests

app = Flask(__name__)

@app.route('/check/<username>/<platform>')
def check_user(username, platform):
    try:
        # API que estamos usando, sin región porque muchas APIs no la requieren
        url = 'https://r6stats.esportsapp.gg/api/v1/profile'
        params = {
            'username': username,
            'platform': platform
        }
        resp = requests.get(url, params=params)

        if resp.status_code == 200 and resp.json().get('userId'):
            return "Información recibida"
        else:
            return "Usuario no encontrado", 404
    except Exception as e:
        print(f"Error al consultar API: {e}")
        return "Error al obtener la información", 500

@app.route('/')
def home():
    return "Servidor Flask R6 funcionando"

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
