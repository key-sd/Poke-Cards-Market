import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PAYPAL_API   = 'https://api-m.sandbox.paypal.com';
const CLIENT_ID    = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET= process.env.PAYPAL_CLIENT_SECRET;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // sirve tu HTML/CSS/JS

// Obtiene un token de acceso de PayPal usando las credenciales del cliente para autenticar las solicitudes posteriores
async function getAccessToken() {
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  return data.access_token;
}

//Crea una orden de pago en Paypal 
app.post('/api/orders', async (req, res) => {
  try {
    const { amount, description } = req.body;
    const token = await getAccessToken();

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amount },
          description
        }]
      })
    });

    const order = await response.json();
    res.json(order);
  } catch (err) {
    console.error('Error creando orden:', err);
    res.status(500).json({ error: 'Error creando orden' });
  }
});

// Para capturar el pago después de que el usuario apruebe la orden en PayPal
app.post('/api/orders/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params;
    const token = await getAccessToken();

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error capturando pago:', err);
    res.status(500).json({ error: 'Error capturando pago' });
  }
});

app.listen(PORT, () => console.log(`✅ Servidor corriendo en http://localhost:${PORT}`));