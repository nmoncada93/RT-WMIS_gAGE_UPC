from flask import Blueprint, jsonify
import os

# [A] Inicialización del Blueprint ===============================
mapsPR_blueprint = Blueprint('mapsPR', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# [B] Función para obtener la ruta de los archivos comprimidos ===============
def get_tmp_file_path(year, doy, filename):
    # Ahora busca directamente en 'upc_tmp/' sin subcarpeta de año
    folder_path = os.path.join(BASE_DIR, 'upc_tmp', f"{year}{doy:03d}")
    return os.path.join(folder_path, filename + ".xz")  # Apunta a la versión comprimida

# [C] Función base para procesar archivos IGP ==============================
def process_igp_file(file_path, file_type):
    if not os.path.exists(file_path):
        return {"error": f"Archivo {file_type} no encontrado para la fecha seleccionada: {file_path}"}

    try:
        json_output = []
        current_time = None  # Almacena el tiempo actual
        data_block = []  # Lista temporal para almacenar filas de datos

        import lzma
        with lzma.open(file_path, 'rt', encoding='utf-8') as file:
            for line in file:
                line = line.strip()

                # [C.1] Detecta encabezados de tiempo
                if line.startswith("TIME:"):
                    if current_time is not None and data_block:
                        json_output.append({"TIME": current_time, "data": data_block})
                        data_block = []  # Reinicia el bloque de datos
                    try:
                        current_time = int(line.split(":")[1].strip())
                    except ValueError:
                        return {"error": f"Formato incorrecto en línea de tiempo: {line}"}

                # [C.2] Procesa filas de datos dependiendo del tipo de archivo
                else:
                    parts = line.split()
                    try:
                        if file_type == "igp_sphi" and len(parts) == 6:
                            row = {
                                "Longitude": float(parts[0]),
                                "Latitude": float(parts[1]),
                                "mean_sphi": float(parts[2]),
                                "std_sphi": float(parts[3]),
                                "mean_sphilif": float(parts[4]),
                                "std_sphilif": float(parts[5]) if parts[5] != "NaN" else None
                            }
                            data_block.append(row)
                        elif file_type == "igp_roti" and len(parts) == 8:
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
                    except ValueError:
                        return {"error": f"Error procesando línea: {line}"}

            # [C.3] Añade el último bloque al JSON
            if current_time is not None and data_block:
                json_output.append({"TIME": current_time, "data": data_block})

        return json_output

    except Exception as e:
        return {"error": f"Error general al procesar {file_type}: {str(e)}"}

# [D] Endpoints para obtener datos de fechas pasadas =====================
@mapsPR_blueprint.route('/read-igp-sphi/<int:year>/<int:doy>', methods=['GET'])
def read_igp_sphi(year, doy):
    file_path = get_tmp_file_path(year, doy, "igp_sphi.dat")
    result = process_igp_file(file_path, "igp_sphi")
    return jsonify(result)

@mapsPR_blueprint.route('/read-igp-roti/<int:year>/<int:doy>', methods=['GET'])
def read_igp_roti(year, doy):
    file_path = get_tmp_file_path(year, doy, "igp_roti.dat")
    result = process_igp_file(file_path, "igp_roti")
    return jsonify(result)



"""
from flask import Blueprint, jsonify
import os

# [A] Inicialización del Blueprint ===============================
mapsPR_blueprint = Blueprint('mapsPR', __name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# [B] Función para obtener la ruta de los archivos comprimidos ===============
def get_tmp_file_path(year, doy, filename):
    folder_path = os.path.join(BASE_DIR, 'upc_tmp', str(year), f"{year}{doy:03d}")
    return os.path.join(folder_path, filename + ".xz")  # Apunta a la versión comprimida

# [C] Función base para procesar archivos IGP ==============================
def process_igp_file(file_path, file_type):
    if not os.path.exists(file_path):
        return {"error": f"Archivo {file_type} no encontrado para la fecha seleccionada: {file_path}"}

    try:
        json_output = []
        current_time = None  # Almacena el tiempo actual
        data_block = []  # Lista temporal para almacenar filas de datos

        import lzma
        with lzma.open(file_path, 'rt', encoding='utf-8') as file:
            for line in file:
                line = line.strip()

                # [C.1] Detecta encabezados de tiempo
                if line.startswith("TIME:"):
                    if current_time is not None and data_block:
                        json_output.append({"TIME": current_time, "data": data_block})
                        data_block = []  # Reinicia el bloque de datos
                    try:
                        current_time = int(line.split(":")[1].strip())
                    except ValueError:
                        return {"error": f"Formato incorrecto en línea de tiempo: {line}"}

                # [C.2] Procesa filas de datos dependiendo del tipo de archivo
                else:
                    parts = line.split()
                    try:
                        if file_type == "igp_sphi" and len(parts) == 6:
                            row = {
                                "Longitude": float(parts[0]),
                                "Latitude": float(parts[1]),
                                "mean_sphi": float(parts[2]),
                                "std_sphi": float(parts[3]),
                                "mean_sphilif": float(parts[4]),
                                "std_sphilif": float(parts[5]) if parts[5] != "NaN" else None
                            }
                            data_block.append(row)
                        elif file_type == "igp_roti" and len(parts) == 8:
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
                    except ValueError:
                        return {"error": f"Error procesando línea: {line}"}

            # [C.3] Añade el último bloque al JSON
            if current_time is not None and data_block:
                json_output.append({"TIME": current_time, "data": data_block})

        return json_output

    except Exception as e:
        return {"error": f"Error general al procesar {file_type}: {str(e)}"}

# [D] Endpoints para obtener datos de fechas pasadas =====================
@mapsPR_blueprint.route('/read-igp-sphi/<int:year>/<int:doy>', methods=['GET'])
def read_igp_sphi(year, doy):
    file_path = get_tmp_file_path(year, doy, "igp_sphi.dat")
    result = process_igp_file(file_path, "igp_sphi")
    return jsonify(result)

@mapsPR_blueprint.route('/read-igp-roti/<int:year>/<int:doy>', methods=['GET'])
def read_igp_roti(year, doy):
    file_path = get_tmp_file_path(year, doy, "igp_roti.dat")
    result = process_igp_file(file_path, "igp_roti")
    return jsonify(result)

"""
