# Synapse AI and Knowledge Architecture

Timezone oficial: America/Sao_Paulo.

## Prioridade de IA

1. IA cloud configurada (`OpenAI`, `Gemini` ou `Azure OpenAI`).
2. IA local opcional, somente quando o equipamento suporta e um endpoint local foi configurado.
3. Fallback humano, sem quebrar o chat.

Variáveis:

- `AI_PROVIDER=openai|gemini|azure|local|disabled`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
- `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`
- `LOCAL_AI_URL`

Se nenhum provider estiver disponível, a triagem registra provider `fallback_humano` e orienta atendimento manual.

## Base de Conhecimento

A estrutura oficial fica em `packages/services/legacy-api/knowledge/`.

Fontes TOTVS, SEFAZ, Microsoft e procedimentos internos começam como `pendente_ingestao`. A IA só deve usar passos específicos quando a fonte estiver homologada como `integrado`; caso contrário, deve informar que precisa validação humana.
