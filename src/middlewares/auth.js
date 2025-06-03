import { User } from "../models/user.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
export const verifyJWT  =  asyncHandler(async (req, res,next) =>{
 try {
    const token  =   req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    if (!token){
       throw new ApiError(401,"Unauthorization request ")
    }
    const decoded  = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
   
    const user = await User.findById(decoded?._id).select("-password -refreshToken")
    if (!user){
       //next_video  = discuss about the frontend  
       throw new ApiError(400,"Invalid access token")
    }
    req.user  =  user 
    next()
 } catch (error) {
    throw new ApiError(401,"invalid access token")
    
 }
})