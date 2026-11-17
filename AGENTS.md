# AGENTS.md

## Visão geral

Aplicação web de estudo de trombone em React + Vite + TypeScript. A detecção de nota é feita no navegador com Web Audio + YIN; não há backend. Interface e textos devem permanecer em português.

## Comandos

```bash
npm install
npm run dev        # servidor de desenvolvimento em http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + bundle de produção em dist/
npm run preview    # serve dist/ localmente
```

Não existe script de lint nem suíte de testes automatizados. Valide mudanças com `npm run typecheck`, `npm run build` e teste manual no navegador com microfone.

Com npm 11, se o postinstall do esbuild for bloqueado:

```bash
npm install-scripts approve esbuild
```

## Docker

```bash
docker compose up --build dev   # http://localhost:5173
docker compose up --build prod  # http://localhost:8081
```

A porta de produção é `8081` porque `8080` pode estar ocupada. Não altere sem conferir o ambiente.

## Estrutura

- `src/audio/`: captura de microfone, YIN, eventos de nota e síntese de som.
- `src/music/`: conversão MIDI/nome, escalas, geração de melodia e armadura de clave.
- `src/components/`: `Staff` (partitura SVG) e `Metronome`.
- `src/exercises/`: `SightReading`, `ScaleStudy` e `EarTraining`.
- `src/hooks/`: relógio de animação compartilhado.
- `src/types.ts`: tipos de notas, resultados e configurações.

## Convenções e pontos importantes

- Mantenha a UI em português e evite comentários desnecessários no código.
- O metrônomo e as notas precisam cair em tempos inteiros: use `LEAD_IN_BEATS` e `ROUND_GAP_BEATS` em `src/exercises/helpers.ts`, nunca atrasos fixos em segundos.
- Ao trocar de partitura ou reiniciar, zere `lastBeatRef` para não tocar o clique do tempo errado.
- A armadura de clave é calculada em `src/music/keySignature.ts` e passada ao `Staff` via prop `keySignature`.
- Posições dos acidentes na clave de fá são deslocamentos diatônicos em relação à linha inferior; não use ledger lines na armadura.
- Quando a armadura define bemóis ou sustenidos, ela prevalece sobre a preferência global `useFlats` nos exercícios 1 e 2.
- O som guia dos exercícios 1 e 2 pode ser captado pelo microfone; mantenha o aviso de usar fones.
- Eventos de nota usam `midi: null` para fim de nota; filtre isso antes de avaliar.
- `getUserMedia` exige contexto seguro: `localhost` funciona por HTTP; IP/rede exige HTTPS.
