# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS
import requests
import math
from datetime import datetime
from typing import Dict, Optional, Tuple

app = Flask(__name__)
CORS(app)

# Constantes
ISS_API_URL = 'http://api.open-notify.org/iss-now.json'
ISS_ORBIT_RADIUS_KM = 6779.0
EARTH_RADIUS_KM = 6371.0
KM_TO_MI = 0.621371


class ISSCalculator:
    """Clase para cálculos precisos relacionados con la ISS"""

    @staticmethod
    def to_radians(degrees: float) -> float:
        """Convierte grados a radianes"""
        return degrees * (math.pi / 180)

    @staticmethod
    def haversine_distance(lat1: float, lon1: float,
                           lat2: float, lon2: float) -> float:
        """
        Calcula la distancia del gran círculo usando la fórmula de Haversine.
        Retorna la distancia en kilómetros.
        """
        r_lat1 = ISSCalculator.to_radians(lat1)
        r_lon1 = ISSCalculator.to_radians(lon1)
        r_lat2 = ISSCalculator.to_radians(lat2)
        r_lon2 = ISSCalculator.to_radians(lon2)

        d_lat = r_lat2 - r_lat1
        d_lon = r_lon2 - r_lon1

        a = (math.sin(d_lat / 2) ** 2 +
             math.cos(r_lat1) * math.cos(r_lat2) *
             math.sin(d_lon / 2) ** 2)

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return ISS_ORBIT_RADIUS_KM * c

    @staticmethod
    def calculate_speed(pos1: Dict, pos2: Dict) -> Optional[Dict]:
        """
        Calcula la velocidad entre dos posiciones.
        Retorna un diccionario con velocidades en diferentes unidades.
        """
        time_diff = pos2['timestamp'] - pos1['timestamp']

        if time_diff <= 0:
            return None

        distance = ISSCalculator.haversine_distance(
            pos1['latitude'], pos1['longitude'],
            pos2['latitude'], pos2['longitude']
        )

        speed_kps = distance / time_diff
        speed_kph = speed_kps * 3600
        speed_mph = speed_kph * KM_TO_MI

        return {
            'km_per_second': round(speed_kps, 3),
            'km_per_hour': round(speed_kph, 2),
            'miles_per_hour': round(speed_mph, 2),
            'distance_traveled_km': round(distance, 2),
            'time_elapsed_seconds': time_diff
        }

    @staticmethod
    def calculate_altitude_from_ground(latitude: float) -> float:
        """
        Calcula la altitud aproximada desde la superficie terrestre.
        Considera la forma elipsoidal de la Tierra.
        """
        # Simplificación: ISS mantiene altitud ~408km
        return ISS_ORBIT_RADIUS_KM - EARTH_RADIUS_KM


@app.route('/api/iss/current', methods=['GET'])
def get_current_position():
    """Obtiene la posición actual de la ISS"""
    try:
        response = requests.get(ISS_API_URL, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data.get('message') != 'success':
            return jsonify({'error': 'API no retornó éxito'}), 500

        position = data['iss_position']
        timestamp = data['timestamp']

        latitude = float(position['latitude'])
        longitude = float(position['longitude'])

        result = {
            'latitude': latitude,
            'longitude': longitude,
            'timestamp': timestamp,
            'datetime': datetime.fromtimestamp(timestamp).isoformat(),
            'altitude_km': ISSCalculator.calculate_altitude_from_ground(latitude)
        }

        return jsonify(result)

    except requests.RequestException as e:
        return jsonify({'error': f'Error al conectar con API: {str(e)}'}), 503
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500


@app.route('/api/iss/speed', methods=['POST'])
def calculate_speed():
    """
    Calcula la velocidad entre dos posiciones.
    Espera JSON con pos1 y pos2.
    """
    try:
        from flask import request
        data = request.get_json()

        if not data or 'pos1' not in data or 'pos2' not in data:
            return jsonify({'error': 'Faltan datos de posición'}), 400

        speed = ISSCalculator.calculate_speed(data['pos1'], data['pos2'])

        if speed is None:
            return jsonify({'error': 'Diferencia de tiempo inválida'}), 400

        return jsonify(speed)

    except Exception as e:
        return jsonify({'error': f'Error al calcular velocidad: {str(e)}'}), 500


@app.route('/api/iss/stats', methods=['GET'])
def get_stats():
    """Retorna estadísticas y constantes de la ISS"""
    return jsonify({
        'orbit_radius_km': ISS_ORBIT_RADIUS_KM,
        'average_altitude_km': ISS_ORBIT_RADIUS_KM - EARTH_RADIUS_KM,
        'earth_radius_km': EARTH_RADIUS_KM,
        'average_speed_kph': 27600,  # Velocidad orbital promedio
        'orbital_period_minutes': 93,  # Periodo orbital
        'astronauts_endpoint': 'http://api.open-notify.org/astros.json'
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)