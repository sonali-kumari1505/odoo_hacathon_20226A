import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import {
 SESSION_COOKIE_NAME,
 clearAuthCookieOptions,
 deleteSessionByToken
} from "@/lib/auth"

export async function POST(){
 const token=cookies().get(SESSION_COOKIE_NAME)?.value
 try{
 await deleteSessionByToken(token)
 }catch(error){
 console.error("Failed to delete session during logout",error)
 }

 const response=NextResponse.json({ok:true})
 response.cookies.set(SESSION_COOKIE_NAME, "", clearAuthCookieOptions())
 return response
}
