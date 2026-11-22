import Member from "../models/member.model.js"
import User from "../models/user.model.js"
import jwt from 'jsonwebtoken'
import ENVIRONMENT from "../config/environment.config.js"
import mailer_transporter from "../config/mailer.config.js"
import ServerError from "../utils/error.util.js"

class MemberRepository {
    async create(userId, workspaceId, role) {
        return await Member.create({
            fk_id_usuario: userId,
            fk_id_espacio_trabajo: workspaceId,
            rol: role
        })
    }

    async deleteById(memberId) {
        //Devolvemos el documento eliminado para que el controlador lo pueda responder
        const result = await Member.findByIdAndDelete(memberId)
        return result
    }

    async updateRoleById(memberId, role) {
        const result = await Member.findByIdAndUpdate(memberId, { rol: role })
        console.log(result)
    }

    /*
    formato:
    {
        member_id.
        member_role,
        workspace_id,
        workspace_name,
        workspace_fecha_creacion
    }
    */



    async getAllWorkspaceByUserId (user_id){
        //Traer todas las membresias de un usuario
        const result = await Member
        .find({fk_id_usuario: user_id})
        .select('rol fecha_creacion fk_id_espacio_trabajo')
        .populate(
            'fk_id_espacio_trabajo',
            'nombre fecha_creacion'
        )

       return result.map((membership) => {
            return {
                member_id: membership._id,
                member_role: membership.rol,
                workspace_id: membership.fk_id_espacio_trabajo._id,
                workspace_name: membership.fk_id_espacio_trabajo.nombre,
                workspace_fecha_creacion: membership.fk_id_espacio_trabajo.fecha_creacion
            }
        })
    }


    //Traer todos miembros de un espacio de trabajo (con sus datos de usuario poblados)
    async getAllMembersByWorkspaceId(workspace_id){
        const result = await Member
        .find({fk_id_espacio_trabajo: workspace_id})
        .populate('fk_id_usuario', 'nombre email')
        return result
    }

    async getMembershipByUserAndWorkspace (user_id, workspace_id){
        return await Member.findOne({fk_id_usuario:user_id, fk_id_espacio_trabajo: workspace_id })
    }


    //Borrar las membresias de un espacio de trabajo
    async deleteAllMembershipsByWorkspaceId(workspace_id){
        await Member.deleteMany({fk_id_espacio_trabajo: workspace_id})
    }

    /*
    Invitar un usuario a un espacio de trabajo
    - Validar que el rol con el que se invita sea 'admin' o 'user' (owner no se puede invitar)
    - Validar que el usuario a invitar exista (busqueda por email)
    - Validar que no tenga ya una membresia en este workspace
    - Crear la membresia con activo: false (invitacion sin aceptar)
    - Enviar por email un link para aceptar la invitacion
        El link usa un token JWT (member_id + workspace_id) con expiracion de 7 dias
        Ese link hace un GET hacia /api/workspaces/:workspace_id/members/accept-invite/:invitation_token
    */
    async inviteMember(workspace_id, email, role){

        if (!email) {
            throw new ServerError('Email is required', 400)
        }

        //Si no envian rol, se invita como 'user'. Owner nunca puede ser un rol de invitacion
        const rol_final = role ?? 'user'
        if (!['admin', 'user'].includes(rol_final)) {
            throw new ServerError('Rol invalido: solo se puede invitar con rol admin o user', 400)
        }

        const user_to_invite = await User.findOne({ email: email })
        if (!user_to_invite) {
            throw new ServerError('Usuario no encontrado', 404)
        }

        const existing_membership = await Member.findOne({
            fk_id_usuario: user_to_invite._id,
            fk_id_espacio_trabajo: workspace_id
        })
        if (existing_membership) {
            throw new ServerError('El usuario ya es miembro de este espacio de trabajo', 400)
        }

        const member_created = await Member.create({
            fk_id_usuario: user_to_invite._id,
            fk_id_espacio_trabajo: workspace_id,
            rol: rol_final,
            activo: false
        })

        const invitation_token = jwt.sign(
            {
                member_id: member_created._id,
                workspace_id: workspace_id
            },
            ENVIRONMENT.JWT_SECRET_KEY,
            {
                expiresIn: '7d'
            }
        )

        await mailer_transporter.sendMail(
            {
                to: email,
                from: ENVIRONMENT.GMAIL_USER,
                subject: "Te invitaron a un espacio de trabajo",
                html: `
                    <body>
                        <h1>Te invitaron a un espacio de trabajo</h1>
                        <p>Fuiste invitado con el rol '${rol_final}'. Tienes 7 dias para aceptar la invitacion</p>
                        <a href='${ENVIRONMENT.URL_BACKEND}/api/workspaces/${workspace_id}/members/accept-invite/${invitation_token}'>
                        Click aqui para aceptar la invitacion
                        </a>
                    </body>
                `
            }
        )

        return member_created
    }

    /*
    Aceptar una invitacion a un espacio de trabajo
    - Verificar que el invitation_token sea valido (firma + expiracion)
    - Verificar que el token corresponda al workspace de la ruta
    - Verificar que la membresia exista y que la invitacion no se haya aceptado ya
    - Marcar la membresia como aceptada (activo: true)
    */
    async acceptInvite(workspace_id, invitation_token){

        let token_data
        try {
            token_data = jwt.verify(invitation_token, ENVIRONMENT.JWT_SECRET_KEY)
        }
        catch (error) {
            //Token malformado, con firma invalida o expirado
            throw new ServerError('Invitacion invalida o expirada', 400)
        }

        //El token fue firmado para otro workspace
        if (token_data.workspace_id !== workspace_id) {
            throw new ServerError('Invitacion invalida o expirada', 400)
        }

        const member_found = await Member.findById(token_data.member_id)
        if (!member_found) {
            throw new ServerError('Invitacion invalida o expirada', 400)
        }

        if (member_found.activo) {
            throw new ServerError('Ya aceptaste esta invitacion', 400)
        }

        return await Member.findByIdAndUpdate(
            member_found._id,
            { activo: true },
            { new: true }
        )
    }
}
const member_repository = new MemberRepository()
export default member_repository