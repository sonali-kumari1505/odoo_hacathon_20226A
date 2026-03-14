import { createHash, randomBytes } from "crypto"

import bcrypt from "bcryptjs"
import { cookies } from "next/headers"

import { prisma } from "@/lib/prisma"

export const SESSION_COOKIE_NAME = "coreinventory_session"

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const PASSWORD_SALT_ROUNDS = 10

type SessionUser = {
 id:number
 name:string | null
 email:string
}

export function normalizeEmail(value:string){
 return value.trim().toLowerCase()
}

export async function hashPassword(password:string){
 return bcrypt.hash(password, PASSWORD_SALT_ROUNDS)
}

export async function verifyPassword(password:string, hash:string){
 return bcrypt.compare(password, hash)
}

export function hashSessionToken(token:string){
 return createHash("sha256").update(token).digest("hex")
}

export function createSessionToken(){
 return randomBytes(32).toString("hex")
}

export async function createSession(userId:number){
 const token=createSessionToken()
 const tokenHash=hashSessionToken(token)
 const expiresAt=new Date(Date.now()+SESSION_TTL_SECONDS*1000)

 await prisma.session.create({
 data:{userId,tokenHash,expiresAt}
 })

 return{token,expiresAt}
}

export async function deleteSessionByToken(token:string | null | undefined){
 if(!token) return

 await prisma.session.deleteMany({
 where:{tokenHash:hashSessionToken(token)}
 })
}

export async function getUserFromSessionToken(token:string | null | undefined):Promise<SessionUser | null>{
 if(!token) return null

 const session=await prisma.session.findFirst({
 where:{
 tokenHash:hashSessionToken(token),
 expiresAt:{gt:new Date()}
 },
 include:{
 user:{
 select:{
 id:true,
 name:true,
 email:true
 }
 }
 }
 })

 if(!session) return null

 return session.user
}

export async function getCurrentUser():Promise<SessionUser | null>{
 const token=cookies().get(SESSION_COOKIE_NAME)?.value
 return getUserFromSessionToken(token)
}

export function authCookieOptions(expiresAt:Date){
 return{
 httpOnly:true,
 sameSite:"lax" as const,
 secure:process.env.NODE_ENV==="production",
 path:"/",
 expires:expiresAt,
 maxAge:SESSION_TTL_SECONDS
 }
}

export function clearAuthCookieOptions(){
 return{
 httpOnly:true,
 sameSite:"lax" as const,
 secure:process.env.NODE_ENV==="production",
 path:"/",
 maxAge:0
 }
}
