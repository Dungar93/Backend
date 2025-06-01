class ApiError extends Error {
    constructor(
        statusCode,
        message  = "Something went wrong",
        errors  = [],
        statck  = ""

    ){
        super(message)
            this.statusCode =  statusCode
            this.message =  message
            this.error  =  error 
            this.data  =  null
            this.success  =  false
            this.errors  =  errors 
            if (stack){
                this.stack = stack

            }
            else {
                Error.captureStackTrace(this, this.constructer)
            }


        
    }
}
export {ApiError}