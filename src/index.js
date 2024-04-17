// require('dotenv).config({path: './env'})
import dotenv from "dotenv";
import express from "express"
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    const PORT=process.env.PORT || 8000;
    app.listen(PORT,()=>{
        console.log(`SERVER is running on PORT: ${PORT}`);
    })
})
.catch((error)=>{
    console.log("MONGO DB connection failed !!",error)
})











/* APPROCH 1 of DataBase Connectivity
import express from "express";

const app=express();
///USing IFEE for connecting
(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/{DB_NAME}`)
        app.on("express",(error)=>{
            console.log("Express unable to talk: ",error);
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on PORT ${PORT}`);
        })
    } catch (error) {
        console.error("Error: ",error)
        throw error
    }
})()


*/