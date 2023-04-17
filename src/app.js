import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from "mongodb";
import joi from 'joi';
import dayjs from 'dayjs';
import "dayjs/locale/pt-br.js";
import { stripHtml } from "string-strip-html";


dayjs.locale('pt-br');
const rightNow = dayjs();

const app = express();

app.use(express.json());
app.use(cors())
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect()
    .then(() => {
        db = mongoClient.db();
    })
    .catch((err) => console.log(err.message))


const userSchema = joi.object({
    name: joi.string().required()
})

app.post("/participants", (req, res) => {
    let { name } = req.body;

    const validation = userSchema.validate(req.body);
    if (validation.error) return res.sendStatus(422);

    name = stripHtml(name).result.trim();

    db.collection("participants").findOne({ name: name })
        .then((infosUser) => {
            if (infosUser) {
                return res.sendStatus(409);
            } else {
                db.collection("participants").insertOne({
                    name: name,
                    lastStatus: Date.now()
                }).then(() => {
                    db.collection("messages").insertOne({
                        from: name,
                        to: 'Todos',
                        text: 'entra na sala...',
                        type: 'status',
                        time: rightNow.format('HH:mm:ss')
                    })
                        .then(() => res.sendStatus(201))
                        .catch(err => res.send(err.message))

                })
                    .catch(err => res.send(err.message))

            }
        })
        .catch(err => res.send(err.message))
});

app.get("/participants", (req, res) => {

    const promise = db.collection("participants").find({}).toArray();
    promise.then(participantes => res.send(participantes));
    promise.catch(() => res.send("Deu algum erro aqui!"));


});


const messageSchema = joi.object({
    to: joi.string().trim().required().empty(false),
    text: joi.string().trim().required().empty(false),
    type: joi.valid('message', 'private_message').required()
})

app.post("/messages", (req, res) => {
    let { to, text, type } = req.body;
    let user = req.headers.user;

    const validation = messageSchema.validate(req.body);
    if (validation.error) return res.sendStatus(422);

    user = stripHtml(user).result.trim();
    to = stripHtml(to).result.trim();
    text = stripHtml(text).result.trim();

    if (!user) return res.sendStatus(422)

    db.collection("participants").findOne({ name: user })
        .then((infoUser) => {

            if (infoUser) {
                db.collection("messages").insertOne({
                    from: user,
                    to: to,
                    text: text,
                    type: type,
                    time: rightNow.format('HH:mm:ss')

                })
                    .then(() => res.sendStatus(201))
                    .catch(err => res.send(err.message))
            } else {
                return res.sendStatus(422);
            }
        })
        .catch(() => res.sendStatus(422))


});
app.get("/messages", (req, res) => {

    const user = req.headers.user;
    const limit = req.query.limit;

    const query = {
        $or: [
            { to: user },
            { from: user },
            { to: "Todos" },
            { type: "message" }
        ]
    };

    const lastMessages = {
        sort: { _id: -1 }
    };

    if (limit && (isNaN(limit) || limit <= 0)) {
        return res.sendStatus(422);
    }

    db.collection("messages").find(query, lastMessages).toArray()
        .then(messages => {
            if (messages && messages.length > 0) {
                if (limit) {
                    messages = messages.slice(0, parseInt(limit));
                }
                res.send(messages);
            } else {
                res.sendStatus(404)
            }
        })
        .catch(err => res.send(err.message))

});

app.post("/status", (req, res) => {
    const user = req.headers.user;

    if (!user) {
        console.log("preencha o nome!")
        res.sendStatus(404);
        return;
    }

    const newTimestamp = Date.now();
    console.log(newTimestamp);

    db.collection("participants").findOne({ name: user })
        .then((infoUser) => {
            if (infoUser) {
                /*console.log(infoUser),
                    console.log(infoUser._id.toString()),
                    console.log(infoUser.name),
                    console.log(infoUser.lastStatus);*/

                db.collection("participants").updateOne(
                    { _id: new ObjectId(infoUser._id.toString()) },
                    { $set: { lastStatus: newTimestamp } }
                ).then(() => {
                    res.sendStatus(200);
                }).catch(() => {
                    res.send("Something went wrong!");
                });
            } else {
                res.sendStatus(404);
            }
        })
        .catch(() => {
            res.sendStatus(404);
        });
});

function removingInativeUsers() {
    const rightNow = dayjs();
    const statusRightNow = Date.now();

    db.collection("participants").find({ lastStatus: { $lt: (statusRightNow - 10000) } }).toArray()
        .then((infosUser) => {
            infosUser.forEach((user) => {
                const { name, _id } = user;

                db.collection("participants").deleteOne({ _id: new ObjectId(_id.toString()) })
                    .then(
                        db.collection("messages").insertOne({
                            from: name.trim(),
                            to: 'Todos',
                            text: 'sai da sala...',
                            type: 'status',
                            time: rightNow.format('HH:mm:ss')
                        })
                            .then()
                            .catch(err => console.log(err.message))

                    )
                    .catch(err => console.log(err.message))
            })

        })
        .catch(err => console.log(err.message))
}

const interval = setInterval(removingInativeUsers, 15000)


const PORT = 5000;
app.listen(PORT, () => {
    console.log(chalk.green(`Rodando em http://localhost:${PORT}`));
});