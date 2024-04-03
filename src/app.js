import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"
const app = express();

// app.use is used for middlewares & cofiguration's

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({
    limit:"16kb"
}))
// URL Encoded configuration for encoding URL => example search= sankalp patnaik => sankalp+patnaik&oq=sankalp+patnaik&gs_lcrp=
app.use(express.urlencoded({extended:true,limit:"16kb"}));
app.use(express.static("public"));
app.use(cookieParser());

// Routes import
import userRouter from "./routes/user.routes.js"

// Routes declaration
// Router ko lane ke liye middle ware lana hoga
app.use("/api/v1/users",userRouter);
// example: http://localhost:8000/api/v1/users/register
export {app};