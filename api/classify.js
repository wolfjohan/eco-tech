export default async function handler(req, res) {
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

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({
        error: 'Falta configurar la variable GEMINI_API_KEY en Vercel.'
      });
    }

    // 1. Consultar dinámicamente qué modelos están disponibles para tu API Key
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResp = await fetch(listUrl);
    
    if (!listResp.ok) {
      const listErr = await listResp.text();
      return res.status(listResp.status).json({
        error: `Error al validar API Key con Google (${listResp.status}): ${listErr}`
      });
    }

    const listData = await listResp.json();
    const availableModels = listData.models || [];
    
    // Filtrar modelos que soporten generación de contenido
    const contentModels = availableModels.filter(m => 
      Array.isArray(m.supportedGenerationMethods) && 
      m.supportedGenerationMethods.includes('generateContent')
    );

    if (contentModels.length === 0) {
      return res.status(500).json({
        error: 'Tu clave de API no tiene modelos de generación disponibles actualmente.'
      });
    }

    // Priorizar modelos rápidos de visión
    let targetModel = contentModels.find(m => m.name.includes('flash') && (m.name.includes('2.5') || m.name.includes('2.0')));
    if (!targetModel) {
      targetModel = contentModels.find(m => m.name.includes('flash'));
    }
    if (!targetModel) {
      targetModel = contentModels.find(m => m.name.includes('gemini'));
    }
    if (!targetModel) {
      targetModel = contentModels[0];
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const validMimeType = mimeType || 'image/jpeg';

    const promptText = `
Eres un experto en gestión ambiental y reciclaje de Residuos de Aparatos Eléctricos y Electrónicos (RAEE).
Analiza la imagen adjunta e identifica el objeto tecnológico o desecho electrónico.

Devuelve estrictamente un objeto JSON con el siguiente formato exacto:
{
  "is_tech_waste": true,
  "item_name": "Nombre común del desecho (ej. Batería de laptop, Teclado averiado, Placa PCB, Celular)",
  "category": "Categoría RAEE (ej. Informática y Telecomunicaciones, Pequeño Electrodoméstico, Baterías, Periféricos)",
  "recyclability_status": "Reciclable" | "Tratamiento Especial" | "Peligroso",
  "status_color": "green" | "yellow" | "red",
  "materials_recoverable": ["lista de materiales como Cobre, Estaño, Plástico ABS, Oro, Aluminio"],
  "hazardous_materials": ["sustancias como Plomo, Cadmio, Litio, Mercurio o Ninguno"],
  "disposal_guide": "Instrucciones de dónde y cómo entregarlo (ej. punto limpio, centro de acopio RAEE).",
  "safety_warnings": "Advertencias de seguridad (ej. no abrir, no perforar, no mezclar con basura común).",
  "environmental_value": "Breve dato de por qué es crucial reciclar este componente."
}

Si el objeto en la imagen NO es un desecho tecnológico o electrónico, devuelve:
{
  "is_tech_waste": false,
  "message": "No se detectó un desecho tecnológico en la imagen. Por favor apunta la cámara hacia un dispositivo o componente electrónico."
}
`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: validMimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    };

    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${targetModel.name}:generateContent?key=${apiKey}`;
    const genResp = await fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!genResp.ok) {
      const genErr = await genResp.text();
      return res.status(genResp.status).json({
        error: `Error al generar contenido con ${targetModel.name} (${genResp.status}): ${genErr}`
      });
    }

    const data = await genResp.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return res.status(500).json({ error: 'No se obtuvo contenido en la respuesta de la IA.' });
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(candidateText);
    } catch (parseErr) {
      const cleanedText = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanedText);
    }

    return res.status(200).json(parsedResult);
  } catch (error) {
    return res.status(500).json({
      error: 'Error interno en el servidor: ' + error.message
    });
  }
}
