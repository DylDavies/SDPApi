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

async function loadRoutes(cb: () => void) {
    let routes = fs.readdirSync(path.join(__dirname, "routes"));
    let queue = [...routes.map(name => ({name, path: path.join(__dirname, "routes"), route: ""}))];

    while (queue.length > 0) {
        let front = queue.shift();
        
        if (front?.name == "router.js") {
            let imported = await import(path.join(front.path, front.name));
            app.use(front.route == "" ? "/" : front.route, imported.default);
        } else {
            let subroutes = fs.readdirSync(path.join(front!.path, front!.name));
            queue = [...queue, ...subroutes.map(name => ({name, path: path.join(front!.path, front!.name), route: front!.route + "/" + front!.name}))]
        }
    }

    cb();
}

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
    loadRoutes(() => {
        app.listen(port, () => {
            console.log(`Listening on port ${port}`);
        });
    })
});