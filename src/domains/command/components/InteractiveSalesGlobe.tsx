import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Client } from '@/types';
import { getPlanPrice } from '@/helpers';
import { useUI } from '@/contexts/UIContext';
import { getThemePalette } from '@shared/utils/themePalette';
import {
  createEarthShaderMaterial,
  createInnerAtmosphereMaterial,
  createOuterAtmosphereMaterial
} from '../three/earthShaders';
import {
  buildCountryBordersGeometry,
  calculateSubsolarPoint,
  createEarthFallbackTexture,
  latLonToVector3
} from '../three/earthGeo';

interface InteractiveSalesGlobeProps {
  clients?: Client[];
}

const TEXTURE_URLS = {
  day: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
  night: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg',
  bump: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png'
};

const EARTH_RADIUS = 1;
const OUTER_ATMOSPHERE_RADIUS = 1.034;
const INNER_ATMOSPHERE_RADIUS = 1.005;
const AUTO_ROTATE_SPEED = 0.00075;

const _localSunPos = new THREE.Vector3();

export function InteractiveSalesGlobe({ clients = [] }: InteractiveSalesGlobeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const { themeColor } = useUI();
  const palette = getThemePalette(themeColor);

  // Refs para atualização reativa de cores 3D ao trocar o tema do sistema
  const themeMaterialsRef = useRef<{
    telemetryMat?: THREE.LineBasicMaterial;
    orbitMat?: THREE.LineBasicMaterial;
    gridMat?: THREE.LineBasicMaterial;
    bordersMat?: THREE.LineBasicMaterial;
    markerMat?: THREE.MeshBasicMaterial;
    markerRingMat?: THREE.MeshBasicMaterial;
    outerAtmMat?: THREE.ShaderMaterial;
    innerAtmMat?: THREE.ShaderMaterial;
  }>({});

  // Computa métricas reais do Hub Central
  const activeClients = (clients || []).filter(
    c => c.status === 'Ativo' || c.paymentStatus === 'RECEIVED'
  );
  const totalRevenue = activeClients.reduce(
    (acc, c) => acc + getPlanPrice(c.plan, c.billingCycle, c),
    0
  );
  const totalCount = activeClients.length;

  // Sincroniza materiais 3D instantaneamente quando o usuário muda o tema do sistema
  useEffect(() => {
    const p = getThemePalette(themeColor);
    const mats = themeMaterialsRef.current;
    if (mats.telemetryMat) mats.telemetryMat.color.set(p.lightHex);
    if (mats.orbitMat) mats.orbitMat.color.set(p.primaryHex);
    if (mats.gridMat) mats.gridMat.color.set(p.primaryHex);
    if (mats.bordersMat) mats.bordersMat.color.set(p.lightHex);
    if (mats.markerMat) mats.markerMat.color.set(p.primaryHex);
    if (mats.markerRingMat) mats.markerRingMat.color.set(p.lightHex);
    if (mats.outerAtmMat) mats.outerAtmMat.uniforms.uAccentColor.value.set(p.lightHex);
    if (mats.innerAtmMat) mats.innerAtmMat.uniforms.uAccentColor.value.set(p.primaryHex);
  }, [themeColor]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    const initialPalette = getThemePalette(themeColor);
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 430;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 0.14, 3.22);

    // 2. Renderer (transparent background to blend seamlessly into active system theme)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch {
      setLoading(false);
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.appendChild(renderer.domElement);

    const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);

    // 3. OrbitControls (smooth damping, drag & zoom)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -0.05, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 1.65;
    controls.maxDistance = 4.6;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.85;
    controls.update();

    let isInteracting = false;
    let resumeTimer: number | null = null;

    const onControlStart = () => {
      isInteracting = true;
      if (resumeTimer !== null) {
        window.clearTimeout(resumeTimer);
        resumeTimer = null;
      }
    };

    const onControlEnd = () => {
      resumeTimer = window.setTimeout(() => {
        isInteracting = false;
      }, 2500);
    };

    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    // 4. Earth Group (oriented initially toward Brazil / South America)
    const earthGroup = new THREE.Group();
    earthGroup.rotation.y = -0.7;
    scene.add(earthGroup);

    // 5. Subtle Sci-Fi Orbital Rings & Tactical Grid (synced with system theme)
    const futuristicGroup = new THREE.Group();
    earthGroup.add(futuristicGroup);

    const disposableGeometries: THREE.BufferGeometry[] = [];
    const disposableMaterials: THREE.Material[] = [];
    const disposableTextures: THREE.Texture[] = [];

    const telemetryMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(initialPalette.lightHex),
      transparent: true,
      opacity: 0.16
    });
    disposableMaterials.push(telemetryMat);
    themeMaterialsRef.current.telemetryMat = telemetryMat;

    // Equator ring
    const eqPts: THREE.Vector3[] = [];
    const eqR = EARTH_RADIUS * 1.018;
    for (let deg = 0; deg <= 360; deg += 3) {
      const rad = (deg * Math.PI) / 180;
      eqPts.push(new THREE.Vector3(Math.cos(rad) * eqR, 0, Math.sin(rad) * eqR));
    }
    const eqGeo = new THREE.BufferGeometry().setFromPoints(eqPts);
    disposableGeometries.push(eqGeo);
    futuristicGroup.add(new THREE.Line(eqGeo, telemetryMat));

    // Inclined orbital ring
    const orbitPts: THREE.Vector3[] = [];
    const orbR = EARTH_RADIUS * 1.12;
    for (let deg = 0; deg <= 360; deg += 3) {
      const rad = (deg * Math.PI) / 180;
      orbitPts.push(
        new THREE.Vector3(
          Math.cos(rad) * orbR,
          Math.sin(rad) * orbR * 0.45,
          Math.sin(rad) * orbR * 0.89
        )
      );
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(initialPalette.primaryHex),
      transparent: true,
      opacity: 0.22
    });
    disposableGeometries.push(orbitGeo);
    disposableMaterials.push(orbitMat);
    themeMaterialsRef.current.orbitMat = orbitMat;
    futuristicGroup.add(new THREE.Line(orbitGeo, orbitMat));

    // Faint coordinate grid
    const gridMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(initialPalette.primaryHex),
      transparent: true,
      opacity: 0.055
    });
    disposableMaterials.push(gridMat);
    themeMaterialsRef.current.gridMat = gridMat;

    for (let lat = -60; lat <= 60; lat += 30) {
      if (lat === 0) continue;
      const pts: THREE.Vector3[] = [];
      const phi = (90 - lat) * (Math.PI / 180);
      const r = EARTH_RADIUS * 1.0015;
      for (let lon = -180; lon <= 180; lon += 6) {
        const theta = (lon + 180) * (Math.PI / 180);
        pts.push(
          new THREE.Vector3(
            -r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
          )
        );
      }
      const gGeo = new THREE.BufferGeometry().setFromPoints(pts);
      disposableGeometries.push(gGeo);
      futuristicGroup.add(new THREE.Line(gGeo, gridMat));
    }

    for (let lon = -180; lon < 180; lon += 45) {
      const pts: THREE.Vector3[] = [];
      const r = EARTH_RADIUS * 1.0015;
      const theta = (lon + 180) * (Math.PI / 180);
      for (let lat = -80; lat <= 80; lat += 6) {
        const phi = (90 - lat) * (Math.PI / 180);
        pts.push(
          new THREE.Vector3(
            -r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
          )
        );
      }
      const gGeo = new THREE.BufferGeometry().setFromPoints(pts);
      disposableGeometries.push(gGeo);
      futuristicGroup.add(new THREE.Line(gGeo, gridMat));
    }

    // 6. Subtle Country Borders Vector Layer
    buildCountryBordersGeometry(EARTH_RADIUS * 1.0022)
      .then(bordersGeo => {
        if (disposed) {
          bordersGeo.dispose();
          return;
        }
        const currentPalette = getThemePalette(localStorage.getItem('hubcrm-theme') || themeColor);
        const bordersMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(currentPalette.lightHex),
          transparent: true,
          opacity: 0.16,
          depthWrite: false
        });
        disposableGeometries.push(bordersGeo);
        disposableMaterials.push(bordersMat);
        themeMaterialsRef.current.bordersMat = bordersMat;
        earthGroup.add(new THREE.LineSegments(bordersGeo, bordersMat));
      })
      .catch(() => {
        // Graceful skip if offline
      });

    // 7. Sleek HQ Marker on Brazil (Brasília / Centro Operacional)
    const hqPos = latLonToVector3(-15.8267, -47.9218, EARTH_RADIUS + 0.007);
    const markerGeo = new THREE.SphereGeometry(0.009, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(initialPalette.primaryHex),
      transparent: true,
      opacity: 0.95
    });
    const hqMarker = new THREE.Mesh(markerGeo, markerMat);
    hqMarker.position.copy(hqPos);
    earthGroup.add(hqMarker);
    themeMaterialsRef.current.markerMat = markerMat;

    const markerRingGeo = new THREE.RingGeometry(0.013, 0.019, 32);
    const markerRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(initialPalette.lightHex),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const hqRing = new THREE.Mesh(markerRingGeo, markerRingMat);
    hqRing.position.copy(hqPos);
    hqRing.lookAt(new THREE.Vector3(0, 0, 0));
    earthGroup.add(hqRing);
    themeMaterialsRef.current.markerRingMat = markerRingMat;

    disposableGeometries.push(markerGeo, markerRingGeo);
    disposableMaterials.push(markerMat, markerRingMat);

    // 8. Load High-Resolution NASA Earth Textures & Custom Shaders
    let earthMat: THREE.ShaderMaterial | null = null;
    let outerAtmMat: THREE.ShaderMaterial | null = null;
    let innerAtmMat: THREE.ShaderMaterial | null = null;

    const textureLoader = new THREE.TextureLoader();
    Promise.all([
      textureLoader
        .loadAsync(TEXTURE_URLS.day)
        .catch(() => createEarthFallbackTexture('#1b4965', '#62b6cb')),
      textureLoader
        .loadAsync(TEXTURE_URLS.night)
        .catch(() => createEarthFallbackTexture('#03071e', '#370617')),
      textureLoader
        .loadAsync(TEXTURE_URLS.bump)
        .catch(() => createEarthFallbackTexture('#101010', '#909090'))
    ]).then(([dayMap, nightMap, bumpMap]) => {
      if (disposed) {
        dayMap.dispose();
        nightMap.dispose();
        bumpMap.dispose();
        return;
      }

      dayMap.colorSpace = THREE.SRGBColorSpace;
      nightMap.colorSpace = THREE.SRGBColorSpace;
      bumpMap.colorSpace = THREE.NoColorSpace;
      [dayMap, nightMap, bumpMap].forEach(tex => {
        tex.anisotropy = maxAniso;
        disposableTextures.push(tex);
      });

      const currentPalette = getThemePalette(localStorage.getItem('hubcrm-theme') || themeColor);

      const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 128, 128);
      earthMat = createEarthShaderMaterial(dayMap, nightMap, bumpMap, true, 0);
      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      earthGroup.add(earthMesh);

      const outerAtmGeo = new THREE.SphereGeometry(OUTER_ATMOSPHERE_RADIUS, 64, 64);
      outerAtmMat = createOuterAtmosphereMaterial(0, currentPalette.lightHex);
      earthGroup.add(new THREE.Mesh(outerAtmGeo, outerAtmMat));
      themeMaterialsRef.current.outerAtmMat = outerAtmMat;

      const innerAtmGeo = new THREE.SphereGeometry(INNER_ATMOSPHERE_RADIUS, 64, 64);
      innerAtmMat = createInnerAtmosphereMaterial(0, currentPalette.primaryHex);
      earthGroup.add(new THREE.Mesh(innerAtmGeo, innerAtmMat));
      themeMaterialsRef.current.innerAtmMat = innerAtmMat;

      disposableGeometries.push(earthGeo, outerAtmGeo, innerAtmGeo);
      disposableMaterials.push(earthMat, outerAtmMat, innerAtmMat);

      renderer.compile(scene, camera);
      setLoading(false);
    });

    // 9. Responsive Resize Handling
    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 430;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Animation Loop
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      if (disposed) return;
      frameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      controls.update();

      if (!isInteracting) {
        earthGroup.rotation.y += AUTO_ROTATE_SPEED;
      }

      // Subtle pulse on Brazil HQ marker
      const pulse = 1 + Math.sin(elapsed * 2.5) * 0.14;
      hqMarker.scale.setScalar(pulse);

      // Real-time astronomical solar illumination
      const subsolar = calculateSubsolarPoint(new Date());
      latLonToVector3(subsolar.lat, subsolar.lon, 1.0, _localSunPos).normalize();

      if (earthMat) {
        earthMat.uniforms.sunDirectionLocal.value.copy(_localSunPos);
      }
      if (outerAtmMat) {
        outerAtmMat.uniforms.sunDirectionLocal.value.copy(_localSunPos);
      }
      if (innerAtmMat) {
        innerAtmMat.uniforms.sunDirectionLocal.value.copy(_localSunPos);
      }

      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      themeMaterialsRef.current = {};
      cancelAnimationFrame(frameId);
      if (resumeTimer !== null) {
        window.clearTimeout(resumeTimer);
      }
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      controls.dispose();

      disposableGeometries.forEach(g => g.dispose());
      disposableMaterials.forEach(m => m.dispose());
      disposableTextures.forEach(t => t.dispose());

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[405px] xl:h-[455px] flex items-center justify-center select-none overflow-hidden group">
      {/* Halo ambiente suave na cor do tema ativo */}
      <div
        className="absolute w-72 h-72 rounded-full blur-[90px] opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: palette.primaryHex }}
      />

      {/* Container WebGL Three.js */}
      <div
        ref={mountRef}
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing relative z-10"
      />

      {/* Spinner suave enquanto carrega as texturas em alta resolução */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-9 h-9 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Dica de Interatividade Flutuante */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-65 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] text-primary-300 whitespace-nowrap z-20">
        🖱️ Arraste para girar • Scroll para zoom
      </div>

      {/* Card Flutuante com Métricas Reais do Banco de Dados (Sincronizado com o Tema) */}
      <div
        className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.55)] flex items-center gap-3.5 z-20 whitespace-nowrap"
        style={{
          borderColor: `rgba(${palette.rgb}, 0.32)`
        }}
      >
        <span className="text-2xl">🇧🇷</span>
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-gray-300">
            Brasil • Centro Operacional
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white tracking-wide">
              {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            {totalCount > 0 && (
              <span className="text-[10px] font-bold text-emerald-400">
                {totalCount} {totalCount === 1 ? 'cliente ativo' : 'clientes ativos'}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400">
            {totalCount === 0
              ? 'Nenhuma transação externa confirmada no momento'
              : 'Sincronizado em tempo real com Asaas e Firestore'}
          </span>
        </div>
      </div>
    </div>
  );
}
