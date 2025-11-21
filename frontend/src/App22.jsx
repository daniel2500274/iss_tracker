import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Constantes ---
const BASE_URL = 'http://localhost:5000';
/**
 * Logo de NASA (SVG mejorado)
 */
const NasaLogo = () => (
  <svg
    width="70"
    height="70"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-[0_0_8px_rgba(252,61,33,0.6)]"
  >
    {/* Fondo azul */}
    <circle cx="100" cy="100" r="90" fill="#0B3D91" />

    {/* Órbita elíptica */}
    <ellipse
      cx="100"
      cy="100"
      rx="70"
      ry="20"
      fill="none"
      stroke="#FC3D21"
      strokeWidth="5"
      strokeLinecap="round"
    />

    {/* Ala roja */}
    <path
      d="M100 40 L130 70 L100 90 L70 70 Z"
      fill="#FC3D21"
    />

    {/* Texto NASA */}
    <text
      x="100"
      y="115"
      fontSize="48"
      fill="white"
      fontFamily="Arial, sans-serif"
      fontWeight="bold"
      textAnchor="middle"
      letterSpacing="2"
    >
      NASA
    </text>
  </svg>
);


const REFRESH_INTERVAL_MS = 5000;

// --- Componentes de UI Auxiliares ---

/**
 * Componente de estrellas de fondo
 */
