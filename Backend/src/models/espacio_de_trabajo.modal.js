/* 
Crear un schema de mongoose para el Workspace (espacio_de_trabajo)
    - Seguir el mismo formato que en SQL (fecha_creacion, nombre, descripcion)
    - Crear el schema y modelo dentro de /models/workspace.model.js
Crear una funcion llamada createWorkspace(name, description) que inserte en la DB un espacio de trabajo
*/

import mongoose from "mongoose";

const espacio_de_trabajoSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
            trim: true
        },
         fecha_creacion: {
            type: Date,
            default: Date.now
        },
        descripcion: {
            type: String,
            maxlength: 500,  
            trim: true   
        }
    }
)
export const WORKSPACE_COLLECTION_NAME = 'EspacioTrabajo'
const EspacioDeTrabajo = mongoose.model('Espacio_de_trabajo', espacio_de_trabajoSchema)

export default EspacioDeTrabajo

