const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

const badLinks = ["http", "https", "chat.whatsapp.com"];
let warnings = {};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        version
    });

    sock.ev.on("creds.update", saveCreds);

    // 🔑 PAIRING CODE
    if (!sock.authState.creds.registered) {
        const phoneNumber = "2349122761580"; // PUT YOUR NUMBER

        const code = await sock.requestPairingCode(phoneNumber);
        console.log("🔥 PAIRING CODE:", code);
    }

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        if (!from.endsWith("@g.us")) return;

        const sender = msg.key.participant;
        const text = (msg.message.conversation || "").toLowerCase();

        if (badLinks.some(link => text.includes(link))) {
            await sock.sendMessage(from, { delete: msg.key });

            warnings[sender] = (warnings[sender] || 0) + 1;

            await sock.sendMessage(from, {
                text: `⚠️ @${sender.split("@")[0]} Warning ${warnings[sender]}/3`,
                mentions: [sender]
            });

            if (warnings[sender] >= 3) {
                await sock.groupParticipantsUpdate(from, [sender], "remove");
            }
        }
    });
}

startBot();
