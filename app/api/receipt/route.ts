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

 const receipts=await prisma.stockDocument.findMany({
 where:{type:DOCUMENT_TYPES.RECEIPT},
 include:{
 supplier:true,
 lines:{
 include:{product:true},
 orderBy:{id:"asc"}
 }
 },
 orderBy:{createdAt:"desc"}
 })

 return NextResponse.json(receipts)
 }catch{
 return NextResponse.json({error:"Failed to load receipts"},{status:500})
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

 const supplierId=body.supplierId===undefined || body.supplierId===null || body.supplierId===""
 ? null
 : Number(body.supplierId)

 if(supplierId!==null && (!Number.isInteger(supplierId) || supplierId<=0)){
 return NextResponse.json({error:"Invalid supplierId"},{status:400})
 }

 const toLocation=typeof body.toLocation==="string" && body.toLocation.trim()
 ? body.toLocation.trim()
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

 if(supplierId!==null){
 const supplier=await prisma.supplier.findUnique({
 where:{id:supplierId},
 select:{id:true}
 })

 if(!supplier){
 return NextResponse.json({error:"Supplier not found"},{status:404})
 }
 }

 const receipt=await prisma.stockDocument.create({
 data:{
 type:DOCUMENT_TYPES.RECEIPT,
 status:DOCUMENT_STATUS.PENDING,
 supplierId,
 toLocation,
 note,
 lines:{
 create:normalized.lines.map(line=>({
 productId:line.productId,
 quantity:line.quantity
 }))
 }
 },
 include:{
 supplier:true,
 lines:{
 include:{product:true},
 orderBy:{id:"asc"}
 }
 }
 })

 return NextResponse.json(receipt,{status:201})
 }catch{
 return NextResponse.json({error:"Failed to create receipt"},{status:500})
 }
}
