Perfeito. Com essas mudanças, ele deixa de ser apenas um sorteador de palavras e vira um **miniapp de jogos para o grupo**, com jogadores, partidas e histórico. Eu consolidaria a descrição assim:

## 🎮 App de Dinâmicas — descrição atualizada

O aplicativo será uma **aplicação web mobile-first, 100% offline**, feita para rodar diretamente no navegador do celular durante o passeio. Não terá backend nem login. Todos os jogadores, partidas, resultados e históricos serão persistidos no **`localStorage` do navegador**.

A interface deve ter uma identidade **divertida, cartunesca e física**, como se cada palavra, pergunta ou resultado estivesse escrito em uma **ficha de papel**. Esses papéis podem ter bordas levemente irregulares, pequenas dobras/amassados e sombras, sem comprometer a leitura.

Como o aplicativo será usado ao ar livre, a estética de papel precisa coexistir com **contraste muito alto, tipografia grande e botões extremamente visíveis**.

### 👥 Jogadores

Antes das brincadeiras, haverá uma área de **Jogadores**.

Será possível cadastrar até **10 pessoas**. Cada jogador terá pelo menos um nome e poderá receber um pequeno avatar visual, como uma cor ou ícone, para facilitar a identificação.

Esses jogadores serão reutilizados nas diferentes partidas e permanecerão cadastrados no `localStorage`.

---

## 🎭 1. Mímica

Ao iniciar uma partida, o usuário seleciona **qual jogador fará a mímica**.

O app então apresenta uma ficha grande contendo um **objeto sorteado**, por exemplo:

> 📝 **LIQUIDIFICADOR**

Começa um timer — inicialmente podemos considerar **40 segundos**.

O jogador tenta fazer o restante do grupo descobrir o objeto sem falar.

Ao terminar, existem duas ações grandes:

**✓ ACERTARAM**
**✕ NÃO ACERTARAM**

O resultado é salvo imediatamente no histórico daquele jogador.

Depois de várias rodadas, será possível consultar algo como:

> **David — Mímica**
> 12 objetos jogados
> 9 acertados
> 3 errados
> **75% de sucesso**

E também consultar o histórico individual:

> ✓ Bicicleta
> ✓ Guarda-chuva
> ✕ Liquidificador
> ✓ Martelo

Assim não guardamos apenas o placar agregado: **guardamos cada tentativa**.

---

## 🤔 2. Palavra na Testa

Antes da rodada, selecionamos **quem colocará o celular na testa**.

O app sorteia uma palavra e a exibe ocupando praticamente toda a tela.

Como a pessoa **não pode olhar para a interface**, não vamos depender de pequenos botões.

A tela será dividida em duas grandes áreas invisíveis de toque:

**← LADO ESQUERDO — ACERTOU**

Ao tocar, registra a palavra como acerto e imediatamente apresenta a próxima.

**LADO DIREITO — ERROU →**

Registra como erro e passa para a próxima.

Pode haver uma resposta visual muito rápida — por exemplo, a ficha dando uma animação — sem exigir que o jogador olhe para a tela.

A rodada terá um timer. Quando terminar:

> **Rodada da Hiris**
> ✓ 8 acertos
> ✕ 3 erros
> **11 palavras jogadas**

Tudo também fica registrado individualmente:

> ✓ Elefante
> ✓ Avião
> ✕ Pipoca
> ✓ Futebol
> ✕ Cachoeira

Assim podemos ter estatísticas acumuladas por jogador e por partida.

---

## 👉 3. Quem é mais provável?

Aqui o funcionamento muda.

Primeiro selecionamos **todos os jogadores que participarão daquela partida**.

O aplicativo sorteia uma pergunta:

> **QUEM É MAIS PROVÁVEL DE...**
>
> dormir durante a viagem de volta?

Todo mundo aponta/vota presencialmente.

Depois alguém registra no celular quantos votos cada pessoa recebeu.

Por exemplo:

> David — 0
> Hiris — 4
> Ivaneide — 1
> Jó — 2

Confirmamos e passamos para a próxima pergunta.

O aplicativo registra **a pergunta + todos os votos**, e não apenas o vencedor.

No final podemos ter:

> 🏆 **Mais acusado da partida**
> **Hiris — 17 votos**

E, ao abrir uma pessoa:

> **Hiris**
>
> 17 votos recebidos
>
> 💤 Mais provável de dormir na volta — 4 votos
> 📱 Mais provável de esquecer alguma coisa — 5 votos
> 😂 Mais provável de começar a rir na hora errada — 3 votos
> ...

Isso permite posteriormente lembrar exatamente **do que cada pessoa foi "acusada"**.

---

# 📊 Estatísticas e histórico

Essa passa a ser uma quarta área importante do aplicativo.

Na tela inicial, eu colocaria:

**🎭 Mímica**
**🤔 Palavra na Testa**
**👉 Quem é mais provável?**
**📊 Histórico e Estatísticas**
**👥 Jogadores**

O histórico seria dividido em duas perspectivas.

**Por partida:** mostra quando aconteceu, quem participou, todas as rodadas e o resultado.

**Por jogador:** junta o desempenho da pessoa em todas as partidas já realizadas.

Por exemplo:

> ### David
>
> 🎭 Mímica
> 23 jogadas · 18 acertos · 5 erros
>
> 🤔 Palavra na testa
> 31 palavras · 24 acertos · 7 erros
>
> 👉 Quem é mais provável
> 38 votos recebidos

Isso significa que fechar o navegador **não apaga a brincadeira**. Quando abrir novamente, o histórico continua lá.

---

# 🎨 Identidade visual — "fichas de papel"

Eu mudaria um pouco a paleta que tínhamos pensado.

Em vez de fundo amarelo muito forte ocupando a tela inteira, faria o **fundo extremamente contrastante** e colocaria o conteúdo sobre uma ficha de papel clara.

Algo conceitualmente assim:

> 🟦 **FUNDO FORTE**
>
> ┌─────────────────────┐
> │                     │
> │       PAPEL         │
> │                     │
> │    GUARDA-CHUVA     │
> │                     │
> └─────────────────────┘

O papel não precisa ser branco puro. Eu usaria algo próximo de **papel creme/amarelado**, com texto quase preto.

Para diferenciar os jogos, podemos usar cores fortes:

**Mímica:** azul + papel creme
**Palavra na testa:** laranja + papel creme
**Quem é mais provável:** roxo + papel creme
**Acerto:** verde intenso
**Erro:** vermelho intenso

A ficha pode ter uma leve rotação, sombra forte e textura discreta de papel amassado. Quando trocar a palavra, podemos inclusive fazer uma animação como se **uma ficha fosse jogada fora e outra aparecesse**.

Isso deixa o aplicativo com cara de **jogo de festa**, em vez de parecer um sistema administrativo.

E como vai ser usado no sol, eu colocaria uma regra de design acima de todas as outras: **nenhuma textura, animação ou estética cartunesca pode diminuir a legibilidade**. O texto principal precisa continuar enorme, pesado e com contraste máximo.

Com isso, acho que agora temos uma definição bem sólida do produto: **3 jogos + jogadores + partidas + histórico + estatísticas + persistência offline**, mantendo uma interface extremamente simples durante a brincadeira.
