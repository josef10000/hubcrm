export interface GameHelpRule {
  title: string;
  objective: string;
  steps: string[];
  tips: string[];
}

export const GAME_RULES: Record<string, GameHelpRule> = {
  connect4: {
    title: 'Lig 4 (Connect 4)',
    objective: 'Alinhar 4 fichas consecutivas da sua cor em qualquer direção (horizontal, vertical ou diagonal) antes do oponente.',
    steps: [
      'Escolha uma coluna para soltar sua ficha.',
      'A ficha cairá sob a ação da gravidade até a menor linha disponível daquela coluna.',
      'Os jogadores se revezam soltando uma ficha por vez.',
      'O jogo termina assim que um jogador forma uma linha de 4 ou o tabuleiro fica totalmente preenchido (empate).'
    ],
    tips: [
      'Monitore o centro do tabuleiro: controlar as colunas centrais oferece mais combinações possíveis.',
      'Bloqueie o oponente imediatamente se ele alinhar 3 fichas seguidas com extremidades livres.'
    ]
  },
  checkers: {
    title: 'Damas Clássicas',
    objective: 'Capturar todas as peças do adversário ou bloqueá-lo de forma que ele não consiga realizar nenhum movimento válido.',
    steps: [
      'As peças normais movem-se apenas diagonalmente para a frente, uma casa por vez.',
      'A captura é obrigatória: se você puder saltar sobre uma peça vizinha do oponente e cair em uma casa vazia logo atrás, você deve fazê-lo.',
      'Ao alcançar a última fileira oposta do tabuleiro, sua peça é promovida a Dama.',
      'A Dama move-se diagonalmente para frente e para trás por qualquer número de casas livres.'
    ],
    tips: [
      'Tente manter a fileira de trás protegida pelo maior tempo possível para evitar que o oponente faça Damas.',
      'Sacrificar uma peça estrategicamente pode forçar o oponente a capturar e cair em uma armadilha de captura dupla.'
    ]
  },
  chess: {
    title: 'Xadrez de Luxo',
    objective: 'Colocar o Rei adversário sob ataque direto ("Xeque") de tal forma que ele não possua nenhuma jogada legal para escapar ("Xeque-mate").',
    steps: [
      'Peões movem-se 1 casa para frente (ou 2 no primeiro movimento) e capturam na diagonal vizinha.',
      'Torres movem-se em linhas retas (horizontais/verticais); Bispos movem-se em diagonais livres.',
      'Cavalos movem-se em formato de "L" (2x1 casas) e são as únicas peças que podem saltar sobre outras.',
      'A Rainha combina os movimentos de Torre e Bispo; o Rei move-se apenas 1 casa em qualquer direção.',
      'Movimentos Especiais: Suporta "Roque" (proteção do Rei com a Torre) e Promoção de Peões na última linha.'
    ],
    tips: [
      'Domine o centro do tabuleiro logo na abertura com Peões e Cavalos.',
      'Não desenvolva a Rainha cedo demais, pois ela pode se tornar alvo fácil de ataques inimigos.'
    ]
  },
  ludo: {
    title: 'Ludo 4 Players',
    objective: 'Mover suas 4 fichas coloridas da base de partida até o triângulo central da sua cor no tabuleiro.',
    steps: [
      'Role o dado. É necessário obter o número 6 para colocar uma ficha em jogo no ponto de partida.',
      'Mova a ficha no sentido horário a quantidade de casas indicadas pelo dado.',
      'Se tirar o número 6, você ganha o direito a uma rolagem extra.',
      'Ao cair em uma casa ocupada por uma ficha inimiga, ela é capturada e mandada de volta à base de origem.'
    ],
    tips: [
      'Priorize tirar todas as suas peças da base o quanto antes se rolar o número 6.',
      'Posicione suas fichas nas casas com estrelas (zonas seguras) para evitar capturas do oponente.'
    ]
  },
  monopoly: {
    title: 'Monopoly (Banco Imobiliário)',
    objective: 'Acumular o maior império imobiliário e financeiro corporativo, forçando todos os oponentes à falência.',
    steps: [
      'Role os dados e avance a quantidade correspondente de casas no tabuleiro 11x11.',
      'Ao cair em uma propriedade sem dono, você pode comprá-la. Ao cair em uma de oponente, você deve pagar aluguel.',
      'Tire dados duplos para jogar de novo. Três duplos seguidos mandam você para a prisão.',
      'Forme um Monopólio: obter todas as propriedades do mesmo grupo de cor dobra o aluguel e libera a construção de casas/hotéis.',
      'Cartas Sorte/Revés executam transações, prêmios ou multas fiscais reativas imediatamente.'
    ],
    tips: [
      'As propriedades laranja e vermelhas são as mais visitadas no tabuleiro devido à distância da prisão.',
      'Não hesite em comprar companhias de serviços, pois fornecem renda passiva excelente no início da partida.'
    ]
  },
  war: {
    title: 'War (Estratégia Militar)',
    objective: 'Cumprir inteiramente o seu Objetivo Secreto de dominação continental antes dos generais oponentes.',
    steps: [
      '📍 Distribuição: Receba e aloque exércitos extras baseados na quantidade de territórios e bônus de continentes dominados.',
      '⚔️ Ataque: Use um território com >= 2 exércitos para invadir um vizinho oponente. Dados de ataque (até 3) duelam contra dados de defesa.',
      '🛡️ Remanejamento: Transfira exércitos entre seus territórios conectados para blindar suas fronteiras desprotegidas.',
      '🃏 Troca de Cartas: Combine símbolos (Triângulo, Círculo, Quadrado) para receber contingentes massivos de reforços.'
    ],
    tips: [
      'A América do Sul e a Oceania são excelentes continentes para dominar no início por terem poucas fronteiras de ataque.',
      'Evite espalhar muito seus exércitos. Concentrar uma grande tropa de ataque é mais eficiente do que manter exércitos fracos.'
    ]
  }
};
