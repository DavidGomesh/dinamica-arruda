Um **app extremamente simples, offline e pensado para ser usado no celular durante a Cachoeira do Arruda**, sem depender de internet.

### 🎮 App das Dinâmicas

Seria uma aplicação web feita em **HTML + CSS + JavaScript puro**, podendo inclusive ficar toda em um único `index.html`. Nada de backend, login, banco de dados, React etc. O objetivo é abrir no navegador do celular e brincar.

Na tela inicial, teríamos três opções grandes:

**🎭 Mímica**
O aplicativo sorteia **um objeto**. Só quem vai fazer a mímica olha a tela e depois tenta representar o objeto sem falar. A ordem dos jogadores é fixa, para garantir que todo mundo participe. Pode haver um timer de aproximadamente **40 segundos** e um botão grande de **“Próxima palavra”**.

Exemplos: guarda-chuva, liquidificador, violão, escova de dentes, bicicleta, martelo etc.

**🤔 Palavra na testa**
O aplicativo mostra uma palavra em letras **bem grandes**. A pessoa coloca o celular na testa sem olhar a tela. Os demais dão dicas verbalmente até ela descobrir qual palavra está aparecendo.

Depois é só tocar em **“Próxima palavra”** e passar para a próxima pessoa.

**👉 Quem é mais provável?**
O aplicativo sorteia uma pergunta e alguém lê em voz alta. Depois de uma contagem — “3, 2, 1...” — **todo mundo aponta simultaneamente** para quem acha que mais combina com aquilo.

Por exemplo:

> “Quem é mais provável de dormir durante a viagem de volta?”

A graça vem justamente da discussão depois: “EU? Por quê?!”, “Claro que é tu!”, “Nada, é fulano!” etc.

### ☀️ Interface

Como vocês vão estar ao ar livre e pode haver bastante claridade, a prioridade é **legibilidade no sol**, não uma interface cheia de detalhes.

Eu faria com:

* contraste muito alto;
* letras **enormes e em negrito**;
* botões grandes, fáceis de tocar;
* pouquíssimos elementos na tela;
* nenhuma informação importante em fonte pequena;
* uma paleta forte, como **azul-marinho + branco + laranja**, ou **amarelo forte + preto**.

Durante uma brincadeira, praticamente **a palavra/pergunta ocupa a tela inteira**.

### 📱 Funcionamento

A navegação seria mais ou menos:

**Tela inicial → Escolher dinâmica → Jogar → Próximo → Próximo → Próximo → Voltar ao menu**

E tudo deve funcionar **100% offline**. As palavras, objetos e perguntas já ficam embutidos no próprio aplicativo.

Eu acrescentaria ainda uma coisa simples que combina muito com a situação: **impedir que a tela do celular apague durante uma rodada**, quando o navegador permitir.

A filosofia do app é: **abrir, escolher uma brincadeira e começar em segundos**. Nada que faça a família ficar esperando você configurar coisa no celular.
