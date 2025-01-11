from flask import Blueprint, jsonify
import pandas as pd
import os
import json

# [A] Crear Blueprint
indexRT_blueprint = Blueprint('indexRT', __name__)

# [B] Define rutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SPHI_FILE_PATH = os.path.join(BASE_DIR, 'upc_tmp', 'sphi.tmp')
ROTI_FILE_PATH = os.path.join(BASE_DIR, 'upc_tmp', 'roti.tmp')

# [C] Endpoint para leer sphi.tmp y devolver JSON
@indexRT_blueprint.route('/read-sphi', methods=['GET'])
def read_sphi():
    try:
        data = pd.read_csv(SPHI_FILE_PATH, sep=r'\s+', header=None)
        data_json = data.to_json(orient='records')
        return jsonify(json.loads(data_json))
    except FileNotFoundError:
        return jsonify({"error": "El archivo sphi.tmp no se encuentra"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# [D] Endpoint para leer roti.tmp y devolver JSON
@indexRT_blueprint.route('/read-roti', methods=['GET'])
def read_roti():
    try:
        data = pd.read_csv(ROTI_FILE_PATH, sep=r'\s+', header=None)
        data_json = data.to_json(orient='records')
        return jsonify(json.loads(data_json))
    except FileNotFoundError:
        return jsonify({"error": "El archivo roti.tmp no se encuentra"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
