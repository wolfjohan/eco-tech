export default async function handler(req, res) {
  // Configurar encabezados CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utiliza POST.' });
  }

  try {
    const { imageBase64, mimeType } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: 'Se requiere la imagen en formato base64.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Falta la variable de entorno GEMINI_API_KEY en Vercel. Por favor configúrala en el panel de Vercel.'
      });
    }

    // Limpiar prefijo data URL si viene incluido
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const validMimeType = mimeType || 'image/jpeg';

    const promptText = `
Eres un experto en gestión ambiental y reciclaje de Residuos de Aparatos Eléctricos y Electrónicos (RAEE).
Analiza la imagen adjunta e identifica el objeto tecnológico o desecho electrónico.

Devuelve estrictamente un objeto JSON (sin texto adicional ni bloques markdown extra) con el siguiente formato exacto:
{
  "is_tech_waste": true,
  "item_name": "Nombre común del desecho (ej. Batería de laptop, Teclado averiado, Placa de circuito PCB, Celular antiguo)",
  "category": "Categoría RAEE (ej. Informática y Telecomunicaciones, Pequeño Electrodoméstico, Baterías y Acumuladores, Periféricos, Componentes Internos)",
  "recyclability_status": "Reciclable" | "Tratamiento Especial" | "Peligroso",
  "status_color": "green" | "yellow" | "red",
  "materials_recoverable": ["lista de materiales recuperables como Cobre, Estaño, Plástico ABS, Oro, Aluminio"],
  "hazardous_materials": ["sustancias potencialmente peligrosas como Plomo, Cadmio, Litio, Mercurio o Ninguno"],
  "disposal_guide": "Instrucciones breves y prácticas para el usuario sobre dónde y cómo entregarlo (ej. punto limpio, contenedor de pilas, centro de acopio RAEE).",
  "safety_warnings": "Advertencias de seguridad en su manipulación (ej. no abrir, evitar perforar, no mezclar con agua, no tirar a la basura común).",
  "environmental_value": "Breve dato educativo de por qué es crucial reciclar este componente."
}

Si el objeto en la imagen NO es un desecho tecnológico o electrónico, devuelve:
{
  "is_tech_waste": false,
  "message": "No se detectó un desecho tecnológico o electrónico en la imagen. Por favor apunta la cámara hacia un dispositivo, cable, batería o componente electrónico."
}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: validMimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2
      }
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error('Gemini API Error:', errorDetails);
      return res.status(response.status).json({
        error: 'Error al comunicarse con la API de IA.',
        details: errorDetails
      });
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return res.status(500).json({ error: 'No se obtuvo respuesta de la IA.' });
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(candidateText);
    } catch (parseErr) {
      // Si viniera envuelto en markdown
      const cleanedText = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanedText);
    }

    return res.status(200).json(parsedResult);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Ocurrió un error interno en el servidor.',
      message: error.message
    });
  }
}
