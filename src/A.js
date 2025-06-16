const readline = require('readline');

class Player {
  constructor(name, isHuman = false) {
    this.name = name;
    this.position = 0; // metros na pista
    this.speed = 0; // metros por turno
    this.lap = 1;
    this.maxLap = 3;
    this.isHuman = isHuman;
    this.items = [];
    this.isSlowed = false; // efeito banana
    this.isTargeted = false; // efeito casca vermelha
    this.finished = false;
  }

  resetTurn() {
    this.speed = 0;
    this.isSlowed = false;
    this.isTargeted = false;
  }

  advance() {
    let advanceDistance = this.speed;
    if (this.isSlowed) advanceDistance = Math.max(1, advanceDistance - 2);
    this.position += advanceDistance;
  }
}

class Game {
  constructor() {
    this.trackLength = 100; // metros por volta
    this.players = [];
    this.turn = 1;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  setup() {
    this.players.push(new Player('Você', true));
    this.players.push(new Player('Luigi'));
    this.players.push(new Player('Peach'));
    this.players.push(new Player('Bowser'));

    // Distribuir 1 item inicial para o jogador humano e IA
    this.players.forEach(p => {
      p.items.push('banana'); // só para exemplo, todos começam com banana
    });

    this.gameLoop();
  }

  showStatus() {
    console.log('\n== Status da corrida ==');
    this.players.forEach(p => {
      console.log(
        `${p.name} - Posição: ${p.position.toFixed(1)}m, Volta: ${p.lap}/${p.maxLap} ${
          p.finished ? '(Terminou)' : ''
        } Itens: [${p.items.join(', ')}]`
      );
    });
    console.log('------------------------');
  }

  async playerTurn(player) {
    if (player.finished) return;

    return new Promise((resolve) => {
      if (!player.isHuman) {
        // IA simples: acelera sempre, usa item se tiver e tiver alguém na frente
        let action = 'acelerar';

        if (player.items.length > 0) {
          const targetsAhead = this.players.filter(p => p.position > player.position && !p.finished);
          if (targetsAhead.length > 0) action = 'usarItem';
        }

        if (action === 'usarItem') {
          const item = player.items.shift();
          console.log(`${player.name} usou um ${item}!`);
          this.applyItemEffect(player, item);
          player.speed = 10; // acelera normalmente depois
        } else {
          player.speed = 10;
        }
        return resolve();
      }

      // Jogador humano
      console.log(`\nSua vez! Escolha a ação:`);
      console.log(`1 - Acelerar`);
      console.log(`2 - Usar item`);
      console.log(`3 - Mostrar status`);
      this.rl.question('Digite o número da ação: ', (answer) => {
        if (answer === '1') {
          player.speed = 10;
          resolve();
        } else if (answer === '2') {
          if (player.items.length === 0) {
            console.log('Você não tem itens para usar!');
            player.speed = 5; // acelerar pouco
            resolve();
          } else {
            console.log(`Itens disponíveis: ${player.items.join(', ')}`);
            this.rl.question('Qual item usar? ', (itemName) => {
              const index = player.items.indexOf(itemName);
              if (index === -1) {
                console.log('Item inválido!');
                player.speed = 5;
                resolve();
              } else {
                player.items.splice(index, 1);
                console.log(`Você usou um ${itemName}!`);
                this.applyItemEffect(player, itemName);
                player.speed = 10;
                resolve();
              }
            });
          }
        } else if (answer === '3') {
          this.showStatus();
          this.playerTurn(player).then(resolve);
        } else {
          console.log('Comando inválido!');
          this.playerTurn(player).then(resolve);
        }
      });
    });
  }

  applyItemEffect(player, item) {
    // Exemplo simples de efeitos
    if (item === 'banana') {
      // joga banana atrás para atrasar quem vem atrás
      const behindPlayers = this.players.filter(p => p.position < player.position && !p.finished);
      if (behindPlayers.length > 0) {
        const target = behindPlayers.sort((a, b) => b.position - a.position)[0];
        target.isSlowed = true;
        console.log(`${target.name} foi atingido pela banana e vai andar mais devagar no próximo turno!`);
      } else {
        console.log('Ninguém atrás para atingir com a banana.');
      }
    } else if (item === 'casca-vermelha') {
      // mira no adversário na frente mais próximo
      const aheadPlayers = this.players.filter(p => p.position > player.position && !p.finished);
      if (aheadPlayers.length > 0) {
        const target = aheadPlayers.sort((a, b) => a.position - b.position)[0];
        target.isTargeted = true;
        console.log(`${target.name} foi atingido pela casca vermelha e perderá velocidade!`);
      } else {
        console.log('Ninguém na frente para atingir com a casca vermelha.');
      }
    } else if (item === 'cogumelo') {
      // acelera mais nesse turno
      player.speed += 5;
      console.log(`${player.name} recebeu um turbo com o cogumelo!`);
    }
  }

  updatePositions() {
    this.players.forEach(p => {
      if (!p.finished) {
        p.advance();

        if (p.position >= this.trackLength * p.lap) {
          p.lap++;
          if (p.lap > p.maxLap) {
            p.finished = true;
            console.log(`\n${p.name} terminou a corrida!`);
          } else {
            console.log(`${p.name} completou a volta ${p.lap - 1}!`);
          }
        }
      }
    });

    // Ordena pela posição
    this.players.sort((a, b) => b.position - a.position);
  }

  allFinished() {
    return this.players.every(p => p.finished);
  }

  async gameLoop() {
    while (!this.allFinished()) {
      console.log(`\n--- Turno ${this.turn} ---`);
      for (const player of this.players) {
        player.resetTurn();
      }

      for (const player of this.players) {
        await this.playerTurn(player);
      }

      this.updatePositions();
      this.showStatus();
      this.turn++;
    }

    console.log('\n=== Corrida finalizada! Resultado final ===');
    this.players.forEach((p, i) => {
      console.log(`${i + 1}º - ${p.name}`);
    });
    this.rl.close();
  }
}

const game = new Game();
game.setup();
