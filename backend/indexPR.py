from flask import Blueprint, jsonify
import os
import pandas as pd
import json

from unxzHandler import unzipxz
# from tmpCleaner import tmp_cleaner
# from tmpCleaner import start_tmp_cleaner

# start_tmp_cleaner(scheduled_hour=19, scheduled_minute=30)

# [A] Inicializacin Blueprints ----------------------------------------------
indexPR_blueprint = Blueprint('indexPR', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# [B] Endpoint para descomprimir archivos (roti.tmp.xz y sphi.tmp.xz) ------
@indexPR_blueprint.route('/unxz-files/<int:year>/<int:doy>', methods=['POST'])
def descomprimir_archivos(year, doy):
    folder_path = os.path.join(BASE_DIR, 'upc_tmp', str(year), f"{year}{doy:03d}")
    archivos_a_descomprimir = ["roti.tmp.xz", "sphi.tmp.xz"]
    resultados = {}

    print(f"Iniciando descompresion para la carpeta: {folder_path}")

    for file_name in archivos_a_descomprimir:
        file_path = os.path.join(folder_path, file_name)

        if os.path.isfile(file_path):
            try:
                ruta_descomprimida = unzipxz(file_path, folder_path)
                resultados[file_name] = f"Descomprimido en {ruta_descomprimida}"
            except Exception as e:
                resultados[file_name] = "Error al descomprimir"
                print(f"Hubo un problema con {file_name}")
        else:
            resultados[file_name] = "Archivo no encontrado"
            print(f"{file_name} no encontrado en {folder_path}")

    print("Resultados de la descompresion:", resultados)
    return jsonify(resultados)

# [C] Funcion para obtener la ruta de los archivos descomprimidos ----------------
def get_tmp_file_path(year, doy, filename):
    folder_path = os.path.join(BASE_DIR, 'upc_tmp', str(year), f"{year}{doy:03d}")
    return os.path.join(folder_path, filename)

# [D] Endpoint para leer el archivo sphi.tmp de una fecha especifica ------------
@indexPR_blueprint.route('/read-sphi/<int:year>/<int:doy>', methods=['GET'])
def read_sphi(year, doy):
    file_path = get_tmp_file_path(year, doy, 'sphi.tmp')
    if not os.path.isfile(file_path):
        return jsonify({"error": "El archivo sphi.tmp no esta descomprimido para la fecha seleccionada"}), 404
    try:
        data = pd.read_csv(file_path, sep=r'\s+', header=None)
        data_json = data.to_json(orient='records')
        return jsonify(json.loads(data_json))
    except Exception as e:
        return jsonify({"Error leyendo los datos de sphi.tmp"}), 500

# [E] Endpoint para leer el archivo roti.tmp de una fecha especifica ------------
@indexPR_blueprint.route('/read-roti/<int:year>/<int:doy>', methods=['GET'])
def read_roti(year, doy):
    file_path = get_tmp_file_path(year, doy, 'roti.tmp')
    if not os.path.isfile(file_path):
        return jsonify({"error": "El archivo roti.tmp no esta descomprimido para la fecha seleccionada."}), 404
    try:
        data = pd.read_csv(file_path, sep=r'\s+', header=None)
        data_json = data.to_json(orient='records')
        return jsonify(json.loads(data_json))
    except Exception as e:
        return jsonify({"Error leyendo los datos de roti.tmp"}), 500
