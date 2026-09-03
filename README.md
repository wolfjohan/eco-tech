# EcoTech AI - Identificador de Desechos Tecnológicos con IA (RAEE)

Aplicación Web Móvil (PWA) desarrollada para identificar mediante Visión Artificial residuos de aparatos eléctricos y electrónicos (RAEE), evaluar su grado de reciclabilidad, detectar sustancias peligrosas y orientar sobre su adecuada gestión ambiental.

## 🚀 Características
- **Optimizado para Móvil:** Permite captura directa con la cámara del celular o carga desde la galería.
- **Compresión en Cliente:** Reduce automáticamente la resolución y peso de la foto en el navegador antes de enviarla, garantizando respuestas rápidas con bajo consumo de datos móviles.
- **Análisis con Gemini 1.5 Flash:** Modelo multimodal gratuito y de alta velocidad con capacidad de visión para reconocer circuitos, baterías, periféricos, fuentes de poder y cables.
- **Formato Estructurado:** Clasificación RAEE, semáforo ecológico (Reciclable, Tratamiento Especial, Peligroso), desglose de metales/materiales y advertencias de seguridad.
- **Arquitectura Serverless:** Protege la API Key en el backend (`/api/classify`) sin exponerla al cliente web.

## 📁 Estructura del Proyecto
```
eco-tech-recycler/
├── index.html         # Interfaz de usuario responsive (Tailwind CSS)
├── app.js             # Lógica cliente, compresión de imagen y renderizado
├── manifest.json      # Configuración PWA para instalar en la pantalla del celular
├── sw.js              # Service Worker para modo offline y caché
├── vercel.json        # Enrutamiento de la función serverless
├── package.json       # Manifiesto del proyecto
├── .env.example       # Plantilla de variables de entorno
└── api/
    └── classify.js    # Función serverless (Node.js) conectada a Gemini API
```

## 🛠️ Guía de Despliegue Gratuito en Vercel (Paso a Paso)

### 1. Obtener la Clave de API de Gemini (Gratis)
1. Ingresa a [Google AI Studio](https://aistudio.google.com/).
2. Inicia sesión con tu cuenta de Google y haz clic en **"Get API key"** (Obtener clave de API).
3. Crea una clave y cópiala.

### 2. Subir el Proyecto a GitHub
1. Crea un nuevo repositorio en [GitHub](https://github.com/new) (puede ser público o privado).
2. Sube todos los archivos de esta carpeta al repositorio.

### 3. Desplegar en Vercel
1. Ve a [Vercel](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** > **"Project"**.
3. Selecciona e importa el repositorio que acabas de subir.
4. En la sección **"Environment Variables"** (Variables de entorno), agrega:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** *(Pega tu clave de API de Gemini)*
5. Haz clic en **"Deploy"**. En menos de 1 minuto tendrás una URL pública HTTPS lista para abrir desde cualquier celular.

---
*Desarrollado para proyectos académicos y de divulgación ambiental sobre RAEE.*
