# app_unxz.py

import lzma
import os

def unzipxz(archivo_xz, carpeta_destino):
    """
    Ubicacion:
      - Descomprime un archivo .xz en la carpeta de destino especificada

    Parametros:
      - archivo_xz: Ruta del archivo comprimido .xz
      - carpeta_destino: Carpeta donde se guardará el archivo descomprimido

    Retorna:
      - Ruta del archivo descomprimido
    """
    print(f"Intentando descomprimir {archivo_xz} en {carpeta_destino}")

    nombre_descomprimido = os.path.splitext(archivo_xz)[0]
    ruta_salida = os.path.join(carpeta_destino, nombre_descomprimido)

    try:
        # Lee y descomprime el archivo .xz
        with lzma.open(archivo_xz, 'rt') as archivo:
            contenido = archivo.read()
        # Guarda el contenido descomprimido en la ruta de salida
        with open(ruta_salida, 'w') as archivo_salida:
            archivo_salida.write(contenido)
        print(f"Archivo descomprimido exitosamente en {ruta_salida}")
        return ruta_salida
    except Exception as e:
        print(f"Error descomprimiendo {archivo_xz}: {str(e)}")
        raise e
