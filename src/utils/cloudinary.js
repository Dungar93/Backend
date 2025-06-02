import {v2 as cloudinary} from "cloudinary"
import fs from "fs"



    
    cloudinary.config({ 
        cloud_name: process.env.CLOUDDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDDINARY_API_KEY, 
        api_secret: process.env.CLOUDDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

    const uploadCloudinary  = async (localFilePath) =>{
        try {
            if(!localFilePath) return null
            //upload the file on cloudinary 
            const response = await cloudinary.uploader.upload(localFilePath,{
                resource_type : "auto"

            })
            // file has been successfully uploaded 
            fs.unlinkSync(localFilePath)
            //console.log("file is uploaded successfully ",response.url);
            return response;


            
        } catch (error) {
            fs.unlinkSync(localFilePath)// remove the locally saved temporary file as the upload operation got failed 
            return null;
        }
    }
    
    export{uploadCloudinary}