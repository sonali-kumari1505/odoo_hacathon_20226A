import {NextResponse} from "next/server"

import {getCurrentUser} from "@/lib/auth"
import {prisma} from "@/lib/prisma"
import {DOCUMENT_STATUS,DOCUMENT_TYPES,calculateStockByProduct} from "@/lib/stock"

type LineInput={
 productId:number
 physicalCount:number
}

function normalizeLines(value:unknown){
 if(!Array.isArray(value) || value.length===0){
 return{error:"At least one product line is required"} as const
 }

 const map=new Map<number,number>()

 for(const item of value){
 const productId=Number((item as any)?.productId)
 const physicalCount=Number((item as any)?.physicalCount)

 if(!Number.isInteger(productId) || productId<=0){
 return{error:"Each line requires a valid productId"} as const
 }

 if(!Number.isInteger(physicalCount) || physicalCount<0){
 return{error:"Each physicalCount must be a non-negative whole number"} as const
 }

 map.set(productId,physicalCount)
 }

 const lines:Array<LineInput>=Array.from(map.entries()).map(([productId,physicalCount])=>({
 productId,
 physicalCount
 }))

 return{lines} as const
}

export async function GET(){
 try{
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const adjustments=await prisma.stockDocument.findMany({
 where:{type:DOCUMENT_TYPES.ADJUSTMENT},
 include:{
 lines:{
 include:{product:true},
 orderBy:{id:"asc"}
 }
 },
 orderBy:{createdAt:"desc"}
 })

 return NextResponse.json(adjustments)
 }catch{
 return NextResponse.json({error:"Failed to load adjustments"},{status:500})
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

 const location=typeof body.location==="string" && body.location.trim()
 ? body.location.trim()
 : null

 const note=typeof body.note==="string" && body.note.trim()
 ? body.note.trim()
 : null

 const productIds=normalized.lines.map(line=>line.productId)
 const productCount=await prisma.product.count({
 where:{
 id:{
 in:productIds
 }
 }
 })

 if(productCount!==productIds.length){
 return NextResponse.json({error:"One or more products do not exist"},{status:400})
 }

 const result=await prisma.$transaction(async tx=>{
 const movements=await tx.movement.findMany({
 where:{
 productId:{
 in:productIds
 }
 },
 select:{
 productId:true,
 type:true,
 quantity:true
 }
 })

 const stockByProduct=calculateStockByProduct(movements)

 const adjustmentLines=normalized.lines.map(line=>{
 const stockBefore=stockByProduct.get(line.productId)||0
 const delta=line.physicalCount-stockBefore

 return{
 productId:line.productId,
 quantity:Math.abs(delta),
 physicalCount:line.physicalCount,
 stockBefore,
 delta
 }
 })

 const adjustment=await tx.stockDocument.create({
 data:{
 type:DOCUMENT_TYPES.ADJUSTMENT,
 status:DOCUMENT_STATUS.VALIDATED,
 toLocation:location,
 note,
 validatedAt:new Date(),
 lines:{
 create:adjustmentLines
 }
 },
 include:{
 lines:{
 include:{product:true},
 orderBy:{id:"asc"}
 }
 }
 })

 const movementRows=adjustmentLines
 .filter(line=>line.delta!==0)
 .map(line=>({
 productId:line.productId,
 type:"adjustment",
 quantity:line.delta,
 location,
 note:`Adjustment #${adjustment.id}`,
 documentId:adjustment.id
 }))

 if(movementRows.length>0){
 await tx.movement.createMany({
 data:movementRows
 })
 }

 return{adjustment}
 })

 return NextResponse.json(result.adjustment,{status:201})
 }catch{
 return NextResponse.json({error:"Failed to create adjustment"},{status:500})
 }
}
