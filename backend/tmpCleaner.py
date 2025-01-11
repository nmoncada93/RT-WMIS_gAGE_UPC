
"""
import os
import time
import threading
from datetime import datetime, timedelta

# Definir el directorio base de limpieza (puedes ajustar BASE_DIR según sea necesario)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Función para limpiar archivos tmp y dat a una hora específica con minutos
def tmp_cleaner(scheduled_hour=0, scheduled_minute=0):
    while True:
        # Obtener la hora actual y calcular la próxima ocurrencia de la hora programada
        now = datetime.now()
        if now.hour > scheduled_hour or (now.hour == scheduled_hour and now.minute >= scheduled_minute):
            next_run = now + timedelta(days=1)
        else:
            next_run = now
        scheduled_time = datetime.combine(next_run.date(), datetime.min.time()) + timedelta(hours=scheduled_hour, minutes=scheduled_minute)
        seconds_until_scheduled_time = (scheduled_time - now).total_seconds()

        # Esperar hasta la hora programada
        time.sleep(seconds_until_scheduled_time)

        # Eliminar todos los archivos .tmp y .dat en las carpetas
        for root, _, files in os.walk(BASE_DIR):
            for file_name in files:
                if file_name.endswith('.tmp') or file_name.endswith('.dat'):
                    file_path = os.path.join(root, file_name)
                    try:
                        os.remove(file_path)
                        print(f"Archivo eliminado a la hora programada: {file_path}")
                    except Exception as e:
                        print(f"Error al eliminar {file_path}: {e}")

# Iniciar la tarea en segundo plano para eliminar archivos a la hora y minutos programados
def start_tmp_cleaner(scheduled_hour=0, scheduled_minute=0):
    threading.Thread(target=tmp_cleaner, args=(scheduled_hour, scheduled_minute), daemon=True).start()

"""
