import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from "mongodb";
import joi from 'joi';
import dayjs from 'dayjs';
import "dayjs/locale/pt-br.js";

dayjs.locale('pt-br');
const rigthNow = dayjs();

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
    const { name } = req.body

    const validation = userSchema.validate(req.body)
    if (validation.error) return res.sendStatus(422)

    db.collection("participants").findOne({ name: name })
        .then((infosUser) => {
            if (infosUser) {
                return res.sendStatus(409)
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
                        time: rigthNow.format('HH:mm:ss')
                    })
                        .then(() => res.sendStatus(201))
                        .catch(() => res.send(err.message))

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

app.post("/messages", (req, res) => { });
app.get("/messages", (req, res) => { });

app.post("/status", (req, res) => { });




const PORT = 5000;
app.listen(PORT, () => {
    console.log(chalk.green(`Rodando em http://localhost:${PORT}`));
});