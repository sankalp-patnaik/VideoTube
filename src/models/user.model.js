import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
const userSchema=new Schema({
    watchHistory:[
        {
            type: Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true

    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avtar:{
        type:String, // Cloudinary URL
        required:true
    },
    coverImage:{
        type:String, //cloudinary URL
        required:true
    },
    password:{
        type:String,
        required:[true,"Password is required"]

    },
    refreshToken:{
        type:String,
    }
},{timestamps:true})


// Here we use Normal function to use the this reference & know the conntext & to access the userschema data
// Arrow function doesnot provide this reference & the context. & it doesnot provide the access to the userSchema Data so we use normal function with Async becoz it takes some time to run
userSchema.pre("save",async function(next){
    if(!this.password.isModified("password")) return next();

    this.password=await bcrypt.hash(this.password,10)
    next()
})
// Now we create Custom methods to check user given password & hashed password
userSchema.methods.isPasswordCorrect=async function(password){
    // password is user given password, this.password is the encrypted password for comapring both the passwords
    return await bcrypt.compare(password,this.password);
}
userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
export const User =mongoose.model("User",userSchema);