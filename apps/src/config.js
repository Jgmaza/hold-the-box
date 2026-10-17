// Todos los parámetros ajustables del juego en un solo lugar.
// El panel de debug (?debug) edita este objeto en vivo: los cambios se ven al instante.
// Unidades: metros, segundos, grados.

export const CONFIG = {
  physics: {
    fixedStep: 1 / 120, // paso fijo de la simulación
    maxFrameDt: 1 / 15, // si un frame tarda más, se recorta (evita "teletransportes")
    gravity: 24,
  },

  player: {
    radius: 0.35,
    height: 1.6,
    walkSpeed: 5.2,
    groundAccel: 38, // qué tan rápido llega a la velocidad deseada en el suelo
    groundDecel: 30, // frenado sin input
    airAccel: 14,
    jumpSpeed: 8.6, // ~1.5 m de altura con gravity 24
    coyoteTime: 0.1, // margen para saltar tras pisar el borde
    jumpBuffer: 0.12, // margen para saltar si pulsas justo antes de tocar el suelo
    maxFallSpeed: 30,
  },

  // Unión entre los dos jugadores (la caja los obliga a ir juntos).
  carry: {
    restDistance: 1.6,
    minDistance: 1.0,
    maxDistance: 2.2,
    stiffness: 14, // fuerza del resorte que los devuelve a restDistance (1/s)
    groundedWeight: 0.8, // el que pisa suelo "pesa" más: rescata al que se cae
    airWeight: 0.2,
    handHeight: 1.15, // altura del centro de la caja sobre los pies
  },

  box: {
    size: { w: 1.0, h: 0.7, d: 0.8 }, // w = a lo largo del eje P1→P2 (cabe entre los dos)

    sync: {
      smoothing: 0.25, // segundos para que la sincronía reaccione
      soloValue: 0.35, // sincronía cuando solo uno se mueve
      speedMin: 0.6, // multiplicador de velocidad con sincronía 0
      speedMax: 1.15, // ... con sincronía 1 (coordinarse = ir más rápido)
    },

    tilt: {
      stiffnessLow: 16, // rigidez del resorte que endereza la caja (desincronizados)
      stiffnessHigh: 42, // ... (sincronizados)
      dampingRatio: 0.75,
      heightGain: 0.85, // cuánto inclina la diferencia de altura entre jugadores
      bothAirborneFactor: 0.5, // si los dos están en el aire, la diferencia pesa menos
      dragLeanDeg: 12, // la caja se va hacia el que se queda quieto
      twistDeg: 30, // uno empuja adelante y el otro atrás: se tuerce
      tensionDeg: 36, // los dos tiran hacia afuera: se desarma
      squeezeDeg: 14, // los dos empujan hacia adentro
      wobbleFreq: 9, // temblor visible cuando hay tensión (rad/s)
      inertiaGain: 0.18, // grados por m/s² de aceleración del grupo
      inertiaSmoothing: 0.12,
      landKickSpeed: 9, // aterrizajes más rápidos que esto sacuden la caja
      landKickGain: 14,
      tiltingDeg: 12, // upright < tiltingDeg <= tilting < criticalDeg <= critical
      criticalDeg: 28,
      dropGrace: 1.0, // segundos en critical antes de soltar la caja
      criticalRecover: 1.5, // qué tan rápido baja el contador al salir de critical
      maxDeg: 65,
    },

    // Huequito: el contenido se fuga con la inclinación y los golpes.
    leak: {
      thresholdDeg: 15,
      ratePerSec: 7, // % por segundo al llegar a criticalDeg
      maxSeverity: 2.5,
      impactSpeed: 12.5, // aterrizajes más rápidos que esto quitan contenido
      impactDamage: 6,
      sweeperDamage: 8,
    },

    // Se moja: más peso, menos agarre, menos estabilidad.
    wet: {
      fallPenalty: 30, // % al caer al agua
      geyserRate: 38, // % por segundo bajo un chorro
      dryRate: 0.6, // % por segundo cuando no se moja
      speedPenalty: 0.25, // a 100% mojada: -25% velocidad
      jumpPenalty: 0.1,
      gripPenalty: 0.5,
      stabilityPenalty: 0.7,
      disturbanceGain: 0.5,
    },
  },

  hazards: {
    sweeperKnockback: 8,
    sweeperLift: 4,
    sweeperHitCooldown: 0.6,
    sweeperKickDeg: 160, // golpe angular a la caja (grados/s)
  },

  water: {
    killDepth: 0.4, // pies por debajo del agua = splash
    voidY: -12,
  },

  respawn: {
    fadeTime: 0.5,
    invulnTime: 1.2,
    failDelay: 1.2, // segundos viendo caer la caja antes de la pantalla de derrota
  },

  camera: {
    offset: { x: 0, y: 8.5, z: 10.5 },
    lookAhead: 2.5, // mira un poco hacia adelante (-Z)
    smoothing: 5,
    fov: 50,
  },

  rating: {
    perfect: { integrity: 85, wetness: 25 },
    ok: { integrity: 50, wetness: 60 },
  },

  debug: {
    godMode: false, // sin derrotas (para probar el nivel)
  },
};
