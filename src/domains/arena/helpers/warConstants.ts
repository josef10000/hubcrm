export interface WarTerritory {
  id: string;
  name: string;
  continent: 'south_america' | 'north_america' | 'europe' | 'africa' | 'asia' | 'oceania';
  adjacencies: string[]; // IDs dos territórios adjacentes
  // Coordenadas aproximadas para renderização visual centralizada de badges de exército
  x: number;
  y: number;
}

export const WAR_TERRITORIES: Record<string, WarTerritory> = {
  // América do Sul (4)
  brasil: { id: 'brasil', name: 'Brasil', continent: 'south_america', adjacencies: ['argentina', 'colombia', 'argelia'], x: 220, y: 350 },
  argentina: { id: 'argentina', name: 'Argentina', continent: 'south_america', adjacencies: ['brasil', 'chile'], x: 200, y: 430 },
  colombia: { id: 'colombia', name: 'Colômbia', continent: 'south_america', adjacencies: ['brasil', 'chile', 'mexico'], x: 170, y: 310 },
  chile: { id: 'chile', name: 'Chile', continent: 'south_america', adjacencies: ['colombia', 'argentina'], x: 160, y: 400 },

  // América do Norte (6)
  mexico: { id: 'mexico', name: 'México', continent: 'north_america', adjacencies: ['colombia', 'eua_oeste', 'eua_leste'], x: 130, y: 240 },
  eua_oeste: { id: 'eua_oeste', name: 'EUA Oeste', continent: 'north_america', adjacencies: ['mexico', 'eua_leste', 'canada', 'alaska'], x: 100, y: 170 },
  eua_leste: { id: 'eua_leste', name: 'EUA Leste', continent: 'north_america', adjacencies: ['mexico', 'eua_oeste', 'canada', 'reino_unido'], x: 150, y: 165 },
  alaska: { id: 'alaska', name: 'Alasca', continent: 'north_america', adjacencies: ['eua_oeste', 'canada', 'siberia'], x: 40, y: 100 },
  canada: { id: 'canada', name: 'Canadá', continent: 'north_america', adjacencies: ['eua_oeste', 'eua_leste', 'alaska', 'groelandia'], x: 110, y: 115 },
  groelandia: { id: 'groelandia', name: 'Groelândia', continent: 'north_america', adjacencies: ['canada', 'islandia'], x: 210, y: 80 },

  // Europa (5)
  islandia: { id: 'islandia', name: 'Islândia', continent: 'europe', adjacencies: ['groelandia', 'reino_unido', 'europa_norte'], x: 290, y: 105 },
  reino_unido: { id: 'reino_unido', name: 'Reino Unido', continent: 'europe', adjacencies: ['islandia', 'europa_oeste', 'europa_norte', 'eua_leste'], x: 310, y: 150 },
  europa_oeste: { id: 'europa_oeste', name: 'Europa Oeste', continent: 'europe', adjacencies: ['reino_unido', 'europa_norte', 'europa_leste', 'argelia'], x: 330, y: 200 },
  europa_norte: { id: 'europa_norte', name: 'Europa Norte', continent: 'europe', adjacencies: ['islandia', 'reino_unido', 'europa_oeste', 'europa_leste'], x: 360, y: 130 },
  europa_leste: { id: 'europa_leste', name: 'Europa Leste', continent: 'europe', adjacencies: ['europa_norte', 'europa_oeste', 'russia', 'oriente_medio'], x: 410, y: 165 },

  // África (5)
  argelia: { id: 'argelia', name: 'Argélia', continent: 'africa', adjacencies: ['brasil', 'europa_oeste', 'egito', 'congo'], x: 340, y: 310 },
  egito: { id: 'egito', name: 'Egito', continent: 'africa', adjacencies: ['argelia', 'oriente_medio', 'congo', 'madagascar'], x: 400, y: 300 },
  congo: { id: 'congo', name: 'Congo', continent: 'africa', adjacencies: ['argelia', 'egito', 'africa_sul'], x: 390, y: 370 },
  africa_sul: { id: 'africa_sul', name: 'África do Sul', continent: 'africa', adjacencies: ['congo', 'madagascar'], x: 410, y: 440 },
  madagascar: { id: 'madagascar', name: 'Madagascar', continent: 'africa', adjacencies: ['egito', 'africa_sul'], x: 470, y: 420 },

  // Ásia (7)
  oriente_medio: { id: 'oriente_medio', name: 'Oriente Médio', continent: 'asia', adjacencies: ['europa_leste', 'egito', 'russia', 'india'], x: 480, y: 240 },
  russia: { id: 'russia', name: 'Rússia', continent: 'asia', adjacencies: ['europa_leste', 'oriente_medio', 'siberia', 'china', 'india'], x: 500, y: 130 },
  siberia: { id: 'siberia', name: 'Sibéria', continent: 'asia', adjacencies: ['russia', 'mongolia', 'alaska'], x: 580, y: 100 },
  mongolia: { id: 'mongolia', name: 'Mongólia', continent: 'asia', adjacencies: ['siberia', 'china', 'japao'], x: 620, y: 150 },
  japao: { id: 'japao', name: 'Japão', continent: 'asia', adjacencies: ['mongolia', 'china'], x: 700, y: 180 },
  china: { id: 'china', name: 'China', continent: 'asia', adjacencies: ['russia', 'mongolia', 'japao', 'india', 'nova_guine'], x: 610, y: 210 },
  india: { id: 'india', name: 'Índia', continent: 'asia', adjacencies: ['russia', 'oriente_medio', 'china', 'sumatra'], x: 560, y: 270 },

  // Oceania (3)
  sumatra: { id: 'sumatra', name: 'Sumatra', continent: 'oceania', adjacencies: ['india', 'australia'], x: 640, y: 380 },
  nova_guine: { id: 'nova_guine', name: 'Nova Guiné', continent: 'oceania', adjacencies: ['china', 'australia'], x: 720, y: 360 },
  australia: { id: 'australia', name: 'Austrália', continent: 'oceania', adjacencies: ['sumatra', 'nova_guine'], x: 690, y: 440 }
};

export const CONTINENT_BONUSES = {
  south_america: 2,
  north_america: 5,
  europe: 5,
  africa: 3,
  asia: 7,
  oceania: 2
};

export const WAR_OBJECTIVES = [
  'Conquistar a Europa, a América do Sul e mais um terceiro continente.',
  'Conquistar a América do Norte e a África.',
  'Conquistar 24 territórios à sua escolha no mapa mundial.',
  'Conquistar a Ásia e a América do Sul.',
  'Conquistar 18 territórios à sua escolha e ocupar cada um com pelo menos 2 exércitos.',
  'Conquistar a Europa, a Oceania e mais um terceiro continente.'
];
