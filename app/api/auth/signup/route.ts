import { NextResponse } from "next/server"

import {
 SESSION_COOKIE_NAME,
 authCookieOptions,
 createSession,
 hashPassword,
 normalizeEmail
} from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req:Request){
 try{
 const body=await req.json()

 const name=typeof body.name==="string" ? body.name.trim() : ""
 const emailInput=typeof body.email==="string" ? body.email : ""
 const password=typeof body.password==="string" ? body.password : ""

 if(!emailInput.trim()){
 return NextResponse.json({error:"Email is required"},{status:400})
 }

 if(password.length<6){
 return NextResponse.json({error:"Password must be at least 6 characters"},{status:400})
 }

 const email=normalizeEmail(emailInput)

 const existing=await prisma.user.findUnique({
 where:{email},
 select:{id:true}
 })

 if(existing){
 return NextResponse.json({error:"An account with this email already exists"},{status:409})
 }

 const passwordHash=await hashPassword(password)

 const user=await prisma.user.create({
 data:{
 name:name || null,
 email,
 passwordHash
 },
 select:{
 id:true,
 name:true,
 email:true
 }
 })

 const {token,expiresAt}=await createSession(user.id)

 const response=NextResponse.json({user},{status:201})
 response.cookies.set(SESSION_COOKIE_NAME, token, authCookieOptions(expiresAt))
 return response
 }catch(error:any){
 console.error("Signup failed",error)

 const message=String(error?.message||"")
 if(message.includes("Can't reach database server")){
 return NextResponse.json({error:"Database unavailable. Please try again shortly."},{status:503})
 }

 return NextResponse.json({error:"Failed to create account"},{status:500})
 }
}
