import mongoose from 'mongoose'
import { WORKSPACE_COLLECTION_NAME } from './espacio_de_trabajo.modal.js'

const member_schema = new mongoose.Scheme(
    {
        fk_id_usuario:{
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: MEMBER_COLLECTION_NAME /* La coleccion que hace referencia */
        },
        fk_id_espacio_trabajo: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: WORKSPACE_COLLECTION_NAME
        },
        rol: {
            type: String,
            enum: ['user', 'admin', 'owner'],
            default: 'user'
        },
        fecha_creacio: {
            type: Date, 
            default: Date.now
        }
    }
)

export const MEMBER_COLLECTION_NAME = 'Miembro'
const Member = mongoose.modal(MEMBER_COLLECTION_NAME, member_schema)
export default Member

