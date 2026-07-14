const fs = require("fs");
const axios = require("axios");
const login = require("fca-project-orion");

const PREFIX = ".";
const BOT_NAME = "Nexus";

// Auto Replies load kora hocche
let autoReplies = {};
try {
    autoReplies = JSON.parse(fs.readFileSync('auto_replies.json', 'utf8'));
} catch (e) {
    console.error("auto_replies.json file e problem ase.");
}

// Anti-Crash System (Kono choto error asle bot bondho hobe na)
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.log('Uncaught Exception:', err);
});

// Chobi bananor lightweight function (API use kore, kono heavy canvas nai)
async function getImageStream(text) {
    const formatText = encodeURIComponent(text);
    const url = `https://dummyimage.com/800x400/282c34/61dafb.png&text=${formatText}`;
    const response = await axios({
        url: url,
        method: 'GET',
        responseType: 'stream'
    });
    return response.data;
}

login({ appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8')) }, (err, api) => {
    if (err) return console.error("Login Error: ", err);

    console.log(`${BOT_NAME} Bot ekhon online e ase!`);
    api.setOptions({ listenEvents: true, selfListen: false });

    api.listenMqtt(async (err, event) => {
        if (err) return;

        try {
            // ==========================================
            // EVENT SYSTEM (Group e add & Welcome)
            // ==========================================
            if (event.type === "event" && event.logMessageType === "log:subscribe") {
                const addedParticipants = event.logMessageData.addedParticipants;
                for (let participant of addedParticipants) {
                    if (participant.userFbId === api.getCurrentUserID()) {
                        // Bot ke group e add korle
                        const imgStream = await getImageStream("JOIN SUCCESSFUL");
                        api.sendMessage({
                            body: "Nexus Bot ke add korar jonno dhonnobad! Command gulo jante .help likhun.",
                            attachment: imgStream
                        }, event.threadID);
                    } else {
                        // Onno keu group e add hole
                        const imgStream = await getImageStream("WELCOME TO THE GROUP");
                        api.sendMessage({
                            body: `Hello ${participant.fullName}, amader group e swagotom!`,
                            attachment: imgStream
                        }, event.threadID);
                    }
                }
            }

            // ==========================================
            // MESSAGE SYSTEM (Reply & Commands)
            // ==========================================
            if (event.type === "message" || event.type === "message_reply") {
                const message = event.body.trim();
                const lowerMsg = message.toLowerCase();

                // 1. PREFIX CHARA AUTO REPLIES (Targeted Reply)
                if (autoReplies[lowerMsg]) {
                    return api.sendMessage(autoReplies[lowerMsg], event.threadID, event.messageID);
                }

                // 2. PREFIX COMMANDS
                if (message.startsWith(PREFIX)) {
                    const args = message.slice(PREFIX.length).trim().split(/ +/);
                    const command = args.shift().toLowerCase();

                    // Command: groupinfo
                    if (command === "groupinfo") {
                        api.getThreadInfo(event.threadID, (err, info) => {
                            if (err) return api.sendMessage("Group info ber korte problem hocche.", event.threadID, event.messageID);
                            const msg = `📌 Group er Nam: ${info.threadName}\n👥 Mot Member: ${info.participantIDs.length} jon\n👑 Admin: ${info.adminIDs.length} jon`;
                            api.sendMessage(msg, event.threadID, event.messageID);
                        });
                    }

                    // Command: setname
                    else if (command === "setname") {
                        const newName = args.join(" ");
                        if (!newName) return api.sendMessage("Bhai, notun ekta nam to likhben naki?", event.threadID, event.messageID);
                        api.setTitle(newName, event.threadID, (err) => {
                            if (err) api.sendMessage("Nam change korte pari ni, amar admin power lagbe.", event.threadID, event.messageID);
                            else api.sendMessage("Group er nam successfully change kora hoyese.", event.threadID, event.messageID);
                        });
                    }

                    // Command: setgrouppic
                    else if (command === "setgrouppic") {
                        if (event.type !== "message_reply" || event.messageReply.attachments.length === 0) {
                            return api.sendMessage("Kono ekta chobite reply diye command din.", event.threadID, event.messageID);
                        }
                        const attachment = event.messageReply.attachments[0];
                        if (attachment.type !== "photo") return api.sendMessage("Eita to photo na, photo te reply din.", event.threadID, event.messageID);
                        
                        const imgStream = await axios({ url: attachment.url, responseType: 'stream' });
                        api.changeGroupImage(imgStream.data, event.threadID, (err) => {
                            if (err) api.sendMessage("Group pic update korte problem hocche.", event.threadID, event.messageID);
                            else api.sendMessage("Group er notun pic set kora hoyese!", event.threadID, event.messageID);
                        });
                    }

                    // Command: fun - joke
                    else if (command === "joke") {
                        const jokes = [
                            "Bolto kon pakhi dim pare na? Answer: Onno pakhir dim!",
                            "Teacher: Bolto abiskar ar toiri korar moddhe parthokko ki? Student: Baba amake toiri koreche, ar ami baba ke abiskar korechi!",
                            "Me: Doctor saheb, amar sob jaygay betha. Doctor: Apnar angul e betha, tai jekhanei dhorchen betha lagche."
                        ];
                        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
                        api.sendMessage(randomJoke, event.threadID, event.messageID);
                    }

                    // Command: fun - 8ball
                    else if (command === "8ball") {
                        const answers = ["Haa, obossoi.", "Kono chance i nai.", "Hote pare.", "Ektu pore abar bolun.", "Ami shiot na bhai."];
                        const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
                        api.sendMessage(`🎱 | ${randomAnswer}`, event.threadID, event.messageID);
                    }
                }
            }
        } catch (error) {
            // Error asleo bot run kora stop hobe na
            console.error("Error asche kintu bot on ase: ", error); 
        }
    });
});
