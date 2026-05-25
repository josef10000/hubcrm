export interface MonopolySquare {
  position: number;
  name: string;
  type: 'go' | 'property' | 'chance' | 'tax' | 'jail' | 'utility' | 'company' | 'free_parking' | 'go_to_jail';
  color?: string; // Cor do grupo
  price?: number; // Preço de compra
  rent?: number[]; // Aluguel base: [base, 1casa, 2casas, 3casas, 4casas, hotel]
  housePrice?: number; // Preço para construir cada casa
  mortgageValue?: number; // Valor de hipoteca
}

export const MONOPOLY_SQUARES: MonopolySquare[] = [
  { position: 0, name: 'Partida', type: 'go' },
  { position: 1, name: 'Avenida Leblon', type: 'property', color: 'saddlebrown', price: 60, rent: [2, 10, 30, 90, 160, 250], housePrice: 50, mortgageValue: 30 },
  { position: 2, name: 'Sorte ou Revés', type: 'chance' },
  { position: 3, name: 'Avenida Presidente Vargas', type: 'property', color: 'saddlebrown', price: 60, rent: [4, 20, 60, 180, 320, 450], housePrice: 50, mortgageValue: 30 },
  { position: 4, name: 'Imposto de Renda', type: 'tax', price: 200 },
  { position: 5, name: 'Companhia de Navegação', type: 'company', price: 200, mortgageValue: 100 },
  { position: 6, name: 'Avenida Nossa S. de Copacabana', type: 'property', color: 'lightskyblue', price: 100, rent: [6, 30, 90, 270, 400, 550], housePrice: 50, mortgageValue: 50 },
  { position: 7, name: 'Sorte ou Revés', type: 'chance' },
  { position: 8, name: 'Avenida Brigadeiro Luís Antônio', type: 'property', color: 'lightskyblue', price: 100, rent: [6, 30, 90, 270, 400, 550], housePrice: 50, mortgageValue: 50 },
  { position: 9, name: 'Avenida Ruvaldo', type: 'property', color: 'lightskyblue', price: 120, rent: [8, 40, 100, 300, 450, 600], housePrice: 50, mortgageValue: 60 },
  { position: 10, name: 'Prisão (Visita)', type: 'jail' },
  { position: 11, name: 'Avenida Paulista', type: 'property', color: 'darkorchid', price: 140, rent: [10, 50, 150, 450, 625, 750], housePrice: 100, mortgageValue: 70 },
  { position: 12, name: 'Companhia de Eletricidade', type: 'utility', price: 150, mortgageValue: 75 },
  { position: 13, name: 'Avenida 9 de Julho', type: 'property', color: 'darkorchid', price: 140, rent: [10, 50, 150, 450, 625, 750], housePrice: 100, mortgageValue: 70 },
  { position: 14, name: 'Avenida Rebouças', type: 'property', color: 'darkorchid', price: 160, rent: [12, 60, 180, 500, 700, 900], housePrice: 100, mortgageValue: 80 },
  { position: 15, name: 'Companhia de Aviação', type: 'company', price: 200, mortgageValue: 100 },
  { position: 16, name: 'Avenida Higienópolis', type: 'property', color: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], housePrice: 100, mortgageValue: 90 },
  { position: 17, name: 'Sorte ou Revés', type: 'chance' },
  { position: 18, name: 'Avenida de São João', type: 'property', color: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], housePrice: 100, mortgageValue: 90 },
  { position: 19, name: 'Avenida Ipiranga', type: 'property', color: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000], housePrice: 100, mortgageValue: 100 },
  { position: 20, name: 'Parada Livre', type: 'free_parking' },
  { position: 21, name: 'Avenida Brasil', type: 'property', color: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], housePrice: 150, mortgageValue: 110 },
  { position: 22, name: 'Sorte ou Revés', type: 'chance' },
  { position: 23, name: 'Avenida Getúlio Vargas', type: 'property', color: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], housePrice: 150, mortgageValue: 110 },
  { position: 24, name: 'Avenida Rio Branco', type: 'property', color: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100], housePrice: 150, mortgageValue: 120 },
  { position: 25, name: 'Companhia de Táxi Aéreo', type: 'company', price: 200, mortgageValue: 100 },
  { position: 26, name: 'Avenida Niemeyer', type: 'property', color: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], housePrice: 150, mortgageValue: 130 },
  { position: 27, name: 'Avenida Francisco Bicalho', type: 'property', color: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], housePrice: 150, mortgageValue: 130 },
  { position: 28, name: 'Companhia de Saneamento', type: 'utility', price: 150, mortgageValue: 75 },
  { position: 29, name: 'Avenida Amaral Peixoto', type: 'property', color: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200], housePrice: 150, mortgageValue: 140 },
  { position: 30, name: 'Vá para a Prisão', type: 'go_to_jail' },
  { position: 31, name: 'Avenida Rui Barbosa', type: 'property', color: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], housePrice: 200, mortgageValue: 150 },
  { position: 32, name: 'Avenida Rui Barbosa Leste', type: 'property', color: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], housePrice: 200, mortgageValue: 150 },
  { position: 33, name: 'Sorte ou Revés', type: 'chance' },
  { position: 34, name: 'Avenida Botafogo', type: 'property', color: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], housePrice: 200, mortgageValue: 160 },
  { position: 35, name: 'Companhia de Ferrovia', type: 'company', price: 200, mortgageValue: 100 },
  { position: 36, name: 'Sorte ou Revés', type: 'chance' },
  { position: 37, name: 'Avenida Vieira Souto', type: 'property', color: 'darkblue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], housePrice: 200, mortgageValue: 175 },
  { position: 38, name: 'Taxa de Riqueza', type: 'tax', price: 100 },
  { position: 39, name: 'Avenida Atlântica', type: 'property', color: 'darkblue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], housePrice: 200, mortgageValue: 200 }
];

export interface MonopolyChanceCard {
  text: string;
  type: 'money' | 'move' | 'jail_free' | 'go_to_jail';
  value: number; // Quantidade de dinheiro ou posição da casa para se mover
}

export const CHANCE_CARDS: MonopolyChanceCard[] = [
  { text: 'Sua startup recebeu aporte de investimento! Receba M$ 200.', type: 'money', value: 200 },
  { text: 'Erro de auditoria fiscal detectado. Pague M$ 100 de multa.', type: 'money', value: -100 },
  { text: 'Você bateu a meta trimestral de vendas! Receba M$ 100.', type: 'money', value: 100 },
  { text: 'Servidores caíram no final de semana. Pague M$ 50 para reparo emergencial.', type: 'money', value: -50 },
  { text: 'Avançar até o ponto de Partida e receba M$ 200.', type: 'move', value: 0 },
  { text: 'Pegue um táxi aéreo corporativo. Vá direto para a Avenida Vieira Souto.', type: 'move', value: 37 },
  { text: 'Seu projeto inovador ganhou um prêmio da indústria! Receba M$ 150.', type: 'money', value: 150 },
  { text: 'Vá direto para a Prisão por fraude fiscal corporativa. Não passe pelo ponto de partida.', type: 'go_to_jail', value: 10 },
  { text: 'Seu time desenvolveu um script de automação espetacular. Receba M$ 50.', type: 'money', value: 50 },
  { text: 'Você encontrou uma brecha legal corporativa. Carta de saída livre da prisão.', type: 'jail_free', value: 0 },
  { text: 'Renovação anual de licenças de software expirada. Pague M$ 150.', type: 'money', value: -150 },
  { text: 'Visite a Avenida Paulista para uma reunião executiva importante.', type: 'move', value: 11 }
];
