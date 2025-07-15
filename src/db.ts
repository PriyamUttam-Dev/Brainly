import mongoose , {model , Schema} from "mongoose";

mongoose.connect('mongodb://localhost:27017/brainlydb').then(() => {
    console.log('db connected');
}).catch((err)=>{
    console.log(err);
})

const userSchema = new Schema({
    username : {
        type : String,
        required : true,
        unique : true
    } , 
    password : String
})

export const User = model('User' , userSchema);

