import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import fs from "fs";
import path from "path";

import AuthRouter from "./routes/auth/router";

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cors({origin: ["*"]}));

// TODO: refactor routes to follow below structure
app.use("/auth", AuthRouter);

app.get("/", (req, res) => {
    res.send("Hello no");
});

async function loadServices(cb: () => void) {
    let services = fs.readdirSync(path.join(__dirname, "services"));
    let loadedServices = [];
    
    for await (let service of services) {
        loadedServices.push((await import(path.join(__dirname, "services", service))))
    }

    loadedServices.sort((a, b) => a.loadPriority > b.loadPriority ? 1 : -1);

    for (let loadedService of loadedServices) {
        let cls = loadedService[Object.keys(loadedService)[0]];
        cls.getInstance();
    }

    cb();
}

loadServices(() => {
    app.listen(port, () => {
        console.log(`Listening on port ${port}`);
    });
});