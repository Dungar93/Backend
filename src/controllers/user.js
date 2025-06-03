import { asyncHandler} from "../utils/asyncHandler.js"
 import {uploadCloudinary} from "../utils/cloudinary.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshToken   = async(userId)=>{
    try {
       const user=  await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()
       user.refreshToken = refreshToken
       user.save({validateBeforeSave: false})
       return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500," something went wrong in this process so check this process again")
    }
}
const registerUser  = asyncHandler(async (req,res) =>{
  //get user details from frontend 
  // validation - not empty 
  // check if user already exist ?? you can chech from the username as well as from email 
  //check for images also check for the avatar 
  // upload them to the cloudinary ,avatar
  // create user object  -  create entry in db

  // remove the password and  refresh token field from response 
  //check for the user creation 
  //return response 


   const {fullname ,email,username ,password}=req.body  
    // console.log("req.body:", req.body);
//   console.log("req.files:", req.files);
//    console.log("email",email)

   if (
    [fullname,email,username,password].some((field) =>field?.trim() === "")
   ) {
    throw new ApiError(400,"All fiels are compulsory")
    
   }
  const existdUser = await User.findOne({
        $or : [{username},{email}]
    })
    if (existdUser){
        throw new ApiError(409,"this eamil or username is already exist in this app please enter a new username or eamil for the login")
    }
    const avatarLocalPath  =req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;


   if (!avatarLocalPath){
    throw new ApiError(400,"Please upload the avatar file this is the necessary for the register into this app")
   }
const avatar =await uploadCloudinary(avatarLocalPath)
const coverImage =  await uploadCloudinary(coverImageLocalPath)
if (!avatar){
    
     throw new ApiError(400,"Please upload the avatar file this is the necessary for the register into this app")

}


const user  = await User.create({
    fullname,
    avatar : avatar.url,
    coverImage: coverImage?.url ||"",  
    email,
    password,
   username: username.toLowerCase()
})
const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)
if (!createdUser){
    throw new ApiError(500,"something went wrong while registering the user")
}
return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered successfully")
)
})

const  loginUser  = asyncHandler(async(req,res) => {
    //req->body  = data 
    // username or email 
    //find the user 
    // check the password 
    //access and refresh token 
    //send cookies 
    const {email,username ,password}  =req.body
    if (!username || !email){
        throw new ApiError(400,'username or password is required for a account ')
    }
    const user  = await User.findOne({
        $or :[{username} ,{email}] 
    })
    if (!user){
        throw new ApiError(404,"user does not exist")
    }
   const isPassValid =  await user.isPasswordCorrect(password)
   if (!isPassValid){
    throw new ApiError(401,"invalid user credentials")
   }

  const {accessToken,refreshToken} =await generateAccessAndRefreshToken(user._id)
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure :true  
      
  }
  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
.json(
    new  ApiResponse(
        200, 
        {
            user: loggedInUser,accessToken,refreshToken

        },
        "user logged in successfully"
    )
)

})
const logoutUser   = asyncHandler(async(req,res) =>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken : undefined 

            }
            
        },
      {
        new : true 
      }
    )
    const options = {
    httpOnly: true,
    secure :true  
      
  }
  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse( 200,{},"user logged out"))

})
export {registerUser,
    loginUser,  logoutUser
}