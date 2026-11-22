import mongoose from 'mongoose'
import member_repository from "../repositories/member.repository.js"
import workspace_repository from "../repositories/workspace.repository.js"
import ServerError from "../utils/error.util.js"


/* 
Validar que el espacio de trabajo exista
Validar que quien consulta sea parte de este espacio de trabajo
    Revisar que sea miembro de este workspace (que tenga membresia)
Validar el rol de quien consulta
*/
/* 
valid_roles es un array con los tipos de roles validos para la consulta, el middleware evualuara si la membresia del usuario cumple con este requisito, sino bloqueara
*/
function workspaceMiddleware(valid_roles) {

    return async function
        (request, response, next) {

        const { workspace_id } = request.params

        /*
        Rutas que no llevan workspace_id en los params (ej: GET /api/workspaces para listar
        los espacios de trabajo del usuario) solo requieren haber pasado el authMiddleware
        */
        if (!workspace_id) {
            return next()
        }

        /*
        Validar el formato del ObjectId ANTES de consultar la DB
        (si no, findById lanza un CastError no controlado y la API responderia 500)
        */
        if (!mongoose.Types.ObjectId.isValid(workspace_id)) {
            throw new ServerError(
                'Workspace id invalido',
                400
            )
        }

        const workspace_selected = await workspace_repository.getById(workspace_id)

        const membership = await member_repository.getMembershipByUserAndWorkspace(request.user.id, workspace_id)
        console.log('[WorkspaceMiddleware]:', membership, workspace_id, request.user)

        if (!workspace_selected) {
            throw new ServerError(
                'Workspace no encontrado',
                404
            )
        }


        if (!membership) {
            throw new ServerError(
                'No eres miembro de este espacio de trabajo',
                403
            )
        }

        if(valid_roles.length > 0 && !valid_roles.includes(membership.rol)){
            throw new ServerError(
                'No tienes permisos suficientes para hacer esta operacion',
                403
            )
        }
        request.workspace = workspace_selected
        next()
    }

}




export default workspaceMiddleware