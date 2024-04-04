import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
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
    console.log("email: ",email);
    if(
        [fullName,email,username,password].some((field)=>field?.trim()==="")
    )
    {
        throw new ApiError(400,"All fields are required!")
    }
    const existedUser = User.findOne({
        $or:[{ username },{ email }]
    })

    if(existedUser)
    {
        throw new ApiError(409,"User with email or username already exists");
    }
    // Multer gives the access to files like the way express gives us body(req.body)

    const avtarLocalPath= req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avtarLocalPath)
    {
        throw new ApiError(400,"Avtar file is required");
    }
    const avatar= await uploadOnCloudinary(avtarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avtar file is required");
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "" ,
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

export {registerUser};