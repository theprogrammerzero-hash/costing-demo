import { NextResponse } from "next/server";

/**
 * POST /api/v1/lavorazioni
 *
 * Endpoint di integrazione IoT (Arduino / PLC / gateway MQTT).
 * Quando implementato, riceverà i tempi macchina e manodopera misurati
 * dai sensori e aggiornerà automaticamente il modello di costo.
 *
 * Body atteso:
 * {
 *   "repartoId": "...",
 *   "prodottoId": "...",
 *   "oreMacchina": 0.50,
 *   "oreMdo": 0.30
 * }
 */
export async function POST() {
  return NextResponse.json(
    {
      status: "not_implemented",
      message:
        "Integrazione IoT in arrivo. Questo endpoint riceverà i dati di " +
        "tempo macchina e manodopera direttamente dal sistema Arduino/PLC.",
      expected_body: {
        repartoId: "string (ID reparto)",
        prodottoId: "string (ID prodotto)",
        oreMacchina: "number (ore macchina per unità)",
        oreMdo: "number (ore manodopera per unità)",
      },
    },
    { status: 501 },
  );
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/v1/lavorazioni",
    status: "stub — integrazione IoT non ancora attiva",
    docs: "Inviare POST con { repartoId, prodottoId, oreMacchina, oreMdo }",
  });
}
