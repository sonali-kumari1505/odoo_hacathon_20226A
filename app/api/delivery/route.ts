import {NextResponse} from "next/server"

import {getCurrentUser} from "@/lib/auth"
import {prisma} from "@/lib/prisma"
import {DOCUMENT_STATUS,DOCUMENT_TYPES} from "@/lib/stock"

type LineInput={
 productId:number
 quantity:number
}

function normalizeLines(value:unknown){
 if(!Array.isArray(value) || value.length===0){
 return{error:"At least one product line is required"} as const
 }

 const map=new Map<number,number>()

 for(const item of value){
 const productId=Number((item as any)?.productId)
 const quantity=Number((item as any)?.quantity)

 if(!Number.isInteger(productId) || productId<=0){
 return{error:"Each line requires a valid productId"} as const
 }

 if(!Number.isInteger(quantity) || quantity<=0){
 return{error:"Each line quantity must be a positive whole number"} as const
 }

 const previous=map.get(productId)||0
 map.set(productId,previous+quantity)
 }

 const lines:Array<LineInput>=Array.from(map.entries()).map(([productId,quantity])=>({
 productId,
 quantity
 }))

 return{lines} as const
}

export async function GET(){
 try{
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const deliveries=await prisma.stockDocument.findMany({
 where:{type:DOCUMENT_TYPES.DELIVERY},
 include:{
 lines:{
 include:{product:true},
 orderBy:{id:"asc"}
 }
 },
 orderBy:{createdAt:"desc"}
 })

 return NextResponse.json(deliveries)
 }catch{
 return NextResponse.json({error:"Failed to load deliveries"},{status:500})
 }
}

export async function POST(req:Request){
 try{
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const body=await req.json()
 const normalized=normalizeLines(body.items)
 if("error" in normalized){
 return NextResponse.json({error:normalized.error},{status:400})
 }

 const fromLocation=typeof body.fromLocation==="string" && body.fromLocation.trim()
 ? body.fromLocation.trim()
 : null

 const note=typeof body.note==="string" && body.note.trim()
 ? body.note.trim()
 : null

 const productIds=normalized.lines.map(line=>line.productId)
 const productCount=await prisma.product.count({
 where:{
 id:{in:productIds}
 }
 })

 if(productCount!==productIds.length){
 return NextResponse.json({error:"One or more products do not exist"},{status:400})
 }

 const delivery=await prisma.stockDocument.create({
 data:{
 type:DOCUMENT_TYPES.DELIVERY,
 status:DOCUMENT_STATUS.PENDING,
 fromLocation,
 note,
 lines:{
 create:normalized.lines.map(line=>({
 productId:line.productId,
 quantity:line.quantity
 }))
 }
 },
 include:{
 lines:{
 include:{product:true},
 orderBy:{id:"asc"}
 }
 }
 })

 return NextResponse.json(delivery,{status:201})
 }catch{
 return NextResponse.json({error:"Failed to create delivery"},{status:500})
 }
}
