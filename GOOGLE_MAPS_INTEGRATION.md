# Integração Google Maps - Synapse

Este documento descreve como usar as integrações do Google Maps e Places API no Synapse.

## 📋 Visão Geral

O Synapse agora possui integrações completas com o Google Maps, permitindo:

- **Geocoding**: Converter endereços em coordenadas e vice-versa
- **Direções**: Calcular rotas entre dois locais
- **Busca de Locais**: Procurar empresas, pontos de interesse, etc.
- **Detalhes de Lugares**: Obter informações detalhadas sobre um local
- **Mapas Estáticos**: Exibir mapas com marcadores

## 🚀 Como Usar

### 1. Hook `useGoogleMaps`

O hook `useGoogleMaps` fornece acesso a todas as funcionalidades:

```typescript
import { useGoogleMaps } from '../hooks/useGoogleMaps';

const MyComponent = () => {
  const { geocode, reverseGeocode, getDirections, searchPlaces, getPlaceDetails, loading, error } = useGoogleMaps();

  // Usar as funções
  const handleGeocode = async () => {
    const result = await geocode('Av. Paulista, São Paulo');
    console.log(result); // { formatted_address, location, place_id }
  };

  return (
    // ...
  );
};
```

### 2. Componente `MapDisplay`

Exibe um mapa estático com marcadores:

```typescript
import MapDisplay from '../components/maps/MapDisplay';

<MapDisplay
  center={{ lat: -23.5505, lng: -46.6333 }}
  zoom={15}
  markers={[
    { position: { lat: -23.5505, lng: -46.6333 }, title: 'São Paulo' }
  ]}
  height="400px"
/>
```

### 3. Componente `PlaceSearch`

Componente completo de busca de locais:

```typescript
import PlaceSearch from '../components/maps/PlaceSearch';

<PlaceSearch
  onPlaceSelected={(place) => {
    console.log('Local selecionado:', place);
  }}
/>
```

## 📚 Exemplos de Uso

### Geocoding (Endereço → Coordenadas)

```typescript
const { geocode } = useGoogleMaps();

const result = await geocode('Rua Augusta, 1000, São Paulo');
// Retorna:
// {
//   formatted_address: "Rua Augusta, 1000 - Centro, São Paulo, SP, Brasil",
//   location: { lat: -23.5505, lng: -46.6333 },
//   place_id: "ChIJ..."
// }
```

### Reverse Geocoding (Coordenadas → Endereço)

```typescript
const { reverseGeocode } = useGoogleMaps();

const result = await reverseGeocode(-23.5505, -46.6333);
// Retorna o endereço da coordenada
```

### Calcular Rotas

```typescript
const { getDirections } = useGoogleMaps();

const result = await getDirections(
  'Av. Paulista, São Paulo',
  'Pça. da Sé, São Paulo',
  'driving' // 'driving' | 'walking' | 'bicycling' | 'transit'
);
// Retorna:
// {
//   distance: "5.2 km",
//   duration: "15 mins",
//   polyline: "..." // para desenhar no mapa
// }
```

### Buscar Locais

```typescript
const { searchPlaces } = useGoogleMaps();

const results = await searchPlaces('restaurantes', { lat: -23.5505, lng: -46.6333 }, 1000);
// Retorna array de PlaceDetails
```

### Obter Detalhes de um Local

```typescript
const { getPlaceDetails } = useGoogleMaps();

const details = await getPlaceDetails('ChIJ...');
// Retorna informações completas do local
```

## 🔧 Configuração

### Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no seu `.env`:

```
BUILT_IN_FORGE_API_URL=<seu-forge-api-url>
BUILT_IN_FORGE_API_KEY=<sua-api-key>
OAUTH_SERVER_URL=<seu-oauth-server>
```

### Backend

As integrações são gerenciadas pelo backend em:
- `/packages/services/legacy-api/_core/map.ts` - Google Maps API
- `/packages/services/legacy-api/_core/oauth.ts` - OAuth

## 🎯 Página de Exemplo

Acesse `/dashboard/maps` para ver um exemplo completo de todas as funcionalidades.

## 📖 Tipos TypeScript

```typescript
interface LatLng {
  lat: number;
  lng: number;
}

interface GeocodingResult {
  formatted_address: string;
  location: LatLng;
  place_id: string;
}

interface DirectionsResult {
  distance: string;
  duration: string;
  polyline: string;
}

interface PlaceDetails {
  name: string;
  formatted_address: string;
  rating?: number;
  phone?: string;
  website?: string;
}
```

## ⚠️ Notas Importantes

1. **Autenticação**: Todas as requisições são autenticadas automaticamente pelo backend
2. **Rate Limiting**: Respeite os limites de taxa da API do Google
3. **Custos**: Algumas APIs do Google Maps têm custos associados
4. **Privacidade**: Dados de localização são sensíveis - trate com cuidado

## 🐛 Troubleshooting

### Erro: "Google Maps proxy credentials missing"

Verifique se as variáveis de ambiente estão configuradas corretamente.

### Erro: "API error"

Verifique a conexão com o servidor backend e os logs do servidor.

### Nenhum resultado na busca

Verifique se a query está correta e se a API está ativa.

## 📞 Suporte

Para mais informações sobre a API do Google Maps, consulte:
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview)
