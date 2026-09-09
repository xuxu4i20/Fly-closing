# FLY Closing

Fechamento de caixa por turno. Conta o dinheiro físico, deixa €150,00, diz exatamente o que retirar.

## Rodar
- **Local**: abra `index.html` no navegador (funciona sem servidor).
- **PWA / iPhone**: sirva a pasta em HTTPS (GitHub Pages, Netlify, Vercel, ou `python3 -m http.server`). No Safari: Compartilhar → Adicionar à Tela de Início. Funciona offline após o primeiro carregamento.

## Testes
```
node tests.js
```
20 testes cobrindo os casos A–N do brief (precisão, limites, sem solução exata, ranking, persistência, editar/apagar, CSV, verificação `inicial − retirado = final`).

## Arquivos
| Arquivo | Papel |
|---|---|
| `logic.js` | Matemática pura em centavos inteiros. DP de bounded subset sum. Zero DOM. |
| `storage.js` | localStorage + CSV. |
| `i18n.js` | ES/EN e formatação monetária (`249,00 €` / `€249.00`). |
| `app.js` | UI (telas, steppers, histórico, detalhe). |
| `styles.css` | Estilo iOS-like, dark mode, safe areas. |
| `sw.js`, `manifest.webmanifest`, `icon-*` | PWA/offline. |

Zero dependências. ~55 KB no total sem compressão.

## Algoritmo (resumo)
DP por sufixo de denominações (maior → menor) sobre valores em unidades de 5 centavos, limitada ao valor a retirar. Critério embutido: menos unidades → mais unidades da denominação maior (preserva troco). Alternativa: melhor solução exata excluindo uma denominação usada na recomendada. Sem solução exata: valores atingíveis mais próximos (acima e abaixo), nunca mostrando €150,00 quando não é exato.

## Ao atualizar arquivos
Incremente `CACHE` em `sw.js` para os usuários receberem a nova versão.
