import mongoose, {Schema} from "mongoose";

const subscriptionSchema=new Schema({
    subscriber:{
        type:Schema.Types.ObjectId, // one who is subscribong
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId, // One to whom 'Subscriber' is Subscribing
        ref:"User"
    }
},{timestamps:true})

export const Subscription=mongoose.model("Subscription",subscriptionSchema)