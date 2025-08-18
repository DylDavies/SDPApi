import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import fs from "fs";
import path from "path";

import { LoggingService } from "./services/LoggingService";
import { loggerMiddleware } from "./middleware/logger.middleware";
import { attachUserMiddleware } from "./middleware/auth.middleware";
import { ServiceManager } from "./services/ServiceManager";
import { Singleton } from "./models/classes/Singleton";

const app = express();
const port = process.env.PORT || 8080;
const logger = Singleton.getInstance(LoggingService);

async function main() {
    // --- Centralized Service Loading ---
    await ServiceManager.loadServices();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(cors({ origin: process.env.FRONTEND_URL , credentials: true}));
    app.set('trust proxy', 1);
    app.use(loggerMiddleware);
    app.use(attachUserMiddleware);

    // --- Route Loading (can remain the same) ---
    logger.info("Loading routes...");
    let routes = fs.readdirSync(path.join(__dirname, "routes"));
    let queue = [...routes.map(name => ({ name, path: path.join(__dirname, "routes"), route: "" }))];

    while (queue.length > 0) {
        let front = queue.shift();
        if (!front) continue;

        if (fs.statSync(path.join(front.path, front.name)).isFile()) {
            let imported = await import(path.join(front.path, front.name));
            app.use("/api" + (front.route === "" ? "/" : front.route), imported.default);
            logger.info(`Loaded routes for: ${"/api" + (front.route === "" ? "/" : front.route)}`);
        } else {
            let subroutes = fs.readdirSync(path.join(front.path, front.name));
            queue.push(...subroutes.map(name => ({ name, path: path.join(front.path, front.name), route: `${front.route}/${front.name}` })));
        }
    }

    // --- Start Server ---
    app.listen(port, () => {
        logger.info(`Listening on port ${port}`);
    });
}

main().catch(error => {
    logger.error("Failed to start the application.", error);
    process.exit(1);
});
