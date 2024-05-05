import {v2 as cloudinary} from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});
const uploadOnCloudinary=async (localFilePath)=>{
    try{
        if(!localFilePath) return null;
        // Upload the file on CLoudinary
        const response=await cloudinary.uploader.upload(localFilePath,{
            // Options we can see in cloudinary docs
            resource_type:("auto")
        })
        // Fil has uploaded successfully
        // console.log("File is uploaded on Cloudinary",response.url);
        fs.unlinkSync(localFilePath);
        return response;
    }
    catch (error){
        fs.unlinkSync(localFilePath)// Removing the locally saved temporary file as the upload opearation got failed
        return null
    }
}
const deleteOnCloudinary=async(oldImageUrl,publicId)=>{
    try {
        if(!(oldImageUrl|| publicId))
        {
            throw ApiError(404,"Oldimageurl or publicId required");
        }
        const result=await cloudinary.uploader.destroy(publicId,
            {
                resource_type:`${oldImageUrl.includes("images")?"image" : "video" }`,
            },
        )   
        console.log("Asset deleted from Cloudinary:", result);
    } catch (error) {
        console.log("Error while deleting from cloudinary",error);
        throw new ApiError(500, error?.message || "Server error");
    }
}
export {uploadOnCloudinary, deleteOnCloudinary}