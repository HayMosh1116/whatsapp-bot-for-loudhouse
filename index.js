const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false
    });

    sock.ev.on("creds.update", saveCreds);

    let pairingRequested = false;

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "connecting") {
            console.log("🔄 Connecting...");
        }

        if (connection === "open") {
            console.log("✅ Connected successfully!");
        }

        // 🔑 SAFE PAIRING (ONLY ONCE + DELAY)
        if (!pairingRequested && !sock.authState.creds.registered) {
            pairingRequested = true;

            setTimeout(async () => {
                try {
                    const phoneNumber = "2349122761580"; // PUT YOUR NUMBER

                    const code = await sock.requestPairingCode(phoneNumber);
                    console.log("🔥 YOUR PAIRING CODE:", code);
                } catch (err) {
                    console.log("❌ Pairing error, retrying...");
                    pairingRequested = false;
                }
            }, 5000); // wait 5 seconds
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;

            console.log("❌ Connection closed. Reason:", reason);

            // 🔁 AUTO RECONNECT
            if (reason !== DisconnectReason.loggedOut) {
                startBot();
            }
        }
    });

    // 📥 SIMPLE TEST MESSAGE (to confirm bot works)
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;

        if (msg.message.conversation === "ping") {
            await sock.sendMessage(from, { text: "pong 🏓" });
        }
    });
}

startBot();
