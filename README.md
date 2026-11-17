# Trombone Practice

Aplicação web para estudar trombone em tempo real. O navegador escuta o microfone, reconhece a nota tocada com Web Audio + YIN e acompanha exercícios de leitura, escala e ouvido. Não há backend: todo o processamento acontece no cliente.

## Recursos

- **Leitura**: partitura em clave de fá que desloca com a música, linha laranja indica o tempo atual, armadura de clave por tonalidade, resultados por nota e som guia opcional.
- **Escala**: sequência de subida, oitava, descida e arpejo no tempo, com metrônomo visual, armadura de clave, estatísticas e som guia opcional.
- **Ouvido**: níveis progressivos de 1 a 6 notas; responda tocando no trombone ou clicando na tela. As notas escolhidas na tela também são reproduzidas.
- Ajustes de BPM, sensibilidade do microfone, nomes das notas e preferência de bemóis/sustenidos.
- Execução local via npm ou Docker.

## Requisitos

- Node.js 22+ e npm 11+ (para desenvolvimento local).
- Navegador moderno com suporte a Web Audio e permissão de microfone.
- Docker e Docker Compose (opcional).

## Executando localmente

```bash
npm install
npm run dev
```

Acesse <http://localhost:5173> e permita o uso do microfone.

Para gerar e servir a versão de produção:

```bash
npm run build
npm run preview
```

Se o npm 11 bloquear o postinstall do esbuild:

```bash
npm install-scripts approve esbuild
```

## Executando com Docker

Desenvolvimento:

```bash
docker compose up --build dev
# http://localhost:5173
```

Produção:

```bash
docker compose up --build prod
# http://localhost:8081
```

A porta `8081` é usada na produção porque `8080` pode estar ocupada no ambiente de desenvolvimento.

## Como usar

1. Clique em **Ativar microfone** e permita o acesso.
2. Use fones de ouvido, especialmente com o som guia ligado, para o microfone não captar a reprodução.
3. Escolha a aba **Leitura**, **Escala** ou **Ouvido**.
4. Ajuste BPM, sensibilidade e preferências no painel superior.
5. Acompanhe a linha laranja e o metrônomo; toque no tempo indicado.

Para reconhecer notas fora de `localhost` (por IP ou rede local), o site precisa ser servido via HTTPS, pois `getUserMedia` exige contexto seguro.

## Estrutura do projeto

```text
src/
  audio/       captura de microfone, YIN, eventos e síntese
  components/  partitura SVG e metrônomo visual
  exercises/   Leitura, Escala e Ouvido
  hooks/       relógio de animação
  music/       MIDI, escalas, melodias e armadura de clave
  types.ts     tipos compartilhados
```

## Validação

```bash
npm run typecheck
npm run build
```

Não há testes automatizados nem script de lint. Após alterar a detecção ou a interface, valide também no navegador com microfone real.
