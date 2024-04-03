import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

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
        console.log("File is uploaded on Cloudinary",response.url);
        return response;
    }
    catch (error){
        fs.unlinkSync(localFilePath)// Removing the locally saved temporary file as the upload opearation got failed
        return null
    }
}
export {uploadOnCloudinary}