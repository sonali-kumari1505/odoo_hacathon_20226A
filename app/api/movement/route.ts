
import {getCurrentUser} from "@/lib/auth"
import {prisma} from "@/lib/prisma"
import {calculateStockFromMovements} from "@/lib/stock"
import {NextResponse} from "next/server"

const POSITIVE_TYPES=new Set(["in","receipt","transfer_in"])
const NEGATIVE_TYPES=new Set(["out","delivery","transfer_out"])

export async function POST(req:Request){
 try{
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const b=await req.json()

 const productId=Number(b.productId)
 const quantity=Number(b.quantity)
 const type=String(b.type||"").toLowerCase()
 const location=typeof b.location==="string" && b.location.trim()
 ? b.location.trim()
 : null
 const fromLocation=typeof b.fromLocation==="string" && b.fromLocation.trim()
 ? b.fromLocation.trim()
 : null
 const toLocation=typeof b.toLocation==="string" && b.toLocation.trim()
 ? b.toLocation.trim()
 : null
 const note=typeof b.note==="string" && b.note.trim()
 ? b.note.trim()
 : null
 const documentId=b.documentId===undefined || b.documentId===null
 ? null
 : Number(b.documentId)

 if(!Number.isInteger(productId) || productId<=0){
 return NextResponse.json({error:"Invalid productId"},{status:400})
 }

 if(type==="adjustment"){
 if(!Number.isInteger(quantity) || quantity===0){
 return NextResponse.json({error:"Adjustment quantity must be a non-zero whole number"},{status:400})
 }
 }else if(!Number.isInteger(quantity) || quantity<=0){
 return NextResponse.json({error:"Invalid quantity"},{status:400})
 }

 if(!POSITIVE_TYPES.has(type) && !NEGATIVE_TYPES.has(type) && type!=="adjustment"){
 return NextResponse.json({error:"Unsupported movement type"},{status:400})
 }

 if(documentId!==null && (!Number.isInteger(documentId) || documentId<=0)){
 return NextResponse.json({error:"Invalid documentId"},{status:400})
 }

 const product=await prisma.product.findUnique({
 where:{id:productId},
 select:{id:true}
 })

 if(!product){
 return NextResponse.json({error:"Product not found"},{status:404})
 }

 if(NEGATIVE_TYPES.has(type)){
 const existing=await prisma.movement.findMany({
 where:{productId},
 select:{type:true,quantity:true}
 })

 const currentStock=calculateStockFromMovements(existing)
 if(currentStock<quantity){
 return NextResponse.json({error:`Insufficient stock. Available: ${currentStock}`},{status:400})
 }
 }

 const m=await prisma.movement.create({
 data:{
 productId,
 type,
 quantity,
 location,
 fromLocation,
 toLocation,
 note,
 documentId
 }
 })

 return NextResponse.json(m)
 }catch{
 return NextResponse.json({error:"Failed to create movement"},{status:500})
 }
}
