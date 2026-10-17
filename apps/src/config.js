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
  // v2 (#13): brazos más largos — más reach, un poco más “elásticos”.
  carry: {
    restDistance: 2.0, // antes 1.6
    minDistance: 1.2, // antes 1.0
    maxDistance: 2.9, // antes 2.2
    stiffness: 11, // antes 14 — un poco más elástico con brazos largos
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

    // v2 (#13): mayor desestabilización — entra antes a tilting/critical, más kick.
    tilt: {
      stiffnessLow: 12, // antes 16 — más floja si van desync
      stiffnessHigh: 42, // ... (sincronizados)
      dampingRatio: 0.7, // antes 0.75
      heightGain: 1.1, // antes 0.85
      bothAirborneFactor: 0.5, // si los dos están en el aire, la diferencia pesa menos
      dragLeanDeg: 18, // antes 12
      twistDeg: 40, // antes 30
      tensionDeg: 48, // antes 36
      squeezeDeg: 14, // los dos empujan hacia adentro
      wobbleFreq: 10, // antes 9
      inertiaGain: 0.26, // antes 0.18
      inertiaSmoothing: 0.12,
      landKickSpeed: 8.5, // antes 9 — aterrizajes un poco más fáciles de sacudir
      landKickGain: 18, // antes 14
      tiltingDeg: 10, // antes 12
      criticalDeg: 22, // antes 28
      dropGrace: 0.7, // antes 1.0
      criticalRecover: 1.2, // antes 1.5
      maxDeg: 70, // antes 65
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

    // v2 (#13): mayor mojado — sube más rápido, seca lento, castiga más el control.
    wet: {
      fallPenalty: 45, // antes 30
      geyserRate: 55, // antes 38
      dryRate: 0.35, // antes 0.6
      speedPenalty: 0.4, // antes 0.25
      jumpPenalty: 0.2, // antes 0.1
      gripPenalty: 0.7, // antes 0.5
      stabilityPenalty: 1.0, // antes 0.7
      disturbanceGain: 0.75, // antes 0.5
    },
  },

  hazards: {
    sweeperKnockback: 8,
    sweeperLift: 4,
    sweeperHitCooldown: 0.6,
    sweeperKickDeg: 320, // golpe angular a la caja (grados/s)
  },

  // NPCs (solo en niveles que declaren `npcs`, ver src/sim/npcs/). Atacan la CAJA: botan contenido o la mojan.
  // Cada dificultad es más difícil de pasar: más rápido, ve más lejos y más ancho, reacciona antes, pega más.
  npcs: {
    enabled: true,
    edgeMargin: 0.6, // distancia mínima al borde de su plataforma (nunca se caen)
    idleMin: 0.6, // segundos quieto mirando alrededor
    idleMax: 2.2,
    turnRate: 300, // grados/s
    loseSightFactor: 1.4, // ya alertado, los sigue viendo hasta visionRange × esto
    heightTolerance: 1.5, // no ve una caja mucho más arriba / abajo que la suya

    // Cangrejo: lento, ve poco y solo de frente. Si lo tocan, pellizca → se bota contenido. Se salta JUNTOS.
    easy: {
      radius: 0.4,
      height: 0.45, // pies por encima de esto = lo saltaron
      wanderSpeed: 1.2,
      chaseSpeed: 1.8,
      chaseTime: 2.5, // segundos persiguiendo antes de rendirse
      visionRange: 3,
      visionFov: 100,
      reaction: 0.6, // segundos desde que ve la caja hasta que ataca
      cooldown: 2,
      knock: 4,
      lift: 2,
      kickDeg: 160, // golpe angular a la caja (grados/s)
      damage: 4, // % de contenido
      wet: 0, // % de mojado
    },

    // Niño con pistola de agua: guarda distancia, avisa y dispara un chorro en arco a la caja → se moja.
    // Apunta con algo de adelanto: si van rápido y coordinados, lo esquivan.
    medium: {
      radius: 0.3,
      height: 1.1,
      wanderSpeed: 1.8,
      keepDistance: 3.5, // retrocede si la caja se le acerca más que esto
      visionRange: 6,
      visionFov: 150,
      reaction: 0.45,
      windup: 0.7, // aviso antes de disparar
      cooldown: 2.2,
      shotSpeed: 9,
      shotGravity: 6,
      shotRadius: 0.25,
      shotLife: 2,
      lead: 0.5, // 0 = apunta a donde está la caja, 1 = a donde va a estar
      kickDeg: 60,
      damage: 0,
      wet: 14,
    },

    // Perro mojado: ve en 360° y de lejos, persigue rápido, frena (aviso) y embiste en línea recta.
    // Si choca: empujón fuerte, sacudida grande, se bota contenido Y se moja. Si falla, queda aturdido.
    hard: {
      alwaysChase: true, // persigue SIEMPRE: no necesita verlos, no se rinde y entre ataques los sigue (no pasea)
      radius: 0.45,
      height: 0.8,
      wanderSpeed: 2.6,
      chaseSpeed: 4,
      chaseTime: 4,
      visionRange: 8,
      visionFov: 360,
      reaction: 0.25,
      dashRange: 4, // a esta distancia de la caja deja de perseguir y embiste
      windup: 0.35,
      dashSpeed: 11,
      dashTime: 0.45,
      stunTime: 0.9, // aturdido tras fallar: la ventana para pasar
      cooldown: 3,
      knock: 9,
      lift: 3,
      kickDeg: 340,
      damage: 9,
      wet: 12,
    },
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
