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

"""
# [C] Endpoint para leer sphi.tmp en RAW  y devolver JSON (ALL COLUMNS RAW) ==============================
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
"""


# [C] Endpoint optimizado para leer sphi.tmp  ==========================================
@indexRT_blueprint.route('/read-sphi', methods=['GET'])
def read_sphi():
    try:
        df = pd.read_csv(SPHI_FILE_PATH, sep=r'\s+', header=None)

        # Filtrar columnas necesarias: [0] tiempo, [1] estación, [5] SPHI L1
        df_reduced = df[[0, 1, 5]]

        return jsonify(df_reduced.values.tolist())

    except FileNotFoundError:
        return jsonify({"error": "El archivo sphi.tmp no se encuentra"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

"""
# [D] Endpoint para leer roti.tmp y devolver JSON  (ALL COLUMNS RAW) ==============================
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
"""

# [D] Endpoint optimizado para leer roti.tmp
@indexRT_blueprint.route('/read-roti', methods=['GET'])
def read_roti():
    try:
        df = pd.read_csv(ROTI_FILE_PATH, sep=r'\s+', header=None)

        # Filtrar columnas necesarias: [0] tiempo, [1] estación, [6] ROTI L1, [10] S4
        df_reduced = df[[0, 1, 6, 10]]

        return jsonify(df_reduced.values.tolist())

    except FileNotFoundError:
        return jsonify({"error": "El archivo roti.tmp no se encuentra"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
