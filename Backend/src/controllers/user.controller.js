import user_repository from "../repositories/user.repository.js"
import ServerError from "../utils/error.util.js"
import mongoose from "mongoose"


export async function getUsers(request, response) {
    const user_list = await user_repository.get()
    response.send({
        message: "Get users list",
        ok: true,
        status: 200,
        data: {
            users: user_list
        }
    })
}

export async function getUserById(request, response) {
    const user_id = request.params.user_id

    /*
    Validar el formato del ObjectId ANTES de consultar la DB
    (si no, findById lanza un CastError no controlado y la API responderia 500)
    */
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new ServerError("Invalid user id", 400)
    }

    const user = await user_repository.getById(user_id)

    if (!user) {
        throw new ServerError("User not found", 404)
    }
    return response.send(
        {
            message: "Get user details successfully",
            status: 200,
            ok: true,
            data: {
                user: user
            }
        }
    )
}