import { asyncHandler} from "../utils/asyncHandler.js"
 import {uploadCloudinary} from "../utils/cloudinary.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken   = async(userId)=>{


    try {
       const user=  await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()
       user.refreshToken = refreshToken
       user.save({validateBeforeSave: false})
       return {accessToken,refreshToken}
    } 
    catch (error) {
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
    if (!username && !email){
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
            $unset:{
                refreshToken : 1//this remove the field from the token  

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



const refreshAccessToken =  asyncHandler(async(req,res) =>{
   const incomingRefreshToken  =  req.cookies?.refreshToken || req.body.refreshToken
  
  
   if (!incomingRefreshToken){
     throw new ApiError (401,"unauthorized request")
   }


try {
    const decodedToken  =  jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )
    
    const user  =  await User.findById(decodedToken?._id)
    
    
    if (!user){
        throw new ApiError(401,"invalid refresh token ")
    }
    
    
    if ( incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401,"refresh token is expired or used ")
    }
    const options  =  {
         httpOnly :true,
         secure :true 
    
    }
    const {accessToken,newRefreshToken}  = await generateAccessAndRefreshToken(user._id)
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json( 200,
        {
            accessToken,
            refreshToken :newRefreshToken
        },
        "Access token refreshed"
    )
    
} catch (error) {
    throw new ApiError(401, "invalid refresh token")
    
}

})


const changeUserPassword  =asyncHandler(async (req,res ) =>{
    const {oldPassword,newPassword} =  req.body
   const user  = await User.findById(req.user?._id)
   console.log("User password fetched:", user.password); // should log a hashed string

   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect){
        throw new ApiError(400,"invalid old password ")
    }
    user.password = newPassword
    await user.save({validateBeforeSave :false})
    return res 
    .status(200)
    .json(new ApiResponse(200,{},"password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res) =>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))
})


const updateAccountDetails  =  asyncHandler(async(req,res)=>{
    const {fullname,email} = req.body

    if (!fullname || !email){
        throw new ApiError(400 ," all fields are required")
    }
    const user  = await User.findByIdAndUpdate(req.user?._id,
        {
            $set :{
                fullname,
                email
            }
        },
        {
            new : true
        }


    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"account detail updated successfully"))
});



const updateUserAvatar =  asyncHandler(async (req,res) =>{
const avatarLocalPath   =  req.file?.path
if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is missing !!")
}
const avatar  =await uploadCloudinary(avatarLocalPath)
if (!avatar.url){
throw new ApiError(400, " there is no url for this avatar please check again for this ")

}
// 🧠 Step 1: Find the user first to get current avatar URL
    const currentUser = await User.findById(req.user?._id);
    const oldAvatarUrl = currentUser?.avatar;

    // 🧹 Step 2: Extract Cloudinary public_id and delete old image
    if (oldAvatarUrl) {
        const publicId = getCloudinaryPublicId(oldAvatarUrl);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }
    }


const user  = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set :{
            avatar: avatar.url
        }
    },
    {new : true}
).select("-password")
return res
.status(200)
.json(
    new ApiResponse(200,user,"avatar  image is updated"
    )
)
})


const updateUserCoverImage =  asyncHandler(async (req,res) =>{
const coverImageLocalPath   =  req.file?.path
if(!coverImageLocalPath){
    throw new ApiError(400,"Avatar file is missing !!")
}
const coverImage  =await uploadCloudinary(coverImageLocalPath)
if (!coverImage.url){
throw new ApiError(400, " there is no url for this avatar please check again for this ")

}

 // 🧠 Step 1: Find the user first to get current coverImage URL
    const currentUser = await User.findById(req.user?._id);
    const oldCoverImageUrl = currentUser?.coverImage;

    // 🧹 Step 2: Extract Cloudinary public_id and delete old image
    if (oldCoverImageUrl) {
        const publicId = getCloudinaryPublicId(oldCoverImageUrl);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }
    }



const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set :{
            coverImage: coverImage.url
        }
    },
    {new : true}


).select("-password")


return res
.status(200)
.json(
    new ApiResponse(200,user,"cover image is updated"
    )
)


})
const getUserChannelProfile  = asyncHandler(async(req,res) =>{

const {username} =  req.params


if (!username?.trim()){
    throw new ApiError(400,"username is missing ")
}


const channel  = await User.aggregate([ 


    {
         $match : {
            username : username?.toLowerCase()
         }
    },



    {


        $lookup:{
             from :"subscriptions",
             localField :  "_id",
             foreignField :"channel",
             as : "subscribers"

        }
    },
    {


        $lookup:{
            from :"subscriptions",
             localField :  "_id",
             foreignField :"subscriber",
             as : "subscribedTo"
        }
    },


    {


        $addFields:{
            subscribersCount :{
                $size :"$subscribers"
            },


            channelsSubscribed :{
                $size :"$subscribedTo"
            },


            isSubscribed :{
                $cond :{
                    if :{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then: true,
                    else: false 
                }
            }
        }
    },



    {
        $project:{
            fullname : 1,
            username : 1,
            subscribersCount :1,
            channelsSubscribed:1,
            isSubscribed :1,
            avatar :1,
            coverImage:1,
            email : 1,

        }

    }
])


if (!channel?.length()){
    throw new ApiError(400,"channek does not exist here ")
}
return res 
.status(200)
.json(
    new ApiResponse(200,channel[0],"user channel fetched successfully ")
)
})

const getWatchHistory  =  asyncHandler(async(req,res) =>{
    const user  =  await User.aggregate([
        {
             $match :{
                _id :new mongoose.Types.ObjectId(req.user._id)
             }

        },
        {
            $lookup:{
                from : "videos",
                localField:"watchHistory",
                foreignField :"_id",
                as : "watchHistory",
                pipeline:[
                    {
                        $lookup :{
                            from :"users",
                            localField : "owner",
                            foreignField :"_id",
                            as: "owner",
                            pipeline :[
                                {
                                    $project:{
                                        fullname: 1,
                                        username: 1,
                                        avatar :1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner :{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(200,
            user[0].watchHistory,
            "watched history fetched successfully"
        )
    )
})

export {registerUser,
    loginUser,
      logoutUser,
      refreshAccessToken,
    changeUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}