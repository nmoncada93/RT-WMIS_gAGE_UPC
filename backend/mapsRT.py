#from flask import Blueprint, jsonify, request
from flask import Blueprint, jsonify
import os

# [A] Creacion de Blueprints + configuracion general ======================
mapsRT_blueprint = Blueprint('mapsRT', __name__)

# Archivos permitidos para lectura
ALLOWED_FILES = ["igp_sphi.dat", "igp_roti.dat"]

# [B] Filtra y estructura datos =======================
def convert_dat_to_json(file_path):
    # Verifica si el archivo existe
    if not os.path.exists(file_path):
        return {"error": f"Archivo no encontrado en la ruta"}

    try:
        # Inicializa lista para los datos procesados
        json_output = []
        current_time = None  # Almacena tiempo actual
        data_block = []  # Lista temporal para almacenar filas de datos

        # Lee archivo linea por linea para procesar encabezados y datos
        with open(file_path, 'r') as file:
            for line in file:
                line = line.strip()  # Elimina espacios al inicio y al final

                # [B.1] Detecta encabezados de tiempo --------------------
                if line.startswith("TIME:"):
                    # Si ya hay datos en el bloque actual los añade al JSON
                    if current_time is not None and data_block:
                        json_output.append({
                            "TIME": current_time,
                            "data": data_block
                        })
                        data_block = []  # Reinicia bloque de datos

                    # Extrae tiempo actual
                    current_time = int(line.split(":")[1].strip())

                # [B.2] Procesa filas de datos -------------------------------
                else:
                    parts = line.split()
                    if len(parts) == 6:  # Valida q tenga 6 columnas
                        row = {
                            "Longitude": float(parts[0]),
                            "Latitude": float(parts[1]),
                            "mean_sphi": float(parts[2]),
                            "std_sphi": float(parts[3]),
                            "mean_sphilif": float(parts[4]),
                            "std_sphilif": float(parts[5]) if parts[5] != "NaN" else None
                        }
                        data_block.append(row)

            # [B.3] Añade ultimo bloque al JSON --------------------------
            if current_time is not None and data_block:
                json_output.append({
                    "TIME": current_time,
                    "data": data_block
                })

        return json_output

    except Exception as e:
        return {"Problema procesando los datos..."}

# [C] Funcion para procesar igp_roti.dat ====================================
def convert_roti_to_json(file_path):
    # Verifica si el archivo existe
    if not os.path.exists(file_path):
        return {"error": f"Archivo no encontrado en la ruta: {file_path}"}

    try:
        # Inicializa lista para los datos procesados
        json_output = []
        current_time = None  # Almacena el tiempo actual
        data_block = []  # Lista temporal para almacenar filas de datos

        # Lee archivo linea por linea para procesar encabezados y datos
        with open(file_path, 'r') as file:
            for line in file:
                line = line.strip()  # Elimina espacios al inicio y al final

                # [C.1] Detecta encabezados de tiempo --------------------
                if line.startswith("TIME:"):
                    # Si ya hay datos en el bloque actual, añadirlos al JSON
                    if current_time is not None and data_block:
                        json_output.append({
                            "TIME": current_time,
                            "data": data_block
                        })
                        data_block = []  # Reinicia el bloque de datos

                    # Extrae el tiempo actual
                    current_time = int(line.split(":")[1].strip())

                # [C.2] Procesa filas de datos ---------------------------
                else:
                    parts = line.split()
                    if len(parts) == 8:  # Valida que tenga 8 columnas
                        row = {
                            "Longitude": float(parts[0]),
                            "Latitude": float(parts[1]),
                            "mean_roti": float(parts[2]),
                            "std_roti": float(parts[3]),
                            "mean_rotilgf": float(parts[4]),
                            "std_rotilgf": float(parts[5]),
                            "mean_s4": float(parts[6]),
                            "std_s4": float(parts[7]) if parts[7] != "NaN" else None
                        }
                        data_block.append(row)

            # [C.3] Añade el último bloque al JSON -------------------
            if current_time is not None and data_block:
                json_output.append({
                    "TIME": current_time,
                    "data": data_block
                })
        return json_output

    except Exception as e:
        return {"error": str(e)}

# ========================== ENDPOINTS ======================================

# [D] Endpoint para servir el archivo JSON ==================================
@mapsRT_blueprint.route('/read-igp-sphi', methods=['GET'])
def get_json():
    # [C.1] Obtiene nombre del archivo desde los parametros --------------
    # file_name = request.args.get('file')

    # [C.2] Verifica si el parametro file_name fue proporcionado -----------
    # if not file_name:
        #return jsonify({"error": "Falta el parámetro 'file' en la solicitud"}), 400

    # [C.3] Valida el archivo solicitado  ----------------
    # if file_name not in ALLOWED_FILES:
        #return jsonify({"error": f"El archivo '{file_name}' no esta permitido"}), 403

    # [D.4] Define ruta base relativa al archivo actual -----------------
    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_dir, "upc_tmp", "igp_sphi.dat")

    # [D.6] Convierte archivo a JSON -------------------------------------
    result = convert_dat_to_json(file_path)

    # [D.7] Maneja errores  ----------------------------
    if "error" in result:
        return jsonify(result), 400

    return jsonify(result)


    # [E] Endpoint para servir datos de igp_roti.dat ===================================
@mapsRT_blueprint.route('/read-igp-roti', methods=['GET'])
def get_roti_json():
    # [E.1] Define ruta base relativa al archivo igp_roti.dat
    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_dir, "upc_tmp", "igp_roti.dat")

    # [E.2] Convierte archivo a JSON utilizando la función convert_roti_to_json
    result = convert_roti_to_json(file_path)

    # [E.3] Maneja errores
    if "error" in result:
        return jsonify(result), 400

    # [E.4] Retorna el JSON procesado
    return jsonify(result)
