// RETO: diseñe su propia prueba
// Ejecutar:  k6 run k6/06-reto-estudiante.js

import http from 'k6/http';
import { check } from 'k6';
import { viajero, monitorServidor, prepararPrueba, cerrarPrueba } from './lib/flujo.js';
import { BASE_URL, SLO, ESCENARIO_MONITOR, TREND_STATS } from './lib/config.js';
import { crearResumen } from './lib/resumen.js';

export const options = {
  summaryTrendStats: TREND_STATS,
  scenarios: {
    viajeros: {
      executor: 'constant-vus',
      vus: 20,
      duration: '3m',
    },

    // TODO 1: Escenario "pantallas" (15 consultas cada 2 segundos = 7.5 req/s)
    pantallas: {
      executor: 'constant-arrival-rate',
      exec: 'pantallaControl',
      rate: 15,
      timeUnit: '2s',
      duration: '3m',
      preAllocatedVUs: 15,
      maxVUs: 50,
    },

    monitor: { ...ESCENARIO_MONITOR, duration: '3m' },
  },
  thresholds: {
    ...SLO,
    // TODO 2: Umbrales exclusivos para el escenario "pantallas"
    'http_req_duration{scenario:pantallas}': ['p(95)<1500'],
    'http_req_failed{scenario:pantallas}': ['rate<0.01'],
  },
};

export function setup() {
  return prepararPrueba();
}

export default function () {
  viajero();
}

export function pantallaControl() {
  // TODO 3: Petición GET con etiqueta { endpoint: 'estadisticas' } y validaciones
  const res = http.get(`${BASE_URL}/reportes/estadisticas`, {
    tags: { endpoint: 'estadisticas', name: 'GET /reportes/estadisticas' },
  });

  check(res, {
    'estadisticas: status 200': (r) => r.status === 200,
    'estadisticas: tiene totalIncidentes': (r) => {
      try {
        const body = r.json();
        return body !== null && body.totalIncidentes !== undefined;
      } catch {
        return false;
      }
    },
  });
}

export { monitorServidor };

export function teardown(datos) {
  cerrarPrueba(datos);
}

export const handleSummary = crearResumen('reto');