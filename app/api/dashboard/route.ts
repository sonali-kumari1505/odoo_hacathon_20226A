import {NextResponse} from "next/server"

import {getCurrentUser} from "@/lib/auth"
import {prisma} from "@/lib/prisma"
import {DOCUMENT_STATUS,DOCUMENT_TYPES,calculateStockByProduct} from "@/lib/stock"

export async function GET(){
 try{
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const [products,movements,pendingReceipts,pendingDeliveries]=await Promise.all([
 prisma.product.findMany({orderBy:{id:"asc"}}),
 prisma.movement.findMany({
 select:{
 productId:true,
 type:true,
 quantity:true
 }
 }),
 prisma.stockDocument.count({
 where:{
 type:DOCUMENT_TYPES.RECEIPT,
 status:DOCUMENT_STATUS.PENDING
 }
 }),
 prisma.stockDocument.count({
 where:{
 type:DOCUMENT_TYPES.DELIVERY,
 status:DOCUMENT_STATUS.PENDING
 }
 })
 ])

 const stockByProduct=calculateStockByProduct(movements)
 const movementCountByProduct=new Map<number,number>()

 for(const movement of movements){
 const previous=movementCountByProduct.get(movement.productId)||0
 movementCountByProduct.set(movement.productId,previous+1)
 }

 const productRows=products.map(product=>{
 const stock=stockByProduct.get(product.id)||0
 const movementCount=movementCountByProduct.get(product.id)||0

 return{
 id:product.id,
 name:product.name,
 sku:product.sku,
 unit:product.unit,
 reorderLevel:product.reorderLevel,
 stock,
 movementCount,
 low:stock<product.reorderLevel
 }
 })

 const lowStockItems=productRows.filter(item=>item.low)
 const totalStock=productRows.reduce((sum,item)=>sum+item.stock,0)

 return NextResponse.json({
 totals:{
 products:products.length,
 movements:movements.length,
 stock:totalStock,
 lowStock:lowStockItems.length,
 pendingReceipts,
 pendingDeliveries
 },
 productRows,
 lowStockItems
 })
 }catch{
 return NextResponse.json({error:"Failed to load dashboard"},{status:500})
 }
}
