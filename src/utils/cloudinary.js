import { v2 as cloudinary } from "cloudinary"
import fs from "fs"


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //upload on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        //File Uploaded successfully
        //console.log("File uploaded on cloudinary", response.url)
        fs.unlinkSync(localFilePath) //Remove the locally save file as upload got failed
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) //Remove the locally save file as upload got failed
        return null
    }
}

export {uploadOnCloudinary}