import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId))
    {
        throw new ApiError(404,"Invalid Channel ID");
    }
    if(!req.user?._id){
        throw new ApiError(404,"Unauthorized user");
    }
    const subscriberId=req.user?._id;

    const isSubscribed=await Subscription.findOne({channel:channelId,subscriber:subscriberId});
    let response;
    try {
        response=isSubscribed 
        ? await Subscription.deleteOne({channel:channelId,subscriber:subscriberId})
        : await Subscription.create({channel:channelId,subscriber:subscriberId})
    } catch (error) {
        console.log("Error while toggleSubscription");
        throw new ApiError(500,error?.message||"Internal Server error in toggle Subscription");
    }
    return res.status(200)
    .json(new ApiResponse(200,response,isSubscribed===null ? "Subscribed Successfully" : "Unsubscribed successfully"))
    

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!isValidObjectId(channelId)) throw new ApiError(401, "Invalid channel Id");

    const user=await User.findById(req.user?._id,{_id:1});
    if(!user)
    {
        throw new ApiError(404,"User not found");
    }
    const pipeline=[
        {
            $match:{
                channel:mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber",
                pipeline:[
                    {
                        $project:{
                            fullName:1,
                            username:1,
                            avatar:"$avatar.url"
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                subscriber:{
                    $first:"subscriber",
                }
            }
        }
    ]
    try{
        const subscribers=await Subscription.aggregate(pipeline);
        const subscribersList=subscribers.map(item=>item.subscriber);
        return res.status(200).json(new ApiResponse(200,subscribersList,"Subscribers fetched Succesfully!!"));
    }
    catch(error){
        console.log("Get userSubscribedChannel error :: ",error);
        throw new ApiError(500,error?.message || "Internal server error in getUserSubscribed Channel")
    }
    
})

// controller to return channel list to which user has subscribed
const getSubscribedChannelsByOwner = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    if(!isValidObjectId(subscriberId))
    {
        throw new ApiError(401, "Invalid subscriber Id");
    }
    if(!req.user)
    {
        throw new ApiError(404,"Unauthorized access :: Please Login");
    }
    const pipeline=[
        {
            $match:{
                subscriber:new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"subscribedTo",
                pipeline:[
                    {
                        $project:{
                            fullName:1,
                            username:1,
                            avatar:"$avatar.url"
                        },
                    },
                ],
            },
        },
        {
            $addFields:{
                $unwind:"$subscribedTo"
            }
        },
        {
            $project:{
                subscribedChannel:"$subscribedTo"
            }
        }
    ]
    try {
        const channelSubscribedTo=await Subscription.aggregate(pipeline);
        const subscribedByOwnerList=channelSubscribedTo.map(item=>item.subscribedChannel);
        return res.status(200)
        .json(new ApiResponse(200,subscribedByOwnerList,"Channel subscribed by Owner Fetched Successfully!!"))
    
    } catch (error) {
        console.log("SubscribedChannelsByOwner error ::", error)
        throw new ApiError(
            500,
            error?.message || "Internal server error in SubscribedChannelsByOwner"
        )
    }
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannelsByOwner
}
