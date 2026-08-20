import express from "express";
import apiRouter from "../src/apiRouter";

const app = express();
app.use(express.json());

// Mount the API router
app.use("/api", apiRouter);

export default app;
