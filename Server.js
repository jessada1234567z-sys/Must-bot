require("dotenv").config();
const express = require("express");
const line = require("@line/bot-sdk");
const mongoose = require("mongoose");

const app = express();

mongoose.connect(process.env.MONGO_URI);

const Bet = mongoose.model("Bet", {
  userId: String,
  side: String,
  amount: Number,
  createdAt: { type: Date, default: Date.now }
});

const config = {
  channelAccessToken: process.env.LINE_TOKEN,
  channelSecret: process.env.LINE_SECRET
};

const client = new line.Client(config);

app.post("/webhook", line.middleware(config), async (req, res) => {
  await Promise.all(req.body.events.map(handleEvent));
  res.sendStatus(200);
});

async function handleEvent(event) {
  if (event.type !== "message") return;

  const msg = event.message.text;
  const userId = event.source.userId;

  const match = msg.match(/(แดง|น้ำเงิน)\s*(\d+)/);

  if (match) {
    const side = match[1];
    const amount = parseInt(match[2]);

    await Bet.create({ userId, side, amount });

    return reply(event, `✅ รับโพยแล้ว\n${side} ${amount} บาท`);
  }

  if (msg === "ดูโพย") {
    const bets = await Bet.find({ userId });

    let total = 0;
    let text = "📊 โพยของคุณ\n";

    bets.forEach(b => {
      text += `${b.side} ${b.amount}\n`;
      total += b.amount;
    });

    text += `รวม: ${total} บาท`;

    return reply(event, text);
  }

  return reply(event, "พิมพ์: แดง 500 / น้ำเงิน 300 / ดูโพย");
}

function reply(event, text) {
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `🥊 พักยกกลางอากาศ\n━━━━━━━━━━\n${text}`
  });
}

app.listen(3000);
