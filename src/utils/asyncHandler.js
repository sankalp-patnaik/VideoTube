const asyncHandler=(requestHandler)=>{
    (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).
        catch((err)=>next(err))
    }

}
export {asyncHandler}




// Higher Order Function:  Higher Order functions are the functions where a pass a function as a parameter to the function
// const higherFunction=(func)=>{()=>{}}
// const higherFunction=(func)=>()=>{}
// Async Higher Order Function
// const higherFunction=(func)=>async ()=>{}
// fn => req,res,next

// It is a rapper function where we can use in multiple places in code // Reusability

//  Method 1 for async Handler

// const asyncHandler=(fn)=>async (req,res,next)=>{
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success:false,
//             message: err.message
//         })
//     }
// }

