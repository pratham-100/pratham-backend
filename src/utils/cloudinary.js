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

const deleteFile = async(url)=>{
    if(!url){
        return;
    }
    
    const public_id_array = String(url).split("/");
    const extName = public_id_array[public_id_array.length-1];
    const public_id = String(extName).split(".")[0];
    try {
        const result = await cloudinary.uploader.destroy(public_id , {
            resource_type: "auto"
        })
        // console.log("File deleted successfully on cloudinary" , result);
        return true;
    } catch (error) {
        console.log("error deleting file" , error.message);
        return null;
    }

}

export {uploadOnCloudinary, deleteFile }