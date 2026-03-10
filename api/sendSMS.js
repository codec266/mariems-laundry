import twilio from "twilio";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, message } = req.body;

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    const msg = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    console.log("Twilio SID:", msg.sid);
    res.status(200).json({ success: true, sid: msg.sid });
  } catch (error) {
    console.error("Twilio error:", error);
    res.status(500).json({ error: error.message });
  }
}