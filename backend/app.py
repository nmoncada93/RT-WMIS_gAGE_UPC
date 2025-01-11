from flask import Flask, jsonify
from flask_cors import CORS
from flask_cors import cross_origin
import json
import os

# Importa los Blueprints
from indexPR import indexPR_blueprint
from mapsRT import mapsRT_blueprint
from indexRT import indexRT_blueprint

# [A] Inicializa la aplicación + configuracion de CORS
app = Flask(__name__)
CORS(app)

# Registra Blueprints con `url_prefix`
app.register_blueprint(indexPR_blueprint, url_prefix='/api/indexPR')
app.register_blueprint(mapsRT_blueprint, url_prefix='/api/mapsRT')
app.register_blueprint(indexRT_blueprint, url_prefix='/api/indexRT')

# [B] Define rutas de archivo como variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SPHI_FILE_PATH = os.path.join(BASE_DIR, 'upc_tmp', 'sphi.tmp')
ROTI_FILE_PATH = os.path.join(BASE_DIR, 'upc_tmp', 'roti.tmp')
NETWORK_STATIONS_PATH = os.path.join(BASE_DIR, 'static', 'networkStations.json')

# [C] Endpoint para obtener estaciones de la red
@app.route('/api/network-stations', methods=['GET'])
@cross_origin(origins="http://localhost:8123")
def get_network_stations():
    with open(NETWORK_STATIONS_PATH, 'r') as file:
        data = json.load(file)
    return jsonify(data)

# [D] Health Check (opcional)
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

handler = app

# [Z] Ejecuta la aplicacion en local
if __name__ == '__main__':
    app.run(debug=True)
