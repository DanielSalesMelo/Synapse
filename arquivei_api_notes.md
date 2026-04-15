# Arquivei API (Lite) Documentation Notes

## Base URL
`https://lite-api.arquivei.com.br`

## Authentication
- API Key via header or query parameter
- Authorize button in Swagger

## Endpoints

### GET /v1/nfe/
- Busca XML de NF-e pela chave de acesso (44 dígitos)
- Query param: `access_key` (string, required, 44 chars)
- Response 200:
  ```json
  {
    "status": { "code": 0, "message": "string" },
    "data": { "xml": "string" }
  }
  ```
- Headers response: `Remaining-Requests`, `Expiration-Date`

### GET /v1/nfe/status/
- Busca o status de NF-es

## Notes
- A chave de acesso tem 44 dígitos numéricos
- O XML retornado pode ser usado para gerar o DANFE (PDF)
- Autenticação via API credentials (App ID + API Key)
