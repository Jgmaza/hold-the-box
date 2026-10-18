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

    // Qué caja está elegida en el título: 'vip', 'gato' o 'bomba'.
    profile: 'vip',

    // Gato inquieto. La rabia sube con el tiempo (juntos la frenan, no la borran).
    // Desincronizarse la acelera. En la terraza, quedarse quieto vacía la caja.
    // `enabled` solo está activo cuando eligieron la caja del gato.
    cat: {
      enabled: false,
      syncThreshold: 0.72, // por debajo de esto la rabia sube más rápido
      ragePerSec: 2.4, // rabia por segundo antes de los multiplicadores
      calmMul: 0.75, // caminar juntos: más lento, pero sigue subiendo
      desyncMul: 2.5, // separados o inclinados
      warnRage: 16, // asoma la pata (~9 s juntos, ~3 s separados)
      scratchRage: 22, // primer arañazo (~12 s juntos, ~4 s separados)
      damageRage: 55, // a partir de aquí también baja la integridad
      chipPerSec: 1.2, // % de contenido por segundo en esa etapa
      swipeHold: 0.7, // un zarpazo: sale, se queda y vuelve (la vista lee esto)
      cooldown: 6.5, // pausa entre arañazos; la rabia no se reinicia
      knock: 3.4, // empujón horizontal al jugador arañado (m/s)
      knockUp: 1.1,
      controlTime: 0.45, // segundos con poco control tras el arañazo
      kick: 240, // golpe angular a la caja hacia ese lado (grados/s)
      goalLead: 10, // metros antes de la meta (la terraza) donde aprieta
      hurrySpeed: 1.4, // m/s hacia la meta; por debajo cuenta como quedarse
      goalDrainPerSec: 20, // % de contenido por segundo si se quedan en ese tramo
      goalRagePerSec: 12, // rabia extra mientras se quedan ahí
    },

    // Bomba: arranca al 100 % y no baja sola. Golpes, agua y falta de sincronía la dañan. En 0 %, explota.
    // Con la bomba no hay mojado ni huequito.
    bomb: {
      enabled: false,
      warnHealth: 25, // desde aquí la chispa se apura, la caja palpita y avisa
      // Golpes: el mismo % que le quitarían a la caja VIP (rodillo 8, aterrizaje fuerte 6+, cangrejo 4, perro 9).
      wetFactor: 0.3, // agua: % de mojado × esto (caer al agua 45 → 13.5, chorro del niño 14 → 4.2)
      desyncBelow: 0.5, // por debajo de esta sincronía la bomba se daña
      desyncPerSec: 6, // % por segundo con sincronía 0 (uno contra el otro); caminar uno solo (0.35) ≈ 1.8 %/s
      rating: { perfect: 85, ok: 50 }, // % de bomba que les sobra al llegar
    },

    // Se moja: más peso, menos agarre, menos estabilidad.
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

  // Clima de las islas (ver src/sim/weather/). Se activa poniendo `weather` en una plataforma del nivel.
  // Ritmo de cada zona: calma → aviso (warn) → activo (aguacero / ráfaga) → calma. Los tiempos varían ±20%.
  weather: {
    enabled: true,
    height: 4, // alto de la zona sobre el piso de la isla

    // Lluvia: la llovizna moja 8 %/s y el AGUACERO 40 %/s: un aguacero entero al descubierto deshace la caja.
    // Para eso están las carpas (`shelters` en la isla, o rainIsland() en levels/sections.js): debajo no se moja.
    rain: {
      drizzle: 0.2, // intensidad en calma (0..1)
      warnLevel: 0.35, // intensidad mientras avisa (se oscurece la nube, trueno): hora de correr a la carpa
      wetRate: 40, // % de mojado por segundo con intensidad 1 (aguacero); llovizna = wetRate × drizzle = 8 %/s
      slip: 0.7, // multiplicador de agarre para quien pisa la isla mojada (bajo la carpa no resbala)
      shelterMargin: 0.45, // la caja cuenta como cubierta aunque su centro quede hasta esto fuera de la carpa
      period: 7, // segundos por ciclo
      warnTime: 1.5,
      activeTime: 3,
    },

    // Viento: ráfagas de lado que empujan a la pareja, inclinan la caja y se llevan contenido.
    wind: {
      breeze: 0.12, // intensidad en calma
      warnLevel: 0.3,
      pushSpeed: 2.6, // m/s que empuja con intensidad 1 (se compensa caminando en contra)
      leanDeg: 16, // inclinación extra de la caja con intensidad 1
      drainRate: 4, // % de contenido por segundo con intensidad 1
      syncRelief: 0.8, // desincronizados pierden hasta (1 + esto)× más contenido
      period: 5.5,
      warnTime: 0.9,
      activeTime: 2.2,
    },

    // Oleaje: una ola cruza la isla de lado a lado; avisa de qué lado viene. Empuja a quien esté en el piso
    // y moja / inclina la caja. Detrás de un rompeolas del lado correcto no pasa nada; saltando juntos, tampoco.
    waves: {
      swell: 0.15, // intensidad en calma (marejada que se ve)
      warnLevel: 0.45, // intensidad del aviso (la loma de agua crece en el borde)
      pushSpeed: 4.5, // m/s que empuja la cresta a quien toca
      wetRate: 60, // % de mojado por segundo mientras la cresta toca la caja (una ola ≈ 20 %)
      leanDeg: 14, // inclinación extra de la caja mientras la toca
      crestWidth: 1.6, // ancho de la cresta (m)
      shelterMargin: 0.3, // la caja cuenta como cubierta aunque su centro quede hasta esto fuera del tramo del rompeolas
      period: 6.5,
      warnTime: 1.6,
      activeTime: 2.2, // lo que tarda la ola en cruzar la isla
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

/** Las cajas que se pueden elegir antes de empezar. */
export const BOX_CHOICES = [
  { id: 'vip', name: 'Caja VIP', blurb: 'Cartón frágil. La caja de siempre.' },
  { id: 'gato', name: 'Caja del gato', blurb: 'Se ve el gato. Si se separan, saca las garras.' },
  { id: 'bomba', name: 'Caja bomba', blurb: 'Golpes, agua y desorden la dañan. En 0 %, explota.' },
];

/** Activa una caja. VIP no tiene gato ni mecha. */
export function selectBox(id) {
  const choice = BOX_CHOICES.find((b) => b.id === id) ?? BOX_CHOICES[0];
  CONFIG.box.profile = choice.id;
  CONFIG.box.cat.enabled = choice.id === 'gato';
  CONFIG.box.bomb.enabled = choice.id === 'bomba';
  return choice;
}
