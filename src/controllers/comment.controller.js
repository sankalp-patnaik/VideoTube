import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid Video Id!");
    }
    const video=await Video.findById(videoId,{_id:1});
    if(!video){
        throw new ApiError(400,"Invalid Video Id");
    }
    var commentAggregate;
    try {
        commentAggregate=Comment.aggregate([
            {
                // Step 1: Getting All the comments of video using videoId
                $match:{
                    video:mongoose.Types.ObjectId(videoId)
                }
            },
            {
                // step2: Getting user info from user collection
                $lookup:{
                    from:"users",
                    localField:"owner",
                    foreignField:"_id",
                    as:"owner",
                    pipeline:[
                        {
                            $project:{
                                _id:1,
                                username:1,
                                avatar:"$avatar.url"
                            },
                        },
                    ]
                },
            },
            {
                $addFields:{
                    owner:{
                        $first:"$owner"
                    }
                }
            },
            {
                $sort:{
                    "createdAt":-1
                }
            }

        ])
    } catch (error) {
        console.error("Error in aggregation:",error);
        throw new ApiError(500,error.message||"Internal server error in comment aggregation");
    }
    const options={
        page,
        limit,
        customLabels:{
            docs:"comments",
            totalDocs:"totalComments"
        },
        skip:(page-1)*limit,
        limit:parseInt(limit)
    }
    Comment.aggregatePaginate(
        commentAggregate,
        options
    ).then(result=>{
        if(result?.comments.length===0){
            return res.status(200)
            .json(new ApiResponse(
                200,
                [],
                "No comments found!"
            ))
        }
        return res.status(200).json(new ApiResponse(200,result,
            "success"
        ))
        
    }).catch(error=>{
        console.error("Error in aggregation:", error);
        res.status(500).
            json(new ApiResponse(500, error.message || "Internal server error"));
    })
    
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    if(!isValidObjectId(videoId))
    {
        throw new ApiError(400,"Invalid Video Id");
    }
    const {content}=req.body;
    if(content?.trim()==="") throw new ApiError(404,"Content is required");

    const [video,user]=await Promise.all([
        Video.findById(videoId),
        User.findById(req.user?._id)
    ])
    if(!user) throw new ApiError(404,"User not found!");
    if(!video) throw new ApiError(404,"Video not found!");

    const comment=await Comment.create({
        content,
        video:videoId,
        owner:req.user?._id
    })
    if(!comment){
        throw new ApiError(500,"Something went wrong while adding comment!");
    }
    return res.status(201)
    .json(new ApiResponse(201,comment,"Comment Added successfully!!"))

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId}=req.params;
    if(!isValidObjectId(commentId))
    {
        throw new ApiError(404,"Invalid Comment Id!!");
    }
    const comment=await Comment.findById(commentId,{_id:1});
    if(!comment)
    {
        throw new ApiError(404,"Not found comment for this id!");
    }
    const {content}=req.body;
    if(content.trim()==="")
    {
        throw new ApiError(404,"Content is required for updating content!!");
    }
    const updateComment=await Comment.findByIdAndUpdate(commentId,
        {
            $set:{
                content
            },
            
        },
        {
            new:true
        }
    );
    if(!updateComment){
        throw new ApiError(500,"Something went wrong while updating comment!!");
    }

    return res.status(200)
    .json(new ApiResponse(200,updateComment,"Commenet updated Successfully!!"));

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId}=req.params;
    if(!isValidObjectId(commentId)){
        throw new ApiError(404, "Invalid comment Id for Deleting the comment!!");
    }
    const comment=await Comment.findById(commentId,{_id:1});
    if(!comment)
    {
        throw new ApiError(404,"Not found comment for this id!");
    }
    const deletedComment=await Comment.findByIdAndDelete(commentId,
        {
            new:true
        }
    )
    if(!deletedComment){
        throw new ApiError(500, "Something went wrong while deleting comment")
    }
    return res.status(200)
        .json(new ApiResponse(
            200,
            {},
            "Comment Deleted Successfully!!"
    ))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
