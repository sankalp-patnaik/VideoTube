import mongoose, {isValidObjectId} from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary";


const isUserOwner=async(videoId,req)=>{
    const video=await Video.findById(videoId);
    if(video?.owner!==req.user?._id)
    {
        return false;
    }
    return true;
}

const getAllVideos = asyncHandler(async (req, res) => {
    const {  
        page = 1,
        limit = 10,
        query,
        sortBy, 
        sortType, 
        userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const matchCondition={
        $or:[
            {title:{$regex:query,$options:"i"}},
            {description:{$regex:query,$options:"i"}}
        ]
    };
    if(userId)
    {
        matchCondition.owner=new mongoose.Types.ObjectId(userId);
    }
    var videoAggregate;
    try {
        videoAggregate=videoAggregate.aggregate([
            {
                $match:matchCondition
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
                                _id:1,
                                fullName:1,
                                avatar:"$avtar.url",
                                username:1,

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
                    [sortBy||"createdAt"]:sortType || 1
                }
            }
        ])
    } catch (error) {
        console.log("Error is occured in Aggregation",error);
        throw new ApiError(500,error.message || "Internal server error occured in video aggregation");
    }
    const options={
        page,
        limit,
        customLabels:{
            totalDocs:"totalVideos",
            docs:"videos",
        },
        skip:(page - 1)*limit,
        limit: parseInt(limit),
    }
    Video.aggregatePaginate(videoAggregate,options)
    .then(result=>{
        // console.log(result);
        if(result?.videos?.length===0 && userId)
        {
            return res.status(200).json(new ApiResponse(200,[],"No videos found"));
        }
        return res.status(200).json(new ApiResponse(200,result,"Videos fetched successfully"));
    }).catch(error=>{
        console.log("Error: ",error);
        throw new ApiError(500,error?.message || "Internal server error in video aggregate Paginate");
    })
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(!(title && description)||!(title?.trim() && description.trim()))
    {
        throw new ApiError(404,"Please provide title & description");
    }
    const videoLocalPath=req.files?.videoFile[0]?.path;
    const thumbnailLocalPath=req.files?.thumbnail[0]?.path;

    if(!videoLocalPath)
    {
        throw new ApiError(404,"Please provide video");
    }
    if(!thumbnailLocalPath)
    {
        throw new ApiError(404,"Please provide thumbnail");
    }
    
    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath);

    if(!videoFile && !thumbnail)
    {
        throw new ApiError(400,"Video upload error");
    }
    const uploadVideo=await Video.create({
        title,
        description,
        videoFile:{publicId:videoFile?.public_id,url:videoFile?.url},
        thumbnail:{publicId: thumbnail?.public_id, url:thumbnail.url},
        duration:videoFile?.duration,
        isPublished:true,
        owner:req.user?._id
    });
    if(!uploadVideo)
    {
        throw new ApiError(500,"Error while uploading video!");
    }
    return res
    .status(201)
    .json(new ApiResponse(200,{
        ...updateVideo._doc,
        videoFile:videoFile?.url,
        thumbnail:thumbnail?.url
    },"Video uploaded successfully!"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId))
    {
        throw new ApiError(404,"Video not found");
    }
    const findVideo=await Video.findById(videoId);
    if(!findVideo)
    {
        throw new ApiError(404,"Video not found");
    }
    const user=await User.findById(req.user?._id,{watchHistory:1});

    if(!user)
    {
        throw new ApiError(404,"SUer not found!");
    }
    // increment the count of views based on watchHistory 
    if(!user?.watchHistory.include(videoId)){
            await Video.findByIdAndUpdate(videoId,
            {
                // incrementing views by 1 to the user watch history
                $inc: {views:1}
            },
            {
                new : true
            }
        )
    }
    // Now adding video to watch History
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $addToSet:{
                watchHistory: videoId
            }
        },
        {
            new: true
        }
    )
    const video= await Video.aggregate([
        {
                $match:{
                    _id:new mongoose.Types.ObjectId(videoId)
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
                            avatar:"$avatar.url",
                            fullName:1,
                            _id:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            },
        },
        {
            $addFields:{
                videoFile:"$videoFile.url",
            }
        },
        {
            $addFields:{
                thumbnail:"$thumbnail.url",
            },
        }
    ])
    console.log("Video: ",video[0]);
    if(!video)
    {
        throw new ApiError(500,"Video detail not found");
    }
    return res.status(200).json(
        new ApiResponse(200,video[0],"Video fetched successfully!!")
    );

    
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title,description}=req.body;
    const thumbnailLocalPath=req.file?.path;
    if(!isValidObjectId(videoId))
    {
        throw new ApiError(404,"Invalid videoID for updateVideo!");
    }
    const oldVideo=await Video.findById(videoId);
    if(!oldVideo)
    {
        throw new ApiError(404,"Video is not found to update!")
    }
    if(!isUserOwner(videoId,req))
    {
        throw new ApiError(300,"Unauthorized access to update details of the video!");
    }
    const {publicId,url}=oldVideo?.thumbnail;
    if (!(publicId || url)) throw new ApiError(500, "old thumbnail url or publicId not found");

   
    
    if(!(title && description) || !(title?.trim() && description.trim()))
    {
        throw new ApiError(400,"Title & Description are required for update video Details!");
    }
    
    // Here we have to update then when ever we want to updtae anything
    if(!thumbnailLocalPath)
    {
        throw new ApiError(400,"thumbnail is required for update the details !");
    }
    // const oldVideo = await Video.findById(videoId, { thumbnail: 1});
    
    const uploadThumbnail=await uploadOnCloudinary(thumbnailLocalPath);
    if(!uploadThumbnail)
    {
        throw new ApiError(500,"Something went wrong while uploading the thumbnail on cloud!")
    }

    const updateVideoDetails=await Video.findByIdAndUpdate(videoId,
        {
            $set:{
                title,
                description,
                thumbnail:{
                    url:uploadThumbnail?.url,
                    publicId:uploadThumbnail?.public_id
                }
            }
        }
    
    );
    if(!updateVideoDetails)
    {
        await deleteOnCloudinary(uploadThumbnail?.url,uploadThumbnail?.publicId);
        console.log("Video not updated successfully")
        throw new ApiError(500,"Error while updating video details!");
    }
    // Deleting old thumbnail from cloudinary
    if(url)
    {
        try {
            await deleteOnCloudinary(url,publicId);
        } catch (error) {
            console.log("Failed to delete old thumbnail from cloudinary");
            throw new ApiError(500, error?.message || 'Server Error');
        }

    }
    
    

    return res
    .status(200)
    .json(new ApiResponse(201,updateVideoDetails,"Video details uploaded Successfully!"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    // NEW
    const {videoId} =req.params;
    
    let deleteVideoFilePromise;
    let deleteThumbnailPromise;

    // 
    try {
        if(!isValidObjectId(videoId))
        {
            throw new ApiError(400,"Invalid video Id!");
        }
        if(!isUserOwner(videoId,req))
        {
            throw new ApiError(404,"Unauthorized access to delete video!");
        }
        // Validate videoId & fetch Video by videoId (Optimized query)
        const video=await Video.findById(videoId,{videoFile:1,thumbnail:1}).select('_id videoFile thumbnail');
        if(!video)
        {
            throw new ApiError(404,"Viedo is not found!");
        }
        // 2. Deleting video file & thumbnail from cloudinary
        [deleteVideoFilePromise,deleteThumbnailPromise]=await Promise.all([
            deleteOnCloudinary(video.videoFile.url,video.videoFile.publicId),
            deleteOnCloudinary(video.thumbnail.url,video.thumbnail.publicId)
        ])
        // 3. Delete video From database
        await Video.findByIdAndDelete(videoId);

        // 4. Remove Video from related collections
        const updatePromises=[
            User.updateMany({watchHistory:videoId},{$pull:{watchHistory:videoId}}),
            Comment.deleteMany({video:videoId}),
            Playlist.updateMany({videos:videoId},{$pull:{videos:videoId}}),
            Like.deleteMany({ video: videoId })
        ]
        await Promise.all(updatePromises);
        // 5. Remaining Tasks handle
        return res.status(200).json(new ApiResponse(201,{},"Video Deleted Successfully"));
    } catch (error) {
        console.log("Error Occured while deleting the video");

        // Now we attempt to retry
        try {
            if(deleteVideoFilePromise?.error)
            {
                await deleteVideoFilePromise.retry();
            }
            if(deleteThumbnailPromise?.error)
            {
                await deleteThumbnailPromise.retry();
            }
        } catch (cloudinaryError) {
            console.log("Failed to rollback Cloudinary Deletions",cloudinaryError);
        }
        throw new ApiError(500,error.message || 'Server error while deleting video! ')
    }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if(!videoId || !isValidObjectId(videoId))
    {
        throw new ApiError(400,"Please provide valid videoId for changeing publish status!")
    }
    const video=await Video.findById(videoId,{_id:1,isPublished:1,owner:1});
    if(!video)
    {
        throw new ApiError(404,"No Video Found!");
    }
    if(!isUserOwner(videoId,req))
    {
        throw new ApiError(401, "Unauthorized request to change video publish status!")
    }
    
    
    const toggleVideo=Video.findByIdAndUpdate(videoId,
    {
        $set:{
            isPublished : !video?.isPublished,
        }
    },
    {
        new:true
    }
   
    );
    if(!toggleVideo)
    {
        throw new ApiError(500,"Something went wrong while changeing the Video togglePublish status");
    }

    return res.status(200).json(new ApiResponse(201,toggleVideo,toggleVideo?.isPublished? "Video Published Successfully" : "Video Unpublished Successfully" ))


})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
