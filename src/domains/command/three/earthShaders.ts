import * as THREE from 'three';

export function createEarthShaderMaterial(
  dayMap: THREE.Texture,
  nightMap: THREE.Texture,
  bumpMap: THREE.Texture,
  initialCityLights = true,
  initialTheme = 0
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayMap },
      nightTexture: { value: nightMap },
      bumpTexture: { value: bumpMap },
      sunDirectionLocal: { value: new THREE.Vector3(1, 0, 0) },
      uCityLights: { value: initialCityLights ? 1.0 : 0.0 },
      uTheme: { value: initialTheme } // 0.0 = Satélite Realista, 1.0 = Fintech Dark Executivo
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalLocal;
      varying vec3 vViewDirLocal;

      void main() {
        vUv = uv;
        vNormalLocal = normalize(normal);

        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 worldToCam = cameraPosition - worldPos.xyz;
        // Orthonormal transpose transform from world space to Earth local space
        vViewDirLocal = vec3(
          dot(modelMatrix[0].xyz, worldToCam),
          dot(modelMatrix[1].xyz, worldToCam),
          dot(modelMatrix[2].xyz, worldToCam)
        );

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D dayTexture;
      uniform sampler2D nightTexture;
      uniform sampler2D bumpTexture;
      uniform vec3 sunDirectionLocal;
      uniform float uCityLights;
      uniform float uTheme;

      varying vec2 vUv;
      varying vec3 vNormalLocal;
      varying vec3 vViewDirLocal;

      void main() {
        vec3 dayColor   = texture2D(dayTexture, vUv).rgb;
        vec3 nightColor = texture2D(nightTexture, vUv).rgb;

        // Finite-difference tangent-space Normal Mapping from topology map
        vec2 texel = vec2(1.0 / 2048.0, 1.0 / 1024.0);
        float hC = texture2D(bumpTexture, vUv).r;
        float hR = texture2D(bumpTexture, vUv + vec2(texel.x, 0.0)).r;
        float hL = texture2D(bumpTexture, vUv - vec2(texel.x, 0.0)).r;
        float hU = texture2D(bumpTexture, vUv + vec2(0.0, texel.y)).r;
        float hD = texture2D(bumpTexture, vUv - vec2(0.0, texel.y)).r;

        vec3 N = normalize(vNormalLocal);
        vec3 V = normalize(vViewDirLocal);
        vec3 L = normalize(sunDirectionLocal);

        // Analytical spherical tangent basis
        vec3 upVec = abs(N.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 T = normalize(cross(upVec, N));
        vec3 B = cross(N, T);

        // Land vs Ocean mask (combining elevation map + coastal color separation)
        float landFromBump = smoothstep(0.008, 0.045, hC);
        float oceanColorHint = clamp((dayColor.b - max(dayColor.r, dayColor.g) * 0.95) * 4.5, 0.0, 1.0);
        float landMask = clamp(max(landFromBump, 1.0 - oceanColorHint * 1.15), 0.0, 1.0);
        float oceanMask = 1.0 - landMask;

        // Perturb surface normal strongly on mountain ridges, smooth on oceans
        float bumpStrength = 3.8 * landMask;
        vec3 perturbedN = normalize(N - T * (hR - hL) * bumpStrength - B * (hU - hD) * bumpStrength);

        // Astronomical terminator & normal-mapped solar diffuse
        float NdotL = dot(N, L);
        float dayFactor = smoothstep(-0.12, 0.14, NdotL);
        float reliefDiffuse = max(dot(perturbedN, L), 0.0);

        // Delicate narrow golden graze strictly on continental terrain at sunrise/sunset
        float twilightLand = exp(-pow((NdotL - 0.02) * 9.5, 2.0)) * landMask;

        // Fresnel grazing reflection for realistic water & orbital silhouette
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.6);

        // Specular sun glint on daytime oceans
        vec3 H = normalize(L + V);
        float specAngle = max(dot(N, H), 0.0);
        float oceanSpecular = pow(specAngle, 56.0) * oceanMask * dayFactor;

        // --- THEME 0: SATÉLITE REALISTA ---
        vec3 crispLights = pow(max(nightColor, vec3(0.0)), vec3(1.18)) * vec3(2.9, 2.35, 1.7);
        vec3 nightBase = vec3(0.010, 0.022, 0.048) + dayColor * 0.055;
        vec3 nightSideSat = (uCityLights > 0.5)
          ? crispLights + nightBase
          : nightBase;

        // Crisp mountain relief lighting + clean sapphire ocean shading
        vec3 reliefShade = dayColor * (0.46 + 0.84 * reliefDiffuse);
        vec3 oceanDay = dayColor * (0.64 + 0.56 * max(NdotL, 0.0)) + vec3(0.05, 0.16, 0.34) * fresnel;
        vec3 daySideSat = mix(oceanDay, reliefShade, landMask);

        daySideSat += vec3(0.11, 0.04, 0.01) * twilightLand;
        daySideSat += vec3(0.95, 0.98, 1.0) * oceanSpecular * 0.55;

        vec3 satColor = mix(nightSideSat, daySideSat, dayFactor);
        satColor += vec3(0.04, 0.11, 0.24) * fresnel * (1.0 - dayFactor);

        // --- THEME 1: FINTECH DARK EXECUTIVO ---
        float dotGridX = smoothstep(0.45, 0.92, cos(vUv.x * 1100.0));
        float dotGridY = smoothstep(0.45, 0.92, cos(vUv.y * 550.0));
        float techDot = dotGridX * dotGridY;

        vec3 execOcean = vec3(0.015, 0.027, 0.054) + vec3(0.04, 0.13, 0.28) * fresnel;
        vec3 execLandBase = vec3(0.065, 0.118, 0.215) + vec3(0.04, 0.085, 0.16) * hC;
        execLandBase *= (0.82 + 0.36 * reliefDiffuse);
        execLandBase += vec3(0.05, 0.18, 0.34) * techDot * 0.42;

        vec3 execColor = mix(execOcean, execLandBase, landMask);
        execColor += vec3(0.035, 0.10, 0.20) * dayFactor * 0.35;
        execColor += vec3(0.35, 0.65, 0.95) * oceanSpecular * 0.16;

        if (uCityLights > 0.5) {
          execColor += crispLights * vec3(0.42, 0.62, 0.92) * 0.65;
        }

        vec3 finalColor = mix(satColor, execColor, uTheme);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  });
}

