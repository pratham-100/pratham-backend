import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFile,} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query="", sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const sortOrder = sortType == "asc" ? 1 : -1;
    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    }

    const filteredPaginatedVideos = await Video.aggregatePaginate(Video.aggregate([
        {
            $match:{
               $or:[{
                title: {$regex: query , $options: "i"}
               } , {
                description: {$regex: query , $options: "i"}
               }]
            }
        },
        {
            $sort: {[sortBy]: sortOrder}
        }
    ]) , options);

    return res.status(200).json(new ApiResponse(200 , {
        videos: filteredPaginatedVideos
    } , "sorted filtered videos with pagination has been fetched successfully"));

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    
    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0].path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0].path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, "videoFileLocalPath is required");
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnailLocalPath is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(400, "Video file not found");
    }

    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail not found");
    }

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: videoFile.url,     
        thumbnail: thumbnail.url,       
        owner: req.user?._id,
        isPublished: false
    });


    const videoUploaded = await Video.findById(video._id);

    if (!videoUploaded) {
        throw new ApiError(500, "videoUpload failed please try again !!!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!videoId){
        throw new ApiError(400 , "video id is not provided");
    }
    const fullVideo = await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerInfo",
                pipeline:[
                    {
                        $project:{
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            },
        },
        {
            $unwind:{
                path: "$ownerInfo",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project:{
                owner: 0
            }
        }
    ])
    if(!fullVideo.length){
        throw new ApiError(404 , "video not found");
    }
    
    return res.status(200).json(new ApiResponse(200 , {
        fullVideo: fullVideo[0]
    }, "video with owner details fetched successfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title , description} = req.body;
    //TODO: update video details like title, description, thumbnail
    
    if(!videoId){
       throw new ApiError(400 , "video id is not provided"); 
    }
    if(!title && !description && !req.file){
        throw new ApiError(400 , "any of the title , description and thumbnail required to update");
    }

    const existingVideo = await Video.findById(videoId);
    if(!existingVideo){
        throw new ApiError(404 , "video not found");
    }

    const oldThumbnail = existingVideo.thumbnail;
    if(String(existingVideo.owner) !== req.user?.id){
        throw new ApiError(402 , "Unauthorized for this action");
    }
    const thumbnailPath = req.file?.path;
    const thumbnail = await uploadOnCloudinary(thumbnailPath);

    existingVideo.title = title?.trim() || existingVideo.title;
    existingVideo.description = description?.trim() || existingVideo.description;
    existingVideo.thumbnail = thumbnail.url || existingVideo.thumbnail

    await existingVideo.save();

    if(thumbnail){
        await deleteFile(oldThumbnail);
    }

    return res.status(200).json(new ApiResponse(200, {
        newVideo: existingVideo
    } , "video updated successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!videoId){
        throw new ApiError(400 , "video id is not provided");
    }
    const existingVideo = await Video.findById(videoId);
    if(!existingVideo){
        throw new ApiError(404 , "video not found");
    }
    const oldThumbnail = existingVideo.thumbnail;
    const oldVideo = existingVideo.videoFile;
    if(String(existingVideo.owner) !== req.user?.id){
        throw new ApiError(402 , "unauthorized to perform this action");
    }
    await Video.findByIdAndDelete(videoId);
    await deleteFile(oldThumbnail);
    await deleteFile(oldVideo);

    return res.status(200).json(new ApiResponse(200 , {} , "video deleted successfully"));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId){
        throw new ApiError(400 , "video id is not provided");
    }
    const existingVideo = await Video.findById(videoId);
    if(!existingVideo){
        throw new ApiError(404 , "video not found");
    }
    if(String(existingVideo.owner) !== req.user?.id){
        throw new ApiError(402 , "unauthorized to perform this action");
    }
    existingVideo.isPublished = !existingVideo.isPublished;
    await existingVideo.save();
    const status = existingVideo.isPublished ? "Published" : "Unpublished"
    return res.status(200).json(new ApiResponse(200 , {
        video: existingVideo,
        status
    } , `video has been ${status.toLowerCase()} successfully`));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}