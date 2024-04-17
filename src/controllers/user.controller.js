import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const generateAccessAndRefreshTokens=async(userId)=>{

    try {
        const user=await User.findById(userId)
        const accesstoken = user.generateAccessToken()
        const refreshtoken = user.generateRefreshToken()
        user.refreshToken=refreshtoken;
        await user.save({validateBeforeSave:false});
        return {accesstoken,refreshtoken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access tokens")
    }

}
const registerUser=asyncHandler(async (req,res)=>{
    // Get user details from frontend
    // Validation - Not empty
    //  check if user already exists: username & Email
    // Check for images, check for avtar
    // upload them to cloudinary, avatar
    // create user object - create entry in DB
    // remove password and refresh token field from response
    // check the user creation
    // return res
    const {fullName,email,username,password}=req.body;

    // console.log("Req.Body: ",req.body);
    if(
        [fullName,email,username,password].some((field)=>field?.trim()==="")
    )
    {
        throw new ApiError(400,"All fields are required!")
    }
    const existedUser =await User.findOne({
        $or:[{ username },{ email }]
    })

    if(existedUser)
    {
        throw new ApiError(409,"User with email or username already exists");
    }
    // Multer gives the access to files like the way express gives us body(req.body)
    // console.log("Request files \n",req.files);
    const avatarLocalPath= req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)
    {
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avtar file is required");
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avtar file is required");
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser)
    {
        throw new ApiError(500,"Something went wrong while registering the user");
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
})
const loginUser=asyncHandler(async (req,res)=>{
    // STEPS
    // Get data from the user
    // username or email to login
    // find the user
    // if yser found then password check
    // Generate Access token & Refresh Token
    // send cookie
    const {email,username,password}=req.body;
    if(!username || !email){
        throw new ApiError(400,"username or email is required");
    }
    const user=await User.findOne({
        $or:[{username},{email}]
    })

    if(!user)
    {
        throw new ApiError(404,"User does not exist");
    }
    
    const isPasswordValid=await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }
    const {accesstoken,refreshToken}=await generateAccessAndRefreshTokens(user._id);
    const loggedInUser=await User.findById(user._id).
    select("-password -refreshToken")
    const options={
        // cookies should be modified only by servers not by frontend users
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",accesstoken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accesstoken,refreshToken
            },
            "User logged In Successfully"
        )
    )
})
const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options={
        // cookies should be modified only by servers not by frontend users
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCooke("accessToken",options)
    .clearCooke("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"));
})
export {
    registerUser,
    loginUser,
    logoutUser
};