// Outer Rayleigh Atmospheric Scattering Halo (BackSide shell - synced with system theme accent)
export function createOuterAtmosphereMaterial(
  initialTheme = 0,
  accentHex = '#38bdf8'
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      sunDirectionLocal: { value: new THREE.Vector3(1, 0, 0) },
      uTheme: { value: initialTheme },
      uAccentColor: { value: new THREE.Color(accentHex) }
    },
    vertexShader: `
      varying vec3 vNormalLocal;
      varying vec3 vNormalView;
      varying vec3 vPositionView;

      void main() {
        vNormalLocal = normalize(normal);
        vNormalView = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vPositionView = mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 sunDirectionLocal;
      uniform float uTheme;
      uniform vec3 uAccentColor;

      varying vec3 vNormalLocal;
      varying vec3 vNormalView;
      varying vec3 vPositionView;

      void main() {
        vec3 viewDir = normalize(-vPositionView);
        float fresnel = pow(clamp(0.68 - dot(viewDir, vNormalView), 0.0, 1.0), 3.4);

        float sunAlign = dot(normalize(vNormalLocal), normalize(sunDirectionLocal));
        float dayLimb = smoothstep(-0.2, 0.35, sunAlign);
        float twilightTip = exp(-pow((sunAlign + 0.02) * 8.0, 2.0));

        vec3 nightTone = mix(vec3(0.05, 0.16, 0.36), uAccentColor * 0.42, 0.55);
        vec3 dayTone = mix(vec3(0.24, 0.68, 1.0), uAccentColor, 0.52);
        vec3 satAtm = mix(nightTone, dayTone, dayLimb) + vec3(0.35, 0.16, 0.05) * twilightTip * 0.22;
        float satAlpha = fresnel * mix(0.18, 0.72, dayLimb);

        vec3 execAtm = uAccentColor;
        float execAlpha = fresnel * 0.48;

        vec3 atmColor = mix(satAtm, execAtm, uTheme);
        float alpha = mix(satAlpha, execAlpha, uTheme);

        gl_FragColor = vec4(atmColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false
  });
}

// Inner Atmospheric Fresnel Rim (FrontSide shell hugging the visible limb)
export function createInnerAtmosphereMaterial(
  initialTheme = 0,
  accentHex = '#38bdf8'
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      sunDirectionLocal: { value: new THREE.Vector3(1, 0, 0) },
      uTheme: { value: initialTheme },
      uAccentColor: { value: new THREE.Color(accentHex) }
    },
    vertexShader: `
      varying vec3 vNormalLocal;
      varying vec3 vNormalView;
      varying vec3 vPositionView;

      void main() {
        vNormalLocal = normalize(normal);
        vNormalView = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vPositionView = mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 sunDirectionLocal;
      uniform float uTheme;
      uniform vec3 uAccentColor;

      varying vec3 vNormalLocal;
      varying vec3 vNormalView;
      varying vec3 vPositionView;

      void main() {
        vec3 viewDir = normalize(-vPositionView);
        float rim = pow(1.0 - clamp(dot(viewDir, vNormalView), 0.0, 1.0), 4.8);

        float sunAlign = dot(normalize(vNormalLocal), normalize(sunDirectionLocal));
        float dayLimb = smoothstep(-0.18, 0.35, sunAlign);
        vec3 satRim = mix(uAccentColor * 0.38, mix(vec3(0.28, 0.74, 1.0), uAccentColor, 0.55), dayLimb);
        vec3 execRim = uAccentColor;

        vec3 col = mix(satRim, execRim, uTheme);
        float intensity = rim * mix(mix(0.16, 0.52, dayLimb), 0.38, uTheme);

        gl_FragColor = vec4(col, intensity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false
  });
}