const StarField = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speed: Math.random() * 0.5 + 0.1
    }));

    const animate = () => {
      ctx.fillStyle = 'rgba(3, 7, 18, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        ctx.fillStyle = 'white';
        ctx.fillRect(star.x, star.y, star.size, star.size);

        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

/**
 * Mini Mapa Component
 */
const MiniMap = ({ lat, lon }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
    script.async = true;
    script.onload = () => {
      if (window.L && mapRef.current && !mapInstanceRef.current) {
        const L = window.L;
        const map = L.map(mapRef.current, {
          center: [0, 0],
          zoom: 2,
          zoomControl: true,
          attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.carto.com/attributions">CARTO</a>'
        }).addTo(map);

        const issIcon = L.divIcon({
          className: 'iss-marker',
          html: `<div style="
            background: radial-gradient(circle, #FC3D21 0%, #FC3D21 60%, transparent 70%);
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            border: 3px solid #FFD700;
            box-shadow: 0 0 20px rgba(252, 61, 33, 1), 0 0 40px rgba(252, 61, 33, 0.5);
            animation: pulse 2s ease-in-out infinite;
          "></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([0, 0], { icon: issIcon }).addTo(map);

        mapInstanceRef.current = map;
        markerRef.current = marker;
      }
    };
    document.body.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && lat !== null && lon !== null) {
      const newLatLng = [lat, lon];
      markerRef.current.setLatLng(newLatLng);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(newLatLng, { animate: true, duration: 1 });
      }
    }
  }, [lat, lon]);

  return (
    <div className="relative rounded-xl overflow-hidden h-64 border-2 border-[#FC3D21] shadow-[0_0_30px_rgba(252,61,33,0.4)]">
      <div ref={mapRef} className="w-full h-full"></div>
      {lat === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#030712] bg-opacity-90">
          <div className="text-[#FC3D21] text-lg animate-pulse">INICIANDO TELEMETRÍA...</div>
        </div>
      )}
    </div>
  );
};

/**
 * Indicador de estado
 */
const StatusIndicator = ({ status }) => {
  const statusConfig = {
    checking: { text: 'VERIFICANDO', color: 'bg-yellow-400', glow: 'shadow-[0_0_15px_rgba(250,204,21,0.6)]' },
    healthy: { text: 'ENLACE ACTIVO', color: 'bg-[#00FF00]', glow: 'shadow-[0_0_15px_rgba(0,255,0,0.6)]' },
    unhealthy: { text: 'SIN CONEXIÓN', color: 'bg-[#FC3D21]', glow: 'shadow-[0_0_15px_rgba(252,61,33,0.6)]' },
  };

  const config = statusConfig[status] || statusConfig.unhealthy;

  return (
    <div className="flex items-center space-x-3 bg-black/40 px-4 py-2 rounded-full border border-[#0B3D91]">
      <span className={`relative flex h-3 w-3`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-3 w-3 ${config.color} ${config.glow}`}></span>
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-white">{config.text}</span>
    </div>
  );
};

/**
 * Tarjeta de estadística
 */
const StatCard = ({ title, children, className = '' }) => (
  <div className={`relative bg-gradient-to-br from-[#0B3D91]/80 to-[#030712]/80 border-2 border-[#FC3D21]/50 rounded-xl shadow-[0_0_25px_rgba(252,61,33,0.3)] backdrop-blur-md p-6 hover:shadow-[0_0_35px_rgba(252,61,33,0.5)] transition-all duration-300 ${className}`}>
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FC3D21] to-transparent"></div>
    <h3 className="text-sm font-bold text-[#FC3D21] uppercase tracking-widest mb-1 flex items-center">
      <span className="inline-block w-2 h-2 bg-[#FC3D21] rounded-full mr-2 animate-pulse"></span>
      {title}
    </h3>
    <div className="mt-3 text-white">
      {children}
    </div>
  </div>
);

/**
 * Mensaje de error
 */
const ErrorDisplay = ({ message }) => (
  <div className="bg-[#FC3D21]/20 border-2 border-[#FC3D21] text-white p-4 rounded-xl my-4 flex items-center space-x-3 shadow-[0_0_20px_rgba(252,61,33,0.4)]">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 flex-shrink-0 text-[#FC3D21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <div>
      <h3 className="font-bold text-lg">ERROR DE TELEMETRÍA</h3>
      <p className="text-sm">{message}</p>
      <p className="text-xs mt-2 opacity-80">Verifica que el sistema backend esté operativo en <strong>{BASE_URL}</strong></p>
    </div>
  </div>
);

// --- Componente Principal ---

function App() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [position, setPosition] = useState(null);
  const [prevPosition, setPrevPosition] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [stats, setStats] = useState(null);
  const [astronauts, setAstronauts] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!document.querySelector('#google-font-orbitron')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'google-font-orbitron';
      fontLink.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&display=swap";
      fontLink.rel = "stylesheet";
      document.head.appendChild(fontLink);
    }
    document.body.style.fontFamily = "'Orbitron', sans-serif";

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 20px rgba(252, 61, 33, 0.4); }
        50% { box-shadow: 0 0 40px rgba(252, 61, 33, 0.8); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const apiFetch = useCallback(async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`Error al hacer fetch a ${url}:`, err);
      setError(`No se pudo conectar a ${url}. ${err.message}`);
      throw err;
    }
  }, []);

  const checkBackendHealth = useCallback(async () => {
    try {
      await apiFetch(`${BASE_URL}/api/health`);
      setBackendStatus('healthy');
      setError(null);
    } catch (err) {
      setBackendStatus('unhealthy');
    }
  }, [apiFetch]);

  const fetchStatsAndAstronauts = useCallback(async () => {
    try {
      const statsData = await apiFetch(`${BASE_URL}/api/iss/stats`);
      setStats(statsData);

      if (statsData && statsData.astronauts_endpoint) {
        const astroData = await apiFetch(statsData.astronauts_endpoint);
        setAstronauts(astroData);
      }
    } catch (err) {
      // Error manejado en apiFetch
    }
  }, [apiFetch]);

  const fetchPosition = useCallback(async () => {
    try {
      const newPos = await apiFetch(`${BASE_URL}/api/iss/current`);

      setPrevPosition(currentPos => currentPos);
      setPosition(newPos);

      if (backendStatus !== 'healthy') {
        setBackendStatus('healthy');
        setError(null);
      }

    } catch (err) {
      if (backendStatus !== 'unhealthy') {
        setBackendStatus('unhealthy');
      }
    }
  }, [apiFetch, backendStatus]);

  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      await checkBackendHealth();
      await fetchStatsAndAstronauts();
      await fetchPosition();
      setIsLoading(false);
    };

    initialLoad();

    const intervalId = setInterval(fetchPosition, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [checkBackendHealth, fetchStatsAndAstronauts, fetchPosition]);

  useEffect(() => {
    if (!position || !prevPosition || position.timestamp === prevPosition.timestamp) {
      return;
    }

    const getSpeed = async () => {
      try {
        const speedData = await apiFetch(`${BASE_URL}/api/iss/speed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pos1: prevPosition, pos2: position }),
        });
        setSpeed(speedData);
      } catch (err) {
        console.error("Error al calcular velocidad:", err);
      }
    };

    getSpeed();
  }, [position, prevPosition, apiFetch]);

  return (
    <div className="relative bg-gradient-to-b from-[#030712] via-[#0B1929] to-[#030712] text-white min-h-screen p-6 md:p-8 overflow-hidden">
      <StarField />

      <div className="relative z-10 container mx-auto max-w-7xl">
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-6 border-b-2 border-[#FC3D21]/50">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <NasaLogo />
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                ISS TRACKER
              </h1>
              <p className="text-xs text-[#FC3D21] uppercase tracking-widest mt-1">Sistema de Telemetría en Tiempo Real</p>
            </div>
          </div>
          <StatusIndicator status={backendStatus} />
        </header>

        {/* Carga inicial */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block">
              <div className="w-16 h-16 border-4 border-[#FC3D21] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-2xl text-[#FC3D21] font-bold animate-pulse uppercase tracking-wider">
                Sincronizando datos orbitales...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <ErrorDisplay message={error} />
        )}

        {/* Contenido principal */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">

            {/* Posición y Mapa */}
            <StatCard title="Coordenadas Orbitales" className="md:col-span-1">
              <MiniMap lat={position?.latitude} lon={position?.longitude} />

              {position ? (
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg">
                    <span className="text-sm text-[#FFD700] font-bold uppercase">LAT</span>
                    <span className="text-3xl font-black text-white tabular-nums">{position.latitude.toFixed(4)}°</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg">
                    <span className="text-sm text-[#FFD700] font-bold uppercase">LON</span>
                    <span className="text-3xl font-black text-white tabular-nums">{position.longitude.toFixed(4)}°</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg">
                    <span className="text-sm text-[#FFD700] font-bold uppercase">ALT</span>
                    <span className="text-3xl font-black text-white tabular-nums">
                      {position.altitude_km.toFixed(2)}
                      <span className="text-xl text-[#FC3D21] ml-2">KM</span>
                    </span>
                  </div>
                  <p className="text-xs text-center text-gray-400 uppercase tracking-wider pt-2 border-t border-[#0B3D91]">
                    ⏱ {new Date(position.datetime).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="text-center mt-4">
                  <p className="animate-pulse text-[#FC3D21]">Obteniendo telemetría...</p>
                </div>
              )}
            </StatCard>

            {/* Velocidad y Estadísticas */}
            <div className="space-y-6 md:space-y-8">
              <StatCard title="Velocidad Orbital">
                {speed ? (
                  <div className="space-y-3">
                    <div className="text-center bg-black/30 p-4 rounded-lg">
                      <p className="text-5xl font-black text-[#00FF00] tabular-nums drop-shadow-[0_0_10px_rgba(0,255,0,0.8)]">
                        {speed.km_per_hour.toFixed(2)}
                      </p>
                      <p className="text-xl text-[#FFD700] mt-2 font-bold">KM/H</p>
                    </div>
                    <p className="text-center text-lg text-gray-300 font-medium">{speed.miles_per_hour.toFixed(2)} MPH</p>
                    <div className="text-xs text-gray-400 uppercase tracking-wider pt-2 border-t border-[#0B3D91] space-y-1">
                      <p>📏 Distancia: {speed.distance_traveled_km} km</p>
                      <p>⏱ Tiempo: {speed.time_elapsed_seconds}s</p>
                    </div>
                  </div>
                ) : (
                  <p className="animate-pulse text-center text-[#FC3D21]">Calculando velocidad...</p>
                )}
              </StatCard>

              <StatCard title="Parámetros Orbitales">
                {stats ? (
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center bg-black/30 p-3 rounded-lg">
                      <span className="text-sm text-[#FFD700] font-bold">VELOCIDAD MEDIA</span>
                      <span className="font-black text-white tabular-nums">{stats.average_speed_kph} km/h</span>
                    </li>
                    <li className="flex justify-between items-center bg-black/30 p-3 rounded-lg">
                      <span className="text-sm text-[#FFD700] font-bold">PERÍODO ORBITAL</span>
                      <span className="font-black text-white tabular-nums">{stats.orbital_period_minutes} min</span>
                    </li>
                    <li className="flex justify-between items-center bg-black/30 p-3 rounded-lg">
                      <span className="text-sm text-[#FFD700] font-bold">ALTITUD MEDIA</span>
                      <span className="font-black text-white tabular-nums">{stats.average_altitude_km.toFixed(2)} km</span>
                    </li>
                  </ul>
                ) : (
                  <p className="animate-pulse text-center text-[#FC3D21]">Cargando datos...</p>
                )}
              </StatCard>
            </div>

            {/* Tripulación */}
            <StatCard title="Tripulación ISS" className="md:col-span-2 lg:col-span-1">
              {astronauts ? (
                <div>
                  <div className="text-center bg-gradient-to-r from-[#FC3D21]/20 to-[#0B3D91]/20 p-4 rounded-lg mb-4 border border-[#FC3D21]/30">
                    <p className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                      {astronauts.number}
                    </p>
                    <p className="text-sm text-[#FFD700] font-bold uppercase tracking-widest mt-2">Humanos en órbita</p>
                  </div>
                  <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {astronauts.people.map(person => (
                      <li key={person.name} className="flex justify-between items-center bg-black/40 p-3 rounded-lg hover:bg-black/60 transition-colors">
                        <span className="font-medium text-white">{person.name}</span>
                        <span className="text-xs text-[#00FF00] bg-[#0B3D91] px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-[#00FF00]/50">
                          {person.craft}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="animate-pulse text-center text-[#FC3D21]">Cargando tripulación...</p>
              )}
            </StatCard>

          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-[#0B3D91]/50 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            NASA • Estación Espacial Internacional • Telemetría en Tiempo Real
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;