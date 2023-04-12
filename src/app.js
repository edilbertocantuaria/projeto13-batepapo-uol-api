import express from 'express';
import cors from 'cors';
import chalk from "chalk"
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());
app.use(cors())



const mongoClient = new MongoClient("mongodb://localhost:27017/nomeDoBanco");
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db();
}).catch((err) => console.log(err.message))

const PORT = 5000;
app.listen(PORT, () => {
    console.log(chalk.green(`Rodando em http://localhost:${PORT}`));
});