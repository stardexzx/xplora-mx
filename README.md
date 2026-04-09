# Xplora MX

**Xplora MX** es una aplicación web progresiva (PWA) construida con Next.js que conecta a turistas con micro y pequeños negocios locales en México. Los usuarios pueden descubrir negocios auténticos mediante búsqueda por texto o voz en lenguaje natural, filtros por categoría y geolocalización, todo visualizado sobre un mapa interactivo de Google Maps.

## Características principales

- **Búsqueda inteligente**: escribe o habla tu consulta en cualquier idioma; la app la traduce y la interpreta para filtrar negocios por categoría y etiquetas.
- **Mapa interactivo**: visualiza los negocios sobre Google Maps con marcadores y popups con información detallada, galería de imágenes y rutas.
- **Geolocalización**: filtra negocios dentro de un radio de 5 km desde tu posición actual.
- **Multiidioma**: la interfaz y los contenidos se traducen automáticamente al idioma del navegador (DeepL) — soporta ES, EN, PT, FR, DE, JA, KO, AR.
- **Chatbot asistente**: widget de chat con IA para orientar a turistas y también para asesorar a dueños de negocios en la gestión de su establecimiento.
- **Panel de dueños**: registro y gestión de negocios con carga de imágenes (Cloudinary), horarios, métodos de pago, etiquetas y ubicación en mapa.
- **Panel de administración**: aprobación y moderación de negocios registrados.
- **Reseñas y calificaciones**: los usuarios pueden dejar reseñas con puntuación de 1 a 5 estrellas.
- **Generación de QR**: página dedicada para generar códigos QR del negocio.
- **PWA**: instalable en dispositivos móviles con soporte offline básico.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (PKCE) |
| Mapas | Google Maps (`@react-google-maps/api`) |
| Traducción | DeepL API |
| Imágenes | Cloudinary |
| IA | Anthropic Claude SDK / Google Generative AI |
| Lenguaje | TypeScript |

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior
- Cuentas activas en: Supabase, Google Cloud (Maps API), DeepL, Cloudinary

## Instalación

1. **Clona el repositorio**

   ```bash
   git clone <url-del-repo>
   cd xplora-mx
   ```

2. **Instala dependencias**

   ```bash
   npm install
   ```

3. **Configura las variables de entorno**

   Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<tu-api-key-de-google-maps>
   DEEPL_API_KEY=<tu-api-key-de-deepl>
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<tu-cloud-name>
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<tu-upload-preset>
   ```

4. **Inicia el servidor de desarrollo**

   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:3000`.

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # Lint con ESLint
```

## Estructura del proyecto

```
app/
  api/           # API Routes (interpretQuery, translate, translateUI, route, asesoria, diagnostico)
  admin/         # Panel de administración
  dashboard/     # Registro y gestión de negocios
  login/         # Autenticación
  mis-negocios/  # Vista de negocios del dueño
  perfil/        # Perfil de usuario
  qr/            # Generador de QR
  page.tsx        # Página principal (mapa + búsqueda)
component/       # Componentes reutilizables (Map, BusinessPopup, ChatbotWidget, etc.)
context/         # Contextos globales (LangContext, MapsContext)
hooks/           # Custom hooks (useTranslatedNegocios)
services/        # Clientes de servicios externos (supabase, translate, geo, cloudinary, ia)
types/           # Tipos TypeScript (Negocio, etc.)
```

## Flujo principal

1. El usuario abre la app → se detecta su idioma → la UI se traduce automáticamente.
2. Escribe o habla una consulta en lenguaje natural (ej. "restaurant barato familiar").
3. La consulta se traduce al español y se interpreta en `POST /api/interpretQuery` → devuelve `{ category, tags[] }`.
4. Los negocios aprobados se consultan en Supabase y se filtran por categoría, etiquetas y (opcionalmente) radio de 5 km.
5. Los resultados aparecen en la lista lateral y como marcadores en el mapa.
6. Al seleccionar un negocio se muestra un popup con detalles, galería, calificación, reseñas y opción de calcular ruta.

## Tipos de usuario

| Tipo | Acceso |
|---|---|
| Turista (anónimo) | Búsqueda, mapa, reseñas |
| Turista (registrado) | Lo anterior + perfil y reseñas propias |
| Dueño de negocio | Lo anterior + dashboard de registro y gestión de negocios |
| Administrador | Lo anterior + panel de aprobación de negocios |
