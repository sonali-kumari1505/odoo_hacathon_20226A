import { NextResponse } from "next/server"

import {
 SESSION_COOKIE_NAME,
 authCookieOptions,
 createSession,
 normalizeEmail,
 verifyPassword
} from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req:Request){
 try{
 const body=await req.json()

 const emailInput=typeof body.email==="string" ? body.email : ""
 const password=typeof body.password==="string" ? body.password : ""

 if(!emailInput.trim() || !password){
 return NextResponse.json({error:"Email and password are required"},{status:400})
 }

 const email=normalizeEmail(emailInput)

 const user=await prisma.user.findUnique({
 where:{email}
 })

 if(!user){
 return NextResponse.json({error:"Invalid email or password"},{status:401})
 }

 const valid=await verifyPassword(password, user.passwordHash)
 if(!valid){
 return NextResponse.json({error:"Invalid email or password"},{status:401})
 }

 const {token,expiresAt}=await createSession(user.id)

 const response=NextResponse.json({
 user:{
 id:user.id,
 name:user.name,
 email:user.email
 }
 })

 response.cookies.set(SESSION_COOKIE_NAME, token, authCookieOptions(expiresAt))
 return response
 }catch(error:any){
 console.error("Login failed",error)

 const message=String(error?.message||"")
 if(message.includes("Can't reach database server")){
 return NextResponse.json({error:"Database unavailable. Please try again shortly."},{status:503})
 }

 return NextResponse.json({error:"Failed to log in"},{status:500})
 }
}
