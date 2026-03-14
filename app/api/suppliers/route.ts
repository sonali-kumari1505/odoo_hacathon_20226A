
import {getCurrentUser} from "@/lib/auth"
import {prisma} from "@/lib/prisma"
import {NextResponse} from "next/server"

export async function GET(){
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const s=await prisma.supplier.findMany()
 return NextResponse.json(s)
}

export async function POST(req:Request){
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const b=await req.json()
 const s=await prisma.supplier.create({
 data:{name:b.name,contact:b.contact}
 })
 return NextResponse.json(s)
}
