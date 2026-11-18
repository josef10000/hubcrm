import * as THREE from 'three';

export function createEarthFallbackTexture(color1: string, color2: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color2;
  for (let i = 0; i < 60; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      Math.random() * 80 + 20,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Calculate exact subsolar point (zenith of the Sun on Earth) for any UTC date
export function calculateSubsolarPoint(now: Date) {
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diffDays = (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);

  const declination = -23.44 * Math.cos(((360 / 365.25) * (diffDays + 10) * Math.PI) / 180);

  const B = ((360 / 365) * (diffDays - 81) * Math.PI) / 180;
  const eqOfTimeMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const solarTime = utcHours + eqOfTimeMin / 60;

  let lon = (12 - solarTime) * 15;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;

  return { lat: declination, lon };
}

// Convert latitude and longitude to 3D Cartesian coordinates on the sphere
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number,
  out?: THREE.Vector3
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  if (out) {
    return out.set(x, y, z);
  }
  return new THREE.Vector3(x, y, z);
}

interface TopoJSONTopology {
  type: 'Topology';
  transform?: {
    scale: [number, number];
    translate: [number, number];
  };
  arcs: number[][][];
}

// Pure TypeScript TopoJSON arc decoder -> single merged THREE.LineSegments geometry
export async function buildCountryBordersGeometry(radius: number): Promise<THREE.BufferGeometry> {
  const url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load country topology');
  const topo = (await res.json()) as TopoJSONTopology;

  const scale = topo.transform?.scale ?? [1, 1];
  const translate = topo.transform?.translate ?? [0, 0];

  const positions: number[] = [];
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();

  for (const arc of topo.arcs) {
    let px = 0;
    let py = 0;
    let prevLon = 0;
    let prevLat = 0;

    for (let i = 0; i < arc.length; i++) {
      px += arc[i][0];
      py += arc[i][1];
      const lon = px * scale[0] + translate[0];
      const lat = py * scale[1] + translate[1];

      if (i > 0) {
        if (Math.abs(lon - prevLon) < 90 && Math.abs(lat) < 88 && Math.abs(prevLat) < 88) {
          latLonToVector3(prevLat, prevLon, radius, vA);
          latLonToVector3(lat, lon, radius, vB);
          positions.push(vA.x, vA.y, vA.z, vB.x, vB.y, vB.z);
        }
      }

      prevLon = lon;
      prevLat = lat;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
