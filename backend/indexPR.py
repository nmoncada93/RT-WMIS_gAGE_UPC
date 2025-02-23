
from flask import Blueprint, jsonify
import os
import pandas as pd
import json

# [A] Inicialización Blueprints ----------------------------------------------
indexPR_blueprint = Blueprint('indexPR', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# [B] Función para obtener la ruta de los archivos comprimidos ----------------
def get_tmp_file_path(doy_folder, filename):
    folder_path = os.path.join(BASE_DIR, 'upc_tmp', doy_folder)
    return os.path.join(folder_path, filename + ".xz")

# [C] Endpoint para leer el archivo sphi.tmp.xz de una fecha específica ------------
@indexPR_blueprint.route('/read-sphi/<int:year>/<int:doy>', methods=['GET'])
def read_sphi(year, doy):
    doy_folder = f"{year}{doy:03d}"  # Convierte el año y DoY en formato carpeta YYYYDDD
    file_path = get_tmp_file_path(doy_folder, 'sphi.tmp')  # Apunta a la versión .xz

    if not os.path.isfile(file_path):
        return jsonify({"error": f"El archivo sphi.tmp.xz no está disponible en {doy_folder}"}), 404
    try:
        data = pd.read_csv(file_path, sep=r'\s+', header=None, compression='xz')  # Lee directamente el .xz
        data_json = data.to_json(orient='records')
        return jsonify(json.loads(data_json))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# [D] Endpoint para leer el archivo roti.tmp.xz de una fecha específica ------------
@indexPR_blueprint.route('/read-roti/<int:year>/<int:doy>', methods=['GET'])
def read_roti(year, doy):
    doy_folder = f"{year}{doy:03d}"  # Convierte el año y DoY en formato carpeta YYYYDDD
    file_path = get_tmp_file_path(doy_folder, 'roti.tmp')  # Apunta a la versión .xz

    if not os.path.isfile(file_path):
        return jsonify({"error": f"El archivo roti.tmp.xz no está disponible en {doy_folder}"}), 404
    try:
        data = pd.read_csv(file_path, sep=r'\s+', header=None, compression='xz')  # Lee directamente el .xz
        data_json = data.to_json(orient='records')
        return jsonify(json.loads(data_json))
    except Exception as e:
        return jsonify({"error": str(e)}), 500





"""
from flask import Blueprint, jsonify
import os
import pandas as pd
import json

# [A] Inicializacin Blueprints ----------------------------------------------
indexPR_blueprint = Blueprint('indexPR', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# [B] Funcion para obtener la ruta de los archivos comprimidos ----------------
def get_tmp_file_path(year, doy, filename):
    folder_path = os.path.join(BASE_DIR, 'upc_tmp', str(year), f"{year}{doy:03d}")
    return os.path.join(folder_path, filename + ".xz")  # Ahora devuelve la versión comprimida

# [C] Endpoint para leer el archivo sphi.tmp.xz de una fecha especifica ------------
@indexPR_blueprint.route('/read-sphi/<int:year>/<int:doy>', methods=['GET'])
def read_sphi(year, doy):
    file_path = get_tmp_file_path(year, doy, 'sphi.tmp')  # Ahora apunta a .xz
    if not os.path.isfile(file_path):
        return jsonify({"error": "El archivo sphi.tmp.xz no está disponible para la fecha seleccionada."}), 404
    try:
        data = pd.read_csv(file_path, sep=r'\s+', header=None, compression='xz')  # Lee directamente el .xz
        data_json = data.to_json(orient='records')
        return jsonify(json.loads(data_json))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# [D] Endpoint para leer el archivo roti.tmp.xz de una fecha especifica ------------
@indexPR_blueprint.route('/read-roti/<int:year>/<int:doy>', methods=['GET'])
def read_roti(year, doy):
    file_path = get_tmp_file_path(year, doy, 'roti.tmp')  # Ahora apunta a .xz
    if not os.path.isfile(file_path):
        return jsonify({"error": "El archivo roti.tmp.xz no está disponible para la fecha seleccionada."}), 404
    try:
        data = pd.read_csv(file_path, sep=r'\s+', header=None, compression='xz')  # Lee directamente el .xz
        data_json = data.to_json(orient='records')
        return jsonify(json.loads(data_json))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

"""
