import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content}=req.body;
    if(!req.user)
    {
        throw new ApiError(404,"Unauthorized access to create Tweet");

    }
    if(!content||content?.trim()==="")
    {
        throw new ApiError(404,"Content is  required!");
    }
    const user=await User.findById(req.user?._id,{_id:1});
    if(!user)
    {
        throw new ApiError(404,"User not found!");
    }
    const tweet=await Tweet.create({
        content,
        owner:req.user?._id
    })
    if(!tweet)
    {
        throw new ApiError(500,"Somethin went wrong while creating tweet!");
    }
    return res.status(200).json(new ApiResponse(201,tweet,"Tweet created successfully"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId}=req.params;
    if(!userId)
    {
        throw new ApiError(404, "userId is required");
    }
    if(!isValidObjectId(userId))
    {
        throw new ApiError(404, "UserId is not valid");
    }
    const {page=1, limit=10}=req.query;
    const user=await User.findById(userId).select("_id");
    if(!user)
    {
        throw new ApiError(404,"User not found");
    }
    const tweetAggregate=Tweet.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(user?._id)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            avtar:"$avtar.url",
                            fullName:1,
                            _id:1,
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner",
                }
            }
        },
        {
            $sort:{
                createdAt:-1
            }
        }
    ])
    if(!tweetAggregate)
    {
        throw new ApiError(404,"Tweet not found :: Tweetaggregate");
    }
    const options={
        page:parseInt(page),
        limit:parseInt(limit),
        customLabels:{
            totalDocs:"totalTweets",
            docs:"tweets"
        },
        $skip: (page-1)*limit
    }
    Tweet.aggregatePaginate(
        tweetAggregate,
        options
    )
    .then(
        result => {
            if (result.length === 0) {
                return res.status(200)
                            .json(new ApiResponse(
                                200,
                                [],
                                "No tweets found"
                            ))
            }
            return res.status(200)
                .json(new ApiResponse(
                    200,    
                    result,
                    "Tweets fetched successfully"
                )
            )
        }

    )
    .catch(error => {
        console.error("Error in aggregation:", error);
        throw new ApiError(500, error?.message || "Internal server error in tweet aggregation");
    })


})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId}=req.params;
    const {content}=req.body;
    if(!isValidObjectId(tweetId))
    {
        throw new ApiError(404, "Not found tweet for this id");
    }
    if(!req.user)
    {
        throw new ApiError(404,"Unauthorized request to update tweet. Please Login!");
    }
    const user=await User.findById(req.user?._id,{_id:1});
    if(!user)
    {
        throw new ApiError(404, "User not found");
    }
    const tweet=await Tweet.findById(tweetId,{_id:1});
    if(!tweet)
    {
        throw new ApiError(404, "Tweet not found to Update");
    }
    if(content||content.trim()==="")
    {
        throw new ApiError(404,"content is required")
    }
    const updatedTweet=await Tweet.findByIdAndUpdate(tweetId,
        {
            $set:{
                content,
            }
        },
        {
            new : true
        }
    )
    if(!updatedTweet)
    {
        throw new ApiError(500, "Something went wrong while updating tweet");
    }
    return res.status(200).json(new ApiResponse(201,updatedTweet,"TweetUpdated Successfully"));
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId}=req.params;
    if(!isValidObjectId(tweetId))
    {
        throw new ApiError(404, "Not found tweet for this id") 
    }
    if(!req.user)
    {
        throw new ApiError(404,"Unauthorized request to Delete the tweet. Please Login!");
    }
    const user=await User.findById(req.user?._id,{_id:1});
    if(!user)
    {
        throw new ApiError(404,"User not found!");
    }
    const tweet=await Tweet.findById(tweetId,{_id:1});
    if(!tweet)
    {
        throw new ApiError(404, "Tweet not found");
    }
    if(!(tweet.owner===req.user?._id))
    {
        throw new ApiError(404,"Unauthorized access to delete the tweet! Please Login");
    }
    const deletedTweet=await Tweet.findByIdAndDelete(tweetId);
    if(!deletedTweet)
    {
        throw new ApiError(500, "Something went wrong while deleting tweet")
    }
    return res.status(200).json(new ApiResponse(200,{},"Tweet successfully deleted!"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
