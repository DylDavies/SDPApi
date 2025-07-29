import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import AuthRouter from "./routes/auth/router";
import { MongoService } from "./services/MongoService";

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cors({origin: ["*"]}));

MongoService.getInstance();

app.use("/auth", AuthRouter);

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});