import mongoose from "mongoose";
import ENVIRONMENT from "./environment.config.js";


console.log(ENVIRONMENT)


const MONGO_URI = 'mongodb://localhost:27017'
const MONGO_DB_NAME = 'UTN_2026_LAUTA'

async function connectMongo() {
    try{
        await mongoose.connect(
        ENVIRONMENT.MONGO_DB_URI + '/' + ENVIRONMENT.MONGO_DB_NAME
    )
    console.log('Conexion a MongoDB exitosa')
    }
    catch(error){
        console.error('Error critico al conectar a MongoDB', error.message)

        /* Crasheo controlado */
        process.exit(1)
    }   
} 


export default connectMongo



